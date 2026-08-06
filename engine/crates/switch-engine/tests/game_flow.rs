//! Round flow, scoring and answer validation.

use net_core::score::{Goal, GoalStatus};
use switch_engine::engine::SwitchActionType;
use switch_engine::game::{Answer, Game, GameConfig, GameState, PortAnswer};

fn game(seed: u64) -> Game {
    Game::new(GameConfig {
        seed,
        ..GameConfig::default()
    })
}

/// Builds the answer a perfect student would give for the pending frame.
fn perfect_answer(game: &Game) -> Answer {
    let frame = game.current_frame().expect("a frame is pending").clone();
    let mut probe = game.engine().clone();
    let entry_required = probe.is_mac_entry_required(&frame);
    let action = probe.process_frame(&frame);
    let expected = probe.expected_decisions(&frame, &action);

    Answer {
        entry_required,
        entry_mac: entry_required.then(|| frame.source_label.clone()),
        entry_port: entry_required.then_some(frame.source_port),
        ports: expected
            .iter()
            .map(|d| PortAnswer {
                port: d.port,
                send: d.send,
                tag: d.tag,
            })
            .collect(),
    }
}

#[test]
fn topology_has_hosts_and_vlans() {
    for seed in 0..200 {
        let game = game(seed);
        assert_eq!(game.hosts().len(), 12, "seed {seed}");
        assert!(!game.engine().available_vlans().is_empty(), "seed {seed}");
        for host in game.hosts() {
            let port = game.engine().port(host.port).expect("valid port");
            assert!(
                port.is_member(host.vlan),
                "seed {seed}: host on port {} not in VLAN {}",
                host.port,
                host.vlan
            );
        }
    }
}

#[test]
fn host_labels_are_unique() {
    let game = game(3);
    let mut labels: Vec<&str> = game.hosts().iter().map(|h| h.label.as_str()).collect();
    labels.sort_unstable();
    labels.dedup();
    assert_eq!(labels.len(), 12);
    assert_eq!(labels[0], "A");
}

#[test]
fn every_generated_frame_is_deliverable() {
    for seed in 0..100 {
        let mut game = game(seed);
        for _ in 0..30 {
            let frame = game.next_round().expect("a frame").clone();
            assert_ne!(frame.source_label, frame.dest_label, "seed {seed}");

            let source = game
                .hosts()
                .iter()
                .find(|h| h.label == frame.source_label)
                .expect("source host exists");
            let dest = game
                .hosts()
                .iter()
                .find(|h| h.label == frame.dest_label)
                .expect("dest host exists");
            assert_eq!(source.vlan, dest.vlan, "seed {seed}: cross-VLAN frame");

            let port = game.engine().port(frame.source_port).expect("valid port");
            assert_eq!(
                frame.vlan_tag.is_some(),
                port.is_vlan_tagged(source.vlan),
                "seed {seed}: tag does not match port role"
            );

            let answer = perfect_answer(&game);
            game.submit(&answer);
        }
    }
}

#[test]
fn a_perfect_answer_always_scores() {
    let mut game = game(11);
    for round in 0..40 {
        game.next_round().expect("a frame");
        let answer = perfect_answer(&game);
        let result = game.submit(&answer).expect("a result");
        assert!(result.correct, "round {round} should be correct");
    }
    assert_eq!(game.score().correct, 40);
    assert_eq!(game.score().wrong, 0);
    assert_eq!(game.score().score, 2000);
}

#[test]
fn a_wrong_port_selection_fails_the_round() {
    let mut game = game(5);
    game.next_round();
    let mut answer = perfect_answer(&game);
    answer.ports[0].send = !answer.ports[0].send;

    let result = game.submit(&answer).expect("a result");
    assert!(!result.correct);
    assert!(!result.ports[0].is_correct());
    assert_eq!(game.score().wrong, 1);
    assert_eq!(game.score().score, 0);
}

#[test]
fn a_wrong_tag_selection_fails_the_round() {
    let mut game = game(6);
    game.next_round();
    let mut answer = perfect_answer(&game);
    answer.ports.iter_mut().for_each(|p| p.tag = !p.tag);
    assert!(!game.submit(&answer).expect("a result").correct);
}

#[test]
fn misjudging_the_table_entry_fails_the_round() {
    let mut game = game(7);
    game.next_round();
    let mut answer = perfect_answer(&game);
    answer.entry_required = !answer.entry_required;

    let result = game.submit(&answer).expect("a result");
    assert!(!result.correct);
    assert!(!result.entry_required_correct);
}

#[test]
fn a_wrong_mac_or_port_in_the_entry_fails_the_round() {
    let mut game = game(8);
    game.next_round();
    let mut answer = perfect_answer(&game);
    assert!(answer.entry_required, "first frame always needs an entry");

    answer.entry_mac = Some("ZZ".to_owned());
    let result = game.submit(&answer).expect("a result");
    assert!(!result.correct);
    assert_eq!(result.mac_correct, Some(false));
    assert_eq!(result.port_correct, Some(true));
    assert!(!result.expected_mac.is_empty());
}

#[test]
fn the_first_frame_of_a_vlan_always_floods() {
    let mut game = game(21);
    game.next_round();
    let result = game.submit(&perfect_answer(&game)).expect("a result");
    assert_eq!(result.action.kind, SwitchActionType::Broadcast);
    assert!(result.entry_required_expected);
}

#[test]
fn state_machine_rejects_out_of_order_calls() {
    let mut game = game(9);
    assert_eq!(game.state(), GameState::AwaitingStart);

    let empty = Answer {
        entry_required: false,
        entry_mac: None,
        entry_port: None,
        ports: Vec::new(),
    };
    assert!(game.submit(&empty).is_none(), "cannot answer before starting");

    game.next_round();
    assert_eq!(game.state(), GameState::AwaitingAnswer);
    game.submit(&empty);
    assert_eq!(game.state(), GameState::ShowingSolution);
    assert!(game.submit(&empty).is_none(), "cannot answer twice");
}

#[test]
fn restart_clears_tables_and_score() {
    let mut game = game(10);
    for _ in 0..5 {
        game.next_round();
        game.submit(&perfect_answer(&game));
    }
    assert!(!game.mac_tables().is_empty());
    assert!(game.score().total() > 0);

    game.restart();
    assert!(game.mac_tables().is_empty());
    assert_eq!(game.score().total(), 0);
    assert_eq!(game.state(), GameState::AwaitingStart);
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
        game.next_round().expect("a frame");
        game.submit(&perfect_answer(&game));
    }

    assert_eq!(game.state(), GameState::Finished);
    assert_eq!(game.last_result().unwrap().goal_status, Some(GoalStatus::Reached));
    assert!(game.next_round().is_none(), "exam is over");
}

#[test]
fn exam_mode_fails_early_once_the_goal_is_unreachable() {
    let mut game = Game::new(GameConfig {
        seed: 13,
        exam_mode: true,
        goal: Goal::new(5, 5),
        ..GameConfig::default()
    });

    game.next_round().expect("a frame");
    let wrong = Answer {
        entry_required: false,
        entry_mac: None,
        entry_port: None,
        ports: Vec::new(),
    };
    let result = game.submit(&wrong).expect("a result");

    assert!(!result.correct);
    assert_eq!(result.goal_status, Some(GoalStatus::Failed));
    assert_eq!(game.state(), GameState::Finished);
}

#[test]
fn practice_mode_never_finishes() {
    let mut game = game(14);
    for _ in 0..50 {
        game.next_round().expect("a frame");
        game.submit(&perfect_answer(&game));
        assert_ne!(game.state(), GameState::Finished);
    }
}

#[test]
fn vlan_free_mode_puts_everything_in_one_vlan() {
    let game = Game::new(GameConfig {
        seed: 15,
        use_vlan: false,
        ..GameConfig::default()
    });
    assert_eq!(game.engine().available_vlans(), vec![1]);
    for port in game.engine().ports() {
        assert!(port.tagged.is_empty());
        assert_eq!(port.untagged, vec![1]);
    }
}

#[test]
fn the_same_seed_replays_identically() {
    let mut a = game(99);
    let mut b = game(99);
    for _ in 0..25 {
        let fa = a.next_round().expect("a frame").clone();
        let fb = b.next_round().expect("a frame").clone();
        assert_eq!(fa, fb);
        a.submit(&perfect_answer(&a));
        b.submit(&perfect_answer(&b));
    }
    assert_eq!(a.score(), b.score());
}

#[test]
fn different_seeds_produce_different_games() {
    let a = game(1);
    let b = game(2);
    let vlans_a: Vec<_> = a.engine().ports().iter().map(|p| p.untagged.clone()).collect();
    let vlans_b: Vec<_> = b.engine().ports().iter().map(|p| p.untagged.clone()).collect();
    assert_ne!(vlans_a, vlans_b);
}
