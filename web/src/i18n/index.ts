import de from './de.json';
import en from './en.json';
import es419 from './es-419.json';
import ptBR from './pt-BR.json';

export const LOCALES = ['de', 'en', 'pt-BR', 'es-419'] as const;
export type Locale = (typeof LOCALES)[number];

/** Short labels for the picker; the tags themselves are BCP 47. */
export const LOCALE_LABELS: Record<Locale, string> = {
  de: 'DE',
  en: 'EN',
  'pt-BR': 'BR',
  'es-419': 'ES',
};

type Catalog = Record<string, string>;

const catalogs: Record<Locale, Catalog> = {
  de,
  en,
  'pt-BR': ptBR,
  'es-419': es419,
};

const STORAGE_KEY = 'bea.locale';

/** Maps a browser language such as `pt-PT` or `es-MX` onto a catalog. */
function matchLocale(language: string): Locale | null {
  const lower = language.toLowerCase();
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('es')) return 'es-419';
  if (lower.startsWith('en')) return 'en';
  return null;
}

// Guarded because storage access throws in some privacy modes, and because the
// geometry tests import this module outside a browser.
function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LOCALES as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
    for (const language of navigator.languages ?? [navigator.language]) {
      const match = matchLocale(language);
      if (match) return match;
    }
    return 'en';
  } catch {
    return 'en';
  }
}

let current: Locale = detectLocale();
const listeners = new Set<() => void>();

export function locale(): Locale {
  return current;
}

export function setLocale(next: Locale): void {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The choice simply does not persist.
  }
  document.documentElement.lang = next;
  listeners.forEach((listener) => listener());
}

export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Translates `key`, substituting `{placeholder}` values. */
export function t(key: string, params: Record<string, string | number> = {}): string {
  const template = catalogs[current][key] ?? catalogs.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function availableKeys(): string[] {
  return Object.keys(catalogs.en);
}

export function catalogFor(target: Locale): Catalog {
  return catalogs[target];
}
