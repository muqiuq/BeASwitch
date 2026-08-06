//! Quiz session flow: selection weighting, category filters, scoring, goals.

use net_core::score::{Goal, GoalStatus};
use quiz_engine::question::{Category, QuestionKind};
use quiz_engine::quiz::{Quiz, QuizOptions, QuizState};

fn quiz(seed: u64) -> Quiz {
    Quiz::new(QuizOptions {
        seed,
        ..QuizOptions::default()
    })
}

#[test]
fn a_session_serves_questions_from_both_categories() {
    let mut quiz = quiz(1);
    let mut seen_ipv4 = false;
    let mut seen_ipv6 = false;

    for _ in 0..200 {
        let question = quiz.next_question().expect("a question");
        match question.category {
            Category::IPv4 => seen_ipv4 = true,
            Category::IPv6 => seen_ipv6 = true,
        }
        let answer = question.answer.clone();
        quiz.submit(&answer);
    }
    assert!(seen_ipv4 && seen_ipv6);
}

#[test]
fn every_question_kind_eventually_appears() {
    let mut quiz = quiz(2);
    let mut seen: Vec<QuestionKind> = Vec::new();
    for _ in 0..2000 {
        let question = quiz.next_question().expect("a question");
        if !seen.contains(&question.kind) {
            seen.push(question.kind);
        }
        let answer = question.answer.clone();
        quiz.submit(&answer);
    }
    assert_eq!(seen.len(), 12, "only saw {seen:?}");
}

#[test]
fn split_subnet_questions_really_are_twice_as_likely() {
    let mut quiz = quiz(3);
    let mut splits = 0;
    let mut netmask = 0;
    const ROUNDS: usize = 6000;

    for _ in 0..ROUNDS {
        let question = quiz.next_question().expect("a question");
        match question.kind {
            QuestionKind::SplitSubnetSecond | QuestionKind::SplitSubnetThird => splits += 1,
            QuestionKind::NetworkAddress => netmask += 1,
            _ => {}
        }
        let answer = question.answer.clone();
        quiz.submit(&answer);
    }

    // Two types at weight 2 against one type at weight 1.
    let ratio = splits as f64 / netmask as f64;
    assert!(
        (3.0..5.0).contains(&ratio),
        "expected roughly 4x, got {ratio:.2} ({splits} vs {netmask})"
    );
}

#[test]
fn the_same_kind_is_not_asked_twice_in_a_row() {
    let mut quiz = quiz(4);
    let mut previous = None;
    let mut repeats = 0;

    for _ in 0..1000 {
        let kind = quiz.next_question().expect("a question").kind;
        if Some(kind) == previous {
            repeats += 1;
        }
        previous = Some(kind);
        let answer = quiz.current().unwrap().answer.clone();
        quiz.submit(&answer);
    }
    assert_eq!(repeats, 0);
}

#[test]
fn disabling_ipv6_leaves_only_ipv4_questions() {
    let mut quiz = Quiz::new(QuizOptions {
        seed: 5,
        ipv6: false,
        ..QuizOptions::default()
    });
    for _ in 0..300 {
        let question = quiz.next_question().expect("a question");
        assert_eq!(question.category, Category::IPv4);
        let answer = question.answer.clone();
        quiz.submit(&answer);
    }
}

#[test]
fn disabling_ipv4_leaves_only_ipv6_questions() {
    let mut quiz = Quiz::new(QuizOptions {
        seed: 6,
        ipv4: false,
        ..QuizOptions::default()
    });
    for _ in 0..300 {
        let question = quiz.next_question().expect("a question");
        assert_eq!(question.category, Category::IPv6);
        let answer = question.answer.clone();
        quiz.submit(&answer);
    }
}

#[test]
fn disabling_everything_yields_no_questions() {
    let mut quiz = Quiz::new(QuizOptions {
        seed: 7,
        ipv4: false,
        ipv6: false,
        ..QuizOptions::default()
    });
    assert!(quiz.next_question().is_none());
}

#[test]
fn correct_answers_score_and_wrong_ones_do_not() {
    let mut quiz = quiz(8);
    quiz.next_question();
    let answer = quiz.current().unwrap().answer.clone();
    let result = quiz.submit(&answer).expect("a result");
    assert!(result.correct);
    assert_eq!(result.expected, answer);
    assert_eq!(quiz.score().score, 50);

    quiz.next_question();
    let result = quiz.submit("nonsense").expect("a result");
    assert!(!result.correct);
    assert_eq!(result.given, "nonsense");
    assert_eq!(quiz.score().score, 25);
    assert_eq!(quiz.score().total(), 2);
}

#[test]
fn state_machine_rejects_out_of_order_calls() {
    let mut quiz = quiz(9);
    assert!(quiz.submit("x").is_none(), "nothing has been asked yet");

    quiz.next_question();
    assert_eq!(quiz.state(), QuizState::AwaitingAnswer);
    quiz.submit("x");
    assert_eq!(quiz.state(), QuizState::ShowingSolution);
    assert!(quiz.submit("x").is_none(), "cannot answer twice");
}

#[test]
fn exam_mode_finishes_when_the_goal_is_reached() {
    let mut quiz = Quiz::new(QuizOptions {
        seed: 10,
        exam_mode: true,
        goal: Goal::new(5, 4),
        ..QuizOptions::default()
    });

    for _ in 0..5 {
        quiz.next_question().expect("a question");
        let answer = quiz.current().unwrap().answer.clone();
        quiz.submit(&answer);
    }

    assert_eq!(quiz.state(), QuizState::Finished);
    assert_eq!(quiz.last_result().unwrap().goal_status, Some(GoalStatus::Reached));
    assert!(quiz.next_question().is_none());
}

#[test]
fn exam_mode_fails_early_once_the_goal_is_unreachable() {
    let mut quiz = Quiz::new(QuizOptions {
        seed: 11,
        exam_mode: true,
        goal: Goal::new(5, 5),
        ..QuizOptions::default()
    });

    quiz.next_question().expect("a question");
    let result = quiz.submit("wrong").expect("a result");
    assert!(!result.correct);
    assert_eq!(result.goal_status, Some(GoalStatus::Failed));
    assert_eq!(quiz.state(), QuizState::Finished);
}

#[test]
fn restart_clears_the_score() {
    let mut quiz = quiz(12);
    for _ in 0..3 {
        quiz.next_question();
        quiz.submit("wrong");
    }
    assert_eq!(quiz.score().total(), 3);

    quiz.restart();
    assert_eq!(quiz.score().total(), 0);
    assert!(quiz.current().is_none());
    assert_eq!(quiz.state(), QuizState::AwaitingAnswer);
}

#[test]
fn the_same_seed_replays_identically() {
    let mut a = quiz(42);
    let mut b = quiz(42);
    for _ in 0..50 {
        assert_eq!(a.next_question(), b.next_question());
        let answer = a.current().unwrap().answer.clone();
        a.submit(&answer);
        b.submit(&answer);
    }
    assert_eq!(a.score(), b.score());
}
