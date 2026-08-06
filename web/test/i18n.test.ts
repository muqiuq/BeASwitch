import { describe, expect, it } from 'vitest';
import de from '../src/i18n/de.json';
import en from '../src/i18n/en.json';
import es419 from '../src/i18n/es-419.json';
import ptBR from '../src/i18n/pt-BR.json';

const PLACEHOLDER = /\{(\w+)\}/g;

/** English is the reference; every other catalog must match it exactly. */
const reference = en as Record<string, string>;
const translations: Record<string, Record<string, string>> = {
  de,
  'pt-BR': ptBR,
  'es-419': es419,
};

function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((match) => match[1]!).sort();
}

describe.each(Object.keys(translations))('%s catalog', (name) => {
  const catalog = translations[name]!;

  it('defines exactly the same keys as English', () => {
    expect(Object.keys(catalog).sort()).toEqual(Object.keys(reference).sort());
  });

  it('never leaves a string empty', () => {
    for (const [key, value] of Object.entries(catalog)) {
      expect(value.trim(), `${key} is empty`).not.toBe('');
    }
  });

  it('uses the same placeholders as English', () => {
    for (const [key, value] of Object.entries(reference)) {
      expect(placeholders(catalog[key]!), `placeholders differ for ${key}`).toEqual(
        placeholders(value),
      );
    }
  });

  it('is actually translated rather than copied', () => {
    // Brand names, protocol names and industry terms are legitimately identical.
    const shared = new Set([
      'app.title',
      'app.brand',
      'home.switch.title',
      'home.router.title',
      'home.categoryIpv4',
      'home.categoryIpv6',
      'quiz.category.ipv4',
      'quiz.category.ipv6',
      'switch.title',
      'switch.vlan',
      'switch.tableMac',
      'switch.role.access',
      'switch.role.trunk',
      'router.title',
      'router.interfaces',
      'prefix.multicast',
      'prefix.loopback',
      'prefix.sixToFour',
    ]);

    const identical = Object.keys(reference).filter(
      (key) => !shared.has(key) && catalog[key] === reference[key],
    );
    // Short words coincide across languages; a wholesale copy would not.
    expect(identical.length, `untranslated: ${identical.join(', ')}`).toBeLessThan(12);
  });
});

describe('translation coverage', () => {
  const all = [reference, ...Object.values(translations)];

  it('covers every question kind exposed by the engine', () => {
    const kinds = [
      'networkAddress',
      'broadcast',
      'numberOfHosts',
      'splitSubnetSecond',
      'splitSubnetThird',
      'cidrToDotted',
      'dottedToCidr',
      'abbreviateIpv6',
      'expandIpv6',
      'eui64',
      'numberOfIpv6Subnets',
    ];
    for (const catalog of all) {
      for (const kind of kinds) {
        expect(catalog, `question.${kind}`).toHaveProperty(`question.${kind}`);
      }
      // The IPv6 prefix question is asked in two directions.
      expect(catalog).toHaveProperty('question.prefixToPurpose');
      expect(catalog).toHaveProperty('question.purposeToPrefix');
    }
  });

  it('covers every IPv6 prefix purpose', () => {
    const purposes = [
      'uniqueLocalUnicast',
      'multicast',
      'linkScopedUnicast',
      'documentation',
      'globalUnicast',
      'loopback',
      'sixToFour',
      'ipv4Ipv6Translation',
    ];
    for (const catalog of all) {
      for (const purpose of purposes) {
        expect(catalog).toHaveProperty(`prefix.${purpose}`);
      }
    }
  });

  it('covers every routing outcome, switch action and port role', () => {
    for (const catalog of all) {
      for (const outcome of [
        'match',
        'networkMismatch',
        'targetIsNetworkAddress',
        'targetIsBroadcast',
      ]) {
        expect(catalog).toHaveProperty(`router.outcome.${outcome}`);
      }
      for (const action of ['discard', 'broadcast', 'unicast']) {
        expect(catalog).toHaveProperty(`switch.action.${action}`);
      }
      for (const role of ['access', 'trunk', 'hybrid']) {
        expect(catalog).toHaveProperty(`switch.role.${role}`);
      }
    }
  });
});
