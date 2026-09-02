/**
 * IPv4 arithmetic for the theory panel, and for nothing else.
 *
 * §3 rule 1 keeps simulation logic in Rust, and it still holds for everything
 * that decides an outcome: the question is generated there, the answer is
 * scored there, and none of that is duplicated here. What this file does is
 * re-derive the working for a question the engine has *already* asked, so the
 * theory can walk through the learner's own numbers instead of a fixed
 * example. It runs in practice mode only, which is also why it cannot leak an
 * answer into an exam.
 *
 * Everything here is total: unparsable input returns `null` and the caller
 * drops the worked example rather than inventing one.
 */

export interface Subnet {
  /** Always four entries, 0–255. */
  octets: number[];
  prefix: number;
}

const OCTET_COUNT = 4;
const BITS = 32;

function octetsFrom(text: string): number[] | null {
  const parts = text.trim().split('.');
  if (parts.length !== OCTET_COUNT) return null;

  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : -1));
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
}

/** `192.168.6.4/24` */
export function parseSubnet(text: string): Subnet | null {
  const [address, prefix, ...rest] = text.trim().split('/');
  if (rest.length > 0 || address === undefined) return null;

  const octets = octetsFrom(address);
  const length = parsePrefix(prefix ?? '');
  return octets && length !== null ? { octets, prefix: length } : null;
}

/** A bare prefix length, `0`–`32`. */
export function parsePrefix(text: string): number | null {
  if (!/^\d{1,2}$/.test(text.trim())) return null;
  const prefix = Number(text.trim());
  return prefix <= BITS ? prefix : null;
}

/** `255.255.255.0` */
export function parseDotted(text: string): number[] | null {
  return octetsFrom(text);
}

export function maskOctets(prefix: number): number[] {
  return Array.from({ length: OCTET_COUNT }, (_, index) => {
    const bits = Math.min(8, Math.max(0, prefix - index * 8));
    return 256 - 2 ** (8 - bits);
  }).map((value) => (value === 256 ? 0 : value));
}

/** The prefix a mask stands for, or `null` if its ones are not in one run. */
export function prefixFromMask(octets: number[]): number | null {
  const bits = octets.map((octet) => octet.toString(2).padStart(8, '0')).join('');
  const match = /^(1*)(0*)$/.exec(bits);
  return match ? (match[1] ?? '').length : null;
}

/** Host bits all 0 gives the network, all 1 gives the broadcast address. */
export function applyPrefix(octets: number[], prefix: number, fill: 0 | 1): number[] {
  return octets.map((octet, index) => {
    const bits = Math.min(8, Math.max(0, prefix - index * 8));
    const keep = octet & (256 - 2 ** (8 - bits));
    return fill === 0 ? keep : keep | (2 ** (8 - bits) - 1);
  });
}

export function format(octets: number[]): string {
  return octets.join('.');
}

/** The octet the prefix boundary falls in, 0-based. */
export function boundaryOctet(prefix: number): number {
  return Math.min(OCTET_COUNT - 1, Math.floor(prefix / 8));
}

function group(octets: number[]): string[] {
  return octets.map((octet) => octet.toString(2).padStart(8, '0'));
}

/**
 * Binary, dotted per octet. With a boundary, a `|` marks the prefix: it
 * replaces the separator when the boundary falls on an octet edge, so every
 * row of a block keeps the same width whatever the prefix is.
 */
export function toBits(octets: number[], boundary?: number): string {
  return joinBits(group(octets), boundary);
}

/** `NNNN|HHHH`, with the last `borrowed` network bits marked `S` instead. */
export function bitsLegend(prefix: number, borrowed = 0): string {
  const marks = Array.from({ length: BITS }, (_, index) => {
    if (index >= prefix) return 'H';
    return index >= prefix - borrowed ? 'S' : 'N';
  }).join('');

  const groups = Array.from({ length: OCTET_COUNT }, (_, index) =>
    marks.slice(index * 8, index * 8 + 8),
  );
  return joinBits(groups, prefix);
}

function joinBits(groups: string[], boundary?: number): string {
  if (boundary === undefined || boundary <= 0 || boundary >= BITS) return groups.join('.');

  const octet = Math.floor(boundary / 8);
  const inside = boundary % 8;
  if (inside === 0) {
    return groups
      .map((bits, index) => (index === octet ? `|${bits}` : index === 0 ? bits : `.${bits}`))
      .join('');
  }
  return groups
    .map((bits, index) =>
      index === octet ? `${bits.slice(0, inside)}|${bits.slice(inside)}` : bits,
    )
    .join('.');
}

export function toNumber(octets: number[]): number {
  // Arithmetic rather than shifts: `<<` is signed 32-bit and would go negative.
  return octets.reduce((total, octet) => total * 256 + octet, 0);
}

export function fromNumber(value: number): number[] {
  return [16777216, 65536, 256, 1].map((unit) => Math.floor(value / unit) % 256);
}

/** Smallest power of two that is at least `count`, as its exponent. */
export function bitsForSplits(count: number): number {
  let bits = 0;
  while (2 ** bits < count) bits += 1;
  return bits;
}
