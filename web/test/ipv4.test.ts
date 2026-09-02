import { describe, expect, it } from 'vitest';
import {
  applyPrefix,
  bitsForSplits,
  bitsLegend,
  boundaryOctet,
  format,
  fromNumber,
  maskOctets,
  parseDotted,
  parsePrefix,
  parseSubnet,
  prefixFromMask,
  toBits,
  toNumber,
} from '../src/ui/quiz/ipv4.js';

/**
 * The theory panel walks through the learner's own question, so these numbers
 * are shown as fact. Wrong ones would teach the wrong method.
 */

describe('parsing', () => {
  it('reads a subnet in the form the engine emits', () => {
    expect(parseSubnet('192.168.6.4/24')).toEqual({ octets: [192, 168, 6, 4], prefix: 24 });
    expect(parseSubnet('10.0.0.0/8')).toEqual({ octets: [10, 0, 0, 0], prefix: 8 });
  });

  it('rejects anything it cannot vouch for', () => {
    for (const input of ['', '192.168.6.4', '192.168.6.4/33', '192.168.6/24', 'x.y.z.w/24',
      '256.1.1.1/24', '192.168.6.4/24/8', '1.2.3.4/-1']) {
      expect(parseSubnet(input), input).toBeNull();
    }
  });

  it('reads a bare prefix and a dotted mask', () => {
    expect(parsePrefix('0')).toBe(0);
    expect(parsePrefix('32')).toBe(32);
    expect(parsePrefix('33')).toBeNull();
    expect(parsePrefix('')).toBeNull();
    expect(parseDotted('255.255.224.0')).toEqual([255, 255, 224, 0]);
    expect(parseDotted('255.255.224')).toBeNull();
  });
});

describe('masks', () => {
  it.each([
    [0, '0.0.0.0'],
    [8, '255.0.0.0'],
    [19, '255.255.224.0'],
    [24, '255.255.255.0'],
    [26, '255.255.255.192'],
    [30, '255.255.255.252'],
    [32, '255.255.255.255'],
  ])('/%i is %s', (prefix, dotted) => {
    expect(format(maskOctets(prefix))).toBe(dotted);
  });

  it('reads a prefix back out of a mask', () => {
    expect(prefixFromMask([255, 255, 224, 0])).toBe(19);
    expect(prefixFromMask([0, 0, 0, 0])).toBe(0);
    expect(prefixFromMask([255, 255, 255, 255])).toBe(32);
  });

  it('refuses a mask whose ones are not in one run', () => {
    expect(prefixFromMask([255, 255, 255, 160])).toBeNull();
    expect(prefixFromMask([255, 0, 255, 0])).toBeNull();
  });
});

describe('network and broadcast', () => {
  it.each([
    ['192.168.128.255/19', '192.168.128.0', '192.168.159.255'],
    ['192.168.6.4/24', '192.168.6.0', '192.168.6.255'],
    ['10.1.2.3/8', '10.0.0.0', '10.255.255.255'],
    ['172.16.5.130/26', '172.16.5.128', '172.16.5.191'],
    ['192.0.2.1/32', '192.0.2.1', '192.0.2.1'],
    ['1.2.3.4/0', '0.0.0.0', '255.255.255.255'],
  ])('%s -> %s .. %s', (input, network, broadcast) => {
    const subnet = parseSubnet(input)!;
    expect(format(applyPrefix(subnet.octets, subnet.prefix, 0))).toBe(network);
    expect(format(applyPrefix(subnet.octets, subnet.prefix, 1))).toBe(broadcast);
  });
});

describe('binary rendering', () => {
  it('marks a boundary inside an octet without losing a separator', () => {
    expect(toBits([192, 168, 128, 255], 19)).toBe('11000000.10101000.100|00000.11111111');
  });

  it('replaces the separator when the boundary is on an octet edge', () => {
    expect(toBits([192, 168, 252, 234], 24)).toBe('11000000.10101000.11111100|11101010');
  });

  it('omits the bar entirely at the ends of the range', () => {
    expect(toBits([255, 255, 255, 255], 0)).toBe('11111111.11111111.11111111.11111111');
    expect(toBits([0, 0, 0, 0], 32)).toBe('00000000.00000000.00000000.00000000');
    expect(toBits([255, 0, 0, 0])).toBe('11111111.00000000.00000000.00000000');
  });

  it('keeps every row of a block the same width', () => {
    for (const prefix of [1, 7, 8, 15, 16, 19, 24, 26, 31]) {
      const rows = [toBits([192, 168, 128, 255], prefix), toBits(maskOctets(prefix), prefix),
        bitsLegend(prefix)];
      expect(new Set(rows.map((row) => row.length)).size, `prefix ${prefix}`).toBe(1);
      expect(new Set(rows.map((row) => row.indexOf('|'))).size, `prefix ${prefix}`).toBe(1);
    }
  });

  it('legends the network and host bits, and the borrowed ones', () => {
    expect(bitsLegend(19)).toBe('NNNNNNNN.NNNNNNNN.NNN|HHHHH.HHHHHHHH');
    expect(bitsLegend(24)).toBe('NNNNNNNN.NNNNNNNN.NNNNNNNN|HHHHHHHH');
    expect(bitsLegend(19, 3)).toBe('NNNNNNNN.NNNNNNNN.SSS|HHHHH.HHHHHHHH');
    expect(bitsLegend(18, 2)).toBe('NNNNNNNN.NNNNNNNN.SS|HHHHHH.HHHHHHHH');
  });
});

describe('boundaries and splits', () => {
  it('finds the octet the prefix falls in', () => {
    expect(boundaryOctet(19)).toBe(2);
    expect(boundaryOctet(24)).toBe(3);
    expect(boundaryOctet(8)).toBe(1);
    expect(boundaryOctet(32)).toBe(3);
  });

  it('rounds a subnet count up to a power of two', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(bitsForSplits)).toEqual([0, 1, 2, 2, 3, 3, 3, 3, 4]);
  });
});

describe('whole addresses as numbers', () => {
  it('round-trips, and steps by a block size', () => {
    expect(toNumber([192, 168, 0, 0])).toBe(3232235520);
    expect(fromNumber(3232235520)).toEqual([192, 168, 0, 0]);
    expect(fromNumber(toNumber([255, 255, 255, 255]))).toEqual([255, 255, 255, 255]);

    const base = toNumber([192, 168, 0, 0]);
    const block = 2 ** (32 - 19);
    expect([0, 1, 2, 7].map((k) => format(fromNumber(base + k * block)))).toEqual([
      '192.168.0.0',
      '192.168.32.0',
      '192.168.64.0',
      '192.168.224.0',
    ]);
  });
});
