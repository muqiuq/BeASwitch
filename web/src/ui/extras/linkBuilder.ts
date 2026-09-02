/**
 * Builds a shareable link that opens the toolkit with a chosen configuration:
 * which exercises are offered, whether the menu is skipped, whether the options
 * can still be changed, and the options themselves.
 *
 * The form seeds itself from the configuration this page is running under, so
 * opening the builder from an already configured link shows that link back.
 */

import { LOCALES, LOCALE_LABELS, locale, t, type Locale } from '../../i18n/index.js';
import { el, mount } from '../shared/dom.js';
import { checkbox, numberInput, radio } from '../shared/controls.js';
import {
  activeSettings,
  buildUrl,
  optionsLocked,
  singleExercise,
  urlConfig,
  visibleExercises,
  type UrlConfig,
} from '../shared/config.js';
import {
  DEFAULT_SETTINGS,
  EXERCISES,
  type ExerciseId,
  type ExerciseSettings,
  type Settings,
} from '../shared/storage.js';

export function linkBuilder(): HTMLElement {
  const root = el('div', { class: 'link-builder' });

  let tools = new Set<ExerciseId>(visibleExercises());
  let startDirectly = singleExercise() !== null;
  let lock = optionsLocked();
  let language: Locale | null = urlConfig()?.locale ?? null;
  let forceReducedMotion = urlConfig()?.reducedMotion === true;
  let settings: Settings = activeSettings();
  let copyStatus = '';

  function selected(): ExerciseId[] {
    return EXERCISES.filter((id) => tools.has(id));
  }

  function config(): UrlConfig {
    const list = selected();
    return {
      tools: list,
      only: startDirectly && list.length === 1 ? list[0]! : null,
      lock,
      locale: language,
      reducedMotion: forceReducedMotion ? true : null,
      settings: Object.fromEntries(list.map((id) => [id, settings[id]])),
    };
  }

  function url(): string {
    return buildUrl(window.location.href, config());
  }

  function update(id: ExerciseId, patch: Partial<ExerciseSettings>): void {
    const next = { ...settings[id], ...patch };
    if (next.goalCorrect > next.goalTotal) next.goalCorrect = next.goalTotal;
    if (!next.ipv4 && !next.ipv6) next.ipv4 = true;
    settings = { ...settings, [id]: next };
    render();
  }

  function toggleTool(id: ExerciseId, on: boolean): void {
    if (on) tools.add(id);
    else tools.delete(id);
    if (tools.size !== 1) startDirectly = false;
    render();
  }

  function reset(): void {
    tools = new Set(EXERCISES);
    startDirectly = false;
    lock = false;
    language = null;
    forceReducedMotion = false;
    settings = { ...DEFAULT_SETTINGS };
    render();
  }

  function render(): void {
    copyStatus = '';
    mount(
      root,
      audienceSection(),
      el('div', { class: 'builder-exercises' }, ...selected().map(exerciseSection)),
      outputSection(),
    );
  }

  function audienceSection(): HTMLElement {
    const single = tools.size === 1;
    const group = el(
      'fieldset',
      { class: 'field-group' },
      el('legend', { text: t('extras.link.tools') }),
      el('p', { class: 'hint', text: t('extras.link.toolsHint') }),
    );

    for (const id of EXERCISES) {
      const only = tools.has(id) && tools.size === 1;
      group.append(
        // The last remaining exercise cannot be unticked: a link that offers
        // nothing at all would be a dead end.
        checkbox(t(`home.${id}.title`), '', tools.has(id), (value) => toggleTool(id, value), only),
      );
    }

    group.append(
      checkbox(
        t('extras.link.single'),
        single ? t('extras.link.singleHint') : t('extras.link.singleNeedsOne'),
        startDirectly,
        (value) => {
          startDirectly = value;
          render();
        },
        !single,
      ),
      checkbox(t('extras.link.lock'), t('extras.link.lockHint'), lock, (value) => {
        lock = value;
        render();
      }),
      checkbox(
        t('extras.link.motion'),
        t('extras.link.motionHint'),
        forceReducedMotion,
        (value) => {
          forceReducedMotion = value;
          render();
        },
      ),
      languageRow(),
    );
    return group;
  }

  function languageRow(): HTMLElement {
    const select = el('select', { class: 'input input-select' });
    const options: Array<[string, string]> = [
      ['', t('extras.link.languageAuto')],
      ...LOCALES.map((code) => [code, languageName(code)] as [string, string]),
    ];

    for (const [value, label] of options) {
      select.append(el('option', { value, text: label, selected: (language ?? '') === value }));
    }
    select.addEventListener('change', () => {
      language = (LOCALES.find((code) => code === select.value) as Locale | undefined) ?? null;
      render();
    });

    return el(
      'label',
      { class: 'labelled labelled-row' },
      el('span', { text: t('extras.link.language') }),
      select,
    );
  }

  function exerciseSection(id: ExerciseId): HTMLElement {
    const current = settings[id];
    const body = el(
      'fieldset',
      { class: 'field-group' },
      el('legend', { text: t('extras.link.optionsFor', { name: t(`home.${id}.title`) }) }),
      radio(`builder-mode-${id}`, t('home.mode.practice'), '', !current.examMode, () =>
        update(id, { examMode: false }),
      ),
      radio(`builder-mode-${id}`, t('home.mode.exam'), '', current.examMode, () =>
        update(id, { examMode: true }),
      ),
    );

    if (current.examMode) {
      body.append(
        el(
          'div',
          { class: 'goal-row' },
          el('span', { class: 'labelled-text', text: t('home.goal') }),
          numberInput(current.goalCorrect, 0, current.goalTotal, (value) =>
            update(id, { goalCorrect: value }),
          ),
          el('span', { text: t('home.goalOf') }),
          numberInput(current.goalTotal, 1, 200, (value) => update(id, { goalTotal: value })),
        ),
      );
    }

    if (id === 'switch') {
      body.append(
        checkbox(t('home.useVlan'), '', current.useVlan, (value) => update(id, { useVlan: value })),
      );
    }

    if (id === 'quiz') {
      body.append(
        checkbox(t('home.categoryIpv4'), '', current.ipv4, (value) => update(id, { ipv4: value })),
        checkbox(t('home.categoryIpv6'), '', current.ipv6, (value) => update(id, { ipv6: value })),
      );
    }
    return body;
  }

  function outputSection(): HTMLElement {
    const value = url();
    const output = el('textarea', {
      class: 'input url-output mono',
      readonly: true,
      rows: 3,
      spellcheck: 'false',
      'aria-label': t('extras.link.result'),
    });
    output.value = value;
    output.addEventListener('focus', () => output.select());

    const status = el('span', { class: 'builder-status', role: 'status', text: copyStatus });

    const copy = el('button', {
      type: 'button',
      class: 'btn btn-primary',
      text: t('extras.link.copy'),
    });
    copy.addEventListener('click', () => {
      void copyToClipboard(value, output).then((ok) => {
        copyStatus = ok ? t('extras.link.copied') : t('extras.link.copyManually');
        status.textContent = copyStatus;
      });
    });

    const open = el('a', {
      class: 'btn btn-ghost',
      href: value,
      target: '_blank',
      rel: 'noopener noreferrer',
      text: t('extras.link.open'),
    });

    const clear = el('button', {
      type: 'button',
      class: 'btn btn-ghost',
      text: t('extras.link.reset'),
    });
    clear.addEventListener('click', reset);

    return el(
      'div',
      { class: 'builder-output' },
      el('h4', { class: 'builder-output-title', text: t('extras.link.result') }),
      output,
      el('div', { class: 'actions' }, copy, open, clear, status),
    );
  }

  render();
  return root;
}

/** `Deutsch`, `English`, … in the reader's own language, falling back to the tag. */
function languageName(code: Locale): string {
  try {
    return new Intl.DisplayNames([locale()], { type: 'language' }).of(code) ?? LOCALE_LABELS[code];
  } catch {
    return LOCALE_LABELS[code];
  }
}

async function copyToClipboard(value: string, fallback: HTMLTextAreaElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Clipboard access is denied on insecure origins and in some browsers, so
    // the text is selected instead and the learner presses the copy shortcut.
    try {
      fallback.select();
      return document.execCommand('copy');
    } catch {
      return false;
    }
  }
}
