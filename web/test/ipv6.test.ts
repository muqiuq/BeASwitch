import { describe, expect, it } from 'vitest';
import {
  abbreviate,
  eui64Address,
  eui64Id,
  expand,
  hex4,
  parseGroups,
  parseMac,
  parseSubnet6,
  zeroRun,
} from '../src/ui/quiz/ipv6.js';

/**
 * The abbreviation rules have to agree with what the engine will accept, so
 * these cases mirror `Ipv6Addr::to_string` (RFC 5952) rather than a house
 * style. See also gotcha 3: a single zero group is never compressed.
 */

describe('parsing', () => {
  it('reads both spellings', () => {
    expect(parseGroups('2001:0db8:0000:0000:1234:0000:0000:0001')).toEqual([
      0x2001, 0x0db8, 0, 0, 0x1234, 0, 0, 1,
    ]);
    expect(parseGroups('2001:db8::1')).toEqual([0x2001, 0x0db8, 0, 0, 0, 0, 0, 1]);
    expect(parseGroups('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(parseGroups('::')).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(parseGroups('2001:db8::')).toEqual([0x2001, 0x0db8, 0, 0, 0, 0, 0, 0]);
  });

  it('rejects what it cannot vouch for', () => {
    for (const input of ['', '2001:db8', '2001::db8::1', 'wxyz::1', '2001:db8:1:2:3:4:5:6:7',
      '12345::1']) {
      expect(parseGroups(input), input).toBeNull();
    }
  });

  it('reads a subnet and a MAC', () => {
    expect(parseSubnet6('2001:db8:1234::/56')).toEqual({
      groups: [0x2001, 0x0db8, 0x1234, 0, 0, 0, 0, 0],
      prefix: 56,
    });
    expect(parseSubnet6('2001:db8::/129')).toBeNull();
    expect(parseMac('02:1A:2B:3C:4D:5E')).toEqual([0x02, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e]);
    expect(parseMac('02-1A-2B-3C-4D-5E')).toEqual([0x02, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e]);
    expect(parseMac('02:1A:2B:3C:4D')).toBeNull();
  });
});

describe('expanding and abbreviating', () => {
  it.each([
    ['2001:0db8:0000:0000:1234:0000:0000:0001', '2001:db8::1234:0:0:1'],
    ['2001:0db8:0000:0001:0000:0000:0000:0001', '2001:db8:0:1::1'],
    ['0000:0000:0000:0000:0000:0000:0000:0001', '::1'],
    ['0000:0000:0000:0000:0000:0000:0000:0000', '::'],
    ['2001:0db8:0000:0000:0000:0000:0000:0000', '2001:db8::'],
    ['fe80:0000:0000:0000:0204:61ff:fe9d:f156', 'fe80::204:61ff:fe9d:f156'],
    ['2001:0db8:0001:0002:0003:0004:0005:0006', '2001:db8:1:2:3:4:5:6'],
  ])('%s -> %s', (full, short) => {
    const groups = parseGroups(full)!;
    expect(abbreviate(groups)).toBe(short);
    expect(expand(groups)).toBe(full);
    expect(expand(parseGroups(short)!)).toBe(full);
  });

  it('never compresses a single zero group', () => {
    // RFC 5952 §4.2.2, and the reason the generator asks for a run of two.
    expect(abbreviate(parseGroups('2001:0db8:0000:0001:0002:0003:0004:0005')!)).toBe(
      '2001:db8:0:1:2:3:4:5',
    );
    expect(zeroRun([0x2001, 0, 1, 2, 3, 4, 5, 6])).toBeNull();
  });

  it('takes the first of two equally long runs', () => {
    expect(zeroRun([0, 0, 1, 0, 0, 2, 3, 4])).toEqual({ start: 0, length: 2 });
    expect(abbreviate([0x2001, 0, 0, 1, 0, 0, 2, 3])).toBe('2001::1:0:0:2:3');
  });

  it('pads a group to four digits', () => {
    expect([0, 1, 0x0db8, 0xffff].map(hex4)).toEqual(['0000', '0001', '0db8', 'ffff']);
  });
});

describe('EUI-64', () => {
  it('inserts fffe and flips the universal/local bit', () => {
    // The textbook example: 00:1A:2B:3C:4D:5E has its first octet become 02.
    expect(eui64Id([0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e]).map(hex4)).toEqual([
      '021a',
      '2bff',
      'fe3c',
      '4d5e',
    ]);
    // …and back the other way: a 02 becomes 00.
    expect(eui64Id([0x02, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e]).map(hex4)).toEqual([
      '001a',
      '2bff',
      'fe3c',
      '4d5e',
    ]);
  });

  it('keeps the prefix and replaces the host half', () => {
    const prefix = parseSubnet6('2001:db8:1:2::/64')!;
    const address = eui64Address(prefix.groups, parseMac('00:1A:2B:3C:4D:5E')!);
    expect(abbreviate(address)).toBe('2001:db8:1:2:21a:2bff:fe3c:4d5e');
  });
});
