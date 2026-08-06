import { svg } from '../shared/dom.js';
import { t } from '../../i18n/index.js';
import type { Packet, RouterSnapshot } from '../../engine/types.js';
import type { Point } from '../shared/animate.js';

export const VIEW_WIDTH = 640;
export const VIEW_HEIGHT = 520;

const CENTRE: Point = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };
const ROUTER_RADIUS = 62;
const INTERFACE_RADIUS = 150;
const EXIT_RADIUS = 218;

export interface Geometry {
  interfaceAnchor(port: number): Point;
  /// Beyond the interface, where a forwarded packet comes to rest.
  exitAnchor(port: number): Point;
  centre: Point;
  /// Off-screen, because the engine does not name the ingress interface.
  entryPoint: Point;
}

/** Interfaces radiate evenly around the router, each facing its own subnet. */
export function computeGeometry(snapshot: RouterSnapshot): Geometry {
  const count = Math.max(1, snapshot.interfaces.length);
  const positions = new Map<number, { iface: Point; exit: Point }>();

  snapshot.interfaces.forEach((iface, index) => {
    // Start at the top and go clockwise.
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    positions.set(iface.number, {
      iface: {
        x: CENTRE.x + Math.cos(angle) * INTERFACE_RADIUS,
        y: CENTRE.y + Math.sin(angle) * INTERFACE_RADIUS,
      },
      exit: {
        x: CENTRE.x + Math.cos(angle) * EXIT_RADIUS,
        y: CENTRE.y + Math.sin(angle) * EXIT_RADIUS,
      },
    });
  });

  return {
    interfaceAnchor: (port) => positions.get(port)?.iface ?? CENTRE,
    exitAnchor: (port) => positions.get(port)?.exit ?? CENTRE,
    centre: CENTRE,
    entryPoint: { x: -90, y: CENTRE.y },
  };
}

export interface TopologyRefs {
  root: SVGSVGElement;
  animationLayer: SVGGElement;
  interfaceGroups: Map<number, SVGGElement>;
  cables: Map<number, SVGLineElement>;
  /// Resting inside the router, or on its way out once the answer is scored.
  packetToken: SVGGElement | null;
}

export function renderTopology(
  snapshot: RouterSnapshot,
  geometry: Geometry,
  selected: Set<number>,
  onToggle: (port: number) => void,
  interactive: boolean,
): TopologyRefs {
  const root = svg('svg', {
    class: 'topology topology-router',
    viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`,
    role: 'group',
    'aria-label': t('router.interfaces'),
  });

  const cableLayer = svg('g', { class: 'layer-cables' });
  const nodeLayer = svg('g', { class: 'layer-nodes' });
  const animationLayer = svg('g', { class: 'layer-animation' });

  const cables = new Map<number, SVGLineElement>();
  const interfaceGroups = new Map<number, SVGGElement>();

  for (const iface of snapshot.interfaces) {
    const anchor = geometry.interfaceAnchor(iface.number);

    const cable = svg('line', {
      class: 'cable',
      x1: geometry.centre.x,
      y1: geometry.centre.y,
      x2: anchor.x,
      y2: anchor.y,
    });
    cableLayer.append(cable);
    cables.set(iface.number, cable);

    const group = svg('g', {
      class: `interface ${selected.has(iface.number) ? 'is-selected' : ''}`,
      'data-port': iface.number,
      transform: `translate(${anchor.x}, ${anchor.y})`,
      role: interactive ? 'checkbox' : 'img',
      tabindex: interactive ? 0 : undefined,
      'aria-checked': interactive ? String(selected.has(iface.number)) : undefined,
      'aria-label': `${iface.name} ${iface.cidr}`,
    });

    group.append(
      svg('rect', { class: 'interface-body', x: -64, y: -26, width: 128, height: 52, rx: 10 }),
      svg('text', { class: 'interface-name', y: -6, 'text-anchor': 'middle', text: iface.name }),
      svg('text', { class: 'interface-addr', y: 12, 'text-anchor': 'middle', text: iface.address }),
    );

    if (interactive) {
      group.classList.add('is-interactive');
      group.addEventListener('click', () => onToggle(iface.number));
      group.addEventListener('keydown', (event) => {
        const key = (event as KeyboardEvent).key;
        if (key === 'Enter' || key === ' ') {
          event.preventDefault();
          onToggle(iface.number);
        }
      });
    }

    nodeLayer.append(group);
    interfaceGroups.set(iface.number, group);
  }

  nodeLayer.append(
    svg(
      'g',
      { class: 'router-body', transform: `translate(${CENTRE.x}, ${CENTRE.y})` },
      svg('circle', { class: 'router-circle', r: ROUTER_RADIUS }),
      svg('text', { class: 'router-label', y: 6, 'text-anchor': 'middle', text: 'ROUTER' }),
    ),
  );

  root.append(cableLayer, nodeLayer, animationLayer);

  let packetToken: SVGGElement | null = null;
  if (snapshot.packet) {
    const expected = snapshot.result?.expectedPort ?? null;
    const resting =
      snapshot.result && expected !== null ? geometry.exitAnchor(expected) : geometry.centre;
    packetToken = packetNode(snapshot.packet, resting);
    if (!snapshot.result) packetToken.classList.add('is-parked');
    if (snapshot.result && expected === null) packetToken.classList.add('is-dropped');
    animationLayer.append(packetToken);
  }

  return { root, animationLayer, interfaceGroups, cables, packetToken };
}

export function packetNode(packet: Packet, at: Point): SVGGElement {
  const group = svg('g', {
    class: 'packet-token',
    transform: `translate(${at.x}, ${at.y})`,
  });
  group.append(
    svg('rect', { x: -62, y: -18, width: 124, height: 36, rx: 8, class: 'packet-body' }),
    svg('text', { class: 'packet-text', y: -3, 'text-anchor': 'middle', text: packet.destIp }),
    svg('text', {
      class: 'packet-sub',
      y: 11,
      'text-anchor': 'middle',
      text: `← ${packet.sourceIp}`,
    }),
  );
  return group;
}
