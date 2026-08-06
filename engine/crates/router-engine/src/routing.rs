//! Routing table and longest-prefix-match lookup.
//!
//! Ported from `BeARouter/RoutingTable.cs`, `Route.cs`, `RouteMatch.cs` and
//! `RouterPort.cs`.

use net_core::v4::SubnetV4;
use std::fmt;
use std::net::Ipv4Addr;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouterPort {
    pub number: usize,
    pub name: String,
    pub addresses: Vec<SubnetV4>,
}

impl RouterPort {
    pub fn new(number: usize) -> Self {
        Self {
            number,
            name: format!("eth{number}"),
            addresses: Vec::new(),
        }
    }

    pub fn first_address(&self) -> Option<SubnetV4> {
        self.addresses.first().copied()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Route {
    pub subnet: SubnetV4,
    pub port: usize,
    pub gateway: Option<Ipv4Addr>,
    pub src: Option<Ipv4Addr>,
}

impl Route {
    /// A directly attached network, reachable without a next hop.
    pub fn connected(subnet: SubnetV4, port: usize, src: Ipv4Addr) -> Self {
        Self {
            subnet,
            port,
            gateway: None,
            src: Some(src),
        }
    }

    pub fn via(subnet: SubnetV4, port: usize, gateway: Ipv4Addr) -> Self {
        Self {
            subnet,
            port,
            gateway: Some(gateway),
            src: None,
        }
    }

    pub fn on_link(&self) -> bool {
        self.gateway.is_none()
    }

    pub fn is_default_route(&self) -> bool {
        self.subnet.is_default_route()
    }
}

impl fmt::Display for Route {
    /// Mirrors the `ip route` style output of the original `Route.ToString`.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let target = self.subnet.to_string();
        match (self.gateway, self.src) {
            (Some(gateway), _) => write!(f, "{target:<19} via {gateway:<16}"),
            (None, Some(src)) => write!(f, "{target:<19} dev eth{} scope link src {src}", self.port),
            (None, None) => write!(f, "{target:<19} dev eth{} scope link", self.port),
        }
    }
}

/// Why a route did or did not match a destination address.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchOutcome {
    Match,
    NetworkMismatch,
    /// A network address is not a usable host destination.
    TargetIsNetworkAddress,
    /// Nor is a directed broadcast address.
    TargetIsBroadcast,
}

impl MatchOutcome {
    pub fn is_match(&self) -> bool {
        matches!(self, MatchOutcome::Match)
    }
}

/// One row of the Explain view: the masking step and its verdict.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouteMatch {
    pub route_index: usize,
    pub route: Route,
    pub outcome: MatchOutcome,
    /// The destination with this route's mask applied.
    pub calculated_network: Ipv4Addr,
    pub route_network: Ipv4Addr,
}

impl RouteMatch {
    pub fn is_match(&self) -> bool {
        self.outcome.is_match()
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RoutingTable {
    routes: Vec<Route>,
}

impl RoutingTable {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn routes(&self) -> &[Route] {
        &self.routes
    }

    pub fn len(&self) -> usize {
        self.routes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.routes.is_empty()
    }

    pub fn get(&self, index: usize) -> Option<&Route> {
        self.routes.get(index)
    }

    /// Ignores a route whose network is already present, so the table never
    /// contains two rows that a student could both defend as correct.
    pub fn add(&mut self, route: Route) -> bool {
        let duplicate = self.routes.iter().any(|existing| {
            existing.subnet.mask == route.subnet.mask
                && existing.subnet.network_address() == route.subnet.network_address()
        });
        if duplicate {
            return false;
        }
        self.routes.push(route);
        self.sort();
        true
    }

    /// Most specific last, matching how routing tables are usually printed.
    fn sort(&mut self) {
        self.routes.sort_by_key(|route| {
            (
                route.subnet.mask,
                u32::from(route.subnet.network_address()),
            )
        });
    }

    pub fn clear(&mut self) {
        self.routes.clear();
    }

    /// Evaluates every row against `address`, in table order.
    pub fn match_all(&self, address: Ipv4Addr) -> Vec<RouteMatch> {
        self.routes
            .iter()
            .enumerate()
            .map(|(route_index, route)| {
                let route_network = route.subnet.network_address();
                let calculated_network = route.subnet.apply_mask_to(address);

                let outcome = if address == route_network {
                    MatchOutcome::TargetIsNetworkAddress
                } else if address == route.subnet.broadcast() {
                    MatchOutcome::TargetIsBroadcast
                } else if calculated_network == route_network {
                    MatchOutcome::Match
                } else {
                    MatchOutcome::NetworkMismatch
                };

                RouteMatch {
                    route_index,
                    route: route.clone(),
                    outcome,
                    calculated_network,
                    route_network,
                }
            })
            .collect()
    }

    /// Longest prefix wins; the first row wins a tie.
    pub fn route_for(&self, address: Ipv4Addr) -> Option<RouteMatch> {
        self.match_all(address)
            .into_iter()
            .filter(RouteMatch::is_match)
            .max_by_key(|m| (m.route.subnet.mask, std::cmp::Reverse(m.route_index)))
    }
}

impl fmt::Display for RoutingTable {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for route in &self.routes {
            writeln!(f, "{route}")?;
        }
        Ok(())
    }
}
