import { describe, expect, it } from 'vitest';
import de from '../src/i18n/de.json';
import en from '../src/i18n/en.json';

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((match) => match[1]!).sort();
}

describe('translation catalogs', () => {
  it('define exactly the same keys', () => {
    const enKeys = Object.keys(en).sort();
    const deKeys = Object.keys(de).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it('never leave a string empty', () => {
    for (const [key, value] of Object.entries({ ...en, ...de })) {
      expect(value.trim(), `${key} is empty`).not.toBe('');
    }
  });

  it('use the same placeholders in both languages', () => {
    for (const [key, value] of Object.entries(en)) {
      const translated = (de as Record<string, string>)[key]!;
      expect(placeholders(translated), `placeholders differ for ${key}`).toEqual(
        placeholders(value),
      );
    }
  });

  it('cover every question kind exposed by the engine', () => {
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
    for (const kind of kinds) {
      expect(en, `question.${kind}`).toHaveProperty(`question.${kind}`);
      expect(de, `question.${kind}`).toHaveProperty(`question.${kind}`);
    }
    // The IPv6 prefix question is asked in two directions.
    expect(en).toHaveProperty('question.prefixToPurpose');
    expect(en).toHaveProperty('question.purposeToPrefix');
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
    for (const purpose of purposes) {
      expect(en).toHaveProperty(`prefix.${purpose}`);
      expect(de).toHaveProperty(`prefix.${purpose}`);
    }
  });

  it('covers every routing match outcome and switch action', () => {
    for (const outcome of [
      'match',
      'networkMismatch',
      'targetIsNetworkAddress',
      'targetIsBroadcast',
    ]) {
      expect(en).toHaveProperty(`router.outcome.${outcome}`);
      expect(de).toHaveProperty(`router.outcome.${outcome}`);
    }
    for (const action of ['discard', 'broadcast', 'unicast']) {
      expect(en).toHaveProperty(`switch.action.${action}`);
      expect(de).toHaveProperty(`switch.action.${action}`);
    }
    for (const role of ['access', 'trunk', 'hybrid']) {
      expect(en).toHaveProperty(`switch.role.${role}`);
      expect(de).toHaveProperty(`switch.role.${role}`);
    }
  });
});
