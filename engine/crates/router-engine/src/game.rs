//! Round orchestration for BeARouter.
//!
//! Ported from `BeARouter/GameEngine.cs` and `IPv4Packet.cs`.

use crate::routing::{Route, RouteMatch, RouterPort, RoutingTable};
use net_core::score::{Goal, GoalStatus, UserScore};
use net_core::v4::{self, SubnetV4};
use net_core::{MacAddress, Rng};
use std::net::Ipv4Addr;

pub const DEFAULT_INTERFACE_COUNT: usize = 5;
pub const DEFAULT_ROUTE_COUNT: usize = 4;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameState {
    AwaitingStart,
    AwaitingAnswer,
    ShowingSolution,
    Finished,
}

#[derive(Debug, Clone, Copy)]
pub struct GameConfig {
    pub interface_count: usize,
    pub route_count: usize,
    pub exam_mode: bool,
    pub goal: Option<Goal>,
    pub seed: u64,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            interface_count: DEFAULT_INTERFACE_COUNT,
            route_count: DEFAULT_ROUTE_COUNT,
            exam_mode: false,
            goal: None,
            seed: 0,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Ipv4Packet {
    pub source_mac: MacAddress,
    pub dest_mac: MacAddress,
    pub source_ip: Ipv4Addr,
    pub dest_ip: Ipv4Addr,
}

#[derive(Debug, Clone)]
pub struct RoundResult {
    pub correct: bool,
    /// `None` when no route matches and the packet must be dropped.
    pub chosen: Option<RouteMatch>,
    pub expected_port: Option<usize>,
    pub selected_ports: Vec<usize>,
    /// Every row evaluated against the destination, for the Explain view.
    pub explanation: Vec<RouteMatch>,
    pub score: UserScore,
    pub goal_status: Option<GoalStatus>,
}

#[derive(Debug, Clone)]
pub struct Game {
    config: GameConfig,
    ports: Vec<RouterPort>,
    routing_table: RoutingTable,
    own_mac: MacAddress,
    destination_pool: Vec<Ipv4Addr>,
    pool_cursor: usize,
    rng: Rng,
    state: GameState,
    current_packet: Option<Ipv4Packet>,
    score: UserScore,
    last_result: Option<RoundResult>,
}

impl Game {
    pub fn new(config: GameConfig) -> Self {
        let mut rng = Rng::new(config.seed);
        let ports = build_ports(config.interface_count, &mut rng);
        let routing_table = build_routing_table(&ports, config.route_count, &mut rng);
        let destination_pool = build_destination_pool(&routing_table, &mut rng);
        let own_mac = MacAddress::random(&mut rng);

        Self {
            config,
            ports,
            routing_table,
            own_mac,
            destination_pool,
            pool_cursor: 0,
            rng,
            state: GameState::AwaitingStart,
            current_packet: None,
            score: UserScore::new(),
            last_result: None,
        }
    }

    pub fn config(&self) -> &GameConfig {
        &self.config
    }

    pub fn ports(&self) -> &[RouterPort] {
        &self.ports
    }

    pub fn routing_table(&self) -> &RoutingTable {
        &self.routing_table
    }

    pub fn state(&self) -> GameState {
        self.state
    }

    pub fn score(&self) -> UserScore {
        self.score
    }

    pub fn current_packet(&self) -> Option<&Ipv4Packet> {
        self.current_packet.as_ref()
    }

    pub fn last_result(&self) -> Option<&RoundResult> {
        self.last_result.as_ref()
    }

    pub fn next_packet(&mut self) -> Option<&Ipv4Packet> {
        if self.state == GameState::Finished || self.destination_pool.len() < 2 {
            return None;
        }
        let source_ip = self.take_from_pool();
        let mut dest_ip = self.take_from_pool();
        // A packet addressed to its own source teaches nothing.
        if dest_ip == source_ip {
            dest_ip = self.take_from_pool();
        }

        self.current_packet = Some(Ipv4Packet {
            source_mac: MacAddress::random(&mut self.rng),
            dest_mac: self.own_mac,
            source_ip,
            dest_ip,
        });
        self.last_result = None;
        self.state = GameState::AwaitingAnswer;
        self.current_packet.as_ref()
    }

    /// Scores the student's interface selection for the pending packet.
    pub fn submit(&mut self, selected_ports: &[usize]) -> Option<&RoundResult> {
        if self.state != GameState::AwaitingAnswer {
            return None;
        }
        let packet = self.current_packet.clone()?;

        let explanation = self.routing_table.match_all(packet.dest_ip);
        let chosen = self.routing_table.route_for(packet.dest_ip);
        let expected_port = chosen.as_ref().map(|m| m.route.port);

        let mut selected: Vec<usize> = selected_ports.to_vec();
        selected.sort_unstable();
        selected.dedup();

        let correct = match expected_port {
            Some(port) => selected == vec![port],
            None => selected.is_empty(),
        };

        if correct {
            self.score.add_correct();
        } else {
            self.score.add_wrong();
        }

        let goal_status = self
            .config
            .goal
            .map(|goal| goal.status(self.score.correct, self.score.total()));

        if self.config.exam_mode
            && matches!(goal_status, Some(GoalStatus::Reached) | Some(GoalStatus::Failed))
        {
            self.state = GameState::Finished;
        } else {
            self.state = GameState::ShowingSolution;
        }

        self.last_result = Some(RoundResult {
            correct,
            chosen,
            expected_port,
            selected_ports: selected,
            explanation,
            score: self.score,
            goal_status,
        });
        self.last_result.as_ref()
    }

    /// Rebuilds the topology and clears the score.
    pub fn restart(&mut self) {
        let mut rng = Rng::new(self.config.seed.wrapping_add(1));
        self.ports = build_ports(self.config.interface_count, &mut rng);
        self.routing_table = build_routing_table(&self.ports, self.config.route_count, &mut rng);
        self.destination_pool = build_destination_pool(&self.routing_table, &mut rng);
        self.own_mac = MacAddress::random(&mut rng);
        self.rng = rng;
        self.pool_cursor = 0;
        self.score.reset();
        self.current_packet = None;
        self.last_result = None;
        self.state = GameState::AwaitingStart;
    }

    fn take_from_pool(&mut self) -> Ipv4Addr {
        let address = self.destination_pool[self.pool_cursor % self.destination_pool.len()];
        self.pool_cursor += 1;
        address
    }
}

fn build_ports(interface_count: usize, rng: &mut Rng) -> Vec<RouterPort> {
    let subnets = generate_interface_subnets(interface_count, rng);
    subnets
        .into_iter()
        .enumerate()
        .map(|(number, subnet)| {
            let mut port = RouterPort::new(number);
            port.addresses.push(subnet);
            port
        })
        .collect()
}

/// Distinct, non-overlapping interface subnets: a mix of RFC1918 and public
/// space, each holding a usable host address. Ported from
/// `GameEngine.GenerateRandomInterfaceAddresses`.
pub fn generate_interface_subnets(count: usize, rng: &mut Rng) -> Vec<SubnetV4> {
    let private_192 = rng.range(1, 3) as usize;
    let private_10 = rng.range(1, 3) as usize;

    let mut subnets: Vec<SubnetV4> = Vec::new();
    let mut guard = 0;

    while subnets.len() < count && guard < count * 500 {
        guard += 1;
        let index = subnets.len();
        let mut candidate = if index < private_192 {
            SubnetV4 {
                address: Ipv4Addr::new(
                    192,
                    168,
                    rng.range(0, 255) as u8,
                    rng.range(0, 254) as u8,
                ),
                mask: rng.range(18, 30) as u8,
            }
        } else if index < private_192 + private_10 {
            SubnetV4 {
                address: Ipv4Addr::new(
                    10,
                    rng.range(0, 255) as u8,
                    rng.range(0, 255) as u8,
                    rng.range(0, 254) as u8,
                ),
                mask: rng.range(14, 28) as u8,
            }
        } else {
            v4::random_public_ipv4_subnet(rng, 16, 28)
        };

        if !candidate.is_host_address() {
            candidate = SubnetV4 {
                address: candidate.host_min(),
                mask: candidate.mask,
            };
        }

        let overlaps = subnets.iter().any(|existing| {
            existing.contains_subnet(&candidate) || candidate.contains_subnet(existing)
        });
        if !overlaps {
            subnets.push(candidate);
        }
    }

    // Fall back to a deterministic block if random generation kept colliding.
    while subnets.len() < count {
        let index = subnets.len() as u8;
        subnets.push(SubnetV4 {
            address: Ipv4Addr::new(172, 16 + index, 0, 1),
            mask: 24,
        });
    }
    subnets
}

/// Connected routes for every interface, some remote routes reachable via a
/// neighbour, a deliberately overlapping supernet, and a default route.
fn build_routing_table(ports: &[RouterPort], route_count: usize, rng: &mut Rng) -> RoutingTable {
    let mut table = RoutingTable::new();

    for port in ports {
        if let Some(subnet) = port.first_address() {
            table.add(Route::connected(
                subnet.to_network(),
                port.number,
                subnet.address,
            ));
        }
    }

    let remote = generate_interface_subnets(route_count.max(1), rng);
    let mut used_hosts: Vec<u32> = vec![1; ports.len()];

    let mut add_via = |table: &mut RoutingTable, subnet: SubnetV4, rng: &mut Rng| {
        let port_index = rng.below(ports.len() as u64) as usize;
        let Some(interface) = ports[port_index].first_address() else {
            return;
        };
        // The next hop is a neighbour inside the directly attached subnet.
        let offset = used_hosts[port_index];
        used_hosts[port_index] += 1;
        let gateway = Ipv4Addr::from(u32::from(interface.address).wrapping_add(offset));
        if !interface.matches(gateway) {
            return;
        }
        table.add(Route::via(subnet.to_network(), port_index, gateway));
    };

    for subnet in &remote {
        add_via(&mut table, *subnet, rng);
    }

    // An overlapping supernet so longest-prefix-match actually decides.
    if let Some(first) = remote.first() {
        if first.mask > 1 {
            let supernet = SubnetV4 {
                address: first.network_address(),
                mask: first.mask - 1,
            };
            add_via(&mut table, supernet, rng);
        }
    }

    if let Some(default_subnet) = SubnetV4::parse("0.0.0.0/0") {
        add_via(&mut table, default_subnet, rng);
    }

    table
}

/// Destinations the student will be asked about: real hosts inside each known
/// network plus public addresses that only the default route can serve.
fn build_destination_pool(table: &RoutingTable, rng: &mut Rng) -> Vec<Ipv4Addr> {
    let mut pool: Vec<Ipv4Addr> = Vec::new();

    for route in table.routes() {
        if route.is_default_route() {
            continue;
        }
        let subnet = route.subnet;
        let total = subnet.total_addresses();
        if total <= 2 {
            continue;
        }
        let wanted = 6.min(total - 2) as usize;
        for _ in 0..wanted {
            let host = subnet.random_host(rng);
            if host != subnet.network_address() && host != subnet.broadcast() {
                pool.push(host);
            }
        }
    }

    let public_count = pool.len() / 10 + 10;
    for _ in 0..public_count {
        let address = v4::random_public_ipv4_subnet(rng, 16, 28).address;
        if !pool.contains(&address) {
            pool.push(address);
        }
    }

    pool.dedup();
    rng.shuffle(&mut pool);
    if pool.is_empty() {
        pool.push(Ipv4Addr::new(203, 0, 113, 7));
    }
    pool
}
