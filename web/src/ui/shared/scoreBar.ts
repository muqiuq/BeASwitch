import { t } from '../../i18n/index.js';
import { el } from './dom.js';
import type { GoalInfo, Score } from '../../engine/types.js';

/** The persistent status strip shown above every exercise. */
export function scoreBar(score: Score, goal: GoalInfo | null): HTMLElement {
  const items = [
    stat(t('common.score'), `${score.score}`),
    stat(t('common.correct'), `${score.correct}`),
    stat(t('common.wrong'), `${score.wrong}`),
  ];

  if (goal) {
    items.push(
      stat(
        t('common.attempt'),
        `${score.total} ${t('common.of')} ${goal.totalAttempts}`,
      ),
      stat(t('home.goal'), `${goal.correctAttempts} ${t('home.goalOf')} ${goal.totalAttempts}`),
    );
  }

  const bar = el('div', { class: 'score-bar' }, ...items);

  if (goal && goal.totalAttempts > 0) {
    const ratio = Math.min(1, score.total / goal.totalAttempts);
    bar.append(
      el(
        'div',
        { class: 'score-progress', role: 'presentation' },
        el('div', { class: 'score-progress-fill', style: `--progress: ${ratio}` }),
      ),
    );
  }

  return bar;
}

function stat(label: string, value: string): HTMLElement {
  return el(
    'div',
    { class: 'stat' },
    el('span', { class: 'stat-label', text: label }),
    el('span', { class: 'stat-value', text: value }),
  );
}
