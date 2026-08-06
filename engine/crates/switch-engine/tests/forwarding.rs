//! Forwarding truth table for the layer-2 engine.

use switch_engine::engine::{EthernetFrame, SwitchActionType, SwitchEngine};

fn frame(source_port: usize, source: &str, dest: &str, vlan_tag: Option<u16>) -> EthernetFrame {
    EthernetFrame {
        source_label: source.to_owned(),
        source_port,
        source_vlan: vlan_tag.unwrap_or(10),
        dest_label: dest.to_owned(),
        vlan_tag,
        payload: "Ping".to_owned(),
    }
}

/// Ports 0-2 access VLAN 10, port 3 access VLAN 20, port 4 trunk (10 + 20),
/// port 5 hybrid (untagged 10, tagged 20).
fn topology() -> SwitchEngine {
    let mut engine = SwitchEngine::new(6);
    {
        let ports = engine.ports_mut();
        ports[0].untagged = vec![10];
        ports[1].untagged = vec![10];
        ports[2].untagged = vec![10];
        ports[3].untagged = vec![20];
        ports[4].tagged = vec![10, 20];
        ports[5].untagged = vec![10];
        ports[5].tagged = vec![20];
    }
    engine
}

#[test]
fn unknown_destination_floods() {
    let mut engine = topology();
    let action = engine.process_frame(&frame(0, "A", "B", None));
    assert_eq!(action.kind, SwitchActionType::Broadcast);
    assert_eq!(action.vlan, 10);
    assert_eq!(action.dest_port, None);
}

#[test]
fn source_mac_is_learned_on_the_ingress_port() {
    let mut engine = topology();
    engine.process_frame(&frame(2, "A", "B", None));
    let table = &engine.mac_tables()[&10];
    assert_eq!(table.get("A"), Some(2));
    assert!(!table.contains("B"));
}

#[test]
fn known_destination_is_unicast() {
    let mut engine = topology();
    engine.process_frame(&frame(1, "B", "A", None));
    let action = engine.process_frame(&frame(0, "A", "B", None));
    assert_eq!(action.kind, SwitchActionType::Unicast);
    assert_eq!(action.dest_port, Some(1));
}

#[test]
fn frame_is_never_sent_back_out_the_ingress_port() {
    let mut engine = topology();
    engine.process_frame(&frame(0, "B", "A", None));
    // "B" now maps to port 0; a frame from "A" on port 0 destined for "B" must die.
    let action = engine.process_frame(&frame(0, "A", "B", None));
    assert_eq!(action.kind, SwitchActionType::Discard);
    assert_eq!(action.dest_port, None);
}

#[test]
fn untagged_frame_on_a_trunk_is_discarded() {
    let mut engine = topology();
    let action = engine.process_frame(&frame(4, "A", "B", None));
    assert_eq!(action.kind, SwitchActionType::Discard);
    assert!(engine.mac_tables().is_empty(), "nothing may be learned");
}

#[test]
fn tagged_frame_for_a_vlan_the_port_does_not_carry_is_discarded() {
    let mut engine = topology();
    assert_eq!(
        engine.process_frame(&frame(0, "A", "B", Some(10))).kind,
        SwitchActionType::Discard,
        "access port carries VLAN 10 untagged, not tagged"
    );
    assert_eq!(
        engine.process_frame(&frame(4, "A", "B", Some(30))).kind,
        SwitchActionType::Discard,
        "VLAN 30 is not configured anywhere"
    );
}

#[test]
fn tagged_frame_on_a_trunk_is_accepted() {
    let mut engine = topology();
    let action = engine.process_frame(&frame(4, "A", "B", Some(20)));
    assert_eq!(action.kind, SwitchActionType::Broadcast);
    assert_eq!(action.vlan, 20);
    assert_eq!(engine.mac_tables()[&20].get("A"), Some(4));
}

#[test]
fn mac_tables_are_isolated_per_vlan() {
    let mut engine = topology();
    engine.process_frame(&frame(0, "A", "X", None));
    engine.process_frame(&frame(3, "A", "Y", None));

    assert_eq!(engine.mac_tables()[&10].get("A"), Some(0));
    assert_eq!(engine.mac_tables()[&20].get("A"), Some(3));

    // "A" is known in VLAN 10 but that must not affect VLAN 20 forwarding.
    let action = engine.process_frame(&frame(4, "Z", "A", Some(20)));
    assert_eq!(action.kind, SwitchActionType::Unicast);
    assert_eq!(action.dest_port, Some(3));
}

#[test]
fn a_station_that_moves_updates_its_entry() {
    let mut engine = topology();
    engine.process_frame(&frame(0, "A", "B", None));
    assert_eq!(engine.mac_tables()[&10].get("A"), Some(0));
    engine.process_frame(&frame(2, "A", "B", None));
    assert_eq!(engine.mac_tables()[&10].get("A"), Some(2));
}

#[test]
fn flooding_reaches_every_member_port_except_the_ingress() {
    let mut engine = topology();
    let f = frame(0, "A", "B", None);
    let action = engine.process_frame(&f);
    let expected = engine.expected_decisions(&f, &action);

    let sending: Vec<usize> = expected.iter().filter(|d| d.send).map(|d| d.port).collect();
    assert_eq!(sending, vec![1, 2, 4, 5]);

    let tagging: Vec<usize> = expected.iter().filter(|d| d.tag).map(|d| d.port).collect();
    assert_eq!(tagging, vec![4], "only the trunk tags VLAN 10");

    assert!(!expected[0].send, "ingress port must not be selected");
    assert!(!expected[3].send, "port 3 is not in VLAN 10");
}

#[test]
fn flooding_on_a_tagged_vlan_tags_the_right_ports() {
    let mut engine = topology();
    let f = frame(3, "A", "B", None);
    let action = engine.process_frame(&f);
    let expected = engine.expected_decisions(&f, &action);

    assert_eq!(action.vlan, 20);
    let sending: Vec<usize> = expected.iter().filter(|d| d.send).map(|d| d.port).collect();
    assert_eq!(sending, vec![4, 5]);
    let tagging: Vec<usize> = expected.iter().filter(|d| d.tag).map(|d| d.port).collect();
    assert_eq!(tagging, vec![4, 5], "trunk and hybrid both tag VLAN 20");
}

#[test]
fn unicast_selects_only_the_destination_port() {
    let mut engine = topology();
    engine.process_frame(&frame(5, "B", "A", None));
    let f = frame(0, "A", "B", None);
    let action = engine.process_frame(&f);
    let expected = engine.expected_decisions(&f, &action);

    let sending: Vec<usize> = expected.iter().filter(|d| d.send).map(|d| d.port).collect();
    assert_eq!(sending, vec![5]);
    assert!(
        !expected[5].tag,
        "hybrid port carries VLAN 10 untagged"
    );
}

#[test]
fn unicast_out_of_a_trunk_is_tagged() {
    let mut engine = topology();
    engine.process_frame(&frame(4, "B", "A", Some(10)));
    let f = frame(0, "A", "B", None);
    let action = engine.process_frame(&f);
    let expected = engine.expected_decisions(&f, &action);

    assert_eq!(action.dest_port, Some(4));
    assert!(expected[4].send);
    assert!(expected[4].tag);
}

#[test]
fn discard_expects_no_ports_at_all() {
    let mut engine = topology();
    let f = frame(4, "A", "B", None);
    let action = engine.process_frame(&f);
    let expected = engine.expected_decisions(&f, &action);
    assert!(expected.iter().all(|d| !d.send && !d.tag));
}

#[test]
fn mac_entry_requirement_tracks_the_table() {
    let mut engine = topology();
    let f = frame(0, "A", "B", None);
    assert!(engine.is_mac_entry_required(&f));
    engine.process_frame(&f);
    assert!(!engine.is_mac_entry_required(&f));

    // A frame the switch would drop never needs a table entry.
    assert!(!engine.is_mac_entry_required(&frame(4, "Q", "B", None)));
}

#[test]
fn available_vlans_are_deduplicated_and_sorted() {
    let engine = topology();
    assert_eq!(engine.available_vlans(), vec![10, 20]);
    assert_eq!(engine.ports()[5].available_vlans(), vec![20, 10]);
    assert!(engine.ports()[4].is_trunk());
    assert!(engine.ports()[0].is_access());
    assert!(!engine.ports()[5].is_trunk());
}
