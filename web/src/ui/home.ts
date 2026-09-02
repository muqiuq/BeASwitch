import { LOCALES, LOCALE_LABELS, locale, setLocale, t } from '../i18n/index.js';
import { el, mount } from './shared/dom.js';
import { fadeIn } from './shared/animate.js';
import { checkbox, numberInput, radio } from './shared/controls.js';
import { displayControls } from './shared/displayControls.js';
import { quizArt, routerArt, switchArt } from './art.js';
import { openExtras } from './extras/view.js';
import { activeSettings, optionsLocked, persistSettings, visibleExercises } from './shared/config.js';
import {
  clearExamHistory,
  loadExamHistory,
  loadProgress,
  type ExamRecord,
  type ExerciseId,
  type ExerciseSettings,
} from './shared/storage.js';

const GITHUB_URL = 'https://github.com/muqiuq/BeASwitch';
const AUTHOR_URL = 'https://uisa.ch';

export function homeView(onLaunch: (exercise: ExerciseId) => void): HTMLElement {
  const root = el('section', { class: 'home' });
  let settings = activeSettings();
  const locked = optionsLocked();
  const art: Record<ExerciseId, () => SVGSVGElement> = {
    switch: switchArt,
    router: routerArt,
    quiz: quizArt,
  };
  // Kept across re-renders so changing an option does not collapse the panel.
  const expanded = new Set<ExerciseId>();

  function update(exercise: ExerciseId, patch: Partial<ExerciseSettings>): void {
    const next = { ...settings[exercise], ...patch };
    if (next.goalCorrect > next.goalTotal) next.goalCorrect = next.goalTotal;
    if (!next.ipv4 && !next.ipv6) next.ipv4 = true;
    settings = { ...settings, [exercise]: next };
    persistSettings(settings, 'exercises');
    render();
  }

  function render(): void {
    mount(
      root,
      header(),
      el('h2', { class: 'section-title', text: t('home.chooseExercise') }),
      el(
        'div',
        { class: 'card-grid' },
        ...visibleExercises().map((id) => exerciseCard(id, art[id]())),
      ),
      examHistoryPanel(),
      footer(),
    );
    void fadeIn(root);
  }

  function header(): HTMLElement {
    return el(
      'header',
      { class: 'home-header' },
      el(
        'div',
        {},
        el('h1', { class: 'home-title', text: t('app.brand') }),
        el('p', { class: 'home-subtitle', text: t('app.subtitle') }),
      ),
      el('div', { class: 'header-controls' }, displayControls(), languagePicker()),
    );
  }

  function languagePicker(): HTMLElement {
    const group = el('div', { class: 'lang-switch', role: 'group', 'aria-label': t('app.language') });
    for (const code of LOCALES) {
      const button = el('button', {
        type: 'button',
        class: `lang-button ${locale() === code ? 'is-active' : ''}`,
        text: LOCALE_LABELS[code],
        lang: code,
        'aria-pressed': String(locale() === code),
      });
      button.addEventListener('click', () => setLocale(code));
      group.append(button);
    }
    return group;
  }

  function exerciseCard(id: ExerciseId, art: SVGSVGElement): HTMLElement {
    const progress = loadProgress()[id];
    const card = el(
      'article',
      { class: `card card-${id}` },
      el('div', { class: `card-art card-art-${id}` }, art),
      el('h3', { class: 'card-title', text: t(`home.${id}.title`) }),
      el('p', { class: 'card-description', text: t(`home.${id}.description`) }),
    );

    if (progress && progress.total > 0) {
      card.append(
        el('p', {
          class: 'card-progress',
          text: `${progress.correct}/${progress.total} · ${progress.score} ${t('common.points')}`,
        }),
      );
    }

    const start = el('button', { type: 'button', class: 'btn btn-primary', text: t('home.start') });
    start.addEventListener('click', () => onLaunch(id));
    card.append(start, locked ? lockedOptions(id) : optionsSection(id));
    return card;
  }

  /** What the options say, without the controls to change them. */
  function lockedOptions(id: ExerciseId): HTMLElement {
    return el(
      'p',
      { class: 'card-locked' },
      el('span', { class: 'card-options-state', text: modeLabel(id) }),
    );
  }

  function modeLabel(id: ExerciseId): string {
    const config = settings[id];
    return config.examMode
      ? `${t('home.mode.exam')} ${config.goalCorrect}/${config.goalTotal}`
      : t('home.mode.practice');
  }

  function optionsSection(id: ExerciseId): HTMLElement {
    const config = settings[id];
    const details = el('details', { class: 'card-options', open: expanded.has(id) });
    const summary = el(
      'summary',
      { class: 'card-options-summary' },
      el('span', { text: t('home.options') }),
      el('span', { class: 'card-options-state', text: modeLabel(id) }),
    );
    details.append(summary);

    details.addEventListener('toggle', () => {
      if (details.open) expanded.add(id);
      else expanded.delete(id);
    });

    const body = el('div', { class: 'card-options-body' });

    body.append(
      el(
        'fieldset',
        { class: 'field-group' },
        el('legend', { text: t('home.mode') }),
        radio(`mode-${id}`, t('home.mode.practice'), t('home.mode.practiceHint'), !config.examMode, () =>
          update(id, { examMode: false }),
        ),
        radio(`mode-${id}`, t('home.mode.exam'), t('home.mode.examHint'), config.examMode, () =>
          update(id, { examMode: true }),
        ),
      ),
    );

    if (config.examMode) {
      body.append(
        el(
          'div',
          { class: 'goal-row' },
          el('span', { class: 'labelled-text', text: t('home.goal') }),
          numberInput(config.goalCorrect, 0, config.goalTotal, (value) =>
            update(id, { goalCorrect: value }),
          ),
          el('span', { text: t('home.goalOf') }),
          numberInput(config.goalTotal, 1, 200, (value) => update(id, { goalTotal: value })),
          el('p', { class: 'hint', text: t('home.goalDescription') }),
        ),
      );
    }

    if (id === 'switch') {
      body.append(
        checkbox(t('home.useVlan'), t('home.useVlanHint'), config.useVlan, (value) =>
          update(id, { useVlan: value }),
        ),
      );
    }

    if (id === 'quiz') {
      body.append(
        el(
          'fieldset',
          { class: 'field-group' },
          el('legend', { text: t('home.categories') }),
          checkbox(t('home.categoryIpv4'), '', config.ipv4, (value) => update(id, { ipv4: value })),
          checkbox(t('home.categoryIpv6'), '', config.ipv6, (value) => update(id, { ipv6: value })),
        ),
      );
    }

    details.append(body);
    return details;
  }

  function examHistoryPanel(): HTMLElement {
    const history = loadExamHistory();
    const panel = el(
      'section',
      { class: 'panel exam-panel' },
      el('h2', { class: 'panel-title', text: t('home.passedExams') }),
    );

    if (history.length === 0) {
      panel.append(el('p', { class: 'muted', text: t('home.noPassedExams') }));
      return panel;
    }

    const list = el('ul', { class: 'exam-list' });
    for (const record of history) {
      list.append(examListItem(record));
    }
    panel.append(list);

    const clear = el('button', {
      type: 'button',
      class: 'btn btn-ghost',
      text: t('home.clearExams'),
    });
    clear.addEventListener('click', () => {
      clearExamHistory();
      render();
    });
    panel.append(el('div', { class: 'actions' }, clear));
    return panel;
  }

  function examListItem(record: ExamRecord): HTMLElement {
    const when = new Date(record.completedAt);
    return el(
      'li',
      { class: 'exam-item' },
      el('span', { class: 'exam-badge', 'aria-hidden': 'true', text: '✓' }),
      el(
        'span',
        { class: 'exam-main' },
        el('span', { class: 'exam-name', text: t(`home.${record.exercise}.title`) }),
        el('span', {
          class: 'exam-detail',
          text: t('home.examResult', {
            correct: record.correct,
            total: record.total,
            goal: `${record.goalCorrect}/${record.goalTotal}`,
          }),
        }),
      ),
      el('span', { class: 'exam-score mono', text: `${record.score} ${t('common.points')}` }),
      el('time', {
        class: 'exam-date',
        datetime: when.toISOString(),
        text: when.toLocaleDateString(locale(), { dateStyle: 'medium' }),
      }),
    );
  }

  function footer(): HTMLElement {
    const github = el('a', {
      class: 'footer-link',
      href: GITHUB_URL,
      rel: 'noopener noreferrer',
      target: '_blank',
      text: t('footer.github'),
    });

    const author = el('a', {
      class: 'footer-link',
      href: AUTHOR_URL,
      rel: 'noopener noreferrer',
      target: '_blank',
      text: 'uisa.ch',
    });

    const footerNode = el(
      'footer',
      { class: 'site-footer' },
      el('span', { text: 'be-a.network' }),
      el('span', { class: 'footer-sep', 'aria-hidden': 'true', text: '·' }),
      el('span', { class: 'footer-version mono', text: `v${__APP_VERSION__}` }),
      el('span', { class: 'footer-sep', 'aria-hidden': 'true', text: '·' }),
      github,
      el('span', { class: 'footer-sep', 'aria-hidden': 'true', text: '·' }),
      el('span', {}, `${t('footer.createdBy')} `, author),
    );

    // Hidden under a configured link: the window only builds such links, and
    // offering it there would just invite learners to undo the configuration.
    if (!locked) {
      const extras = el('button', {
        type: 'button',
        class: 'footer-link footer-button',
        text: t('extras.title'),
      });
      extras.addEventListener('click', openExtras);
      footerNode.append(
        el('span', { class: 'footer-sep', 'aria-hidden': 'true', text: '·' }),
        extras,
      );
    }
    return footerNode;
  }

  render();
  return root;
}
