import { describe, expect, it } from 'vitest';
import type { SwitchSnapshot } from '../src/engine/types.js';
import {
  computeGeometry,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../src/ui/switch/topology.js';
import {
  computeGeometry as computeRouterGeometry,
  VIEW_HEIGHT as ROUTER_HEIGHT,
  VIEW_WIDTH as ROUTER_WIDTH,
} from '../src/ui/router/topology.js';
import type { RouterSnapshot } from '../src/engine/types.js';

/** Station glyphs are circles of r=15, so they need this much clearance. */
const GLYPH_RADIUS = 16;

function snapshot(hostsPerPort: number[]): SwitchSnapshot {
  const ports = hostsPerPort.map((_, number) => ({
    number,
    untagged: [10],
    tagged: [],
    role: 'access' as const,
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
    vlans: [10],
    frame: null,
    macTables: [],
    score: { score: 0, correct: 0, wrong: 0, total: 0, percentCorrect: 0 },
    goal: null,
    result: null,
  };
}

describe('switch topology geometry', () => {
  it('keeps an even distribution inside the view box', () => {
    const geometry = computeGeometry(snapshot([2, 2, 2, 2, 2, 2]));
    for (let port = 0; port < 6; port++) {
      const anchor = geometry.portAnchor(port);
      expect(anchor.y).toBeGreaterThanOrEqual(0);
      expect(anchor.y).toBeLessThanOrEqual(VIEW_HEIGHT);
      expect(anchor.x).toBeGreaterThanOrEqual(0);
      expect(anchor.x).toBeLessThanOrEqual(VIEW_WIDTH);
    }
  });

  // The engine may pile several stations onto one port; nothing may spill out.
  it.each([
    ['crowded first port', [8, 1, 1, 1, 1, 0]],
    ['everything on one port', [12, 0, 0, 0, 0, 0]],
    ['crowded last port', [0, 0, 0, 0, 0, 12]],
    ['lopsided', [5, 4, 3, 0, 0, 0]],
    ['single station', [1, 0, 0, 0, 0, 0]],
  ])('keeps stations inside the view box: %s', (_name, distribution) => {
    const snap = snapshot(distribution as number[]);
    const geometry = computeGeometry(snap);

    for (const host of snap.hosts) {
      const { x, y } = geometry.hostAnchor(host.label);
      expect(y, `host ${host.label} y=${y}`).toBeGreaterThanOrEqual(GLYPH_RADIUS);
      expect(y, `host ${host.label} y=${y}`).toBeLessThanOrEqual(VIEW_HEIGHT - GLYPH_RADIUS);
      expect(x, `host ${host.label} x=${x}`).toBeGreaterThanOrEqual(GLYPH_RADIUS);
      expect(x, `host ${host.label} x=${x}`).toBeLessThanOrEqual(VIEW_WIDTH - GLYPH_RADIUS);
    }
  });

  it('never stacks two stations on the exact same spot', () => {
    const snap = snapshot([4, 4, 4, 0, 0, 0]);
    const geometry = computeGeometry(snap);
    const seen = new Set<string>();
    for (const host of snap.hosts) {
      const { x, y } = geometry.hostAnchor(host.label);
      const key = `${Math.round(x)}:${Math.round(y)}`;
      expect(seen.has(key), `two stations at ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('places the chassis centre between the port columns', () => {
    const geometry = computeGeometry(snapshot([2, 2, 2, 2, 2, 2]));
    const left = geometry.portAnchor(0);
    const right = geometry.portAnchor(5);
    expect(geometry.chassisCentre.x).toBeGreaterThan(left.x);
    expect(geometry.chassisCentre.x).toBeLessThan(right.x);
  });
});

function routerSnapshot(count: number): RouterSnapshot {
  return {
    state: 'awaitingAnswer',
    examMode: false,
    interfaces: Array.from({ length: count }, (_, number) => ({
      number,
      name: `eth${number}`,
      address: '10.0.0.1',
      network: '10.0.0.0',
      mask: 24,
      cidr: '10.0.0.1/24',
    })),
    routes: [],
    packet: null,
    score: { score: 0, correct: 0, wrong: 0, total: 0, percentCorrect: 0 },
    goal: null,
    result: null,
  };
}

describe('router topology geometry', () => {
  it.each([2, 3, 5, 8])('keeps %i interfaces and their exits in view', (count) => {
    const geometry = computeRouterGeometry(routerSnapshot(count));
    for (let port = 0; port < count; port++) {
      for (const anchor of [geometry.interfaceAnchor(port), geometry.exitAnchor(port)]) {
        expect(anchor.x).toBeGreaterThanOrEqual(0);
        expect(anchor.x).toBeLessThanOrEqual(ROUTER_WIDTH);
        expect(anchor.y).toBeGreaterThanOrEqual(0);
        expect(anchor.y).toBeLessThanOrEqual(ROUTER_HEIGHT);
      }
    }
  });

  it('starts the packet off-screen so it flies in', () => {
    const geometry = computeRouterGeometry(routerSnapshot(5));
    expect(geometry.entryPoint.x).toBeLessThan(0);
  });
});
