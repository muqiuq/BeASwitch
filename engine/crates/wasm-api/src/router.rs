//! wasm-bindgen surface for BeARouter.

use crate::dto::{goal_dto, goal_status_str, to_js, GoalDto, ScoreDto, SessionOptions};
use router_engine::game::{Game, GameConfig, GameState};
use router_engine::routing::{MatchOutcome, RouteMatch};
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InterfaceDto {
    number: usize,
    name: String,
    address: String,
    network: String,
    mask: u8,
    cidr: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RouteDto {
    index: usize,
    target: String,
    network: String,
    mask: u8,
    /// Only for directly attached routes. For a gateway route this is the
    /// answer, so it stays in wasm until the round has been scored.
    port: Option<usize>,
    gateway: Option<String>,
    src: Option<String>,
    on_link: bool,
    is_default: bool,
    display: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PacketDto {
    source_mac: String,
    dest_mac: String,
    source_ip: String,
    dest_ip: String,
}

/// One row of the Explain view.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MatchDto {
    route_index: usize,
    outcome: &'static str,
    matches: bool,
    mask: u8,
    dotted_mask: String,
    calculated_network: String,
    route_network: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultDto {
    correct: bool,
    expected_port: Option<usize>,
    chosen_route_index: Option<usize>,
    selected_ports: Vec<usize>,
    explanation: Vec<MatchDto>,
    goal_status: Option<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotDto {
    state: &'static str,
    exam_mode: bool,
    interfaces: Vec<InterfaceDto>,
    routes: Vec<RouteDto>,
    packet: Option<PacketDto>,
    score: ScoreDto,
    goal: Option<GoalDto>,
    result: Option<ResultDto>,
}

#[wasm_bindgen]
pub struct RouterGame {
    game: Game,
}

#[wasm_bindgen]
impl RouterGame {
    #[wasm_bindgen(constructor)]
    pub fn new(options: JsValue) -> Result<RouterGame, JsValue> {
        let options: SessionOptions =
            serde_wasm_bindgen::from_value(options).map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(Self {
            game: Game::new(GameConfig {
                interface_count: options.interface_count.clamp(2, 8),
                route_count: 4,
                exam_mode: options.exam_mode,
                goal: options.goal(),
                seed: options.seed_u64(),
            }),
        })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        to_js(&self.build_snapshot())
    }

    #[wasm_bindgen(js_name = nextPacket)]
    pub fn next_packet(&mut self) -> Result<JsValue, JsValue> {
        self.game.next_packet();
        self.snapshot()
    }

    pub fn submit(&mut self, selected_ports: Vec<usize>) -> Result<JsValue, JsValue> {
        self.game.submit(&selected_ports);
        self.snapshot()
    }

    pub fn restart(&mut self) -> Result<JsValue, JsValue> {
        self.game.restart();
        self.snapshot()
    }

    fn build_snapshot(&self) -> SnapshotDto {
        SnapshotDto {
            state: match self.game.state() {
                GameState::AwaitingStart => "awaitingStart",
                GameState::AwaitingAnswer => "awaitingAnswer",
                GameState::ShowingSolution => "showingSolution",
                GameState::Finished => "finished",
            },
            exam_mode: self.game.config().exam_mode,
            interfaces: self
                .game
                .ports()
                .iter()
                .map(|port| {
                    let address = port.first_address().expect("every interface has an address");
                    InterfaceDto {
                        number: port.number,
                        name: port.name.clone(),
                        address: address.address.to_string(),
                        network: address.network_address().to_string(),
                        mask: address.mask,
                        cidr: address.to_string(),
                    }
                })
                .collect(),
            routes: self
                .game
                .routing_table()
                .routes()
                .iter()
                .enumerate()
                .map(|(index, route)| RouteDto {
                    index,
                    target: route.subnet.to_string(),
                    network: route.subnet.network_address().to_string(),
                    mask: route.subnet.mask,
                    port: route.on_link().then_some(route.port),
                    gateway: route.gateway.map(|g| g.to_string()),
                    src: route.src.map(|s| s.to_string()),
                    on_link: route.on_link(),
                    is_default: route.is_default_route(),
                    display: route.to_string().trim_end().to_owned(),
                })
                .collect(),
            packet: self.game.current_packet().map(|packet| PacketDto {
                source_mac: packet.source_mac.to_string(),
                dest_mac: packet.dest_mac.to_string(),
                source_ip: packet.source_ip.to_string(),
                dest_ip: packet.dest_ip.to_string(),
            }),
            score: self.game.score().into(),
            goal: goal_dto(self.game.config().goal, self.game.score().total()),
            result: self.game.last_result().map(|result| ResultDto {
                correct: result.correct,
                expected_port: result.expected_port,
                chosen_route_index: result.chosen.as_ref().map(|m| m.route_index),
                selected_ports: result.selected_ports.clone(),
                explanation: result.explanation.iter().map(match_dto).collect(),
                goal_status: goal_status_str(result.goal_status),
            }),
        }
    }
}

fn match_dto(m: &RouteMatch) -> MatchDto {
    MatchDto {
        route_index: m.route_index,
        outcome: match m.outcome {
            MatchOutcome::Match => "match",
            MatchOutcome::NetworkMismatch => "networkMismatch",
            MatchOutcome::TargetIsNetworkAddress => "targetIsNetworkAddress",
            MatchOutcome::TargetIsBroadcast => "targetIsBroadcast",
        },
        matches: m.is_match(),
        mask: m.route.subnet.mask,
        dotted_mask: net_core::v4::mask_to_dotted(m.route.subnet.mask)
            .map(|a| a.to_string())
            .unwrap_or_default(),
        calculated_network: m.calculated_network.to_string(),
        route_network: m.route_network.to_string(),
    }
}
