import { QuizSession, defaultOptions } from '../../engine/index.js';
import type { QuizQuestion, QuizSnapshot } from '../../engine/types.js';
import { t } from '../../i18n/index.js';
import { el, mount } from '../shared/dom.js';
import { fadeIn, pulse, shake } from '../shared/animate.js';
import { scoreBar } from '../shared/scoreBar.js';
import { summaryView } from '../shared/summary.js';
import { recordPassedExam, saveProgress } from '../shared/storage.js';
import { activeSettings } from '../shared/config.js';

export function quizView(onExit: (() => void) | null): HTMLElement {
  const settings = activeSettings().quiz;
  const root = el('section', { class: 'exercise exercise-quiz' });

  let session = new QuizSession(
    defaultOptions({
      examMode: settings.examMode,
      goalTotal: settings.examMode ? settings.goalTotal : 0,
      goalCorrect: settings.examMode ? settings.goalCorrect : 0,
      ipv4: settings.ipv4,
      ipv6: settings.ipv6,
    }),
  );

  let snapshot: QuizSnapshot = session.nextQuestion();
  let response = snapshot.question?.responseTemplate ?? '';
  let choice = '';

  function render(): void {
    if (snapshot.state === 'finished') {
      mount(
        root,
        summaryView({
          score: snapshot.score,
          goal: snapshot.goal,
          status: snapshot.result?.goalStatus ?? null,
          onRetry: restart,
          onExit,
        }),
      );
      return;
    }

    mount(
      root,
      header(),
      scoreBar(snapshot.score, snapshot.goal),
      el('div', { class: 'quiz-layout' }, questionCard()),
    );

    focusInput();
  }

  function header(): HTMLElement {
    return el(
      'header',
      { class: 'exercise-header' },
      el('h1', { class: 'exercise-title', text: t('quiz.title') }),
      backButton(),
    );
  }

  /** Absent when a link limits the app to this exercise. */
  function backButton(): HTMLElement | null {
    if (!onExit) return null;
    const back = el('button', { type: 'button', class: 'btn btn-ghost', text: t('app.backToMenu') });
    back.addEventListener('click', onExit);
    return back;
  }

  function questionCard(): HTMLElement {
    const question = snapshot.question;
    if (!question) {
      return el('p', { class: 'muted', text: t('home.categoryWarning') });
    }

    const card = el(
      'div',
      { class: 'quiz-card' },
      el('span', {
        class: `chip chip-${question.category}`,
        text: t(`quiz.category.${question.category}`),
      }),
      el('h2', { class: 'quiz-question', text: promptFor(question) }),
    );

    card.append(
      question.inputType === 'text' ? textInput(question) : choiceInput(question),
    );

    if (snapshot.state === 'showingSolution' && snapshot.result) {
      const result = snapshot.result;
      const box = el(
        'div',
        { class: `result ${result.correct ? 'is-correct' : 'is-wrong'}`, role: 'status' },
        el('strong', { text: result.correct ? t('quiz.correct') : t('quiz.wrong') }),
      );
      if (!result.correct) {
        box.append(el('p', { class: 'mono', text: `${t('common.expected')}: ${result.expected}` }));
        if (result.given) {
          box.append(
            el('p', { class: 'mono muted', text: `${t('common.youAnswered')}: ${result.given}` }),
          );
        }
      }
      card.append(box);
      queueMicrotask(() => void (result.correct ? pulse(box) : shake(box)));
    }

    card.append(actions());
    queueMicrotask(() => void fadeIn(card));
    return card;
  }

  function promptFor(question: QuizQuestion): string {
    // The IPv6 prefix question carries its direction in subject2.
    const key =
      question.kind === 'ipv6Prefix' ? `question.${question.subject2}` : `question.${question.kind}`;
    const subject =
      question.kind === 'ipv6Prefix' && question.subject2 === 'purposeToPrefix'
        ? t(`prefix.${question.subject}`)
        : question.subject;
    return t(key, { subject, subject2: question.subject2 });
  }

  function optionLabel(question: QuizQuestion, option: string): string {
    return question.kind === 'ipv6Prefix' && question.subject2 === 'prefixToPurpose'
      ? t(`prefix.${option}`)
      : option;
  }

  function textInput(question: QuizQuestion): HTMLElement {
    const disabled = snapshot.state !== 'awaitingAnswer';
    const input = el('input', {
      type: 'text',
      class: 'input input-answer mono',
      value: response,
      placeholder: question.responseHint,
      disabled,
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': t('quiz.answer'),
    });

    input.addEventListener('input', () => {
      response = input.value;
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        snapshot.state === 'awaitingAnswer' ? check() : next();
      }
    });

    const wrapper = el(
      'label',
      { class: 'labelled' },
      el('span', { text: t('quiz.answer') }),
      input,
    );

    if (question.responseHint) {
      wrapper.append(el('span', { class: 'hint', text: `${t('quiz.hint')}: ${question.responseHint}` }));
    }
    return wrapper;
  }

  function choiceInput(question: QuizQuestion): HTMLElement {
    const disabled = snapshot.state !== 'awaitingAnswer';
    const group = el('div', { class: 'choice-group', role: 'radiogroup' });

    for (const option of question.options) {
      const input = el('input', {
        type: 'radio',
        name: 'quiz-choice',
        value: option,
        checked: choice === option,
        disabled,
      });
      input.addEventListener('change', () => {
        choice = option;
        response = option;
      });

      const isExpected =
        snapshot.state === 'showingSolution' && snapshot.result?.expected === option;
      const isWrongPick =
        snapshot.state === 'showingSolution' && choice === option && !snapshot.result?.correct;

      group.append(
        el(
          'label',
          {
            class: `choice ${isExpected ? 'is-expected' : ''} ${isWrongPick ? 'is-wrong' : ''}`,
          },
          input,
          el('span', { class: 'mono', text: optionLabel(question, option) }),
        ),
      );
    }
    return group;
  }

  function actions(): HTMLElement {
    const row = el('div', { class: 'actions' });
    row.append(
      snapshot.state === 'awaitingAnswer'
        ? primary(t('quiz.submit'), check)
        : primary(t('quiz.next'), next),
    );

    const restartBtn = el('button', {
      type: 'button',
      class: 'btn btn-ghost',
      text: t('common.restart'),
    });
    restartBtn.addEventListener('click', restart);
    row.append(restartBtn);
    return row;
  }

  function primary(label: string, handler: () => void): HTMLButtonElement {
    const button = el('button', { type: 'button', class: 'btn btn-primary', text: label });
    button.addEventListener('click', handler);
    return button;
  }

  function check(): void {
    snapshot = session.submit(response);
    saveProgress({
      exercise: 'quiz',
      correct: snapshot.score.correct,
      total: snapshot.score.total,
      score: snapshot.score.score,
      updatedAt: Date.now(),
    });
    if (snapshot.result?.goalStatus === 'reached' && snapshot.goal) {
      recordPassedExam({
        exercise: 'quiz',
        correct: snapshot.score.correct,
        total: snapshot.score.total,
        score: snapshot.score.score,
        goalCorrect: snapshot.goal.correctAttempts,
        goalTotal: snapshot.goal.totalAttempts,
        completedAt: Date.now(),
      });
    }
    render();
  }

  function next(): void {
    snapshot = session.nextQuestion();
    response = snapshot.question?.responseTemplate ?? '';
    choice = '';
    render();
  }

  function restart(): void {
    session.dispose();
    const current = activeSettings().quiz;
    session = new QuizSession(
      defaultOptions({
        examMode: current.examMode,
        goalTotal: current.examMode ? current.goalTotal : 0,
        goalCorrect: current.examMode ? current.goalCorrect : 0,
        ipv4: current.ipv4,
        ipv6: current.ipv6,
      }),
    );
    snapshot = session.nextQuestion();
    response = snapshot.question?.responseTemplate ?? '';
    choice = '';
    render();
  }

  function focusInput(): void {
    if (snapshot.state !== 'awaitingAnswer') return;
    const input = root.querySelector<HTMLInputElement>('.input-answer');
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }

  render();
  return root;
}
