/**
 * Motion and text size: the two controls that belong on every page, because
 * both are about the room the app is being shown in rather than the exercise.
 * The language picker stays on the menu, where there is space for it.
 *
 * Self-contained — it re-renders only itself when a button is used. Neither
 * setting needs the surrounding view to redraw: motion is read afresh by each
 * animation, and the text size is carried entirely by CSS.
 */

import { t } from '../../i18n/index.js';
import { el, mount } from './dom.js';
import { motionIcon, textSizeIcon } from './icons.js';
import { activeSettings, persistSettings } from './config.js';
import { applyTextScale, nextScale, scaleLevel } from './textSize.js';
import type { Settings } from './storage.js';

export function displayControls(): HTMLElement {
  const group = el('div', { class: 'lang-switch' });

  function render(): void {
    const settings = activeSettings();
    mount(group, motionButton(settings), textSizeButton(settings));
  }

  function motionButton(settings: Settings): HTMLButtonElement {
    const active = !settings.reducedMotion;
    const button = el(
      'button',
      {
        type: 'button',
        class: `lang-button icon-button ${active ? 'is-active' : ''}`,
        'aria-pressed': String(active),
        'aria-label': t('home.motion'),
        title: `${t('home.motion')} — ${t('home.reducedMotionHint')}`,
      },
      motionIcon(),
    );
    button.addEventListener('click', () => {
      persistSettings({ ...settings, reducedMotion: !settings.reducedMotion }, 'motion');
      render();
    });
    return button;
  }

  /** Cycles through the text sizes; the largest is meant for a projector. */
  function textSizeButton(settings: Settings): HTMLButtonElement {
    const level = scaleLevel(settings.textScale);
    const label = `${t('home.textSize')}: ${t(`home.textSize.${level}`)}`;
    const button = el(
      'button',
      {
        type: 'button',
        // One class per step, so the button shows which of the three it is on.
        class: `lang-button icon-button text-size text-size-${level}`,
        'aria-label': label,
        title: `${label} — ${t('home.textSizeHint')}`,
      },
      textSizeIcon(),
    );
    button.addEventListener('click', () => {
      const textScale = nextScale(settings.textScale);
      applyTextScale(textScale);
      // No scope: no link can set the text size, so nothing is being taken over.
      persistSettings({ ...settings, textScale });
      render();
    });
    return button;
  }

  render();
  return group;
}
