/** Inline illustrations for the exercise cards. Drawn, not fetched. */

import { svg } from './shared/dom.js';

const VIEW = '0 0 240 110';

function frame(x: number, y: number, colour: string, opacity = 1): SVGRectElement {
  return svg('rect', {
    x,
    y,
    width: 22,
    height: 12,
    rx: 3,
    fill: colour,
    opacity,
  });
}

export function switchArt(): SVGSVGElement {
  const root = svg('svg', { class: 'art', viewBox: VIEW, 'aria-hidden': 'true' });

  // Stations on the left and right, wires converging on the chassis.
  const stations: [number, number, string][] = [
    [26, 22, 'var(--vlan-1)'],
    [26, 55, 'var(--vlan-2)'],
    [26, 88, 'var(--vlan-3)'],
    [214, 30, 'var(--vlan-2)'],
    [214, 80, 'var(--vlan-1)'],
  ];

  for (const [x, y, colour] of stations) {
    root.append(
      svg('line', {
        x1: x,
        y1: y,
        x2: x < 120 ? 88 : 152,
        y2: 55,
        stroke: colour,
        'stroke-width': 2,
        opacity: 0.45,
      }),
      svg('circle', { cx: x, cy: y, r: 9, fill: 'var(--bg-raised)', stroke: colour, 'stroke-width': 2 }),
    );
  }

  root.append(
    svg('rect', {
      x: 88,
      y: 34,
      width: 64,
      height: 42,
      rx: 8,
      fill: 'var(--surface)',
      stroke: 'var(--accent)',
      'stroke-width': 2,
    }),
  );

  for (let i = 0; i < 4; i++) {
    root.append(
      svg('rect', {
        x: 96 + i * 13,
        y: 60,
        width: 8,
        height: 8,
        rx: 2,
        fill: 'var(--accent)',
        opacity: 0.7,
      }),
    );
  }

  root.append(frame(56, 24, 'var(--vlan-1)'), frame(164, 74, 'var(--vlan-2)', 0.8));
  return root;
}

export function routerArt(): SVGSVGElement {
  const root = svg('svg', { class: 'art', viewBox: VIEW, 'aria-hidden': 'true' });

  const spokes: [number, number, string][] = [
    [42, 24, 'var(--vlan-1)'],
    [42, 86, 'var(--vlan-3)'],
    [198, 24, 'var(--vlan-2)'],
    [198, 86, 'var(--vlan-4)'],
  ];

  for (const [x, y, colour] of spokes) {
    root.append(
      svg('line', {
        x1: 120,
        y1: 55,
        x2: x,
        y2: y,
        stroke: colour,
        'stroke-width': 2,
        opacity: 0.5,
      }),
      svg('ellipse', {
        cx: x,
        cy: y,
        rx: 30,
        ry: 14,
        fill: 'var(--bg-raised)',
        stroke: colour,
        'stroke-width': 1.5,
        'stroke-dasharray': '4 3',
      }),
    );
  }

  root.append(
    svg('circle', {
      cx: 120,
      cy: 55,
      r: 26,
      fill: 'var(--surface)',
      stroke: 'var(--success)',
      'stroke-width': 2,
    }),
    svg('path', {
      d: 'M108 55 h24 M126 49 l6 6 -6 6',
      stroke: 'var(--success)',
      'stroke-width': 2.5,
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );
  return root;
}

export function quizArt(): SVGSVGElement {
  const root = svg('svg', { class: 'art', viewBox: VIEW, 'aria-hidden': 'true' });

  root.append(
    svg('rect', {
      x: 34,
      y: 20,
      width: 172,
      height: 30,
      rx: 6,
      fill: 'var(--surface)',
      stroke: 'var(--vlan-4)',
      'stroke-width': 2,
    }),
    svg('text', {
      x: 120,
      y: 40,
      'text-anchor': 'middle',
      class: 'art-text',
      text: '192.168.10.0/26',
    }),
  );

  // The prefix bits, filled up to the mask boundary.
  for (let i = 0; i < 16; i++) {
    root.append(
      svg('rect', {
        x: 34 + i * 11,
        y: 62,
        width: 8,
        height: 14,
        rx: 2,
        fill: i < 11 ? 'var(--vlan-4)' : 'var(--bg-raised)',
        stroke: 'var(--vlan-4)',
        'stroke-width': 1,
        opacity: i < 11 ? 0.85 : 0.5,
      }),
    );
  }

  root.append(
    svg('text', {
      x: 34,
      y: 92,
      class: 'art-caption',
      text: 'network',
    }),
    svg('text', {
      x: 206,
      y: 92,
      'text-anchor': 'end',
      class: 'art-caption',
      text: 'host',
    }),
  );
  return root;
}
