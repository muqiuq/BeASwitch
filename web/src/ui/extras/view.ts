/**
 * The extra features window: a full-size modal holding tools that support the
 * exercises without being part of them.
 *
 * `<dialog>` is used rather than a hand-rolled overlay because it brings the
 * focus trap, the inert background and the Escape key with it.
 */

import { t } from '../../i18n/index.js';
import { el, mount } from '../shared/dom.js';
import { fadeIn } from '../shared/animate.js';
import { linkBuilder } from './linkBuilder.js';

interface ExtraFeature {
  id: string;
  /** Read at render time so the window follows a language change. */
  title: () => string;
  description: () => string;
  render: () => HTMLElement;
}

const FEATURES: ExtraFeature[] = [
  {
    id: 'link',
    title: () => t('extras.link.title'),
    description: () => t('extras.link.description'),
    render: linkBuilder,
  },
];

export function openExtras(): void {
  const dialog = el('dialog', { class: 'extras', 'aria-label': t('extras.title') });
  const content = el('div', { class: 'extras-content' });
  let active = FEATURES[0]!;

  function selectFeature(feature: ExtraFeature): void {
    active = feature;
    renderNav();
    mount(
      content,
      el(
        'div',
        { class: 'extras-feature' },
        el('h3', { class: 'extras-feature-title', text: feature.title() }),
        el('p', { class: 'extras-feature-description', text: feature.description() }),
        feature.render(),
      ),
    );
    void fadeIn(content);
  }

  const nav = el('nav', { class: 'extras-nav', 'aria-label': t('extras.title') });

  function renderNav(): void {
    mount(
      nav,
      ...FEATURES.map((feature) => {
        const button = el('button', {
          type: 'button',
          class: `extras-nav-item ${feature === active ? 'is-active' : ''}`,
          text: feature.title(),
          'aria-current': feature === active ? 'true' : 'false',
        });
        button.addEventListener('click', () => selectFeature(feature));
        return button;
      }),
    );
  }

  const close = el('button', {
    type: 'button',
    class: 'btn btn-ghost btn-sm',
    text: t('common.close'),
  });
  close.addEventListener('click', () => dialog.close());

  dialog.append(
    el(
      'div',
      { class: 'extras-shell' },
      el(
        'header',
        { class: 'extras-header' },
        el(
          'div',
          {},
          el('h2', { class: 'extras-title', text: t('extras.title') }),
          el('p', { class: 'extras-subtitle', text: t('extras.subtitle') }),
        ),
        close,
      ),
      el('div', { class: 'extras-body' }, nav, content),
    ),
  );

  // Clicking outside the shell: the dialog itself only shows through the gap
  // around it, so a hit on it is a hit on the backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());

  document.body.append(dialog);
  selectFeature(active);
  dialog.showModal();
}
