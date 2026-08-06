//! Serialisable views of engine state.
//!
//! These deliberately never carry an expected answer until the round has been
//! submitted, so the solution cannot be read out of the JS heap beforehand.

use net_core::score::{Goal, GoalStatus, UserScore};
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsValue;

/// Serialises `None` as `null` rather than `undefined`, so the values match the
/// `T | null` shapes declared in `web/src/engine/types.ts`.
pub fn to_js<T: Serialize>(value: &T) -> Result<JsValue, JsValue> {
    let serializer = serde_wasm_bindgen::Serializer::new().serialize_missing_as_null(true);
    value
        .serialize(&serializer)
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreDto {
    pub score: i32,
    pub correct: u32,
    pub wrong: u32,
    pub total: u32,
    pub percent_correct: f64,
}

impl From<UserScore> for ScoreDto {
    fn from(score: UserScore) -> Self {
        Self {
            score: score.score,
            correct: score.correct,
            wrong: score.wrong,
            total: score.total(),
            percent_correct: score.percent_correct(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalDto {
    pub total_attempts: u32,
    pub correct_attempts: u32,
    pub remaining: u32,
}

pub fn goal_dto(goal: Option<Goal>, total: u32) -> Option<GoalDto> {
    goal.map(|goal| GoalDto {
        total_attempts: goal.total_attempts,
        correct_attempts: goal.correct_attempts,
        remaining: goal.attempts_remaining(total),
    })
}

pub fn goal_status_str(status: Option<GoalStatus>) -> Option<&'static str> {
    status.map(|status| match status {
        GoalStatus::InProgress => "inProgress",
        GoalStatus::Reached => "reached",
        GoalStatus::Failed => "failed",
    })
}

/// Shared shape of the options the launcher sends for every exercise.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SessionOptions {
    pub seed: f64,
    pub exam_mode: bool,
    pub goal_total: u32,
    pub goal_correct: u32,
    pub use_vlan: bool,
    pub ipv4: bool,
    pub ipv6: bool,
    pub port_count: usize,
    pub interface_count: usize,
}

impl Default for SessionOptions {
    fn default() -> Self {
        Self {
            seed: 0.0,
            exam_mode: false,
            goal_total: 0,
            goal_correct: 0,
            use_vlan: true,
            ipv4: true,
            ipv6: true,
            port_count: 6,
            interface_count: 5,
        }
    }
}

impl SessionOptions {
    pub fn seed_u64(&self) -> u64 {
        // JS numbers arrive as f64; take the bit pattern so any value seeds well.
        self.seed.to_bits()
    }

    pub fn goal(&self) -> Option<Goal> {
        if self.goal_total == 0 {
            None
        } else {
            Goal::new(self.goal_total, self.goal_correct)
        }
    }
}
