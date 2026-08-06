import { beforeAll, describe, expect, it } from 'vitest';

/**
 * A CSS transform animation replaces the SVG `transform` attribute, so any
 * keyframe that animates transform must re-state the element's own position.
 * Forgetting this snaps the element to the canvas origin, where it is clipped.
 */

interface Recorded {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

function fakeNode(transform: string | null): { node: Element; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const node = {
    getAttribute: (name: string) => (name === 'transform' ? transform : null),
    classList: { add: () => {}, remove: () => {} },
    animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      calls.push({ keyframes, options });
      return { finished: Promise.resolve() };
    },
  };
  return { node: node as unknown as Element, calls };
}

beforeAll(() => {
  (globalThis as Record<string, unknown>).window = {
    matchMedia: () => ({ matches: false }),
  };
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: () => null,
    setItem: () => {},
  };
});

describe('baseTransform', () => {
  it('extracts an existing translate', async () => {
    const { baseTransform } = await import('../src/ui/shared/animate.js');
    expect(baseTransform(fakeNode('translate(220, 130)').node)).toBe('translate(220px, 130px) ');
    expect(baseTransform(fakeNode('translate(220,130)').node)).toBe('translate(220px, 130px) ');
    expect(baseTransform(fakeNode('translate(-90 260)').node)).toBe('translate(-90px, 260px) ');
    expect(baseTransform(fakeNode('translate(40)').node)).toBe('translate(40px, 0px) ');
  });

  it('is empty for nodes that are not positioned by an attribute', async () => {
    const { baseTransform } = await import('../src/ui/shared/animate.js');
    expect(baseTransform(fakeNode(null).node)).toBe('');
    expect(baseTransform(fakeNode('rotate(45)').node)).toBe('');
  });
});

describe('transform animations', () => {
  it('pulse keeps the element in place', async () => {
    const { pulse } = await import('../src/ui/shared/animate.js');
    const { node, calls } = fakeNode('translate(220, 130)');
    await pulse(node);

    expect(calls).toHaveLength(1);
    for (const frame of calls[0]!.keyframes) {
      expect(String(frame.transform)).toContain('translate(220px, 130px)');
    }
    expect(calls[0]!.options.fill).not.toBe('both');
    expect(calls[0]!.options.fill).not.toBe('forwards');
  });

  it('shake keeps the element in place', async () => {
    const { shake } = await import('../src/ui/shared/animate.js');
    const { node, calls } = fakeNode('translate(680, 390)');
    await shake(node);

    for (const frame of calls[0]!.keyframes) {
      expect(String(frame.transform)).toContain('translate(680px, 390px)');
    }
  });

  it('leaves plain HTML elements untouched', async () => {
    const { pulse } = await import('../src/ui/shared/animate.js');
    const { node, calls } = fakeNode(null);
    await pulse(node);

    for (const frame of calls[0]!.keyframes) {
      expect(String(frame.transform)).not.toContain('translate');
    }
  });

  it('travel holds its final position, because that is where the node rests', async () => {
    const { travel } = await import('../src/ui/shared/animate.js');
    const { node, calls } = fakeNode('translate(450, 260)');
    await travel(node as unknown as SVGGraphicsElement, { x: 90, y: 130 }, { x: 450, y: 260 }, 400);

    expect(calls[0]!.options.fill).toBe('forwards');
    expect(String(calls[0]!.keyframes.at(-1)?.transform)).toBe('translate(450px, 260px)');
  });
});
