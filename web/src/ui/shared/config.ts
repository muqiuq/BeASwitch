/**
 * Configuration carried in the query string, so a teacher can hand out a link
 * that opens the toolkit already set up: fewer exercises, a fixed exam goal,
 * or a single exercise with the options hidden.
 *
 * The parameters stay readable (`?tools=switch,router&switch=exam:16/20`)
 * rather than being packed into one opaque token, so a link can be understood
 * and edited by hand. They live in the *search* string, not the hash, because
 * the hash is the router: `#/switch` changes while the configuration must not.
 *
 * A link only ever suggests values. Anything the learner changes afterwards
 * wins for the rest of the visit, and `lock` hides the option editors rather
 * than enforcing anything — the same deterrence-not-DRM stance as the engine.
 */

import { LOCALES, type Locale } from '../../i18n/index.js';
import {
  EXERCISES,
  loadSettings,
  normaliseExercise,
  saveSettings,
  type ExerciseId,
  type ExerciseSettings,
  type Settings,
} from './storage.js';

export interface UrlConfig {
  /** Exercises the menu offers. Never empty. */
  tools: ExerciseId[];
  /** Open this exercise straight away and hide the way back to the menu. */
  only: ExerciseId | null;
  /** Hide the option editors. */
  lock: boolean;
  /** Forced interface language, or `null` to leave the choice to the learner. */
  locale: Locale | null;
  /** Forced motion preference, or `null` to leave it alone. */
  reducedMotion: boolean | null;
  /** Per exercise, only the fields the link actually spells out. */
  settings: Partial<Record<ExerciseId, Partial<ExerciseSettings>>>;
}

const PARAMS = ['tools', 'only', 'lock', 'lang', 'motion', ...EXERCISES];

export function emptyConfig(): UrlConfig {
  return {
    tools: [...EXERCISES],
    only: null,
    lock: false,
    locale: null,
    reducedMotion: null,
    settings: {},
  };
}

function asExercise(value: string | null | undefined): ExerciseId | null {
  const candidate = value?.trim().toLowerCase() ?? '';
  return EXERCISES.find((id) => id === candidate) ?? null;
}

function asLocale(value: string | null): Locale | null {
  const candidate = value?.trim().toLowerCase() ?? '';
  return LOCALES.find((code) => code.toLowerCase() === candidate) ?? null;
}

function integer(value: string | undefined, min: number, max: number): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
}

/** `exam:16/20`, `practice`, `vlan`, `novlan`, `ipv4`, `ipv6` — order is free. */
function parseExercise(id: ExerciseId, raw: string): Partial<ExerciseSettings> {
  const patch: Partial<ExerciseSettings> = {};
  const categories: string[] = [];

  for (const token of raw.split(',').map((part) => part.trim().toLowerCase())) {
    if (token === 'practice') {
      patch.examMode = false;
    } else if (token === 'exam' || token.startsWith('exam:')) {
      patch.examMode = true;
      const [correct, total] = token.slice(5).split('/');
      const goalTotal = integer(total, 1, 200);
      const goalCorrect = integer(correct, 0, goalTotal ?? 200);
      if (goalTotal !== null) patch.goalTotal = goalTotal;
      if (goalCorrect !== null) patch.goalCorrect = goalCorrect;
    } else if (token === 'vlan' || token === 'novlan') {
      if (id === 'switch') patch.useVlan = token === 'vlan';
    } else if (token === 'ipv4' || token === 'ipv6') {
      if (id === 'quiz') categories.push(token);
    }
  }

  // Listing a category selects it and deselects the others; listing none says
  // nothing at all, so the stored preference survives.
  if (categories.length > 0) {
    patch.ipv4 = categories.includes('ipv4');
    patch.ipv6 = categories.includes('ipv6');
  }
  return patch;
}

/** Returns `null` when the query string carries no configuration at all. */
export function parseConfig(search: string): UrlConfig | null {
  const params = new URLSearchParams(search);
  if (!PARAMS.some((name) => params.has(name))) return null;

  const config = emptyConfig();
  const only = asExercise(params.get('only'));

  if (only) {
    config.only = only;
    config.tools = [only];
  } else if (params.has('tools')) {
    const wanted = (params.get('tools') ?? '').split(',').map((part) => asExercise(part));
    const tools = EXERCISES.filter((id) => wanted.includes(id));
    // An empty or unrecognisable list would leave nothing to do, so it is ignored.
    if (tools.length > 0) config.tools = tools;
  }

  config.lock = params.get('lock') !== '0' && params.has('lock');
  config.locale = asLocale(params.get('lang'));
  if (params.has('motion')) config.reducedMotion = params.get('motion') === '0';

  for (const id of EXERCISES) {
    const raw = params.get(id);
    if (raw !== null) config.settings[id] = parseExercise(id, raw);
  }
  return config;
}

function exerciseTokens(id: ExerciseId, settings: ExerciseSettings): string {
  const tokens = [
    settings.examMode ? `exam:${settings.goalCorrect}/${settings.goalTotal}` : 'practice',
  ];
  if (id === 'switch') tokens.push(settings.useVlan ? 'vlan' : 'novlan');
  if (id === 'quiz') {
    if (settings.ipv4) tokens.push('ipv4');
    if (settings.ipv6) tokens.push('ipv6');
  }
  return tokens.join(',');
}

/**
 * Serialised by hand rather than with `URLSearchParams.toString()`, which would
 * percent-encode the `,` `:` and `/` separators and make the link unreadable.
 * Every value comes from a fixed vocabulary or is a small integer, so there is
 * nothing here that needs escaping.
 */
export function buildQuery(config: UrlConfig): string {
  const parts: string[] = [];

  if (config.only) parts.push(`only=${config.only}`);
  else if (config.tools.length < EXERCISES.length) parts.push(`tools=${config.tools.join(',')}`);

  if (config.lock) parts.push('lock=1');
  if (config.locale) parts.push(`lang=${config.locale}`);
  if (config.reducedMotion !== null) parts.push(`motion=${config.reducedMotion ? '0' : '1'}`);

  // Spelled out for every offered exercise, so a link never inherits whatever
  // the learner happened to have stored from an earlier session. Anything the
  // config leaves open falls back to the app defaults, not to that store.
  for (const id of config.tools) {
    parts.push(`${id}=${exerciseTokens(id, normaliseExercise(config.settings[id] ?? {}))}`);
  }

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/** Strips any existing query and hash from `base`. */
export function buildUrl(base: string, config: UrlConfig): string {
  return `${base.split(/[?#]/)[0] ?? base}${buildQuery(config)}`;
}

let parsed: UrlConfig | null | undefined;

/**
 * Tracked per concern, not as one flag: switching the motion toggle off must
 * not also throw away the exam configuration the link came with.
 */
const takenOver = { exercises: false, motion: false };

export function urlConfig(): UrlConfig | null {
  if (parsed === undefined) {
    try {
      parsed = parseConfig(window.location.search);
    } catch {
      // No DOM (the geometry tests) or an unusable location: behave normally.
      parsed = null;
    }
  }
  return parsed;
}

export function visibleExercises(): ExerciseId[] {
  return urlConfig()?.tools ?? [...EXERCISES];
}

export function singleExercise(): ExerciseId | null {
  return urlConfig()?.only ?? null;
}

export function optionsLocked(): boolean {
  return urlConfig()?.lock ?? false;
}

/** Stored settings with the link's values laid over them. */
export function activeSettings(): Settings {
  const stored = loadSettings();
  const config = urlConfig();
  if (!config) return stored;

  const merged: Settings = {
    ...stored,
    reducedMotion:
      takenOver.motion || config.reducedMotion === null
        ? stored.reducedMotion
        : config.reducedMotion,
  };
  if (takenOver.exercises) return merged;

  for (const id of EXERCISES) {
    const patch = config.settings[id];
    if (patch) merged[id] = normaliseExercise({ ...stored[id], ...patch });
  }
  return merged;
}

/**
 * Saves an edit the learner made themselves. The link stops speaking for that
 * concern from here on, otherwise the edit would be undone by the next render.
 */
export function persistSettings(settings: Settings, scope: 'exercises' | 'motion'): void {
  takenOver[scope] = true;
  saveSettings(settings);
}
