//! Round orchestration for BeASwitch.
//!
//! Ported from `BeASwitch/GameEngine.cs` and the state machine in
//! `BeASwitch/MainWindow.xaml.cs`.

use crate::engine::{
    EthernetFrame, Host, PortDecision, SwitchAction, SwitchEngine, VlanId,
};
use net_core::score::{Goal, GoalStatus, UserScore};
use net_core::Rng;
use std::collections::BTreeMap;

pub const DEFAULT_PORT_COUNT: usize = 6;
pub const DEFAULT_HOST_COUNT: usize = 12;
pub const DEFAULT_VLAN: VlanId = 1;

pub const PAYLOADS: [&str; 5] = [
    "Hey",
    "Ping",
    "The cake is a lie",
    "Ups",
    "Please work faster",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameState {
    AwaitingStart,
    AwaitingAnswer,
    ShowingSolution,
    Finished,
}

#[derive(Debug, Clone, Copy)]
pub struct GameConfig {
    pub port_count: usize,
    pub host_count: usize,
    pub use_vlan: bool,
    pub exam_mode: bool,
    pub goal: Option<Goal>,
    pub seed: u64,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            port_count: DEFAULT_PORT_COUNT,
            host_count: DEFAULT_HOST_COUNT,
            use_vlan: true,
            exam_mode: false,
            goal: None,
            seed: 0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PortAnswer {
    pub port: usize,
    pub send: bool,
    pub tag: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Answer {
    pub entry_required: bool,
    pub entry_mac: Option<String>,
    pub entry_port: Option<usize>,
    pub ports: Vec<PortAnswer>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PortVerdict {
    pub port: usize,
    pub expected_send: bool,
    pub expected_tag: bool,
    pub given_send: bool,
    pub given_tag: bool,
}

impl PortVerdict {
    pub fn is_correct(&self) -> bool {
        self.expected_send == self.given_send && self.expected_tag == self.given_tag
    }
}

#[derive(Debug, Clone)]
pub struct RoundResult {
    pub correct: bool,
    pub action: SwitchAction,
    pub entry_required_expected: bool,
    pub entry_required_correct: bool,
    pub expected_mac: String,
    pub expected_port: usize,
    pub mac_correct: Option<bool>,
    pub port_correct: Option<bool>,
    pub ports: Vec<PortVerdict>,
    pub score: UserScore,
    pub goal_status: Option<GoalStatus>,
}

#[derive(Debug, Clone)]
pub struct Game {
    config: GameConfig,
    engine: SwitchEngine,
    hosts: Vec<Host>,
    rng: Rng,
    state: GameState,
    current_frame: Option<EthernetFrame>,
    entry_required: bool,
    score: UserScore,
    last_result: Option<RoundResult>,
}

impl Game {
    pub fn new(config: GameConfig) -> Self {
        let mut rng = Rng::new(config.seed);
        let mut engine = SwitchEngine::new(config.port_count);

        if config.use_vlan {
            engine.randomize_vlans(&mut rng);
        } else {
            for port in engine.ports_mut() {
                port.untagged.clear();
                port.tagged.clear();
                port.untagged.push(DEFAULT_VLAN);
            }
        }

        let hosts = populate_hosts(&engine, config.host_count, &mut rng);

        Self {
            config,
            engine,
            hosts,
            rng,
            state: GameState::AwaitingStart,
            current_frame: None,
            entry_required: false,
            score: UserScore::new(),
            last_result: None,
        }
    }

    pub fn config(&self) -> &GameConfig {
        &self.config
    }

    pub fn engine(&self) -> &SwitchEngine {
        &self.engine
    }

    pub fn hosts(&self) -> &[Host] {
        &self.hosts
    }

    pub fn state(&self) -> GameState {
        self.state
    }

    pub fn score(&self) -> UserScore {
        self.score
    }

    pub fn current_frame(&self) -> Option<&EthernetFrame> {
        self.current_frame.as_ref()
    }

    pub fn last_result(&self) -> Option<&RoundResult> {
        self.last_result.as_ref()
    }

    pub fn mac_tables(&self) -> &BTreeMap<VlanId, crate::engine::MacTable> {
        self.engine.mac_tables()
    }

    /// Deals the next frame. Returns `None` once an exam has finished.
    pub fn next_round(&mut self) -> Option<&EthernetFrame> {
        if self.state == GameState::Finished {
            return None;
        }
        let frame = self.random_frame()?;
        self.entry_required = self.engine.is_mac_entry_required(&frame);
        self.current_frame = Some(frame);
        self.last_result = None;
        self.state = GameState::AwaitingAnswer;
        self.current_frame.as_ref()
    }

    /// Scores the student's answer and advances the MAC tables by one frame.
    pub fn submit(&mut self, answer: &Answer) -> Option<&RoundResult> {
        if self.state != GameState::AwaitingAnswer {
            return None;
        }
        let frame = self.current_frame.clone()?;

        let entry_required_expected = self.entry_required;
        let entry_required_correct = answer.entry_required == entry_required_expected;

        let expected_mac = frame.source_label.clone();
        let expected_port = frame.source_port;

        let (mac_correct, port_correct) = if entry_required_expected && answer.entry_required {
            (
                Some(answer.entry_mac.as_deref() == Some(expected_mac.as_str())),
                Some(answer.entry_port == Some(expected_port)),
            )
        } else {
            (None, None)
        };

        let action = self.engine.process_frame(&frame);
        let expected = self.engine.expected_decisions(&frame, &action);

        let given: BTreeMap<usize, PortAnswer> =
            answer.ports.iter().map(|p| (p.port, *p)).collect();

        let ports: Vec<PortVerdict> = expected
            .iter()
            .map(|decision: &PortDecision| {
                let given = given.get(&decision.port);
                PortVerdict {
                    port: decision.port,
                    expected_send: decision.send,
                    expected_tag: decision.tag,
                    given_send: given.is_some_and(|g| g.send),
                    given_tag: given.is_some_and(|g| g.tag),
                }
            })
            .collect();

        let correct = entry_required_correct
            && mac_correct.unwrap_or(true)
            && port_correct.unwrap_or(true)
            && ports.iter().all(PortVerdict::is_correct);

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
            action,
            entry_required_expected,
            entry_required_correct,
            expected_mac,
            expected_port,
            mac_correct,
            port_correct,
            ports,
            score: self.score,
            goal_status,
        });
        self.last_result.as_ref()
    }

    pub fn restart(&mut self) {
        self.engine.clear_mac_tables();
        self.score.reset();
        self.current_frame = None;
        self.last_result = None;
        self.state = GameState::AwaitingStart;
    }

    fn random_frame(&mut self) -> Option<EthernetFrame> {
        // Only VLANs with at least two stations can produce traffic.
        let mut by_vlan: BTreeMap<VlanId, Vec<usize>> = BTreeMap::new();
        for (index, host) in self.hosts.iter().enumerate() {
            by_vlan.entry(host.vlan).or_default().push(index);
        }
        let candidates: Vec<usize> = by_vlan
            .values()
            .filter(|hosts| hosts.len() >= 2)
            .flat_map(|hosts| hosts.iter().copied())
            .collect();

        let source_index = *self.rng.choose(&candidates)?;
        let source = self.hosts[source_index].clone();

        let peers: Vec<usize> = by_vlan
            .get(&source.vlan)?
            .iter()
            .copied()
            .filter(|index| *index != source_index)
            .collect();
        let dest_index = *self.rng.choose(&peers)?;
        let dest = &self.hosts[dest_index];

        let source_port = self.engine.port(source.port)?;
        let vlan_tag = if source_port.is_vlan_tagged(source.vlan) {
            Some(source.vlan)
        } else {
            None
        };

        let payload = self
            .rng
            .choose(&PAYLOADS)
            .copied()
            .unwrap_or(PAYLOADS[0])
            .to_owned();

        Some(EthernetFrame {
            source_label: source.label.clone(),
            source_port: source.port,
            source_vlan: source.vlan,
            dest_label: dest.label.clone(),
            vlan_tag,
            payload,
        })
    }
}

/// Spreads hosts over the (port, VLAN) combinations, guaranteeing that every
/// VLAN in play has at least two stations on different ports.
fn populate_hosts(engine: &SwitchEngine, host_count: usize, rng: &mut Rng) -> Vec<Host> {
    let mut slots_by_vlan: BTreeMap<VlanId, Vec<usize>> = BTreeMap::new();
    for port in engine.ports() {
        for vlan in port.available_vlans() {
            slots_by_vlan.entry(vlan).or_default().push(port.number);
        }
    }
    slots_by_vlan.retain(|_, ports| ports.len() >= 2);
    if slots_by_vlan.is_empty() {
        return Vec::new();
    }

    for ports in slots_by_vlan.values_mut() {
        rng.shuffle(ports);
    }

    let mut placements: Vec<(usize, VlanId)> = Vec::new();
    for (vlan, ports) in &slots_by_vlan {
        for port in ports.iter().take(2) {
            placements.push((*port, *vlan));
        }
    }

    let mut extras: Vec<(usize, VlanId)> = slots_by_vlan
        .iter()
        .flat_map(|(vlan, ports)| ports.iter().skip(2).map(move |port| (*port, *vlan)))
        .collect();
    rng.shuffle(&mut extras);

    let mut cycle = 0usize;
    while placements.len() < host_count {
        if !extras.is_empty() && placements.len() < host_count {
            placements.push(extras.remove(0));
            continue;
        }
        // Reuse existing slots so busy ports carry several stations.
        let all: Vec<(usize, VlanId)> = slots_by_vlan
            .iter()
            .flat_map(|(vlan, ports)| ports.iter().map(move |port| (*port, *vlan)))
            .collect();
        if all.is_empty() {
            break;
        }
        placements.push(all[cycle % all.len()]);
        cycle += 1;
    }
    placements.truncate(host_count);
    rng.shuffle(&mut placements);

    placements
        .into_iter()
        .enumerate()
        .map(|(index, (port, vlan))| Host {
            label: host_label(index),
            vlan,
            port,
        })
        .collect()
}

/// `A`..`Z`, then `AA`, `AB`, ... for larger host counts.
fn host_label(index: usize) -> String {
    let mut label = String::new();
    let mut n = index;
    loop {
        label.insert(0, (b'A' + (n % 26) as u8) as char);
        if n < 26 {
            break;
        }
        n = n / 26 - 1;
    }
    label
}

/// Human readable form of a forwarding decision, as shown in the result banner.
pub fn describe_action(frame: &EthernetFrame, action: &SwitchAction) -> String {
    let dest = match action.dest_port {
        Some(port) => format!(" to {port}"),
        None => String::new(),
    };
    format!(
        "({} => {}) (VLAN {}) {}{}",
        frame.source_label,
        frame.dest_label,
        action.vlan,
        action.kind.as_str(),
        dest
    )
}
