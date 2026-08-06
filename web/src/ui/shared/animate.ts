/**
 * Motion helpers built on the Web Animations API.
 *
 * Everything honours `prefers-reduced-motion` and the in-app setting: when
 * motion is off the animation is skipped and the element jumps to its end state.
 */

import { loadSettings } from './storage.js';

export function motionDisabled(): boolean {
  return (
    loadSettings().reducedMotion ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function animate(
  node: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Promise<void> {
  if (motionDisabled()) return Promise.resolve();
  const animation = node.animate(keyframes, options);
  return animation.finished.then(() => undefined).catch(() => undefined);
}

/**
 * A CSS `transform` animation replaces the SVG `transform` attribute outright,
 * which would drop an element's `translate(...)` and snap it to the origin.
 * Every transform keyframe must therefore be prefixed with its own position.
 */
export function baseTransform(node: Element): string {
  const attribute = node.getAttribute('transform');
  if (!attribute) return '';
  const match = /translate\(\s*(-?[\d.]+)(?:[ ,]+(-?[\d.]+))?\s*\)/.exec(attribute);
  if (!match) return '';
  return `translate(${match[1]}px, ${match[2] ?? '0'}px) `;
}

export function wait(ms: number): Promise<void> {
  if (motionDisabled()) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Slides a node along an SVG path, used for frames and packets on the wire. */
export function travel(
  node: SVGGraphicsElement,
  from: Point,
  to: Point,
  duration: number,
): Promise<void> {
  return animate(
    node,
    [
      { transform: `translate(${from.x}px, ${from.y}px)` },
      { transform: `translate(${to.x}px, ${to.y}px)` },
    ],
    // Holds the end position, which is also the node's resting place.
    { duration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
  );
}

export interface Point {
  x: number;
  y: number;
}

export function pulse(node: Element): Promise<void> {
  const base = baseTransform(node);
  return animate(
    node,
    [
      { transform: `${base}scale(1)`, offset: 0 },
      { transform: `${base}scale(1.06)`, offset: 0.5 },
      { transform: `${base}scale(1)`, offset: 1 },
    ],
    { duration: 420, easing: 'ease-in-out' },
  );
}

export function shake(node: Element): Promise<void> {
  const base = baseTransform(node);
  return animate(
    node,
    [
      { transform: `${base}translateX(0)` },
      { transform: `${base}translateX(-6px)` },
      { transform: `${base}translateX(6px)` },
      { transform: `${base}translateX(-4px)` },
      { transform: `${base}translateX(0)` },
    ],
    { duration: 360, easing: 'ease-in-out' },
  );
}

export function fadeIn(node: Element, duration = 240): Promise<void> {
  return animate(node, [{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'ease-out' });
}

/** Highlights a freshly inserted table row. */
export function highlightRow(node: Element): Promise<void> {
  node.classList.add('row-new');
  return animate(
    node,
    [
      { backgroundColor: 'var(--accent-soft)', transform: 'translateX(-8px)', opacity: 0 },
      { backgroundColor: 'var(--accent-soft)', transform: 'translateX(0)', opacity: 1, offset: 0.4 },
      { backgroundColor: 'transparent', transform: 'translateX(0)', opacity: 1 },
    ],
    { duration: 900, easing: 'ease-out' },
  ).then(() => {
    node.classList.remove('row-new');
  });
}
