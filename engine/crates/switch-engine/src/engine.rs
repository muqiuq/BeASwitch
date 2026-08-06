//! Layer-2 forwarding simulation.
//!
//! Ported from `BeASwitch/SwitchEngine.cs`, `MacTable.cs`, `SwitchPort.cs`,
//! `EthernetFrame.cs` and `SwitchAction.cs`.

use net_core::Rng;
use std::collections::BTreeMap;

pub type VlanId = u16;

/// VLAN membership of a single switch port.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SwitchPort {
    pub number: usize,
    pub untagged: Vec<VlanId>,
    pub tagged: Vec<VlanId>,
}

impl SwitchPort {
    pub fn new(number: usize) -> Self {
        Self {
            number,
            untagged: Vec::new(),
            tagged: Vec::new(),
        }
    }

    pub fn is_vlan_tagged(&self, vlan: VlanId) -> bool {
        self.tagged.contains(&vlan)
    }

    pub fn is_member(&self, vlan: VlanId) -> bool {
        self.tagged.contains(&vlan) || self.untagged.contains(&vlan)
    }

    /// Tagged first, then untagged, deduplicated — matches `GetAvaiableVlans`.
    pub fn available_vlans(&self) -> Vec<VlanId> {
        let mut vlans = Vec::new();
        for vlan in self.tagged.iter().chain(self.untagged.iter()) {
            if !vlans.contains(vlan) {
                vlans.push(*vlan);
            }
        }
        vlans
    }

    /// A trunk carries only tagged VLANs.
    pub fn is_trunk(&self) -> bool {
        self.untagged.is_empty() && !self.tagged.is_empty()
    }

    pub fn is_access(&self) -> bool {
        self.tagged.is_empty() && !self.untagged.is_empty()
    }
}

/// A station attached to a port. The original uses single letters (`A`..`L`)
/// instead of real MAC addresses to keep the table readable for students.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Host {
    pub label: String,
    pub vlan: VlanId,
    pub port: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EthernetFrame {
    pub source_label: String,
    pub source_port: usize,
    pub source_vlan: VlanId,
    pub dest_label: String,
    pub vlan_tag: Option<VlanId>,
    pub payload: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SwitchActionType {
    Discard,
    Broadcast,
    Unicast,
}

impl SwitchActionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SwitchActionType::Discard => "DISCARD",
            SwitchActionType::Broadcast => "BROADCAST",
            SwitchActionType::Unicast => "UNICAST",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SwitchAction {
    pub kind: SwitchActionType,
    pub vlan: VlanId,
    pub dest_port: Option<usize>,
}

/// Per-VLAN MAC address table.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct MacTable {
    entries: BTreeMap<String, usize>,
}

impl MacTable {
    pub fn contains(&self, mac: &str) -> bool {
        self.entries.contains_key(mac)
    }

    pub fn get(&self, mac: &str) -> Option<usize> {
        self.entries.get(mac).copied()
    }

    pub fn learn(&mut self, mac: &str, port: usize) -> bool {
        self.entries.insert(mac.to_owned(), port) != Some(port)
    }

    pub fn iter(&self) -> impl Iterator<Item = (&String, &usize)> {
        self.entries.iter()
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

/// Whether a port should receive a frame for a VLAN, and whether it must be tagged.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PortDecision {
    pub port: usize,
    pub send: bool,
    pub tag: bool,
}

#[derive(Debug, Clone)]
pub struct SwitchEngine {
    ports: Vec<SwitchPort>,
    mac_tables: BTreeMap<VlanId, MacTable>,
}

impl SwitchEngine {
    pub fn new(port_count: usize) -> Self {
        Self {
            ports: (0..port_count).map(SwitchPort::new).collect(),
            mac_tables: BTreeMap::new(),
        }
    }

    pub fn ports(&self) -> &[SwitchPort] {
        &self.ports
    }

    pub fn ports_mut(&mut self) -> &mut [SwitchPort] {
        &mut self.ports
    }

    pub fn port(&self, number: usize) -> Option<&SwitchPort> {
        self.ports.get(number)
    }

    pub fn port_count(&self) -> usize {
        self.ports.len()
    }

    pub fn mac_tables(&self) -> &BTreeMap<VlanId, MacTable> {
        &self.mac_tables
    }

    pub fn clear_mac_tables(&mut self) {
        self.mac_tables.clear();
    }

    /// Every VLAN configured anywhere on the switch.
    pub fn available_vlans(&self) -> Vec<VlanId> {
        let mut vlans: Vec<VlanId> = Vec::new();
        for port in &self.ports {
            for vlan in port.available_vlans() {
                if !vlans.contains(&vlan) {
                    vlans.push(vlan);
                }
            }
        }
        vlans.sort_unstable();
        vlans
    }

    /// Resolves the VLAN a frame belongs to, or `None` when the ingress port
    /// does not carry it and the frame must be dropped.
    fn resolve_vlan(&self, frame: &EthernetFrame) -> Option<VlanId> {
        let port = self.ports.get(frame.source_port)?;
        match frame.vlan_tag {
            None => port.untagged.first().copied(),
            Some(tag) => {
                if port.tagged.contains(&tag) {
                    Some(tag)
                } else {
                    None
                }
            }
        }
    }

    /// True when the source MAC is not yet in the table for the frame's VLAN.
    pub fn is_mac_entry_required(&self, frame: &EthernetFrame) -> bool {
        let Some(vlan) = self.resolve_vlan(frame) else {
            return false;
        };
        match self.mac_tables.get(&vlan) {
            None => true,
            Some(table) => !table.contains(&frame.source_label),
        }
    }

    /// Learns the source MAC and decides how to forward the frame.
    pub fn process_frame(&mut self, frame: &EthernetFrame) -> SwitchAction {
        let Some(vlan) = self.resolve_vlan(frame) else {
            return SwitchAction {
                kind: SwitchActionType::Discard,
                vlan: 0,
                dest_port: None,
            };
        };

        let table = self.mac_tables.entry(vlan).or_default();
        table.learn(&frame.source_label, frame.source_port);

        match table.get(&frame.dest_label) {
            // A switch never sends a frame back out the port it arrived on.
            Some(dest_port) if dest_port == frame.source_port => SwitchAction {
                kind: SwitchActionType::Discard,
                vlan,
                dest_port: None,
            },
            Some(dest_port) => SwitchAction {
                kind: SwitchActionType::Unicast,
                vlan,
                dest_port: Some(dest_port),
            },
            None => SwitchAction {
                kind: SwitchActionType::Broadcast,
                vlan,
                dest_port: None,
            },
        }
    }

    /// Send/tag decision for every port on a VLAN, ignoring the ingress port.
    pub fn tag_and_send_decisions(&self, vlan: VlanId) -> Vec<PortDecision> {
        self.ports
            .iter()
            .map(|port| {
                if port.untagged.contains(&vlan) {
                    PortDecision {
                        port: port.number,
                        send: true,
                        tag: false,
                    }
                } else if port.tagged.contains(&vlan) {
                    PortDecision {
                        port: port.number,
                        send: true,
                        tag: true,
                    }
                } else {
                    PortDecision {
                        port: port.number,
                        send: false,
                        tag: false,
                    }
                }
            })
            .collect()
    }

    /// The expected answer: which ports the student must tick for send and tag.
    pub fn expected_decisions(
        &self,
        frame: &EthernetFrame,
        action: &SwitchAction,
    ) -> Vec<PortDecision> {
        let mut expected: Vec<PortDecision> = self
            .ports
            .iter()
            .map(|port| PortDecision {
                port: port.number,
                send: false,
                tag: false,
            })
            .collect();

        match action.kind {
            SwitchActionType::Discard => {}
            SwitchActionType::Broadcast => {
                for decision in self.tag_and_send_decisions(action.vlan) {
                    if decision.port == frame.source_port {
                        continue;
                    }
                    expected[decision.port] = decision;
                }
            }
            SwitchActionType::Unicast => {
                if let Some(dest) = action.dest_port {
                    let tag = self
                        .ports
                        .get(dest)
                        .is_some_and(|port| port.is_vlan_tagged(action.vlan));
                    expected[dest] = PortDecision {
                        port: dest,
                        send: true,
                        tag,
                    };
                }
            }
        }
        expected
    }

    /// Assigns VLANs across the ports: access ports, one trunk and one hybrid
    /// port. Mirrors the shape produced by `GameEngine.RandomizeSwitchPortsVlan`.
    pub fn randomize_vlans(&mut self, rng: &mut Rng) {
        let port_count = self.ports.len();
        if port_count == 0 {
            return;
        }

        let vlan_count = port_count.saturating_sub(3).max(1);
        let vlans: Vec<VlanId> = (0..vlan_count)
            .map(|i| {
                let base = (i * 3) as i64 + 1;
                (rng.range(base, base + 3) * 10) as VlanId
            })
            .collect();

        let mut order: Vec<usize> = (0..port_count).collect();
        rng.shuffle(&mut order);

        for port in self.ports.iter_mut() {
            port.untagged.clear();
            port.tagged.clear();
        }

        // Reserve the last two slots for the trunk and the hybrid port.
        let access_slots = port_count.saturating_sub(2);
        for (slot, &port_index) in order.iter().take(access_slots).enumerate() {
            self.ports[port_index]
                .untagged
                .push(vlans[slot % vlans.len()]);
        }

        if port_count >= 2 {
            let trunk = order[port_count - 2];
            self.ports[trunk].tagged = vlans.clone();
        }
        if port_count >= 1 {
            let hybrid = order[port_count - 1];
            self.ports[hybrid].untagged.push(vlans[0]);
            for vlan in vlans.iter().skip(1).take(2) {
                self.ports[hybrid].tagged.push(*vlan);
            }
        }
    }
}
