import { describe, expect, it } from 'vitest';
import { buildQuery, buildUrl, emptyConfig, parseConfig } from '../src/ui/shared/config.js';

/**
 * The shareable link is the only piece of state that arrives from outside the
 * app, so it has to survive being truncated, mistyped or hand-edited.
 */

describe('parseConfig', () => {
  it('ignores a query that carries no configuration', () => {
    expect(parseConfig('')).toBeNull();
    expect(parseConfig('?utm_source=newsletter')).toBeNull();
  });

  it('reads the visible exercises in engine order and drops unknown names', () => {
    expect(parseConfig('?tools=quiz,switch,telnet')?.tools).toEqual(['switch', 'quiz']);
  });

  it('keeps every exercise when the list is unusable', () => {
    expect(parseConfig('?tools=')?.tools).toEqual(['switch', 'router', 'quiz']);
    expect(parseConfig('?tools=nonsense')?.tools).toEqual(['switch', 'router', 'quiz']);
  });

  it('lets a single exercise imply the tool list', () => {
    const config = parseConfig('?tools=switch,router&only=quiz');
    expect(config?.only).toBe('quiz');
    expect(config?.tools).toEqual(['quiz']);
  });

  it('reads the lock, the language and the motion preference', () => {
    expect(parseConfig('?lock=1')?.lock).toBe(true);
    expect(parseConfig('?lock=0')?.lock).toBe(false);
    expect(parseConfig('?lang=pt-BR')?.locale).toBe('pt-BR');
    expect(parseConfig('?lang=klingon')?.locale).toBeNull();
    expect(parseConfig('?motion=0')?.reducedMotion).toBe(true);
    expect(parseConfig('?motion=1')?.reducedMotion).toBe(false);
    expect(parseConfig('?lock=1')?.reducedMotion).toBeNull();
  });

  it('reads exam mode with its goal', () => {
    expect(parseConfig('?switch=exam:16/20')?.settings.switch).toEqual({
      examMode: true,
      goalCorrect: 16,
      goalTotal: 20,
    });
    expect(parseConfig('?quiz=practice')?.settings.quiz).toEqual({ examMode: false });
  });

  it('drops a goal that cannot hold, leaving the defaults to fill in', () => {
    // More correct answers than attempts, and a total beyond the input's range.
    expect(parseConfig('?router=exam:99/20')?.settings.router).toEqual({
      examMode: true,
      goalTotal: 20,
    });
    // An out-of-range total falls back to the default; the goal itself stands.
    expect(parseConfig('?router=exam:5/900')?.settings.router).toEqual({
      examMode: true,
      goalCorrect: 5,
    });
    expect(parseConfig('?router=exam:x/y')?.settings.router).toEqual({ examMode: true });
  });

  it('only applies a flag to the exercise it belongs to', () => {
    expect(parseConfig('?switch=practice,novlan')?.settings.switch).toEqual({
      examMode: false,
      useVlan: false,
    });
    expect(parseConfig('?router=practice,novlan,ipv4')?.settings.router).toEqual({
      examMode: false,
    });
  });

  it('treats a listed quiz category as the whole selection', () => {
    expect(parseConfig('?quiz=practice,ipv6')?.settings.quiz).toEqual({
      examMode: false,
      ipv4: false,
      ipv6: true,
    });
    // Naming none says nothing, so the learner's own choice survives.
    expect(parseConfig('?quiz=practice')?.settings.quiz).toEqual({ examMode: false });
  });

  it('survives junk without throwing', () => {
    expect(() => parseConfig('?tools=&only=&lock=&lang=&motion=&switch=&quiz=,,,')).not.toThrow();
    expect(parseConfig('?switch=')?.settings.switch).toEqual({});
  });
});

describe('buildQuery', () => {
  it('spells out the options of every offered exercise', () => {
    const config = emptyConfig();
    expect(buildQuery(config)).toBe(
      '?switch=practice,vlan&router=practice&quiz=practice,ipv4,ipv6',
    );
  });

  it('leaves the separators readable', () => {
    const query = buildQuery({
      ...emptyConfig(),
      tools: ['quiz'],
      only: 'quiz',
      lock: true,
      locale: 'es-419',
      settings: { quiz: { examMode: true, goalCorrect: 8, goalTotal: 10, ipv6: false } },
    });
    expect(query).toBe('?only=quiz&lock=1&lang=es-419&quiz=exam:8/10,ipv4');
    expect(query).not.toContain('%');
  });

  it('names the tools only when some are hidden', () => {
    expect(buildQuery({ ...emptyConfig(), tools: ['switch', 'quiz'] })).toContain(
      '?tools=switch,quiz&',
    );
    expect(buildQuery(emptyConfig())).not.toContain('tools=');
  });

  it('round-trips through the parser', () => {
    const config = {
      ...emptyConfig(),
      tools: ['switch' as const, 'quiz' as const],
      lock: true,
      locale: 'de' as const,
      reducedMotion: true,
      settings: {
        switch: { examMode: true, goalCorrect: 12, goalTotal: 15, useVlan: false },
        quiz: { examMode: false, ipv4: true, ipv6: false },
      },
    };
    const parsed = parseConfig(buildQuery(config));

    expect(parsed?.tools).toEqual(config.tools);
    expect(parsed?.lock).toBe(true);
    expect(parsed?.locale).toBe('de');
    expect(parsed?.reducedMotion).toBe(true);
    expect(parsed?.settings.switch).toMatchObject(config.settings.switch);
    expect(parsed?.settings.quiz).toMatchObject(config.settings.quiz);
  });
});

describe('buildUrl', () => {
  it('replaces an existing query and hash rather than appending to them', () => {
    const url = buildUrl('https://be-a.network/?only=switch#/switch', {
      ...emptyConfig(),
      tools: ['router'],
      only: 'router',
    });
    expect(url).toBe('https://be-a.network/?only=router&router=practice');
  });
});
