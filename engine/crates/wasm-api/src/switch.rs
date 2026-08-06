//! wasm-bindgen surface for BeASwitch.

use crate::dto::{goal_dto, goal_status_str, to_js, GoalDto, ScoreDto, SessionOptions};
use serde::{Deserialize, Serialize};
use switch_engine::engine::SwitchActionType;
use switch_engine::game::{Answer, Game, GameConfig, GameState, PortAnswer};
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PortDto {
    number: usize,
    untagged: Vec<u16>,
    tagged: Vec<u16>,
    role: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HostDto {
    label: String,
    vlan: u16,
    port: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FrameDto {
    source_label: String,
    source_port: usize,
    source_vlan: u16,
    dest_label: String,
    vlan_tag: Option<u16>,
    payload: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MacTableDto {
    vlan: u16,
    entries: Vec<MacEntryDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MacEntryDto {
    mac: String,
    port: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PortVerdictDto {
    port: usize,
    expected_send: bool,
    expected_tag: bool,
    given_send: bool,
    given_tag: bool,
    correct: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultDto {
    correct: bool,
    action: &'static str,
    vlan: u16,
    dest_port: Option<usize>,
    entry_required_expected: bool,
    entry_required_correct: bool,
    expected_mac: String,
    expected_port: usize,
    mac_correct: Option<bool>,
    port_correct: Option<bool>,
    ports: Vec<PortVerdictDto>,
    goal_status: Option<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotDto {
    state: &'static str,
    use_vlan: bool,
    exam_mode: bool,
    ports: Vec<PortDto>,
    hosts: Vec<HostDto>,
    vlans: Vec<u16>,
    frame: Option<FrameDto>,
    mac_tables: Vec<MacTableDto>,
    score: ScoreDto,
    goal: Option<GoalDto>,
    result: Option<ResultDto>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AnswerDto {
    entry_required: bool,
    entry_mac: Option<String>,
    entry_port: Option<usize>,
    ports: Vec<PortAnswerDto>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PortAnswerDto {
    port: usize,
    send: bool,
    tag: bool,
}

#[wasm_bindgen]
pub struct SwitchGame {
    game: Game,
}

#[wasm_bindgen]
impl SwitchGame {
    #[wasm_bindgen(constructor)]
    pub fn new(options: JsValue) -> Result<SwitchGame, JsValue> {
        let options: SessionOptions =
            serde_wasm_bindgen::from_value(options).map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(Self {
            game: Game::new(GameConfig {
                port_count: options.port_count.clamp(2, 12),
                host_count: 12,
                use_vlan: options.use_vlan,
                exam_mode: options.exam_mode,
                goal: options.goal(),
                seed: options.seed_u64(),
            }),
        })
    }

    /// The full view of the board. Never contains the pending solution.
    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        to_js(&self.build_snapshot())
    }

    #[wasm_bindgen(js_name = nextRound)]
    pub fn next_round(&mut self) -> Result<JsValue, JsValue> {
        self.game.next_round();
        self.snapshot()
    }

    pub fn submit(&mut self, answer: JsValue) -> Result<JsValue, JsValue> {
        let answer: AnswerDto =
            serde_wasm_bindgen::from_value(answer).map_err(|e| JsValue::from_str(&e.to_string()))?;
        self.game.submit(&Answer {
            entry_required: answer.entry_required,
            entry_mac: answer.entry_mac,
            entry_port: answer.entry_port,
            ports: answer
                .ports
                .into_iter()
                .map(|p| PortAnswer {
                    port: p.port,
                    send: p.send,
                    tag: p.tag,
                })
                .collect(),
        });
        self.snapshot()
    }

    pub fn restart(&mut self) -> Result<JsValue, JsValue> {
        self.game.restart();
        self.snapshot()
    }

    fn build_snapshot(&self) -> SnapshotDto {
        let engine = self.game.engine();

        SnapshotDto {
            state: match self.game.state() {
                GameState::AwaitingStart => "awaitingStart",
                GameState::AwaitingAnswer => "awaitingAnswer",
                GameState::ShowingSolution => "showingSolution",
                GameState::Finished => "finished",
            },
            use_vlan: self.game.config().use_vlan,
            exam_mode: self.game.config().exam_mode,
            ports: engine
                .ports()
                .iter()
                .map(|port| PortDto {
                    number: port.number,
                    untagged: port.untagged.clone(),
                    tagged: port.tagged.clone(),
                    role: if port.is_trunk() {
                        "trunk"
                    } else if port.is_access() {
                        "access"
                    } else {
                        "hybrid"
                    },
                })
                .collect(),
            hosts: self
                .game
                .hosts()
                .iter()
                .map(|host| HostDto {
                    label: host.label.clone(),
                    vlan: host.vlan,
                    port: host.port,
                })
                .collect(),
            vlans: engine.available_vlans(),
            frame: self.game.current_frame().map(|frame| FrameDto {
                source_label: frame.source_label.clone(),
                source_port: frame.source_port,
                source_vlan: frame.source_vlan,
                dest_label: frame.dest_label.clone(),
                vlan_tag: frame.vlan_tag,
                payload: frame.payload.clone(),
            }),
            mac_tables: engine
                .mac_tables()
                .iter()
                .map(|(vlan, table)| MacTableDto {
                    vlan: *vlan,
                    entries: table
                        .iter()
                        .map(|(mac, port)| MacEntryDto {
                            mac: mac.clone(),
                            port: *port,
                        })
                        .collect(),
                })
                .collect(),
            score: self.game.score().into(),
            goal: goal_dto(self.game.config().goal, self.game.score().total()),
            result: self.game.last_result().map(|result| ResultDto {
                correct: result.correct,
                action: match result.action.kind {
                    SwitchActionType::Discard => "discard",
                    SwitchActionType::Broadcast => "broadcast",
                    SwitchActionType::Unicast => "unicast",
                },
                vlan: result.action.vlan,
                dest_port: result.action.dest_port,
                entry_required_expected: result.entry_required_expected,
                entry_required_correct: result.entry_required_correct,
                expected_mac: result.expected_mac.clone(),
                expected_port: result.expected_port,
                mac_correct: result.mac_correct,
                port_correct: result.port_correct,
                ports: result
                    .ports
                    .iter()
                    .map(|verdict| PortVerdictDto {
                        port: verdict.port,
                        expected_send: verdict.expected_send,
                        expected_tag: verdict.expected_tag,
                        given_send: verdict.given_send,
                        given_tag: verdict.given_tag,
                        correct: verdict.is_correct(),
                    })
                    .collect(),
                goal_status: goal_status_str(result.goal_status),
            }),
        }
    }
}
