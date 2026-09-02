/**
 * Theory for the IPv4 question types, shown under the question in practice
 * mode. Condensed from the course notes on address calculation and subnetting.
 *
 * Seven question kinds map onto four topics, because one calculation answers
 * several of them.
 *
 * The worked example is **the learner's own question**, walked through step by
 * step, rather than a fixed one they would have to transfer. That does put the
 * answer within reach of anyone who reads to the end — which is why the panel
 * exists in practice mode only, and why there is no highlighted "result" box:
 * the numbers arrive as the working, not as a solution.
 *
 * A question whose subject cannot be parsed simply loses its example; the
 * method, the reference tables and the notes are still there.
 */

import { t } from '../../i18n/index.js';
import { el } from '../shared/dom.js';
import type { QuizQuestion } from '../../engine/types.js';
import {
  abbreviate,
  eui64Address,
  eui64Id,
  expand,
  hex4,
  parseGroups,
  parseMac,
  parseSubnet6,
  toBinary,
  zeroRun,
} from './ipv6.js';
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
} from './ipv4.js';

export type TopicId =
  | 'address'
  | 'hostCount'
  | 'split'
  | 'mask'
  | 'notation'
  | 'eui64'
  | 'ipv6Subnets'
  | 'ipv6Prefix';

const TOPIC_BY_KIND: Record<string, TopicId> = {
  networkAddress: 'address',
  broadcast: 'address',
  numberOfHosts: 'hostCount',
  splitSubnetSecond: 'split',
  splitSubnetThird: 'split',
  cidrToDotted: 'mask',
  dottedToCidr: 'mask',
  abbreviateIpv6: 'notation',
  expandIpv6: 'notation',
  eui64: 'eui64',
  numberOfIpv6Subnets: 'ipv6Subnets',
  ipv6Prefix: 'ipv6Prefix',
};

/** Mirrors `IPV6_PREFIXES` in the engine; the purposes are i18n keys. */
const IPV6_PREFIXES: Array<[string, string]> = [
  ['2000::/3', 'globalUnicast'],
  ['fc00::/7', 'uniqueLocalUnicast'],
  ['fe80::/10', 'linkScopedUnicast'],
  ['ff00::/8', 'multicast'],
  ['::1/128', 'loopback'],
  ['2001:db8::/32', 'documentation'],
  ['2002::/16', 'sixToFour'],
  ['64:ff9b::/96', 'ipv4Ipv6Translation'],
];

/** `null` for a question type that has no theory of its own. */
export function theoryTopic(kind: string): TopicId | null {
  return TOPIC_BY_KIND[kind] ?? null;
}

export function theoryPanel(
  question: QuizQuestion,
  topic: TopicId,
  open: boolean,
  onToggle: (open: boolean) => void,
): HTMLElement {
  const details = el('details', { class: 'theory', open });
  details.append(
    el(
      'summary',
      { class: 'theory-summary' },
      el('span', { text: t('quiz.theory') }),
      el('span', { class: 'theory-topic', text: t(`theory.${topic}.title`) }),
    ),
    el('div', { class: 'theory-body' }, ...BODIES[topic](question)),
  );
  details.addEventListener('toggle', () => onToggle(details.open));
  return details;
}

const BODIES: Record<TopicId, (question: QuizQuestion) => HTMLElement[]> = {
  address: addressBody,
  hostCount: hostCountBody,
  split: splitBody,
  mask: maskBody,
  notation: notationBody,
  eui64: eui64Body,
  ipv6Subnets: ipv6SubnetsBody,
  ipv6Prefix: ipv6PrefixBody,
};

function addressBody(question: QuizQuestion): HTMLElement[] {
  const head = [el('p', { text: t('theory.address.intro') }), steps('address', 4)];
  const subnet = parseSubnet(question.subject);
  if (!subnet) return [...head, note(t('theory.address.note'))];

  const { octets, prefix } = subnet;
  const mask = maskOctets(prefix);
  const index = boundaryOctet(prefix);
  const maskOctet = mask[index] ?? 0;
  const size = 256 - maskOctet;
  const hostOctet = octets[index] ?? 0;
  const times = Math.floor(hostOctet / size);
  const value = times * size;
  const network = applyPrefix(octets, prefix, 0);
  const broadcast = applyPrefix(octets, prefix, 1);
  const hostBits = 32 - prefix;

  return [
    ...head,
    subheading(t('theory.example')),
    kv([
      [t('theory.task'), question.subject],
      [t('theory.mask'), `/${prefix} → ${format(mask)}`],
    ]),
    worked([
      {
        label: t('theory.address.kvOctet'),
        calc: [mask.join(' . '), `→ ${maskOctet}`],
        thought: t('theory.address.thought1', { position: index + 1 }),
      },
      { label: t('theory.blockSize'), calc: [`256 − ${maskOctet} = ${size}`] },
      // A prefix on an octet edge makes the block the whole octet. Dividing by
      // 256 is correct but says nothing; the boundary case gets its own words.
      {
        label: t('theory.address.worked3'),
        calc:
          size === 256
            ? [`${format(octets)} → ${hostOctet}`, `→ 0 → ${format(network)}`]
            : [
                `${format(octets)} → ${hostOctet}`,
                `${hostOctet} ÷ ${size} = ${times}`,
                `${times} × ${size} = ${value} → ${format(network)}`,
              ],
        thought:
          size === 256
            ? t('theory.address.thought3Edge', { position: index + 1 })
            : t('theory.address.thought3', {
                blocks: multiples(size),
                octet: hostOctet,
                size,
                times,
                value,
              }),
      },
      {
        label: t('theory.broadcast'),
        calc:
          size === 256
            ? [`→ 255 → ${format(broadcast)}`]
            : [
                `${value} + ${size} = ${value + size}`,
                `${value + size} − 1 = ${value + size - 1} → ${format(broadcast)}`,
              ],
        thought:
          size === 256
            ? t('theory.address.thought4Edge')
            : t('theory.address.thought4', { next: value + size }),
      },
    ]),
    subheading(t('theory.binaryTitle')),
    codeBlock([
      [t('theory.address.rowAddress'), format(octets), toBits(octets, prefix)],
      [`${t('theory.mask')} /${prefix}`, format(mask), toBits(mask, prefix)],
      [t('theory.binaryRowBits'), `${prefix} + ${hostBits}`, bitsLegend(prefix)],
      RULE,
      [t('theory.network'), format(network), toBits(network, prefix)],
      [t('theory.broadcast'), format(broadcast), toBits(broadcast, prefix)],
    ]),
    caption(t('theory.address.binaryNote', { prefix, hostBits })),
    note(t('theory.address.note')),
  ];
}

function hostCountBody(question: QuizQuestion): HTMLElement[] {
  const head = [el('p', { text: t('theory.hostCount.intro') }), steps('hostCount', 4)];
  const subnet = parseSubnet(question.subject);
  if (!subnet) {
    return [...head, hostTable(), note(t('theory.hostCount.note', { subject: '10.0.0.1/24' }))];
  }

  const { octets, prefix } = subnet;
  const mask = maskOctets(prefix);
  const hostBits = 32 - prefix;
  const total = 2 ** hostBits;
  const usable = Math.max(0, total - 2);
  const network = applyPrefix(octets, prefix, 0);
  const broadcast = applyPrefix(octets, prefix, 1);

  return [
    ...head,
    subheading(t('theory.binaryTitle')),
    codeBlock([
      [t('theory.address.rowAddress'), format(octets), toBits(octets, prefix)],
      [`${t('theory.mask')} /${prefix}`, format(mask), toBits(mask, prefix)],
      [t('theory.binaryRowBits'), `${prefix} + ${hostBits}`, bitsLegend(prefix)],
    ]),
    caption(t('theory.hostCount.binaryNote', { hostBits, total, usable })),
    subheading(t('theory.example')),
    worked([
      { label: t('theory.hostCount.rowHostBits'), calc: [`32 − ${prefix} = ${hostBits}`] },
      {
        label: t('theory.hostCount.kvAddresses'),
        calc: [chain(hostBits), `= 2^${hostBits} = ${total}`],
        thought: t('theory.hostCount.thought2', { hostBits }),
      },
      {
        label: t('theory.hostCount.worked3'),
        calc: [format(network), format(broadcast)],
        thought: t('theory.hostCount.thought3'),
      },
      { label: t('theory.hostCount.kvUsable'), calc: [`${total} − 2 = ${usable}`] },
    ]),
    hostTable(),
    note(t('theory.hostCount.note', { subject: question.subject })),
  ];
}

function splitBody(question: QuizQuestion): HTMLElement[] {
  const head = [el('p', { text: t('theory.split.intro') }), steps('split', 4)];
  const subnet = parseSubnet(question.subject);
  const splits = Number(question.subject2);
  if (!subnet || !Number.isInteger(splits) || splits < 2) return [...head];

  const bits = bitsForSplits(splits);
  const rounded = 2 ** bits;
  const newPrefix = Math.min(32, subnet.prefix + bits);
  const base = toNumber(applyPrefix(subnet.octets, subnet.prefix, 0));
  const blockSize = 2 ** (32 - newPrefix);
  const nets = Array.from({ length: rounded }, (_, index) => fromNumber(base + index * blockSize));
  const newMask = maskOctets(newPrefix);
  const index = boundaryOctet(newPrefix);
  const step = 256 - (newMask[index] ?? 0);

  return [
    ...head,
    subheading(t('theory.example')),
    kv([[t('theory.task'), `${question.subject} ÷ ${splits}`]]),
    worked([
      {
        label: t('theory.split.kvRound'),
        calc: [
          ...Array.from({ length: bits }, (_, position) => {
            const power = 2 ** (position + 1);
            return `2^${position + 1} = ${power}  ${power < splits ? '<' : '≥'} ${splits}`;
          }),
          `${splits} → ${rounded}`,
        ],
        thought:
          rounded === splits
            ? t('theory.split.thought1Exact', { splits, bits })
            : t('theory.split.thought1', { splits, bits, rounded, spare: rounded - splits }),
      },
      {
        label: t('theory.split.worked2'),
        calc: [`${rounded} = 2${superscript(bits)}`, `→ n = ${bits}`],
        thought: t('theory.split.thought2', { rounded, bits }),
      },
      { label: t('theory.split.kvNewPrefix'), calc: [`/${subnet.prefix} + ${bits} = /${newPrefix}`] },
      {
        label: t('theory.blockSize'),
        calc: [`/${newPrefix} → ${format(newMask)}`, `256 − ${newMask[index] ?? 0} = ${step}`],
      },
    ]),
    subheading(t('theory.result')),
    table(
      ['#', t('theory.subnet')],
      nets.map((net, position) => [String(position + 1), `${format(net)}/${newPrefix}`]),
    ),
    subheading(t('theory.binaryTitle')),
    codeBlock([
      [t('theory.binaryRowBits'), `${newPrefix} + ${32 - newPrefix}`, bitsLegend(newPrefix, bits)],
      RULE,
      ...nets.map((net, position): string[] => [
        `${t('theory.subnet')} ${position + 1}`,
        format(net),
        toBits(net, newPrefix),
      ]),
    ]),
    // A new prefix on an octet edge makes the block the whole octet, so the
    // step of 256 belongs to no octet: it is the one to the left that counts.
    caption(
      step === 256
        ? t('theory.split.binaryNoteEdge', { bits, rounded, position: index })
        : t('theory.split.binaryNote', { bits, rounded, step }),
    ),
    note(
      t('theory.split.note', {
        old: subnet.prefix,
        new: newPrefix,
        first: `${format(nets[0] ?? [])}/${newPrefix}`,
        second: `${format(nets[1] ?? [])}/${newPrefix}`,
      }),
    ),
  ];
}

function maskBody(question: QuizQuestion): HTMLElement[] {
  const head = [el('p', { text: t('theory.mask.intro') }), steps('mask', 3)];
  const toMask = question.kind === 'cidrToDotted';
  const prefix = toMask
    ? parsePrefix(question.subject)
    : prefixFromMask(parseDotted(question.subject) ?? []);
  if (prefix === null) return [...head, maskTable(), note(t('theory.mask.note'))];

  const mask = maskOctets(prefix);
  const full = Math.floor(prefix / 8);
  const rest = prefix % 8;
  const restValue = rest === 0 ? 0 : 256 - 2 ** (8 - rest);
  // Absent for /32, where every octet is 255 and none of them is interesting.
  const boundary = mask[full];

  const forward: WorkedStep[] = [
    {
      label: t('theory.mask.workedFull'),
      calc: [
        `${prefix} = ${[...Array<string>(full).fill('8'), ...(rest ? [String(rest)] : [])].join(' + ') || '0'}`,
        `→ ${[...Array<string>(full).fill('255'), ...(rest ? ['?'] : [])].join('.') || '0.0.0.0'}`,
      ],
    },
    ...(rest > 0
      ? [
          {
            label: t('theory.mask.workedRest'),
            calc: [`r = ${rest}`, `256 − 2^(8 − ${rest}) = 256 − ${2 ** (8 - rest)} = ${restValue}`],
            thought: t('theory.mask.thought2', { rest, values: powers(rest), value: restValue }),
          },
        ]
      : []),
    { label: t('theory.mask'), calc: [format(mask)] },
  ];

  const backward: WorkedStep[] = [
    { label: t('theory.mask.workedFull'), calc: [`${full} × 255 → ${full} × 8 = ${full * 8}`] },
    ...(boundary === undefined
      ? []
      : [
          {
            label: t('theory.address.kvOctet'),
            calc: [`${boundary} = ${toBinary(boundary, 8)}`, `→ ${rest}`],
          },
        ]),
    {
      label: t('theory.prefix'),
      calc: [
        boundary === undefined ? `${full * 8} = /${prefix}` : `${full * 8} + ${rest} = /${prefix}`,
      ],
    },
  ];

  return [
    ...head,
    subheading(toMask ? t('theory.mask.exampleToMask') : t('theory.mask.exampleToPrefix')),
    kv([[t('theory.task'), toMask ? `/${prefix}` : format(mask)]]),
    worked(toMask ? forward : backward),
    subheading(t('theory.binaryTitle')),
    codeBlock([
      [`/${prefix}`, format(mask), toBits(mask)],
      RULE,
      [t('theory.mask.rowInvalid'), '255.255.255.160', '11111111.11111111.11111111.10100000'],
    ]),
    caption(t('theory.mask.binaryNote', { prefix })),
    maskTable(),
    note(t('theory.mask.note')),
  ];
}

function hostTable(): HTMLElement {
  return table(
    [t('theory.prefix'), t('theory.hostCount.rowHostBits'), t('theory.hosts')],
    [24, 25, 26, 27, 28, 29, 30].map((prefix) => [
      `/${prefix}`,
      String(32 - prefix),
      String(2 ** (32 - prefix) - 2),
    ]),
  );
}

function maskTable(): HTMLElement {
  return table(
    [t('theory.prefix'), t('theory.mask'), t('theory.hosts')],
    [16, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30].map((prefix) => [
      `/${prefix}`,
      format(maskOctets(prefix)),
      String(2 ** (32 - prefix) - 2),
    ]),
  );
}

/** `0, 32, 64, 96, …` — the first few block starts, for the reasoning text. */
function multiples(size: number): string {
  const list: number[] = [];
  for (let value = 0; value < 256 && list.length < 6; value += size) list.push(value);
  return list.join(', ');
}

/** `2 × 2 × 2 …`, abbreviated once it stops being readable. */
function chain(count: number): string {
  return count <= 8 ? Array<string>(Math.max(1, count)).fill('2').join(' × ') : '2 × … × 2';
}

/** `128, 64` — the values the leftmost `count` bits of an octet carry. */
function powers(count: number): string {
  return Array.from({ length: count }, (_, index) => 2 ** (7 - index)).join(', ');
}

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

function superscript(value: number): string {
  return String(value)
    .split('')
    .map((digit) => SUPERSCRIPTS[Number(digit)] ?? digit)
    .join('');
}

function steps(topic: TopicId, count: number): HTMLElement {
  const list = el('ol', { class: 'theory-steps' });
  for (let index = 1; index <= count; index += 1) {
    list.append(el('li', { text: t(`theory.${topic}.step${index}`) }));
  }
  return list;
}

function subheading(text: string): HTMLElement {
  return el('h4', { class: 'theory-subtitle', text });
}

function kv(rows: Array<[string, string]>): HTMLElement {
  const list = el('dl', { class: 'kv theory-kv' });
  for (const [label, value] of rows) {
    list.append(el('dt', { text: label }), el('dd', { class: 'mono', text: value }));
  }
  return list;
}

interface WorkedStep {
  /** What this step is called, matching the numbered step above it. */
  label: string;
  /** The arithmetic, one line each. Numbers only, so nothing to translate. */
  calc: string[];
  /** The reasoning in plain words, for the steps that skip over knowledge. */
  thought?: string;
}

/**
 * The steps above, actually carried out — one list item per step, in the same
 * order, with every intermediate calculation on its own line rather than
 * jumped over. Where a step assumes something a learner may not have yet
 * (that 8 is the next power of two after 5, say), `thought` says it out loud
 * underneath the numbers instead of leaving them to infer it.
 */
function worked(entries: WorkedStep[]): HTMLElement {
  const list = el('ol', { class: 'theory-worked' });
  for (const entry of entries) {
    list.append(
      el(
        'li',
        {},
        el('span', { class: 'theory-worked-label', text: entry.label }),
        ...entry.calc.map((line) => el('span', { class: 'theory-worked-calc mono', text: line })),
        entry.thought ? el('span', { class: 'theory-worked-thought', text: entry.thought }) : null,
      ),
    );
  }
  return list;
}

/** A horizontal rule spanning the columns, written as its own row. */
const RULE = 'rule';

/**
 * Monospace block with the columns padded here rather than in the catalogs:
 * a translated label can be any length, and the binary digits still line up.
 */
function codeBlock(rows: Array<string[] | typeof RULE>): HTMLElement {
  const cells = rows.filter((row): row is string[] => row !== RULE);
  const count = Math.max(...cells.map((row) => row.length));
  const widths = Array.from({ length: count }, (_, column) =>
    Math.max(...cells.map((row) => (row[column] ?? '').length)),
  );

  const text = rows
    .map((row) => {
      const source = row === RULE ? widths.map((width) => '─'.repeat(width)) : row;
      return source
        .map((cell, column) => cell.padEnd(widths[column] ?? 0))
        .join('  ')
        .trimEnd();
    })
    .join('\n');

  return el('pre', { class: 'theory-code mono', text });
}

function table(headers: string[], rows: string[][]): HTMLElement {
  const head = el('tr', {}, ...headers.map((text) => el('th', { text })));
  const body = el('tbody');
  for (const row of rows) {
    body.append(el('tr', {}, ...row.map((text) => el('td', { class: 'mono', text }))));
  }
  return el('table', { class: 'theory-table' }, el('thead', {}, head), body);
}

/** Reads the block above out loud: what the eye should be comparing. */
function caption(text: string): HTMLElement {
  return el('p', { class: 'theory-caption', text });
}

function note(text: string): HTMLElement {
  return el('p', { class: 'theory-note' }, el('strong', { text: `${t('theory.note')}: ` }), text);
}

// ---------------------------------------------------------------- IPv6 ---

function notationBody(question: QuizQuestion): HTMLElement[] {
  const head = [el('p', { text: t('theory.notation.intro') }), steps('notation', 4)];
  const groups = parseGroups(question.subject);
  if (!groups) return [...head, note(t('theory.notation.note'))];

  const run = zeroRun(groups);
  // Every row is laid out in the same 4-character columns, so a group in one
  // row sits above the same group in the next.
  const columns = (cells: string[]): string => cells.map((cell) => cell.padStart(4)).join(':');
  const marker = groups
    .map((_, index) =>
      run && index >= run.start && index < run.start + run.length ? '^^^^' : '    ',
    )
    .join(' ');

  return [
    ...head,
    subheading(t('theory.example')),
    codeBlock([
      [t('theory.notation.rowFull'), columns(groups.map(hex4))],
      [t('theory.notation.rowTrimmed'), columns(groups.map((group) => group.toString(16)))],
      ...(run ? [[t('theory.notation.rowRun'), marker]] : []),
      RULE,
      [t('theory.notation.rowShort'), abbreviate(groups)],
    ]),
    caption(
      run
        ? t('theory.notation.captionRun', { length: run.length, position: run.start + 1 })
        : t('theory.notation.captionNoRun'),
    ),
    subheading(t('theory.result')),
    kv([
      [t('theory.notation.rowFull'), expand(groups)],
      [t('theory.notation.rowShort'), abbreviate(groups)],
    ]),
    note(t('theory.notation.note')),
  ];
}

function eui64Body(question: QuizQuestion): HTMLElement[] {
  const head = [el('p', { text: t('theory.eui64.intro') }), steps('eui64', 4)];
  const mac = parseMac(question.subject);
  const subnet = parseSubnet6(question.subject2);
  if (!mac || !subnet) return [...head, note(t('theory.eui64.note'))];

  const hex = (octet: number): string => octet.toString(16).padStart(2, '0');
  const flipped = (mac[0] ?? 0) ^ 0x02;
  const identifier = eui64Id(mac);
  const address = eui64Address(subnet.groups, mac);

  return [
    ...head,
    subheading(t('theory.example')),
    kv([
      [t('theory.eui64.rowMac'), question.subject],
      [t('theory.prefix'), question.subject2],
    ]),
    worked([
      {
        label: t('theory.eui64.workedSplit'),
        calc: [`${mac.slice(0, 3).map(hex).join(':')} | ${mac.slice(3).map(hex).join(':')}`],
      },
      {
        label: t('theory.eui64.workedInsert'),
        calc: [
          `${mac.slice(0, 3).map(hex).join(':')} : ff:fe : ${mac.slice(3).map(hex).join(':')}`,
        ],
        thought: t('theory.eui64.thoughtInsert'),
      },
      {
        label: t('theory.eui64.workedFlip'),
        calc: [`${hex(mac[0] ?? 0)} → ${hex(flipped)}`],
        thought: t('theory.eui64.thoughtFlip'),
      },
      {
        label: t('theory.address.rowAddress'),
        calc: [`${abbreviate(subnet.groups)}/64`, `+ ${identifier.map(hex4).join(':')}`, abbreviate(address)],
      },
    ]),
    // The flip is one bit; showing the byte is the only way to see which.
    subheading(t('theory.binaryTitle')),
    codeBlock([
      [t('theory.eui64.rowFirstByte'), hex(mac[0] ?? 0), toBinary(mac[0] ?? 0, 8)],
      [t('theory.eui64.rowUlBit'), '', '      ^'],
      [t('theory.eui64.rowFlipped'), hex(flipped), toBinary(flipped, 8)],
    ]),
    caption(t('theory.eui64.binaryNote')),
    note(t('theory.eui64.note')),
  ];
}

function ipv6SubnetsBody(question: QuizQuestion): HTMLElement[] {
  const head = [el('p', { text: t('theory.ipv6Subnets.intro') }), steps('ipv6Subnets', 3)];
  const subnet = parseSubnet6(question.subject);
  const target = Number(question.subject2);
  if (!subnet || !Number.isInteger(target) || target <= subnet.prefix) {
    return [...head, note(t('theory.ipv6Subnets.note'))];
  }

  const difference = target - subnet.prefix;
  const count = 2 ** difference;
  // For the prefixes the engine generates (48–63 into 64) every varying bit
  // sits in the fourth group, so the numbering is visible there.
  const groupIndex = 3;
  const base = subnet.groups[groupIndex] ?? 0;
  const label = (index: number): string[] => {
    const groups = [...subnet.groups];
    groups[groupIndex] = base + index;
    return [String(index + 1), `${abbreviate(groups)}/${target}`];
  };

  return [
    ...head,
    subheading(t('theory.example')),
    kv([[t('theory.task'), `${question.subject} → /${target}`]]),
    worked([
      { label: t('theory.ipv6Subnets.workedDiff'), calc: [`${target} − ${subnet.prefix} = ${difference}`] },
      {
        label: t('theory.ipv6Subnets.workedBits'),
        calc: [`${difference} bit`],
        thought: t('theory.ipv6Subnets.thoughtBits', { difference }),
      },
      {
        label: t('theory.ipv6Subnets.workedCount'),
        calc: [`2^${difference} = ${count}`],
      },
    ]),
    subheading(t('theory.result')),
    table(
      ['#', t('theory.subnet')],
      count <= 4
        ? Array.from({ length: count }, (_, index) => label(index))
        : [label(0), label(1), label(2), ['…', '…'], label(count - 1)],
    ),
    note(t('theory.ipv6Subnets.note')),
  ];
}

function ipv6PrefixBody(): HTMLElement[] {
  return [
    el('p', { text: t('theory.ipv6Prefix.intro') }),
    subheading(t('theory.ipv6Prefix.tableTitle')),
    table(
      [t('theory.prefix'), t('theory.ipv6Prefix.colPurpose')],
      IPV6_PREFIXES.map(([prefix, purpose]) => [prefix, t(`prefix.${purpose}`)]),
    ),
    note(t('theory.ipv6Prefix.note')),
  ];
}
