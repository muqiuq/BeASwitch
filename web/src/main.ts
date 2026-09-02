import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/topology.css';

import { loadEngine } from './engine/index.js';
import { locale, onLocaleChange, setLocale, t } from './i18n/index.js';
import { el, mount } from './ui/shared/dom.js';
import { homeView } from './ui/home.js';
import { routerView } from './ui/router/view.js';
import { switchView } from './ui/switch/view.js';
import { quizView } from './ui/quiz/view.js';
import { singleExercise, urlConfig, visibleExercises } from './ui/shared/config.js';
import type { ExerciseId } from './ui/shared/storage.js';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app is missing from index.html');

const ROUTES: Record<string, ExerciseId> = {
  '#/switch': 'switch',
  '#/router': 'router',
  '#/quiz': 'quiz',
};

/** Set by a link that limits the app to one exercise; the menu is then skipped. */
const forcedExercise = singleExercise();

function currentRoute(): ExerciseId | null {
  if (forcedExercise) return forcedExercise;
  const route = ROUTES[window.location.hash] ?? null;
  // A link that hides an exercise hides its deep link with it.
  return route && visibleExercises().includes(route) ? route : null;
}

function navigate(exercise: ExerciseId | null): void {
  const hash = exercise ? `#/${exercise}` : '#/';
  if (window.location.hash === hash) {
    render();
  } else {
    window.location.hash = hash;
  }
}

function render(): void {
  document.documentElement.lang = locale();
  const exercise = currentRoute();
  // Without a menu to return to there is nothing for a back button to do.
  const exit = forcedExercise ? null : () => navigate(null);

  switch (exercise) {
    case 'switch':
      mount(app!, switchView(exit));
      break;
    case 'router':
      mount(app!, routerView(exit));
      break;
    case 'quiz':
      mount(app!, quizView(exit));
      break;
    default:
      mount(app!, homeView(navigate));
  }
}

function renderEngineError(error: unknown): void {
  mount(
    app!,
    el(
      'div',
      { class: 'fatal', role: 'alert' },
      el('h1', { text: t('app.engineFailed') }),
      el('p', { text: t('app.engineHint') }),
      el('pre', { class: 'mono', text: String(error) }),
    ),
  );
}

async function main(): Promise<void> {
  // A language forced by a link applies to this visit only.
  const forcedLocale = urlConfig()?.locale;
  if (forcedLocale) setLocale(forcedLocale, false);

  try {
    await loadEngine();
  } catch (error) {
    renderEngineError(error);
    return;
  }

  window.addEventListener('hashchange', render);
  onLocaleChange(render);
  render();
  registerServiceWorker();
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    // Resolved against <base>, so the app also works from a sub-path.
    void navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href);
  });
}

void main();
