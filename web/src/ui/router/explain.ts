import { t } from '../../i18n/index.js';
import { el } from '../shared/dom.js';
import type { RouterSnapshot } from '../../engine/types.js';

/**
 * The Explain panel: shows the masking step for every row so the
 * longest-prefix-match rule becomes visible rather than magical.
 */
export function explainPanel(snapshot: RouterSnapshot, onClose: () => void): HTMLElement {
  const result = snapshot.result;
  const packet = snapshot.packet;
  if (!result || !packet) {
    return el('div', { class: 'explain' });
  }

  const body = el('tbody');
  const winner = result.chosenRouteIndex;

  for (const row of result.explanation) {
    const route = snapshot.routes[row.routeIndex];
    const isWinner = row.routeIndex === winner;

    body.append(
      el(
        'tr',
        {
          class: `${row.matches ? 'is-match' : 'is-nomatch'} ${isWinner ? 'is-winner' : ''}`,
        },
        el('td', { class: 'mono', text: route?.target ?? '—' }),
        el('td', { class: 'mono', text: `${row.dottedMask} (/${row.mask})` }),
        el('td', { class: 'mono', text: row.calculatedNetwork }),
        el('td', { class: 'mono', text: row.routeNetwork }),
        el('td', { text: t(`router.outcome.${row.outcome}`) }),
      ),
    );
  }

  const winnerRow = result.explanation.find((row) => row.routeIndex === winner);

  return el(
    'div',
    { class: 'explain', role: 'dialog', 'aria-modal': 'false' },
    el(
      'div',
      { class: 'explain-head' },
      el('h2', { class: 'panel-title', text: t('router.explainTitle') }),
      closeButton(onClose),
    ),
    el('p', { class: 'hint', text: t('router.explainIntro', { ip: packet.destIp }) }),
    el(
      'table',
      { class: 'explain-table' },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          el('th', { text: t('router.explainColRoute') }),
          el('th', { text: t('router.explainColMask') }),
          el('th', { text: t('router.explainColCalculated') }),
          el('th', { text: t('router.explainColNetwork') }),
          el('th', { text: t('router.explainColResult') }),
        ),
      ),
      body,
    ),
    el('p', {
      class: 'explain-verdict',
      text: winnerRow
        ? t('router.explainWinner', { mask: winnerRow.mask })
        : t('router.explainNoWinner'),
    }),
  );
}

function closeButton(onClose: () => void): HTMLButtonElement {
  const button = el('button', { type: 'button', class: 'btn btn-ghost', text: t('common.close') });
  button.addEventListener('click', onClose);
  return button;
}
