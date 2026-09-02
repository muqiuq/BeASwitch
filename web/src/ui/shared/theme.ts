/**
 * Colour modes. The palettes themselves live in `styles/tokens.css`; this only
 * decides which of them `<html>` is wearing.
 *
 * `system` is the default: it follows `prefers-color-scheme`, dark or light.
 * The other fourteen are fixed palettes chosen in the extra features window.
 * The choice is personal, so no configured link can set it.
 */

export const THEMES = [
  'system',
  'sunset',
  'deepFried',
  'justWokeUp',
  'terminal',
  'blueprint',
  'highlighter',
  'cottonCandy',
  'monochrome',
  'sepia',
  'brazil',
  'switzerland',
  'radioactive',
  'slay',
  'touchGrass',
] as const;

export type ThemeId = (typeof THEMES)[number];

/**
 * Deliberately not in the i18n catalogs and deliberately English everywhere:
 * these are names, not interface copy — the same reasoning as `LOCALE_LABELS`.
 */
export const THEME_LABELS: Record<ThemeId, string> = {
  system: 'System',
  sunset: 'Sunset',
  deepFried: 'Deep fried',
  justWokeUp: 'Just woke up',
  terminal: 'Terminal',
  blueprint: 'Blueprint',
  highlighter: 'Highlighter',
  cottonCandy: 'Cotton candy',
  monochrome: 'Colors are evil',
  sepia: 'Lost in the Past',
  brazil: 'Brazil',
  switzerland: 'Switzerland',
  radioactive: 'Radioactive',
  slay: 'Slay',
  touchGrass: 'Touch grass',
};

export function normaliseTheme(value: unknown): ThemeId {
  return THEMES.find((theme) => theme === value) ?? 'system';
}

export function applyTheme(theme: unknown): void {
  // Written out even for `system`, which tokens.css names explicitly so that a
  // preview swatch can re-declare the default palette inside itself.
  document.documentElement.dataset.theme = normaliseTheme(theme);
}
