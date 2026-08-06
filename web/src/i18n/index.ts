import de from './de.json';
import en from './en.json';

export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

type Catalog = Record<string, string>;

const catalogs: Record<Locale, Catalog> = { de, en };

const STORAGE_KEY = 'bea.locale';

// Guarded because storage access throws in some privacy modes, and because the
// geometry tests import this module outside a browser.
function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LOCALES as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
    return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
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
