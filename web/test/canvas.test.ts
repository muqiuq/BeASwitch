/**
 * Renders the real SVG through a minimal DOM shim and measures every shape, so
 * nothing can silently end up outside the canvas and get clipped.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { RouterSnapshot, SwitchSnapshot } from '../src/engine/types.js';

interface Shim {
  tag: string;
  ns: string | null;
  attributes: Map<string, string>;
  children: Shim[];
  text: string;
  classes: Set<string>;
}

function createNode(tag: string, ns: string | null): Shim {
  const node: Shim = {
    tag,
    ns,
    attributes: new Map(),
    children: [],
    text: '',
    classes: new Set(),
  };
  const api = {
    get classList() {
      return {
        add: (...names: string[]) => names.forEach((n) => node.classes.add(n)),
        remove: (...names: string[]) => names.forEach((n) => node.classes.delete(n)),
        toggle: (name: string, force?: boolean) => {
          if (force ?? !node.classes.has(name)) node.classes.add(name);
          else node.classes.delete(name);
        },
        contains: (name: string) => node.classes.has(name),
      };
    },
    style: {} as Record<string, string>,
    setAttribute: (name: string, value: unknown) => {
      node.attributes.set(name, String(value));
      if (name === 'class') String(value).split(/\s+/).filter(Boolean).forEach((c) => node.classes.add(c));
    },
    getAttribute: (name: string) => node.attributes.get(name) ?? null,
    append: (...items: unknown[]) => {
      for (const item of items) {
        const child = item as { __node?: Shim; __text?: string };
        if (child.__node) node.children.push(child.__node);
        else if (child.__text !== undefined) node.text += child.__text;
      }
    },
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    remove: () => {},
    set textContent(value: string) {
      node.text = value;
    },
    get textContent() {
      return node.text;
    },
    __node: node,
  };
  return api as unknown as Shim;
}

beforeAll(() => {
  // Node 24 exposes `navigator` as a getter-only global, so it is left alone;
  // detectLocale() already falls back to English when it is unavailable.
  (globalThis as Record<string, unknown>).document = {
    createElement: (tag: string) => createNode(tag, null),
    createElementNS: (ns: string, tag: string) => createNode(tag, ns),
    createTextNode: (text: string) => ({ __text: text }),
    documentElement: { lang: 'en' },
  };
});

interface Extent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  label: string;
}

function numeric(node: Shim, name: string, fallback = 0): number {
  const raw = node.attributes.get(name);
  const value = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

/** Approximate: text is centred on x and sits roughly one line around y. */
function extentsFor(node: Shim, dx: number, dy: number): Extent | null {
  const label = `<${node.tag} class="${[...node.classes].join(' ')}">`;
  switch (node.tag) {
    case 'rect': {
      const x = dx + numeric(node, 'x');
      const y = dy + numeric(node, 'y');
      return { minX: x, minY: y, maxX: x + numeric(node, 'width'), maxY: y + numeric(node, 'height'), label };
    }
    case 'circle': {
      const r = numeric(node, 'r');
      const x = dx + numeric(node, 'cx');
      const y = dy + numeric(node, 'cy');
      return { minX: x - r, minY: y - r, maxX: x + r, maxY: y + r, label };
    }
    case 'ellipse': {
      const rx = numeric(node, 'rx');
      const ry = numeric(node, 'ry');
      const x = dx + numeric(node, 'cx');
      const y = dy + numeric(node, 'cy');
      return { minX: x - rx, minY: y - ry, maxX: x + rx, maxY: y + ry, label };
    }
    case 'line': {
      const x1 = dx + numeric(node, 'x1');
      const y1 = dy + numeric(node, 'y1');
      const x2 = dx + numeric(node, 'x2');
      const y2 = dy + numeric(node, 'y2');
      return { minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2), label };
    }
    case 'text': {
      const half = Math.max(6, node.text.length * 4);
      const x = dx + numeric(node, 'x');
      const y = dy + numeric(node, 'y');
      return { minX: x - half, minY: y - 12, maxX: x + half, maxY: y + 4, label: `${label} "${node.text}"` };
    }
    case 'path': {
      const d = node.attributes.get('d') ?? '';
      const numbers = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      if (numbers.length < 2) return null;
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        xs.push(dx + numbers[i]!);
        ys.push(dy + numbers[i + 1]!);
      }
      return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys), label };
    }
    default:
      return null;
  }
}

function collect(node: Shim, dx = 0, dy = 0, out: Extent[] = []): Extent[] {
  const transform = node.attributes.get('transform') ?? '';
  const match = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/.exec(transform);
  const x = dx + (match ? Number(match[1]) : 0);
  const y = dy + (match ? Number(match[2]) : 0);

  const extent = extentsFor(node, x, y);
  if (extent) out.push(extent);
  for (const child of node.children) collect(child, x, y, out);
  return out;
}

function snapshot(hostsPerPort: number[]): SwitchSnapshot {
  const ports = hostsPerPort.map((_, number) => ({
    number,
    untagged: number === 4 ? [] : [10 + number * 10],
    tagged: number === 4 ? [10, 20, 30] : [],
    role: (number === 4 ? 'trunk' : 'access') as 'trunk' | 'access',
  }));

  const hosts: SwitchSnapshot['hosts'] = [];
  let label = 0;
  hostsPerPort.forEach((count, port) => {
    for (let i = 0; i < count; i++) {
      hosts.push({ label: String.fromCharCode(65 + label++), vlan: 10, port });
    }
  });

  return {
    state: 'awaitingAnswer',
    useVlan: true,
    examMode: false,
    ports,
    hosts,
    vlans: [10, 20, 30],
    frame: {
      sourceLabel: 'A',
      sourcePort: 0,
      sourceVlan: 10,
      destLabel: 'B',
      vlanTag: null,
      payload: 'Ping',
    },
    macTables: [],
    score: { score: 0, correct: 0, wrong: 0, total: 0, percentCorrect: 0 },
    goal: null,
    result: null,
  };
}

describe('switch canvas', () => {
  it.each([
    ['even', [2, 2, 2, 2, 2, 2]],
    ['crowded first port', [8, 1, 1, 1, 1, 0]],
    ['everything on port 0', [12, 0, 0, 0, 0, 0]],
    ['everything on the last port', [0, 0, 0, 0, 0, 12]],
  ])('draws nothing outside the canvas: %s', async (_name, distribution) => {
    const { computeGeometry, renderTopology, VIEW_WIDTH, VIEW_HEIGHT } = await import(
      '../src/ui/switch/topology.js'
    );
    const snap = snapshot(distribution as number[]);
    const refs = renderTopology(snap, computeGeometry(snap));

    const root = (refs.root as unknown as { __node: Shim }).__node;
    const extents = collect(root);
    expect(extents.length).toBeGreaterThan(10);

    const outside = extents.filter(
      (e) => e.minX < 0 || e.minY < 0 || e.maxX > VIEW_WIDTH || e.maxY > VIEW_HEIGHT,
    );

    expect(
      outside.map((e) => `${e.label} x:${e.minX.toFixed(0)}..${e.maxX.toFixed(0)} y:${e.minY.toFixed(0)}..${e.maxY.toFixed(0)}`),
    ).toEqual([]);
  });
});

function routerSnapshot(count: number): RouterSnapshot {
  return {
    state: 'awaitingAnswer',
    examMode: false,
    interfaces: Array.from({ length: count }, (_, number) => ({
      number,
      name: `eth${number}`,
      // The widest address the generator can produce.
      address: '255.255.255.255',
      network: '255.255.255.0',
      mask: 24,
      cidr: '255.255.255.255/24',
    })),
    routes: [],
    packet: {
      sourceMac: 'AA:BB:CC:DD:EE:FF',
      destMac: '11:22:33:44:55:66',
      sourceIp: '203.0.113.9',
      destIp: '198.51.100.42',
    },
    score: { score: 0, correct: 0, wrong: 0, total: 0, percentCorrect: 0 },
    goal: null,
    result: null,
  };
}

describe('router canvas', () => {
  it.each([2, 3, 5, 8])('draws %i interfaces inside the canvas', async (count) => {
    const { computeGeometry, renderTopology, VIEW_WIDTH, VIEW_HEIGHT } = await import(
      '../src/ui/router/topology.js'
    );
    const snap = routerSnapshot(count);
    const refs = renderTopology(snap, computeGeometry(snap), new Set(), () => {}, true);

    const root = (refs.root as unknown as { __node: Shim }).__node;
    const outside = collect(root).filter(
      (e) => e.minX < 0 || e.minY < 0 || e.maxX > VIEW_WIDTH || e.maxY > VIEW_HEIGHT,
    );

    expect(
      outside.map((e) => `${e.label} x:${e.minX.toFixed(0)}..${e.maxX.toFixed(0)}`),
    ).toEqual([]);
  });

  it('no longer draws subnet clouds', async () => {
    const { computeGeometry, renderTopology } = await import('../src/ui/router/topology.js');
    const snap = routerSnapshot(5);
    const refs = renderTopology(snap, computeGeometry(snap), new Set(), () => {}, true);

    const root = (refs.root as unknown as { __node: Shim }).__node;
    const labels = collect(root).map((e) => e.label);
    expect(labels.some((label) => label.includes('cloud'))).toBe(false);
  });

  it('gives the address room inside its box', async () => {
    const { computeGeometry, renderTopology } = await import('../src/ui/router/topology.js');
    const snap = routerSnapshot(5);
    const refs = renderTopology(snap, computeGeometry(snap), new Set(), () => {}, true);

    const root = (refs.root as unknown as { __node: Shim }).__node;
    const extents = collect(root);
    const boxes = extents.filter((e) => e.label.includes('interface-body'));
    const addresses = extents.filter((e) => e.label.includes('interface-addr'));
    expect(boxes).toHaveLength(5);
    expect(addresses).toHaveLength(5);

    // Both lists follow document order, so index i is the same interface.
    boxes.forEach((box, index) => {
      const address = addresses[index]!;
      expect(address.minX, address.label).toBeGreaterThan(box.minX);
      expect(address.maxX, address.label).toBeLessThan(box.maxX);
      expect(address.minY, address.label).toBeGreaterThan(box.minY);
      expect(address.maxY, address.label).toBeLessThan(box.maxY);
    });
  });
});
