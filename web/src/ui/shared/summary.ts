import { t } from '../../i18n/index.js';
import { el } from './dom.js';
import type { GoalInfo, GoalStatus, Score } from '../../engine/types.js';

export interface SummaryOptions {
  score: Score;
  goal: GoalInfo | null;
  status: GoalStatus | null;
  onRetry: () => void;
  onExit: () => void;
}

/** Replaces the certificate window of the desktop app. */
export function summaryView(options: SummaryOptions): HTMLElement {
  const { score, goal, status } = options;
  const passed = status === 'reached';
  const failed = status === 'failed';

  const heading = passed
    ? t('summary.passed')
    : failed
      ? t('summary.failed')
      : t('summary.practiceEnded');

  return el(
    'div',
    { class: 'summary', role: 'status' },
    el(
      'div',
      { class: `summary-card ${passed ? 'is-passed' : failed ? 'is-failed' : ''}` },
      el('p', { class: 'summary-eyebrow', text: t('summary.title') }),
      el('h2', { class: 'summary-heading', text: heading }),
      el('p', {
        class: 'summary-line',
        text: t('summary.correctOf', { correct: score.correct, total: score.total }),
      }),
      el('p', {
        class: 'summary-line',
        text: t('summary.percent', { percent: score.percentCorrect }),
      }),
      el('p', { class: 'summary-points', text: t('summary.points', { score: score.score }) }),
      goal
        ? el('p', {
            class: 'summary-goal',
            text: `${t('home.goal')}: ${goal.correctAttempts} ${t('home.goalOf')} ${goal.totalAttempts}`,
          })
        : null,
      el(
        'div',
        { class: 'summary-actions' },
        button(t('summary.tryAgain'), 'primary', options.onRetry),
        button(t('summary.backToMenu'), 'ghost', options.onExit),
      ),
    ),
  );
}

function button(label: string, variant: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', { type: 'button', class: `btn btn-${variant}`, text: label });
  node.addEventListener('click', onClick);
  return node;
}
