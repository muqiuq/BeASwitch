/**
 * Theory for the IPv4 question types, shown under the question in practice
 * mode. Condensed from the course notes on address calculation and subnetting.
 *
 * Seven question kinds map onto three topics, because the same calculation
 * answers several of them: the block size gives network, broadcast and host
 * count alike.
 *
 * The worked examples are built as tables rather than pre-formatted text. The
 * numbers are identical in every language, and a table stays aligned however
 * long a translated label turns out to be — a `<pre>` block would not.
 */

import { t } from '../../i18n/index.js';
import { el } from '../shared/dom.js';

export type TopicId = 'address' | 'hostCount' | 'split' | 'mask';

const TOPIC_BY_KIND: Record<string, TopicId> = {
  networkAddress: 'address',
  broadcast: 'address',
  numberOfHosts: 'hostCount',
  splitSubnetSecond: 'split',
  splitSubnetThird: 'split',
  cidrToDotted: 'mask',
  dottedToCidr: 'mask',
};

/** `null` for a question type that has no theory of its own. */
export function theoryTopic(kind: string): TopicId | null {
  return TOPIC_BY_KIND[kind] ?? null;
}

export function theoryPanel(
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
    el('div', { class: 'theory-body' }, ...BODIES[topic]()),
  );
  details.addEventListener('toggle', () => onToggle(details.open));
  return details;
}

const BODIES: Record<TopicId, () => HTMLElement[]> = {
  address: addressBody,
  hostCount: hostCountBody,
  split: splitBody,
  mask: maskBody,
};

function addressBody(): HTMLElement[] {
  return [
    el('p', { text: t('theory.address.intro') }),
    steps('address', 4),
    subheading(t('theory.example')),
    kv([
      [t('theory.task'), '192.168.128.255/19'],
      [t('theory.mask'), '/19 → 255.255.224.0'],
    ]),
    worked([
      {
        label: t('theory.address.kvOctet'),
        calc: ['255 . 255 . 224 . 0', '→ 224'],
        thought: t('theory.address.thought1'),
      },
      { label: t('theory.blockSize'), calc: ['256 − 224 = 32'] },
      {
        label: t('theory.address.worked3'),
        calc: ['192.168.128.255 → 128', '128 ÷ 32 = 4', '4 × 32 = 128 → 192.168.128.0'],
        thought: t('theory.address.thought3'),
      },
      {
        label: t('theory.broadcast'),
        calc: ['128 + 32 = 160', '160 − 1 = 159 → 192.168.159.255'],
        thought: t('theory.address.thought4'),
      },
    ]),
    subheading(t('theory.result')),
    kv([
      [t('theory.network'), '192.168.128.0/19'],
      [t('theory.hostRange'), '192.168.128.1 – 192.168.159.254'],
      [t('theory.broadcast'), '192.168.159.255'],
      [t('theory.hosts'), '8190'],
    ]),
    // The same address in bits. `|` sits on the /19 boundary in every row, so
    // the two results differ only to the right of it.
    subheading(t('theory.binaryTitle')),
    codeBlock([
      [t('theory.address.rowAddress'), '192.168.128.255', '11000000.10101000.100|00000.11111111'],
      [`${t('theory.mask')} /19`, '255.255.224.0', '11111111.11111111.111|00000.00000000'],
      [t('theory.binaryRowBits'), '19 + 13', 'NNNNNNNN.NNNNNNNN.NNN|HHHHH.HHHHHHHH'],
      RULE,
      [t('theory.network'), '192.168.128.0', '11000000.10101000.100|00000.00000000'],
      [t('theory.broadcast'), '192.168.159.255', '11000000.10101000.100|11111.11111111'],
    ]),
    caption(t('theory.address.binaryNote')),
    note(t('theory.address.note')),
  ];
}

function hostCountBody(): HTMLElement[] {
  return [
    el('p', { text: t('theory.hostCount.intro') }),
    steps('hostCount', 4),
    subheading(t('theory.binaryTitle')),
    // Count the H to the right of the boundary: that count is the exponent.
    codeBlock([
      [t('theory.address.rowAddress'), '192.168.252.234', '11000000.10101000.11111100|11101010'],
      [`${t('theory.mask')} /24`, '255.255.255.0', '11111111.11111111.11111111|00000000'],
      [t('theory.binaryRowBits'), '24 + 8', 'NNNNNNNN.NNNNNNNN.NNNNNNNN|HHHHHHHH'],
    ]),
    caption(t('theory.hostCount.binaryNote')),
    subheading(t('theory.result')),
    worked([
      { label: t('theory.hostCount.rowHostBits'), calc: ['32 − 24 = 8'] },
      {
        label: t('theory.hostCount.kvAddresses'),
        calc: ['2 × 2 × 2 × 2 × 2 × 2 × 2 × 2', '= 2^8 = 256'],
        thought: t('theory.hostCount.thought2'),
      },
      {
        label: t('theory.hostCount.worked3'),
        calc: ['192.168.252.0', '192.168.252.255'],
        thought: t('theory.hostCount.thought3'),
      },
      { label: t('theory.hostCount.kvUsable'), calc: ['256 − 2 = 254'] },
    ]),
    table(
      [t('theory.prefix'), t('theory.hostCount.rowHostBits'), t('theory.hosts')],
      [
        ['/24', '8', '254'],
        ['/25', '7', '126'],
        ['/26', '6', '62'],
        ['/27', '5', '30'],
        ['/28', '4', '14'],
        ['/29', '3', '6'],
        ['/30', '2', '2'],
      ],
    ),
    note(t('theory.hostCount.note')),
  ];
}

function splitBody(): HTMLElement[] {
  return [
    el('p', { text: t('theory.split.intro') }),
    steps('split', 4),
    subheading(t('theory.example')),
    // Divided by 5 rather than by 4: rounding up only teaches something when
    // the number is not already a power of two, and 5 skips 6 and 7 to reach 8.
    kv([[t('theory.task'), '192.168.0.0/16 ÷ 5']]),
    worked([
      {
        label: t('theory.split.kvRound'),
        calc: ['2^1 = 2  < 5', '2^2 = 4  < 5', '2^3 = 8  ≥ 5', '5 → 8'],
        thought: t('theory.split.thought1'),
      },
      {
        label: t('theory.split.worked2'),
        calc: ['8 = 2³', '→ n = 3'],
        thought: t('theory.split.thought2'),
      },
      { label: t('theory.split.kvNewPrefix'), calc: ['/16 + 3 = /19'] },
      { label: t('theory.blockSize'), calc: ['/19 → 255.255.224.0', '256 − 224 = 32'] },
    ]),
    subheading(t('theory.result')),
    table(
      ['#', t('theory.subnet')],
      [
        ['1', '192.168.0.0/19'],
        ['2', '192.168.32.0/19'],
        ['3', '192.168.64.0/19'],
        ['4', '192.168.96.0/19'],
        ['5', '192.168.128.0/19'],
        ['6', '192.168.160.0/19'],
        ['7', '192.168.192.0/19'],
        ['8', '192.168.224.0/19'],
      ],
    ),
    // The three borrowed bits counting 000 to 111 is the whole idea: eight
    // rows, because three bits cannot make any other number of them.
    subheading(t('theory.binaryTitle')),
    codeBlock([
      [t('theory.binaryRowBits'), '19 + 13', 'NNNNNNNN.NNNNNNNN.SSS|HHHHH.HHHHHHHH'],
      RULE,
      [`${t('theory.subnet')} 1`, '192.168.0.0', '11000000.10101000.000|00000.00000000'],
      [`${t('theory.subnet')} 2`, '192.168.32.0', '11000000.10101000.001|00000.00000000'],
      [`${t('theory.subnet')} 3`, '192.168.64.0', '11000000.10101000.010|00000.00000000'],
      [`${t('theory.subnet')} 4`, '192.168.96.0', '11000000.10101000.011|00000.00000000'],
      [`${t('theory.subnet')} 5`, '192.168.128.0', '11000000.10101000.100|00000.00000000'],
      [`${t('theory.subnet')} 6`, '192.168.160.0', '11000000.10101000.101|00000.00000000'],
      [`${t('theory.subnet')} 7`, '192.168.192.0', '11000000.10101000.110|00000.00000000'],
      [`${t('theory.subnet')} 8`, '192.168.224.0', '11000000.10101000.111|00000.00000000'],
    ]),
    caption(t('theory.split.binaryNote')),
    note(t('theory.split.note')),
  ];
}

function maskBody(): HTMLElement[] {
  return [
    el('p', { text: t('theory.mask.intro') }),
    steps('mask', 3),
    // Both directions worked out, because the two question kinds this topic
    // covers are exactly those two directions.
    subheading(t('theory.mask.exampleToMask')),
    kv([[t('theory.task'), '/26']]),
    worked([
      { label: t('theory.mask.workedFull'), calc: ['26 = 8 + 8 + 8 + 2', '→ 255.255.255.?'] },
      {
        label: t('theory.mask.workedRest'),
        calc: ['r = 2', '256 − 2^(8 − 2) = 256 − 64 = 192'],
        thought: t('theory.mask.thought2'),
      },
      { label: t('theory.mask'), calc: ['255.255.255.192'] },
    ]),
    subheading(t('theory.mask.exampleToPrefix')),
    kv([[t('theory.task'), '255.255.240.0']]),
    worked([
      { label: t('theory.mask.workedFull'), calc: ['255 + 255 → 8 + 8 = 16'] },
      { label: t('theory.address.kvOctet'), calc: ['240 = 11110000', '→ 4'] },
      { label: t('theory.prefix'), calc: ['16 + 4 = /20'] },
    ]),
    subheading(t('theory.example')),
    table(
      [t('theory.prefix'), t('theory.mask'), t('theory.hosts')],
      [
        ['/16', '255.255.0.0', '65534'],
        ['/20', '255.255.240.0', '4094'],
        ['/22', '255.255.252.0', '1022'],
        ['/23', '255.255.254.0', '510'],
        ['/24', '255.255.255.0', '254'],
        ['/25', '255.255.255.128', '126'],
        ['/26', '255.255.255.192', '62'],
        ['/27', '255.255.255.224', '30'],
        ['/28', '255.255.255.240', '14'],
        ['/29', '255.255.255.248', '6'],
        ['/30', '255.255.255.252', '2'],
      ],
    ),
    // No boundary marker: the point is that the ones are the prefix, and that
    // the last row has a one after a zero, which no mask may have.
    subheading(t('theory.binaryTitle')),
    codeBlock([
      ['/19', '255.255.224.0', '11111111.11111111.11100000.00000000'],
      ['/24', '255.255.255.0', '11111111.11111111.11111111.00000000'],
      ['/26', '255.255.255.192', '11111111.11111111.11111111.11000000'],
      RULE,
      [t('theory.mask.rowInvalid'), '255.255.255.160', '11111111.11111111.11111111.10100000'],
    ]),
    caption(t('theory.mask.binaryNote')),
    note(t('theory.mask.note')),
  ];
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
function worked(steps: WorkedStep[]): HTMLElement {
  const list = el('ol', { class: 'theory-worked' });
  for (const step of steps) {
    list.append(
      el(
        'li',
        {},
        el('span', { class: 'theory-worked-label', text: step.label }),
        ...step.calc.map((line) => el('span', { class: 'theory-worked-calc mono', text: line })),
        step.thought ? el('span', { class: 'theory-worked-thought', text: step.thought }) : null,
      ),
    );
  }
  return list;
}

/** Reads the block above out loud: what the eye should be comparing. */
function caption(text: string): HTMLElement {
  return el('p', { class: 'theory-caption', text });
}

function note(text: string): HTMLElement {
  return el(
    'p',
    { class: 'theory-note' },
    el('strong', { text: `${t('theory.note')}: ` }),
    text,
  );
}
