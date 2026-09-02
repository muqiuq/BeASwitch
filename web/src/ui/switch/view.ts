import { SwitchGame, defaultOptions } from '../../engine/index.js';
import type { SwitchAnswer } from '../../engine/types.js';
import { t } from '../../i18n/index.js';
import { el, mount } from '../shared/dom.js';
import { displayControls } from '../shared/displayControls.js';
import { animate, highlightRow, motionDisabled, pulse, shake, travel, wait } from '../shared/animate.js';
import { scoreBar } from '../shared/scoreBar.js';
import { summaryView } from '../shared/summary.js';
import { recordPassedExam, saveProgress } from '../shared/storage.js';
import { activeSettings } from '../shared/config.js';
import { computeGeometry, renderTopology, vlanColour } from './topology.js';
import type { Geometry, TopologyRefs } from './topology.js';

interface PortSelection {
  send: boolean;
  tag: boolean;
}

export function switchView(onExit: (() => void) | null): HTMLElement {
  const settings = activeSettings().switch;
  const root = el('section', { class: 'exercise exercise-switch' });

  let game = new SwitchGame(
    defaultOptions({
      examMode: settings.examMode,
      goalTotal: settings.examMode ? settings.goalTotal : 0,
      goalCorrect: settings.examMode ? settings.goalCorrect : 0,
      useVlan: settings.useVlan,
    }),
  );

  let snapshot = game.snapshot();
  let selections = new Map<number, PortSelection>();
  let entryRequired: boolean | null = null;
  let entryMac = '';
  let entryPort = '';
  let geometry: Geometry = computeGeometry(snapshot);
  let refs: TopologyRefs | null = null;
  let knownMacRows = new Set<string>();
  // A station only shows its name once it has sent, just as the switch only
  // learns a MAC once it has seen a frame from it.
  let revealedHosts = new Set<string>();

  function resetSelections(): void {
    selections = new Map(
      snapshot.ports.map((port) => [port.number, { send: false, tag: false }]),
    );
    entryRequired = null;
    entryMac = '';
    entryPort = '';
  }

  resetSelections();

  function render(): void {
    if (snapshot.state === 'finished') {
      mount(
        root,
        summaryView({
          score: snapshot.score,
          goal: snapshot.goal,
          status: snapshot.result?.goalStatus ?? null,
          onRetry: restart,
          onExit,
        }),
      );
      return;
    }

    geometry = computeGeometry(snapshot);
    refs = renderTopology(snapshot, geometry, revealedHosts);

    mount(
      root,
      header(),
      scoreBar(snapshot.score, snapshot.goal),
      el(
        'div',
        { class: 'switch-layout' },
        el('div', { class: 'topology-panel' }, refs.root, banner()),
        el('div', { class: 'switch-side' }, macTablePanel(), controlPanel()),
      ),
    );

    applyVerdictStyling();
  }

  function header(): HTMLElement {
    return el(
      'header',
      { class: 'exercise-header' },
      el('h1', { class: 'exercise-title', text: t('switch.title') }),
      el('div', { class: 'header-controls' }, displayControls(), backButton()),
    );
  }

  /** Absent when a link limits the app to this exercise. */
  function backButton(): HTMLElement | null {
    if (!onExit) return null;
    const back = el('button', { type: 'button', class: 'btn btn-ghost', text: t('app.backToMenu') });
    back.addEventListener('click', onExit);
    return back;
  }

  function banner(): HTMLElement {
    const frame = snapshot.frame;
    if (!frame) {
      return el('p', { class: 'banner', text: t('switch.intro') });
    }
    const tag =
      frame.vlanTag === null
        ? t('switch.untagged')
        : t('switch.tagged', { vlan: frame.vlanTag });
    return el(
      'div',
      { class: 'banner banner-frame' },
      el('strong', {
        text: t('switch.frameFrom', { source: frame.sourceLabel, dest: frame.destLabel }),
      }),
      el('span', { class: 'chip', text: tag }),
      el('span', { class: 'banner-payload', text: `${t('switch.payload')}: “${frame.payload}”` }),
    );
  }

  function macTablePanel(): HTMLElement {
    const panel = el('div', { class: 'panel' }, el('h2', { class: 'panel-title', text: t('switch.macTables') }));

    if (snapshot.macTables.length === 0) {
      panel.append(el('p', { class: 'muted', text: t('switch.macTablesEmpty') }));
      return panel;
    }

    for (const table of snapshot.macTables) {
      const body = el('tbody');
      for (const entry of table.entries) {
        const key = `${table.vlan}:${entry.mac}`;
        const row = el(
          'tr',
          { 'data-key': key },
          el('td', { text: entry.mac }),
          el('td', { text: String(entry.port) }),
        );
        body.append(row);
        if (!knownMacRows.has(key)) {
          knownMacRows.add(key);
          queueMicrotask(() => void highlightRow(row));
        }
      }

      panel.append(
        el(
          'div',
          { class: 'mac-table' },
          el('h3', {
            class: 'mac-table-title',
            style: `--vlan-colour: ${vlanColour(table.vlan, snapshot.vlans)}`,
            text: t('switch.vlan', { vlan: table.vlan }),
          }),
          el(
            'table',
            {},
            el(
              'thead',
              {},
              el(
                'tr',
                {},
                el('th', { text: t('switch.tableMac') }),
                el('th', { text: t('switch.tablePort') }),
              ),
            ),
            body,
          ),
        ),
      );
    }
    return panel;
  }

  function controlPanel(): HTMLElement {
    const panel = el('div', { class: 'panel' });
    const awaiting = snapshot.state === 'awaitingAnswer';
    const showing = snapshot.state === 'showingSolution';

    if (awaiting || showing) {
      panel.append(entrySection(!awaiting));
      panel.append(el('p', { class: 'hint', text: t('switch.selectPorts') }));
      panel.append(portSelector(!awaiting));
    }

    if (showing && snapshot.result) {
      panel.append(resultSection());
    }

    panel.append(actions());
    return panel;
  }

  function entrySection(disabled: boolean): HTMLElement {
    const section = el(
      'fieldset',
      { class: 'field-group' },
      el('legend', { text: t('switch.entryQuestion') }),
    );

    for (const [value, label] of [
      [true, t('switch.entryRequired')],
      [false, t('switch.entryNotRequired')],
    ] as const) {
      const input = el('input', {
        type: 'radio',
        name: 'entry-required',
        disabled,
        checked: entryRequired === value,
      });
      input.addEventListener('change', () => {
        entryRequired = value;
        render();
      });
      section.append(el('label', { class: 'radio' }, input, el('span', { text: label })));
    }

    if (entryRequired === true) {
      const macSelect = el('select', { disabled, class: 'input' });
      macSelect.append(el('option', { value: '', text: '—' }));
      for (const host of [...snapshot.hosts].sort((a, b) => a.label.localeCompare(b.label))) {
        macSelect.append(
          el('option', { value: host.label, selected: entryMac === host.label, text: host.label }),
        );
      }
      macSelect.addEventListener('change', () => {
        entryMac = macSelect.value;
      });

      const portSelect = el('select', { disabled, class: 'input' });
      portSelect.append(el('option', { value: '', text: '—' }));
      for (const port of snapshot.ports) {
        portSelect.append(
          el('option', {
            value: String(port.number),
            selected: entryPort === String(port.number),
            text: String(port.number),
          }),
        );
      }
      portSelect.addEventListener('change', () => {
        entryPort = portSelect.value;
      });

      section.append(
        el(
          'div',
          { class: 'entry-inputs' },
          el('label', { class: 'labelled' }, el('span', { text: t('switch.entryMac') }), macSelect),
          el('label', { class: 'labelled' }, el('span', { text: t('switch.entryPort') }), portSelect),
        ),
      );
    }

    return section;
  }

  function portSelector(disabled: boolean): HTMLElement {
    const grid = el('div', { class: 'port-grid' });

    for (const port of snapshot.ports) {
      const selection = selections.get(port.number) ?? { send: false, tag: false };
      const verdict = snapshot.result?.ports.find((entry) => entry.port === port.number);

      const sendBox = el('input', { type: 'checkbox', disabled, checked: selection.send });
      sendBox.addEventListener('change', () => {
        selection.send = sendBox.checked;
        if (!selection.send) selection.tag = false;
        selections.set(port.number, selection);
        render();
      });

      const tagBox = el('input', {
        type: 'checkbox',
        disabled: disabled || !snapshot.useVlan,
        checked: selection.tag,
      });
      tagBox.addEventListener('change', () => {
        selection.tag = tagBox.checked;
        selections.set(port.number, selection);
      });

      const card = el(
        'div',
        {
          class: `port-card ${verdict ? (verdict.correct ? 'is-correct' : 'is-wrong') : ''}`,
          'data-port': port.number,
        },
        el('div', { class: 'port-card-title', text: t('switch.port', { number: port.number }) }),
        el('div', { class: 'port-card-role', text: t(`switch.role.${port.role}`) }),
        el('label', { class: 'check' }, sendBox, el('span', { text: t('switch.send') })),
        snapshot.useVlan
          ? el('label', { class: 'check' }, tagBox, el('span', { text: t('switch.tag') }))
          : null,
      );

      if (verdict && !verdict.correct) {
        card.append(
          el('p', {
            class: 'port-card-expected',
            text: `${t('common.expected')}: ${verdict.expectedSend ? t('switch.send') : '—'}${
              verdict.expectedTag ? ` + ${t('switch.tag')}` : ''
            }`,
          }),
        );
      }

      grid.append(card);
    }

    return grid;
  }

  function resultSection(): HTMLElement {
    const result = snapshot.result!;
    const frame = snapshot.frame;

    let actionText: string;
    if (result.action === 'discard') {
      actionText = t('switch.action.discard');
    } else if (result.action === 'broadcast') {
      actionText = t('switch.action.broadcast', { vlan: result.vlan });
    } else {
      actionText = t('switch.action.unicast', {
        port: result.destPort ?? '—',
        vlan: result.vlan,
      });
    }

    const section = el(
      'div',
      { class: `result ${result.correct ? 'is-correct' : 'is-wrong'}`, role: 'status' },
      el('strong', { text: result.correct ? t('switch.resultCorrect') : t('switch.resultWrong') }),
      el('p', { text: actionText }),
    );

    if (!result.entryRequiredCorrect || result.macCorrect === false || result.portCorrect === false) {
      section.append(
        el('p', {
          class: 'result-detail',
          text: result.entryRequiredExpected
            ? t('switch.expectedEntry', {
                mac: result.expectedMac,
                port: result.expectedPort,
              })
            : t('switch.expectedNoEntry'),
        }),
      );
    }

    if (frame && result.correct) {
      queueMicrotask(() => void pulse(section));
    } else if (frame) {
      queueMicrotask(() => void shake(section));
    }

    return section;
  }

  function actions(): HTMLElement {
    const row = el('div', { class: 'actions' });

    if (snapshot.state === 'awaitingStart') {
      row.append(primary(t('common.start'), start));
    } else if (snapshot.state === 'awaitingAnswer') {
      row.append(primary(t('common.check'), check));
      const helper = el('button', {
        type: 'button',
        class: 'btn btn-ghost',
        text: t('switch.markAllExceptInbound'),
      });
      helper.addEventListener('click', () => {
        const inbound = snapshot.frame?.sourcePort;
        for (const [port, selection] of selections) {
          selection.send = port !== inbound;
          if (!selection.send) selection.tag = false;
        }
        render();
      });
      const clearBtn = el('button', {
        type: 'button',
        class: 'btn btn-ghost',
        text: t('switch.clearSelection'),
      });
      clearBtn.addEventListener('click', () => {
        for (const selection of selections.values()) {
          selection.send = false;
          selection.tag = false;
        }
        render();
      });
      row.append(helper, clearBtn);
    } else {
      row.append(primary(t('common.next'), start));
    }

    const restartBtn = el('button', {
      type: 'button',
      class: 'btn btn-ghost',
      text: t('common.restart'),
    });
    restartBtn.addEventListener('click', restart);
    row.append(restartBtn);

    return row;
  }

  function primary(label: string, handler: () => void): HTMLButtonElement {
    const button = el('button', { type: 'button', class: 'btn btn-primary', text: label });
    button.addEventListener('click', handler);
    return button;
  }

  function start(): void {
    snapshot = game.nextRound();
    if (snapshot.frame) revealedHosts.add(snapshot.frame.sourceLabel);
    resetSelections();
    render();
    void animateArrival();
  }

  function check(): void {
    const answer: SwitchAnswer = {
      entryRequired: entryRequired === true,
      entryMac: entryMac === '' ? null : entryMac,
      entryPort: entryPort === '' ? null : Number(entryPort),
      ports: [...selections.entries()].map(([port, selection]) => ({
        port,
        send: selection.send,
        tag: selection.tag,
      })),
    };
    snapshot = game.submit(answer);
    saveProgress({
      exercise: 'switch',
      correct: snapshot.score.correct,
      total: snapshot.score.total,
      score: snapshot.score.score,
      updatedAt: Date.now(),
    });
    recordIfPassed();
    render();
    void animateForwarding();
  }

  function recordIfPassed(): void {
    if (snapshot.result?.goalStatus !== 'reached' || !snapshot.goal) return;
    recordPassedExam({
      exercise: 'switch',
      correct: snapshot.score.correct,
      total: snapshot.score.total,
      score: snapshot.score.score,
      goalCorrect: snapshot.goal.correctAttempts,
      goalTotal: snapshot.goal.totalAttempts,
      completedAt: Date.now(),
    });
  }

  function restart(): void {
    game.dispose();
    const current = activeSettings().switch;
    game = new SwitchGame(
      defaultOptions({
        examMode: current.examMode,
        goalTotal: current.examMode ? current.goalTotal : 0,
        goalCorrect: current.examMode ? current.goalCorrect : 0,
        useVlan: current.useVlan,
      }),
    );
    snapshot = game.snapshot();
    knownMacRows = new Set();
    revealedHosts = new Set();
    resetSelections();
    render();
  }

  /** Frame slides from the sending station into its ingress port. */
  async function animateArrival(): Promise<void> {
    const frame = snapshot.frame;
    const token = refs?.parkedFrame;
    if (!frame || !token || !refs || motionDisabled()) return;

    const from = geometry.hostAnchor(frame.sourceLabel);
    const port = geometry.portAnchor(frame.sourcePort);

    // Reposition before the first paint; the node's own transform is where it rests.
    token.style.transform = `translate(${from.x}px, ${from.y}px)`;
    refs.hostGroups.get(frame.sourceLabel)?.classList.add('is-sending');

    await Promise.all([
      animate(token, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' }),
      travel(token, from, port, 620).then(() => travel(token, port, geometry.chassisCentre, 420)),
    ]);
  }

  /** Replays the forwarding decision: fan-out for flooding, one path for unicast. */
  async function animateForwarding(): Promise<void> {
    const result = snapshot.result;
    const frame = snapshot.frame;
    if (!result || !frame || !refs) return;

    if (result.action === 'discard') {
      const port = refs.portGroups.get(frame.sourcePort);
      if (port) await shake(port);
      return;
    }

    const centre = geometry.chassisCentre;
    await Promise.all(
      [...refs.deliveredFrames].map(async ([port, token], index) => {
        await wait(index * 90);
        refs!.cables.get(port)?.classList.add('is-active');
        await travel(token, centre, geometry.portAnchor(port), 520);
        const group = refs!.portGroups.get(port);
        if (group) await pulse(group);
        refs!.cables.get(port)?.classList.remove('is-active');
      }),
    );
  }

  function applyVerdictStyling(): void {
    if (!refs || !snapshot.result) return;
    for (const verdict of snapshot.result.ports) {
      const group = refs.portGroups.get(verdict.port);
      if (!group) continue;
      group.classList.toggle('is-expected', verdict.expectedSend);
      group.classList.toggle('is-mistake', !verdict.correct);
    }
  }

  render();
  return root;
}
