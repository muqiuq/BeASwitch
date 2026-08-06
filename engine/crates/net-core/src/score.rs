//! Scoring and exam goals, shared by all three exercises.
//!
//! Ported from `BeAToolsLibrary/Goal.cs` and `BeASwitch/UserScore.cs`.

use core::fmt;

pub const POINTS_PER_CORRECT: i32 = 50;
pub const POINTS_PER_WRONG: i32 = 25;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct UserScore {
    pub score: i32,
    pub correct: u32,
    pub wrong: u32,
}

impl UserScore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn total(&self) -> u32 {
        self.correct + self.wrong
    }

    pub fn add_correct(&mut self) {
        self.score += POINTS_PER_CORRECT;
        self.correct += 1;
    }

    pub fn add_wrong(&mut self) {
        self.score = (self.score - POINTS_PER_WRONG).max(0);
        self.wrong += 1;
    }

    pub fn reset(&mut self) {
        *self = Self::default();
    }

    /// Percentage of correct answers, rounded to two decimals.
    pub fn percent_correct(&self) -> f64 {
        if self.total() == 0 {
            return 0.0;
        }
        (f64::from(self.correct) / f64::from(self.total()) * 10_000.0).round() / 100.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Goal {
    pub total_attempts: u32,
    pub correct_attempts: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GoalStatus {
    InProgress,
    Reached,
    Failed,
}

impl Goal {
    pub fn new(total_attempts: u32, correct_attempts: u32) -> Option<Self> {
        if correct_attempts > total_attempts || total_attempts == 0 {
            return None;
        }
        Some(Self {
            total_attempts,
            correct_attempts,
        })
    }

    /// Parses the `correct/total` form used by the original launcher.
    pub fn parse(input: &str) -> Option<Self> {
        let (correct, total) = input.split_once('/')?;
        Self::new(total.trim().parse().ok()?, correct.trim().parse().ok()?)
    }

    pub fn is_reached(&self, correct: u32, total: u32) -> bool {
        correct >= self.correct_attempts && total == self.total_attempts
    }

    pub fn can_be_reached(&self, correct: u32, total: u32) -> bool {
        total.saturating_sub(correct) <= self.total_attempts - self.correct_attempts
    }

    pub fn status(&self, correct: u32, total: u32) -> GoalStatus {
        if !self.can_be_reached(correct, total) {
            GoalStatus::Failed
        } else if self.is_reached(correct, total) {
            GoalStatus::Reached
        } else {
            GoalStatus::InProgress
        }
    }

    pub fn attempts_remaining(&self, total: u32) -> u32 {
        self.total_attempts.saturating_sub(total)
    }
}

impl fmt::Display for Goal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}/{}", self.correct_attempts, self.total_attempts)
    }
}

#[cfg(test)]
mod tests {
    use super::{Goal, GoalStatus, UserScore};

    #[test]
    fn score_never_goes_negative() {
        let mut score = UserScore::new();
        score.add_wrong();
        assert_eq!(score.score, 0);
        score.add_wrong();
        assert_eq!(score.score, 0);
        assert_eq!(score.wrong, 2);
    }

    #[test]
    fn score_accumulates() {
        let mut score = UserScore::new();
        score.add_correct();
        score.add_correct();
        assert_eq!(score.score, 100);
        score.add_wrong();
        assert_eq!(score.score, 75);
        assert_eq!(score.total(), 3);
        assert_eq!(score.percent_correct(), 66.67);
    }

    #[test]
    fn empty_score_reports_zero_percent() {
        assert_eq!(UserScore::new().percent_correct(), 0.0);
    }

    #[test]
    fn goal_parses_correct_over_total() {
        let goal = Goal::parse("39/40").unwrap();
        assert_eq!(goal.correct_attempts, 39);
        assert_eq!(goal.total_attempts, 40);
        assert_eq!(goal.to_string(), "39/40");
    }

    #[test]
    fn goal_rejects_impossible_input() {
        assert!(Goal::parse("41/40").is_none());
        assert!(Goal::parse("40").is_none());
        assert!(Goal::parse("a/b").is_none());
        assert!(Goal::new(0, 0).is_none());
    }

    #[test]
    fn goal_is_reached_only_on_the_final_attempt() {
        let goal = Goal::new(10, 8).unwrap();
        assert!(!goal.is_reached(8, 9));
        assert!(goal.is_reached(8, 10));
        assert!(goal.is_reached(10, 10));
    }

    #[test]
    fn goal_fails_once_too_many_are_wrong() {
        let goal = Goal::new(10, 8).unwrap();
        assert_eq!(goal.status(2, 2), GoalStatus::InProgress);
        assert_eq!(goal.status(1, 3), GoalStatus::InProgress);
        assert_eq!(goal.status(1, 4), GoalStatus::Failed);
        assert_eq!(goal.status(8, 10), GoalStatus::Reached);
    }
}
