//! Longest-prefix-match behaviour and Explain-view data.

use net_core::v4::SubnetV4;
use router_engine::routing::{MatchOutcome, Route, RoutingTable};
use std::net::Ipv4Addr;

fn ip(s: &str) -> Ipv4Addr {
    s.parse().expect("valid IPv4")
}

fn subnet(s: &str) -> SubnetV4 {
    SubnetV4::parse(s).expect("valid CIDR")
}

fn table() -> RoutingTable {
    let mut table = RoutingTable::new();
    table.add(Route::connected(subnet("192.168.1.0/24"), 0, ip("192.168.1.1")));
    table.add(Route::via(subnet("10.0.0.0/8"), 1, ip("192.168.1.2")));
    table.add(Route::via(subnet("10.1.0.0/16"), 2, ip("192.168.1.3")));
    table.add(Route::via(subnet("10.1.2.0/24"), 3, ip("192.168.1.4")));
    table.add(Route::via(subnet("0.0.0.0/0"), 4, ip("192.168.1.254")));
    table
}

#[test]
fn most_specific_route_wins() {
    let table = table();
    assert_eq!(table.route_for(ip("10.1.2.5")).unwrap().route.port, 3);
    assert_eq!(table.route_for(ip("10.1.3.5")).unwrap().route.port, 2);
    assert_eq!(table.route_for(ip("10.2.3.5")).unwrap().route.port, 1);
    assert_eq!(table.route_for(ip("192.168.1.9")).unwrap().route.port, 0);
}

#[test]
fn unknown_destinations_fall_back_to_the_default_route() {
    let table = table();
    let chosen = table.route_for(ip("8.8.8.8")).unwrap();
    assert_eq!(chosen.route.port, 4);
    assert!(chosen.route.is_default_route());
}

#[test]
fn a_network_address_is_not_a_routable_destination() {
    let table = table();
    let matches = table.match_all(ip("10.1.2.0"));
    let specific = matches
        .iter()
        .find(|m| m.route.subnet.mask == 24 && m.route.port == 3)
        .unwrap();
    assert_eq!(specific.outcome, MatchOutcome::TargetIsNetworkAddress);
    // The less specific routes still carry it.
    assert_eq!(table.route_for(ip("10.1.2.0")).unwrap().route.port, 2);
}

#[test]
fn a_broadcast_address_is_not_a_routable_destination() {
    let table = table();
    let matches = table.match_all(ip("10.1.2.255"));
    let specific = matches
        .iter()
        .find(|m| m.route.subnet.mask == 24 && m.route.port == 3)
        .unwrap();
    assert_eq!(specific.outcome, MatchOutcome::TargetIsBroadcast);
    assert_eq!(table.route_for(ip("10.1.2.255")).unwrap().route.port, 2);
}

#[test]
fn explanation_covers_every_row_in_table_order() {
    let table = table();
    let matches = table.match_all(ip("10.1.2.5"));
    assert_eq!(matches.len(), table.len());
    for (index, m) in matches.iter().enumerate() {
        assert_eq!(m.route_index, index);
    }

    let default = &matches[0];
    assert_eq!(default.route.subnet.mask, 0, "table is sorted least specific first");
    assert!(default.is_match());
}

#[test]
fn explanation_shows_the_masking_step() {
    let table = table();
    let matches = table.match_all(ip("10.1.2.5"));

    let eight = matches.iter().find(|m| m.route.subnet.mask == 8).unwrap();
    assert_eq!(eight.calculated_network, ip("10.0.0.0"));
    assert_eq!(eight.route_network, ip("10.0.0.0"));
    assert!(eight.is_match());

    let connected = matches.iter().find(|m| m.route.port == 0).unwrap();
    assert_eq!(connected.calculated_network, ip("10.1.2.0"));
    assert_eq!(connected.route_network, ip("192.168.1.0"));
    assert_eq!(connected.outcome, MatchOutcome::NetworkMismatch);
}

#[test]
fn a_table_without_a_default_route_can_drop_a_packet() {
    let mut table = RoutingTable::new();
    table.add(Route::connected(subnet("192.168.1.0/24"), 0, ip("192.168.1.1")));
    assert!(table.route_for(ip("8.8.8.8")).is_none());
    assert!(table.route_for(ip("192.168.1.5")).is_some());
}

#[test]
fn duplicate_networks_are_rejected() {
    let mut table = RoutingTable::new();
    assert!(table.add(Route::connected(subnet("192.168.1.0/24"), 0, ip("192.168.1.1"))));
    assert!(!table.add(Route::via(subnet("192.168.1.0/24"), 1, ip("10.0.0.1"))));
    assert!(!table.add(Route::via(subnet("192.168.1.77/24"), 1, ip("10.0.0.1"))));
    assert_eq!(table.len(), 1);
}

#[test]
fn the_default_route_matches_everything_except_its_own_edges() {
    let mut table = RoutingTable::new();
    table.add(Route::via(subnet("0.0.0.0/0"), 0, ip("10.0.0.1")));
    assert!(table.route_for(ip("1.2.3.4")).is_some());
    assert!(table.route_for(ip("0.0.0.0")).is_none());
    assert!(table.route_for(ip("255.255.255.255")).is_none());
}

#[test]
fn routes_render_in_ip_route_style() {
    let connected = Route::connected(subnet("192.168.1.0/24"), 0, ip("192.168.1.1"));
    assert_eq!(
        connected.to_string().trim(),
        "192.168.1.0/24      dev eth0 scope link src 192.168.1.1"
    );
    assert!(connected.on_link());

    let via = Route::via(subnet("10.0.0.0/8"), 1, ip("192.168.1.2"));
    assert_eq!(via.to_string().trim(), "10.0.0.0/8          via 192.168.1.2");
    assert!(!via.on_link());
}

#[test]
fn a_route_cannot_carry_traffic_to_its_own_edges() {
    let mut table = RoutingTable::new();
    table.add(Route::via(subnet("10.1.2.0/24"), 0, ip("192.168.1.9")));

    assert!(table.route_for(ip("10.1.2.7")).is_some());
    assert!(
        table.route_for(ip("10.1.2.0")).is_none(),
        "network address is not a host"
    );
    assert!(
        table.route_for(ip("10.1.2.255")).is_none(),
        "broadcast address is not a host"
    );
}
