//! IPv4/IPv6 quiz: question generation, evaluation and session state.

pub mod question;
pub mod quiz;
pub mod types;

pub use question::{Category, InputType, Matcher, Question, QuestionKind};
pub use quiz::{Quiz, QuizOptions, QuizResult, QuizState};
pub use types::{Registration, IPV6_PREFIXES, REGISTRY};
