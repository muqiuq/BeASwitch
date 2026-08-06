//! Quiz session: weighted question selection, scoring and goal tracking.
//!
//! Ported from `BeARouter/DoAQuiz/QuestionRandomizer.cs`, `QuizOptions.cs` and
//! `DoAQuizWindow.xaml.cs`.

use crate::question::{Category, Question, QuestionKind};
use crate::types::REGISTRY;
use net_core::score::{Goal, GoalStatus, UserScore};
use net_core::Rng;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuizState {
    AwaitingAnswer,
    ShowingSolution,
    Finished,
}

#[derive(Debug, Clone, Copy)]
pub struct QuizOptions {
    pub ipv4: bool,
    pub ipv6: bool,
    pub exam_mode: bool,
    pub goal: Option<Goal>,
    pub seed: u64,
}

impl Default for QuizOptions {
    fn default() -> Self {
        Self {
            ipv4: true,
            ipv6: true,
            exam_mode: false,
            goal: None,
            seed: 0,
        }
    }
}

impl QuizOptions {
    pub fn is_category_active(&self, category: Category) -> bool {
        match category {
            Category::IPv4 => self.ipv4,
            Category::IPv6 => self.ipv6,
        }
    }

    pub fn has_any_category(&self) -> bool {
        self.ipv4 || self.ipv6
    }
}

#[derive(Debug, Clone)]
pub struct QuizResult {
    pub correct: bool,
    pub expected: String,
    pub given: String,
    pub score: UserScore,
    pub goal_status: Option<GoalStatus>,
}

#[derive(Debug, Clone)]
pub struct Quiz {
    options: QuizOptions,
    rng: Rng,
    state: QuizState,
    current: Option<Question>,
    previous_kind: Option<QuestionKind>,
    score: UserScore,
    last_result: Option<QuizResult>,
}

impl Quiz {
    pub fn new(options: QuizOptions) -> Self {
        Self {
            options,
            rng: Rng::new(options.seed),
            state: QuizState::AwaitingAnswer,
            current: None,
            previous_kind: None,
            score: UserScore::new(),
            last_result: None,
        }
    }

    pub fn options(&self) -> &QuizOptions {
        &self.options
    }

    pub fn state(&self) -> QuizState {
        self.state
    }

    pub fn score(&self) -> UserScore {
        self.score
    }

    pub fn current(&self) -> Option<&Question> {
        self.current.as_ref()
    }

    pub fn last_result(&self) -> Option<&QuizResult> {
        self.last_result.as_ref()
    }

    /// Draws the next question, avoiding an immediate repeat of the same type.
    pub fn next_question(&mut self) -> Option<&Question> {
        if self.state == QuizState::Finished || !self.options.has_any_category() {
            return None;
        }

        let pool: Vec<&'static crate::types::Registration> = REGISTRY
            .iter()
            .filter(|r| self.options.is_category_active(r.category))
            .collect();
        if pool.is_empty() {
            return None;
        }

        let mut weighted: Vec<&'static crate::types::Registration> = Vec::new();
        for registration in &pool {
            for _ in 0..registration.frequency.max(1) {
                weighted.push(registration);
            }
        }

        // Only avoid a repeat when there is something else to pick.
        let distinct_kinds = pool.len();
        let mut chosen = weighted[self.rng.below(weighted.len() as u64) as usize];
        if distinct_kinds > 1 {
            let mut attempts = 0;
            while Some(chosen.kind) == self.previous_kind && attempts < 16 {
                chosen = weighted[self.rng.below(weighted.len() as u64) as usize];
                attempts += 1;
            }
        }

        self.previous_kind = Some(chosen.kind);
        self.current = Some((chosen.generate)(&mut self.rng));
        self.last_result = None;
        self.state = QuizState::AwaitingAnswer;
        self.current.as_ref()
    }

    pub fn submit(&mut self, response: &str) -> Option<&QuizResult> {
        if self.state != QuizState::AwaitingAnswer {
            return None;
        }
        let question = self.current.as_ref()?;
        let correct = question.evaluate(response);
        let expected = question.answer.clone();

        if correct {
            self.score.add_correct();
        } else {
            self.score.add_wrong();
        }

        let goal_status = self
            .options
            .goal
            .map(|goal| goal.status(self.score.correct, self.score.total()));

        if self.options.exam_mode
            && matches!(goal_status, Some(GoalStatus::Reached) | Some(GoalStatus::Failed))
        {
            self.state = QuizState::Finished;
        } else {
            self.state = QuizState::ShowingSolution;
        }

        self.last_result = Some(QuizResult {
            correct,
            expected,
            given: response.trim().to_owned(),
            score: self.score,
            goal_status,
        });
        self.last_result.as_ref()
    }

    pub fn restart(&mut self) {
        self.rng = Rng::new(self.options.seed);
        self.score.reset();
        self.current = None;
        self.previous_kind = None;
        self.last_result = None;
        self.state = QuizState::AwaitingAnswer;
    }

    pub fn set_options(&mut self, options: QuizOptions) {
        self.options = options;
    }
}
