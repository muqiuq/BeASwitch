//! Round flow, topology generation and scoring for BeARouter.

use net_core::score::{Goal, GoalStatus};
use router_engine::game::{Game, GameConfig, GameState};

fn game(seed: u64) -> Game {
    Game::new(GameConfig {
        seed,
        ..GameConfig::default()
    })
}

fn expected_port(game: &Game) -> Option<usize> {
    let packet = game.current_packet().expect("a packet is pending");
    game.routing_table()
        .route_for(packet.dest_ip)
        .map(|m| m.route.port)
}

#[test]
fn topology_is_well_formed() {
    for seed in 0..200 {
        let game = game(seed);
        assert_eq!(game.ports().len(), 5, "seed {seed}");

        for (index, port) in game.ports().iter().enumerate() {
            assert_eq!(port.name, format!("eth{index}"));
            let address = port.first_address().expect("an address");
            assert!(
                address.is_host_address(),
                "seed {seed}: eth{index} holds {address}, not a host address"
            );
        }

        assert!(
            game.routing_table().len() >= game.ports().len(),
            "seed {seed}: every interface needs a connected route"
        );
        assert!(
            game.routing_table().routes().iter().any(|r| r.is_default_route()),
            "seed {seed}: a default route is required"
        );
    }
}

#[test]
fn interface_subnets_never_overlap() {
    for seed in 0..200 {
        let game = game(seed);
        let subnets: Vec<_> = game
            .ports()
            .iter()
            .map(|p| p.first_address().expect("an address"))
            .collect();
        for (i, a) in subnets.iter().enumerate() {
            for (j, b) in subnets.iter().enumerate() {
                if i == j {
                    continue;
                }
                assert!(
                    !a.contains_subnet(b),
                    "seed {seed}: {a} contains {b}"
                );
            }
        }
    }
}

#[test]
fn connected_routes_point_at_their_own_interface() {
    let game = game(4);
    for port in game.ports() {
        let subnet = port.first_address().unwrap().to_network();
        let route = game
            .routing_table()
            .routes()
            .iter()
            .find(|r| r.on_link() && r.subnet == subnet)
            .unwrap_or_else(|| panic!("no connected route for {}", port.name));
        assert_eq!(route.port, port.number);
        assert_eq!(route.src, Some(port.first_address().unwrap().address));
    }
}

#[test]
fn every_next_hop_lives_on_its_own_interface() {
    for seed in 0..100 {
        let game = game(seed);
        for route in game.routing_table().routes() {
            let Some(gateway) = route.gateway else {
                continue;
            };
            let interface = game.ports()[route.port].first_address().unwrap();
            assert!(
                interface.matches(gateway),
                "seed {seed}: gateway {gateway} is not reachable on eth{}",
                route.port
            );
        }
    }
}

#[test]
fn every_generated_destination_is_resolvable() {
    for seed in 0..100 {
        let mut game = game(seed);
        for _ in 0..30 {
            let packet = game.next_packet().expect("a packet").clone();
            assert_ne!(packet.source_ip, packet.dest_ip, "seed {seed}");
            assert!(
                game.routing_table().route_for(packet.dest_ip).is_some(),
                "seed {seed}: {} is unroutable",
                packet.dest_ip
            );
            let port = expected_port(&game);
            game.submit(&port.into_iter().collect::<Vec<_>>());
        }
    }
}

#[test]
fn packets_are_addressed_to_the_router_itself() {
    let mut game = game(2);
    let first = game.next_packet().unwrap().dest_mac;
    for _ in 0..10 {
        let packet = game.next_packet().unwrap();
        assert_eq!(packet.dest_mac, first, "the router's own MAC is stable");
        assert_ne!(packet.source_mac, first);
    }
}

#[test]
fn choosing_the_right_interface_scores() {
    let mut game = game(3);
    for round in 0..40 {
        game.next_packet().expect("a packet");
        let port = expected_port(&game).expect("a route");
        let result = game.submit(&[port]).expect("a result");
        assert!(result.correct, "round {round}");
        assert_eq!(result.expected_port, Some(port));
    }
    assert_eq!(game.score().correct, 40);
    assert_eq!(game.score().score, 2000);
}

#[test]
fn choosing_the_wrong_interface_fails() {
    let mut game = game(5);
    game.next_packet();
    let port = expected_port(&game).expect("a route");
    let wrong = (port + 1) % 5;

    let result = game.submit(&[wrong]).expect("a result");
    assert!(!result.correct);
    assert_eq!(result.expected_port, Some(port));
    assert_eq!(game.score().wrong, 1);
}

#[test]
fn selecting_extra_interfaces_fails() {
    let mut game = game(6);
    game.next_packet();
    let port = expected_port(&game).expect("a route");
    let extra = (port + 2) % 5;
    assert!(!game.submit(&[port, extra]).expect("a result").correct);
}

#[test]
fn selecting_nothing_fails_when_a_route_exists() {
    let mut game = game(7);
    game.next_packet();
    assert!(!game.submit(&[]).expect("a result").correct);
}

#[test]
fn duplicate_selections_are_tolerated() {
    let mut game = game(8);
    game.next_packet();
    let port = expected_port(&game).expect("a route");
    let result = game.submit(&[port, port, port]).expect("a result");
    assert!(result.correct);
    assert_eq!(result.selected_ports, vec![port]);
}

#[test]
fn the_result_explains_every_row() {
    let mut game = game(9);
    game.next_packet();
    let port = expected_port(&game).expect("a route");
    let route_count = game.routing_table().len();
    let result = game.submit(&[port]).expect("a result").clone();

    assert_eq!(result.explanation.len(), route_count);
    assert!(result.explanation.iter().any(|m| m.is_match()));

    let chosen = result.chosen.as_ref().expect("a winning route");
    let best_mask = result
        .explanation
        .iter()
        .filter(|m| m.is_match())
        .map(|m| m.route.subnet.mask)
        .max()
        .unwrap();
    assert_eq!(
        chosen.route.subnet.mask, best_mask,
        "the winner must be the longest matching prefix"
    );
}

#[test]
fn state_machine_rejects_out_of_order_calls() {
    let mut game = game(10);
    assert_eq!(game.state(), GameState::AwaitingStart);
    assert!(game.submit(&[0]).is_none(), "cannot answer before starting");

    game.next_packet();
    assert_eq!(game.state(), GameState::AwaitingAnswer);
    game.submit(&[0]);
    assert_eq!(game.state(), GameState::ShowingSolution);
    assert!(game.submit(&[0]).is_none(), "cannot answer twice");
}

#[test]
fn restart_clears_the_score_and_rebuilds_the_topology() {
    let mut game = game(11);
    let before = game.routing_table().clone();
    for _ in 0..5 {
        game.next_packet();
        let port = expected_port(&game).expect("a route");
        game.submit(&[port]);
    }
    assert!(game.score().total() > 0);

    game.restart();
    assert_eq!(game.score().total(), 0);
    assert_eq!(game.state(), GameState::AwaitingStart);
    assert!(game.current_packet().is_none());
    assert_ne!(*game.routing_table(), before);
}

#[test]
fn exam_mode_finishes_when_the_goal_is_reached() {
    let mut game = Game::new(GameConfig {
        seed: 12,
        exam_mode: true,
        goal: Goal::new(5, 4),
        ..GameConfig::default()
    });

    for _ in 0..5 {
        game.next_packet().expect("a packet");
        let port = expected_port(&game).expect("a route");
        game.submit(&[port]);
    }

    assert_eq!(game.state(), GameState::Finished);
    assert_eq!(game.last_result().unwrap().goal_status, Some(GoalStatus::Reached));
    assert!(game.next_packet().is_none());
}

#[test]
fn exam_mode_fails_early_once_the_goal_is_unreachable() {
    let mut game = Game::new(GameConfig {
        seed: 13,
        exam_mode: true,
        goal: Goal::new(5, 5),
        ..GameConfig::default()
    });

    game.next_packet().expect("a packet");
    let result = game.submit(&[]).expect("a result");
    assert!(!result.correct);
    assert_eq!(result.goal_status, Some(GoalStatus::Failed));
    assert_eq!(game.state(), GameState::Finished);
}

#[test]
fn the_same_seed_replays_identically() {
    let mut a = game(77);
    let mut b = game(77);
    assert_eq!(a.routing_table(), b.routing_table());
    for _ in 0..25 {
        assert_eq!(a.next_packet(), b.next_packet());
        let port = expected_port(&a);
        let selection: Vec<usize> = port.into_iter().collect();
        a.submit(&selection);
        b.submit(&selection);
    }
    assert_eq!(a.score(), b.score());
}

#[test]
fn different_seeds_produce_different_topologies() {
    assert_ne!(game(1).routing_table(), game(2).routing_table());
}

#[test]
fn overlapping_prefixes_appear_often_enough_to_teach_the_rule() {
    let mut seeds_with_overlap = 0;
    for seed in 0..100 {
        let game = game(seed);
        let routes = game.routing_table().routes();
        let overlapping = routes.iter().any(|a| {
            routes.iter().any(|b| {
                !std::ptr::eq(a, b)
                    && a.subnet.mask != b.subnet.mask
                    && a.subnet.contains_subnet(&b.subnet)
            })
        });
        if overlapping {
            seeds_with_overlap += 1;
        }
    }
    assert!(
        seeds_with_overlap > 90,
        "only {seeds_with_overlap}/100 topologies exercise longest-prefix-match"
    );
}
