/**
 * Colour mode picker.
 *
 * Every card carries its own `data-theme`, so the palette cascades into it and
 * the card is painted in the mode it offers — the preview is the real thing
 * rather than a drawing of it.
 */

import { el, mount } from '../shared/dom.js';
import { activeSettings, persistSettings } from '../shared/config.js';
import { THEMES, THEME_LABELS, applyTheme, type ThemeId } from '../shared/theme.js';

/** The tokens a swatch shows off, in order. */
const SWATCH_TOKENS = ['--surface', '--accent', '--success', '--warning', '--danger'];

export function colourModes(): HTMLElement {
  const root = el('div', { class: 'theme-grid' });

  function render(): void {
    const current = activeSettings().theme;
    mount(root, ...THEMES.map((id) => themeCard(id, id === current)));
  }

  function themeCard(id: ThemeId, active: boolean): HTMLElement {
    const card = el(
      'button',
      {
        type: 'button',
        class: `theme-card ${active ? 'is-active' : ''}`,
        'data-theme': id,
        'aria-pressed': String(active),
      },
      el('span', { class: 'theme-preview' }, ...SWATCH_TOKENS.map(swatch)),
      el('span', { class: 'theme-name', text: THEME_LABELS[id] }),
    );

    card.addEventListener('click', () => {
      const settings = activeSettings();
      applyTheme(id);
      // No scope: no link can set the colour mode, so nothing is taken over.
      persistSettings({ ...settings, theme: id });
      render();
    });
    return card;
  }

  function swatch(token: string): HTMLElement {
    return el('span', { class: 'theme-swatch', style: `background: var(${token})` });
  }

  render();
  return root;
}
