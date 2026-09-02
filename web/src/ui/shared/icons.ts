/** Line icons for the header controls: a 20×20 box, stroked in `currentColor`. */

import { svg } from './dom.js';

function icon(...children: SVGElement[]): SVGSVGElement {
  const node = svg('svg', {
    class: 'icon',
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.8,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    // Decorative: the button itself carries the label.
    'aria-hidden': 'true',
    focusable: 'false',
  });
  node.append(...children);
  return node;
}

/** A body trailing speed lines. */
export function motionIcon(): SVGSVGElement {
  return icon(
    svg('circle', { cx: 13.2, cy: 10, r: 3.6 }),
    svg('path', { d: 'M2.5 5.5h5M1.5 10h3.5M2.5 14.5h5' }),
  );
}

/** A small and a large A, the usual mark for a text size control. */
export function textSizeIcon(): SVGSVGElement {
  return icon(
    svg('path', { d: 'M2.4 16.5 5.4 8.2 8.4 16.5M3.5 14h3.8' }),
    svg('path', { d: 'M10.4 16.5 14 3.8 17.6 16.5M11.7 12.2h4.6' }),
  );
}
