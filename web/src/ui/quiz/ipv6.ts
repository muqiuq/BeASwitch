/**
 * IPv6 notation for the theory panel, under the same terms as `ipv4.ts`: it
 * re-derives the working for a question the engine has already asked, never
 * generates one and never scores one, and runs in practice mode only.
 *
 * `abbreviate` mirrors what Rust's `Ipv6Addr::to_string` produces (RFC 5952),
 * because the theory must agree with the answer the engine will accept.
 *
 * Everything here is total: unparsable input returns `null`.
 */

const GROUPS = 8;

/** Accepts both spellings, `2001:0db8:…` and `2001:db8::1`. */
export function parseGroups(text: string): number[] | null {
  const value = text.trim().toLowerCase();
  if (!/^[0-9a-f:]+$/.test(value)) return null;

  const halves = value.split('::');
  if (halves.length > 2) return null;

  const read = (part: string): number[] =>
    part === '' ? [] : part.split(':').map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : -1));

  const head = read(halves[0] ?? '');
  const tail = halves.length === 2 ? read(halves[1] ?? '') : [];
  if ([...head, ...tail].some((group) => group < 0)) return null;

  if (halves.length === 2) {
    const fill = GROUPS - head.length - tail.length;
    return fill >= 1 ? [...head, ...Array<number>(fill).fill(0), ...tail] : null;
  }
  return head.length === GROUPS ? head : null;
}

export interface Subnet6 {
  groups: number[];
  prefix: number;
}

/** `2001:db8:1234::/56` */
export function parseSubnet6(text: string): Subnet6 | null {
  const [address, prefix, ...rest] = text.trim().split('/');
  if (rest.length > 0 || address === undefined || prefix === undefined) return null;
  if (!/^\d{1,3}$/.test(prefix)) return null;

  const groups = parseGroups(address);
  const length = Number(prefix);
  return groups && length <= 128 ? { groups, prefix: length } : null;
}

/** `AA:BB:CC:DD:EE:FF`, also accepting `-` separators. */
export function parseMac(text: string): number[] | null {
  const parts = text.trim().toLowerCase().split(/[:-]/);
  if (parts.length !== 6) return null;

  const octets = parts.map((part) => (/^[0-9a-f]{2}$/.test(part) ? parseInt(part, 16) : -1));
  return octets.every((octet) => octet >= 0) ? octets : null;
}

export function hex4(value: number): string {
  return value.toString(16).padStart(4, '0');
}

export function expand(groups: number[]): string {
  return groups.map(hex4).join(':');
}

/** The longest run of zero groups, or `null` when no run reaches two. */
export function zeroRun(groups: number[]): { start: number; length: number } | null {
  let best: { start: number; length: number } | null = null;
  let start = -1;

  groups.forEach((group, index) => {
    if (group === 0) {
      if (start < 0) start = index;
      const length = index - start + 1;
      // Strictly greater: on a tie the earlier run wins, as RFC 5952 requires.
      if (length >= 2 && (!best || length > best.length)) best = { start, length };
    } else {
      start = -1;
    }
  });
  return best;
}

export function abbreviate(groups: number[]): string {
  const text = groups.map((group) => group.toString(16));
  const run = zeroRun(groups);
  if (!run) return text.join(':');

  return `${text.slice(0, run.start).join(':')}::${text.slice(run.start + run.length).join(':')}`;
}

/** The 64-bit interface identifier a MAC turns into: `FFFE` in, U/L flipped. */
export function eui64Id(mac: number[]): number[] {
  const bytes = [(mac[0] ?? 0) ^ 0x02, mac[1] ?? 0, mac[2] ?? 0, 0xff, 0xfe, mac[3] ?? 0, mac[4] ?? 0, mac[5] ?? 0];
  return [0, 2, 4, 6].map((index) => ((bytes[index] ?? 0) << 8) | (bytes[index + 1] ?? 0));
}

/** The prefix's own 64 bits, with the interface identifier appended. */
export function eui64Address(prefix: number[], mac: number[]): number[] {
  return [...prefix.slice(0, 4), ...eui64Id(mac)];
}

export function toBinary(value: number, width: number): string {
  return value.toString(2).padStart(width, '0');
}
