//! wasm-bindgen surface for the IPv4/IPv6 quiz.

use crate::dto::{goal_dto, goal_status_str, to_js, GoalDto, ScoreDto, SessionOptions};
use quiz_engine::question::{Category, InputType, Question};
use quiz_engine::quiz::{Quiz, QuizOptions, QuizState};
use serde::Serialize;
use wasm_bindgen::prelude::*;

/// The question as the UI sees it. The expected answer is deliberately absent.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct QuestionDto {
    kind: &'static str,
    category: &'static str,
    input_type: &'static str,
    subject: String,
    subject2: String,
    response_hint: String,
    response_template: String,
    options: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultDto {
    correct: bool,
    expected: String,
    given: String,
    goal_status: Option<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotDto {
    state: &'static str,
    exam_mode: bool,
    ipv4: bool,
    ipv6: bool,
    question: Option<QuestionDto>,
    score: ScoreDto,
    goal: Option<GoalDto>,
    result: Option<ResultDto>,
}

#[wasm_bindgen]
pub struct QuizSession {
    quiz: Quiz,
}

#[wasm_bindgen]
impl QuizSession {
    #[wasm_bindgen(constructor)]
    pub fn new(options: JsValue) -> Result<QuizSession, JsValue> {
        let options: SessionOptions =
            serde_wasm_bindgen::from_value(options).map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(Self {
            quiz: Quiz::new(QuizOptions {
                ipv4: options.ipv4,
                ipv6: options.ipv6,
                exam_mode: options.exam_mode,
                goal: options.goal(),
                seed: options.seed_u64(),
            }),
        })
    }

    pub fn snapshot(&self) -> Result<JsValue, JsValue> {
        to_js(&self.build_snapshot())
    }

    #[wasm_bindgen(js_name = nextQuestion)]
    pub fn next_question(&mut self) -> Result<JsValue, JsValue> {
        self.quiz.next_question();
        self.snapshot()
    }

    pub fn submit(&mut self, response: &str) -> Result<JsValue, JsValue> {
        self.quiz.submit(response);
        self.snapshot()
    }

    pub fn restart(&mut self) -> Result<JsValue, JsValue> {
        self.quiz.restart();
        self.snapshot()
    }

    fn build_snapshot(&self) -> SnapshotDto {
        SnapshotDto {
            state: match self.quiz.state() {
                QuizState::AwaitingAnswer => "awaitingAnswer",
                QuizState::ShowingSolution => "showingSolution",
                QuizState::Finished => "finished",
            },
            exam_mode: self.quiz.options().exam_mode,
            ipv4: self.quiz.options().ipv4,
            ipv6: self.quiz.options().ipv6,
            question: self.quiz.current().map(question_dto),
            score: self.quiz.score().into(),
            goal: goal_dto(self.quiz.options().goal, self.quiz.score().total()),
            result: self.quiz.last_result().map(|result| ResultDto {
                correct: result.correct,
                expected: result.expected.clone(),
                given: result.given.clone(),
                goal_status: goal_status_str(result.goal_status),
            }),
        }
    }
}

fn question_dto(question: &Question) -> QuestionDto {
    QuestionDto {
        kind: question.kind.as_str(),
        category: question.category.as_str(),
        input_type: match question.input_type {
            InputType::Text => "text",
            InputType::SingleChoice => "singleChoice",
        },
        subject: question.subject.clone(),
        subject2: question.subject2.clone(),
        response_hint: question.response_hint.clone(),
        response_template: question.response_template.clone(),
        options: question.options.clone(),
    }
}

/// The keys the UI needs to translate IPv6 prefix purposes.
#[wasm_bindgen(js_name = ipv6PrefixPurposes)]
pub fn ipv6_prefix_purposes() -> Vec<String> {
    quiz_engine::types::IPV6_PREFIXES
        .iter()
        .map(|(_, purpose)| (*purpose).to_owned())
        .collect()
}

/// Every question kind, so the UI can render category filters and help pages.
#[wasm_bindgen(js_name = questionKinds)]
pub fn question_kinds() -> Vec<String> {
    quiz_engine::types::REGISTRY
        .iter()
        .map(|registration| {
            let category = match registration.category {
                Category::IPv4 => "ipv4",
                Category::IPv6 => "ipv6",
            };
            format!("{}:{}", category, registration.kind.as_str())
        })
        .collect()
}
