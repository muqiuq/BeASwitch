/**
 * Text size, for a room where the projector is far from the back row.
 *
 * The scale is applied to the root font size, which every `rem` in the
 * stylesheets follows, and is a percentage rather than a pixel value so a
 * reader who already runs a larger browser default keeps that as their 100%.
 *
 * The SVG topologies are drawn in their own user units and do not follow it;
 * they scale with the width of their panel instead.
 */

export const TEXT_SCALES = [100, 120, 145] as const;

/** Parallel to `TEXT_SCALES`; the i18n keys are `home.textSize.<level>`. */
const LEVELS = ['normal', 'large', 'xlarge'] as const;

function indexOf(scale: unknown): number {
  const index = TEXT_SCALES.findIndex((value) => value === Number(scale));
  return index === -1 ? 0 : index;
}

export function normaliseScale(scale: unknown): number {
  return TEXT_SCALES[indexOf(scale)]!;
}

export function nextScale(scale: number): number {
  return TEXT_SCALES[(indexOf(scale) + 1) % TEXT_SCALES.length]!;
}

export function scaleLevel(scale: number): string {
  return LEVELS[indexOf(scale)]!;
}

export function applyTextScale(scale: number): void {
  const value = normaliseScale(scale);
  document.documentElement.style.fontSize = `${value}%`;
  // A class per step as well, for the layout rules that only apply at one of
  // them — the projector layout in `text-xlarge` cannot be expressed in rem.
  for (const level of LEVELS) {
    document.documentElement.classList.toggle(`text-${level}`, level === scaleLevel(value));
  }
}
