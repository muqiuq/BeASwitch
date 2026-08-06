import { svg } from '../shared/dom.js';
import { t } from '../../i18n/index.js';
import type { EthernetFrame, SwitchHost, SwitchPort, SwitchSnapshot } from '../../engine/types.js';
import type { Point } from '../shared/animate.js';

export const VIEW_WIDTH = 900;
export const VIEW_HEIGHT = 520;

const CHASSIS = { x: 300, y: 205, width: 300, height: 110 };

/** Palette cycled per VLAN so membership is readable at a glance. */
const VLAN_COLOURS = [
  'var(--vlan-1)',
  'var(--vlan-2)',
  'var(--vlan-3)',
  'var(--vlan-4)',
  'var(--vlan-5)',
];

export function vlanColour(vlan: number, vlans: number[]): string {
  const index = Math.max(0, vlans.indexOf(vlan));
  return VLAN_COLOURS[index % VLAN_COLOURS.length] ?? VLAN_COLOURS[0]!;
}

export interface Geometry {
  portAnchor(port: number): Point;
  hostAnchor(label: string): Point;
  chassisCentre: Point;
}

/**
 * Ports fan out left and right of the chassis; stations sit further out on the
 * same row so a frame can travel host -> port -> switch in a straight line.
 */
export function computeGeometry(snapshot: SwitchSnapshot): Geometry {
  const ports = snapshot.ports;
  const half = Math.ceil(ports.length / 2);
  const portPositions = new Map<number, Point>();

  ports.forEach((port, index) => {
    const left = index < half;
    const column = left ? index : index - half;
    const rows = left ? half : ports.length - half;
    const spacing = VIEW_HEIGHT / (rows + 1);
    portPositions.set(port.number, {
      x: left ? CHASSIS.x - 80 : CHASSIS.x + CHASSIS.width + 80,
      y: spacing * (column + 1),
    });
  });

  const hostPositions = new Map<string, Point>();
  const byPort = new Map<number, SwitchHost[]>();
  for (const host of snapshot.hosts) {
    const list = byPort.get(host.port) ?? [];
    list.push(host);
    byPort.set(host.port, list);
  }

  const rowSpacing = VIEW_HEIGHT / (half + 1);
  const margin = 26;

  for (const [port, hosts] of byPort) {
    const anchor = portPositions.get(port);
    if (!anchor) continue;
    const left = anchor.x < CHASSIS.x;
    // Tighten the stack when a port carries many stations so it still fits.
    const spread =
      hosts.length > 1 ? Math.min(34, (rowSpacing - margin) / (hosts.length - 1)) : 0;
    const offset = ((hosts.length - 1) * spread) / 2;
    hosts.forEach((host, index) => {
      const y = anchor.y - offset + index * spread;
      hostPositions.set(host.label, {
        x: left ? anchor.x - 130 : anchor.x + 130,
        y: Math.min(VIEW_HEIGHT - margin, Math.max(margin, y)),
      });
    });
  }

  return {
    portAnchor: (port) => portPositions.get(port) ?? { x: CHASSIS.x, y: VIEW_HEIGHT / 2 },
    hostAnchor: (label) => hostPositions.get(label) ?? { x: 40, y: VIEW_HEIGHT / 2 },
    chassisCentre: {
      x: CHASSIS.x + CHASSIS.width / 2,
      y: CHASSIS.y + CHASSIS.height / 2,
    },
  };
}

export interface TopologyRefs {
  root: SVGSVGElement;
  animationLayer: SVGGElement;
  portGroups: Map<number, SVGGElement>;
  cables: Map<number, SVGPathElement>;
  hostGroups: Map<string, SVGGElement>;
  /// Resting inside the switch while the student decides.
  parkedFrame: SVGGElement | null;
  /// One copy per port the frame is forwarded to, resting on that port.
  deliveredFrames: Map<number, SVGGElement>;
}

export function renderTopology(
  snapshot: SwitchSnapshot,
  geometry: Geometry,
  revealedHosts: ReadonlySet<string> = new Set(),
): TopologyRefs {
  const root = svg('svg', {
    class: 'topology',
    viewBox: `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`,
    role: 'img',
    'aria-label': t('switch.title'),
  });

  const cableLayer = svg('g', { class: 'layer-cables' });
  const nodeLayer = svg('g', { class: 'layer-nodes' });
  const animationLayer = svg('g', { class: 'layer-animation' });

  const cables = new Map<number, SVGPathElement>();
  const portGroups = new Map<number, SVGGElement>();
  const hostGroups = new Map<string, SVGGElement>();

  nodeLayer.append(chassis());

  for (const port of snapshot.ports) {
    const anchor = geometry.portAnchor(port.number);
    const left = anchor.x < geometry.chassisCentre.x;
    const edgeX = left ? CHASSIS.x : CHASSIS.x + CHASSIS.width;

    const cable = svg('path', {
      class: 'cable',
      d: `M ${anchor.x} ${anchor.y} C ${(anchor.x + edgeX) / 2} ${anchor.y}, ${(anchor.x + edgeX) / 2} ${geometry.chassisCentre.y}, ${edgeX} ${geometry.chassisCentre.y}`,
      stroke: portColour(port, snapshot.vlans),
    });
    cableLayer.append(cable);
    cables.set(port.number, cable);

    const group = renderPort(port, anchor, snapshot.vlans);
    nodeLayer.append(group);
    portGroups.set(port.number, group);
  }

  for (const host of snapshot.hosts) {
    const anchor = geometry.hostAnchor(host.label);
    const portAnchor = geometry.portAnchor(host.port);
    cableLayer.append(
      svg('line', {
        class: 'cable cable-host',
        x1: anchor.x,
        y1: anchor.y,
        x2: portAnchor.x,
        y2: portAnchor.y,
        stroke: vlanColour(host.vlan, snapshot.vlans),
      }),
    );

    const group = renderHost(host, anchor, snapshot.vlans, revealedHosts.has(host.label));
    nodeLayer.append(group);
    hostGroups.set(host.label, group);
  }

  root.append(cableLayer, nodeLayer, animationLayer);

  const { parkedFrame, deliveredFrames } = renderFrames(snapshot, geometry, animationLayer);
  return { root, animationLayer, portGroups, cables, hostGroups, parkedFrame, deliveredFrames };
}

/**
 * Frames are part of the render rather than the animation, so they keep their
 * place when the view re-renders and never sit at the SVG origin.
 */
function renderFrames(
  snapshot: SwitchSnapshot,
  geometry: Geometry,
  layer: SVGGElement,
): { parkedFrame: SVGGElement | null; deliveredFrames: Map<number, SVGGElement> } {
  const deliveredFrames = new Map<number, SVGGElement>();
  const frame = snapshot.frame;
  if (!frame) {
    return { parkedFrame: null, deliveredFrames };
  }

  const result = snapshot.result;
  if (!result || result.action === 'discard') {
    const token = frameNode(frame, geometry.chassisCentre);
    if (result) token.classList.add('is-discarded');
    layer.append(token);
    return { parkedFrame: token, deliveredFrames };
  }

  for (const verdict of result.ports) {
    if (!verdict.expectedSend) continue;
    const label = verdict.expectedTag ? `VLAN ${result.vlan}` : t('switch.untagged');
    const token = frameNode(frame, geometry.portAnchor(verdict.port), label);
    layer.append(token);
    deliveredFrames.set(verdict.port, token);
  }
  return { parkedFrame: null, deliveredFrames };
}

function chassis(): SVGGElement {
  return svg(
    'g',
    { class: 'chassis' },
    svg('rect', {
      x: CHASSIS.x,
      y: CHASSIS.y,
      width: CHASSIS.width,
      height: CHASSIS.height,
      rx: 14,
      class: 'chassis-body',
    }),
    svg('text', {
      x: CHASSIS.x + CHASSIS.width / 2,
      y: CHASSIS.y + CHASSIS.height / 2 + 6,
      class: 'chassis-label',
      'text-anchor': 'middle',
      text: 'SWITCH',
    }),
  );
}

function portColour(port: SwitchPort, vlans: number[]): string {
  const first = port.untagged[0] ?? port.tagged[0];
  return first === undefined ? 'var(--line)' : vlanColour(first, vlans);
}

function renderPort(port: SwitchPort, anchor: Point, vlans: number[]): SVGGElement {
  const group = svg('g', {
    class: `port port-${port.role}`,
    'data-port': port.number,
    transform: `translate(${anchor.x}, ${anchor.y})`,
  });

  group.append(
    svg('rect', { class: 'port-body', x: -30, y: -22, width: 60, height: 44, rx: 8 }),
    svg('text', {
      class: 'port-label',
      x: 0,
      y: -4,
      'text-anchor': 'middle',
      text: String(port.number),
    }),
    svg('text', {
      class: 'port-role',
      x: 0,
      y: 12,
      'text-anchor': 'middle',
      text: t(`switch.role.${port.role}`),
    }),
  );

  const badges = svg('g', { class: 'port-vlans', transform: 'translate(0, 34)' });
  const labels = [
    ...port.untagged.map((vlan) => ({ vlan, tagged: false })),
    ...port.tagged.map((vlan) => ({ vlan, tagged: true })),
  ];
  labels.forEach((entry, index) => {
    const y = index * 16;
    badges.append(
      svg('text', {
        class: `vlan-badge ${entry.tagged ? 'is-tagged' : 'is-untagged'}`,
        x: 0,
        y,
        'text-anchor': 'middle',
        fill: vlanColour(entry.vlan, vlans),
        text: entry.tagged ? `${entry.vlan} T` : `${entry.vlan}`,
      }),
    );
  });
  group.append(badges);

  return group;
}

function renderHost(
  host: SwitchHost,
  anchor: Point,
  vlans: number[],
  revealed: boolean,
): SVGGElement {
  const group = svg('g', {
    class: `host ${revealed ? 'is-known' : 'is-unknown'}`,
    'data-host': host.label,
    transform: `translate(${anchor.x}, ${anchor.y})`,
    // The name is withheld until the station has sent, so screen readers agree.
    'aria-label': revealed ? host.label : t('switch.unknownHost'),
  });
  group.append(
    svg('circle', {
      class: 'host-body',
      r: 15,
      stroke: vlanColour(host.vlan, vlans),
    }),
    svg('text', {
      class: 'host-label',
      y: 5,
      'text-anchor': 'middle',
      text: revealed ? host.label : '?',
    }),
  );
  return group;
}

/** The little packet card that travels along the wire. */
export function frameNode(frame: EthernetFrame, at: Point, tagLabel?: string): SVGGElement {
  const group = svg('g', {
    class: 'frame-token',
    transform: `translate(${at.x}, ${at.y})`,
  });
  group.append(
    svg('rect', { x: -40, y: -16, width: 80, height: 32, rx: 8, class: 'frame-body' }),
    svg('text', {
      class: 'frame-text',
      y: -2,
      'text-anchor': 'middle',
      text: `${frame.sourceLabel} → ${frame.destLabel}`,
    }),
    svg('text', {
      class: 'frame-tag',
      y: 10,
      'text-anchor': 'middle',
      text:
        tagLabel ??
        (frame.vlanTag === null ? t('switch.untagged') : `VLAN ${frame.vlanTag}`),
    }),
  );
  return group;
}
