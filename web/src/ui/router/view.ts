import { RouterGame, defaultOptions } from '../../engine/index.js';
import { t } from '../../i18n/index.js';
import { el, mount } from '../shared/dom.js';
import { displayControls } from '../shared/displayControls.js';
import { animate, motionDisabled, pulse, shake, travel, wait } from '../shared/animate.js';
import { scoreBar } from '../shared/scoreBar.js';
import { summaryView } from '../shared/summary.js';
import { recordPassedExam, saveProgress } from '../shared/storage.js';
import { activeSettings } from '../shared/config.js';
import { explainPanel } from './explain.js';
import { computeGeometry, renderTopology } from './topology.js';
import type { Geometry, TopologyRefs } from './topology.js';
import type { RouterResult } from '../../engine/types.js';

export function routerView(onExit: (() => void) | null): HTMLElement {
  const settings = activeSettings().router;
  const root = el('section', { class: 'exercise exercise-router' });

  let game = new RouterGame(
    defaultOptions({
      examMode: settings.examMode,
      goalTotal: settings.examMode ? settings.goalTotal : 0,
      goalCorrect: settings.examMode ? settings.goalCorrect : 0,
    }),
  );

  let snapshot = game.snapshot();
  let selected = new Set<number>();
  let showExplain = false;
  let geometry: Geometry = computeGeometry(snapshot);
  let refs: TopologyRefs | null = null;

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
    refs = renderTopology(
      snapshot,
      geometry,
      selected,
      toggleInterface,
      snapshot.state === 'awaitingAnswer',
    );

    mount(
      root,
      header(),
      scoreBar(snapshot.score, snapshot.goal),
      el(
        'div',
        { class: 'router-layout' },
        el(
          'div',
          { class: 'router-main' },
          verdictStrip(),
          el('div', { class: `topology-panel ${verdictClass()}` }, refs.root),
        ),
        el('div', { class: 'router-side' }, packetPanel(), routingTablePanel()),
      ),
      showExplain ? explainPanel(snapshot, () => {
        showExplain = false;
        render();
      }) : null,
    );

    applyVerdictStyling();
  }

  function header(): HTMLElement {
    return el(
      'header',
      { class: 'exercise-header' },
      el('h1', { class: 'exercise-title', text: t('router.title') }),
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

  /**
   * Sits above the topology and keeps its height whether or not it has a
   * verdict to show, so scoring an answer never moves the canvas. Before an
   * answer it carries the instruction, which is why there is no separate
   * banner under the topology any more.
   */
  function verdictStrip(): HTMLElement {
    const result = scoredResult();
    const strip = el('div', {
      class: `verdict ${result ? (result.correct ? 'is-correct' : 'is-wrong') : 'is-idle'}`,
      role: 'status',
      'aria-live': 'polite',
    });

    if (!result) {
      strip.append(
        el('span', {
          class: 'verdict-detail',
          text: snapshot.packet ? t('router.selectInterface') : t('router.intro'),
        }),
      );
      return strip;
    }

    const expected =
      result.expectedPort === null
        ? t('router.expectedDrop')
        : t('router.expectedInterface', {
            name: snapshot.interfaces[result.expectedPort]?.name ?? `eth${result.expectedPort}`,
          });

    strip.append(
      el('strong', {
        class: 'verdict-label',
        text: result.correct ? t('router.resultCorrect') : t('router.resultWrong'),
      }),
      el('span', { class: 'verdict-detail', text: expected }),
    );
    queueMicrotask(() => void (result.correct ? pulse(strip) : shake(strip)));
    return strip;
  }

  /** The whole topology box takes the verdict's colour. */
  function verdictClass(): string {
    const result = scoredResult();
    if (!result) return '';
    return result.correct ? 'is-correct' : 'is-wrong';
  }

  function scoredResult(): RouterResult | null {
    return snapshot.state === 'showingSolution' ? snapshot.result : null;
  }

  function packetPanel(): HTMLElement {
    const panel = el(
      'div',
      { class: 'panel' },
      el(
        'div',
        { class: 'panel-header' },
        el('h2', { class: 'panel-title', text: t('router.packet') }),
        actions(),
      ),
    );
    const packet = snapshot.packet;

    if (!packet) {
      panel.append(el('p', { class: 'muted', text: t('router.intro') }));
      return panel;
    }

    panel.append(
      el(
        'dl',
        { class: 'kv' },
        ...field(t('router.destIp'), packet.destIp, true),
        ...field(t('router.sourceIp'), packet.sourceIp),
        ...field(t('router.destMac'), packet.destMac),
        ...field(t('router.sourceMac'), packet.sourceMac),
      ),
    );
    return panel;
  }

  function field(label: string, value: string, emphasis = false): [HTMLElement, HTMLElement] {
    return [
      el('dt', { text: label }),
      el('dd', { class: `mono ${emphasis ? 'is-emphasis' : ''}`, text: value }),
    ];
  }

  function routingTablePanel(): HTMLElement {
    const panel = el(
      'div',
      { class: 'panel' },
      el('h2', { class: 'panel-title', text: t('router.routingTable') }),
    );

    const body = el('tbody');
    const chosen = snapshot.result?.chosenRouteIndex ?? null;
    const matches = new Map(
      (snapshot.result?.explanation ?? []).map((row) => [row.routeIndex, row]),
    );

    for (const route of snapshot.routes) {
      const match = matches.get(route.index);
      const classes = [
        route.isDefault ? 'is-default' : '',
        match ? (match.matches ? 'is-match' : 'is-nomatch') : '',
        route.index === chosen ? 'is-winner' : '',
      ].join(' ');

      body.append(
        el(
          'tr',
          { class: classes, 'data-route': route.index },
          el('td', { class: 'mono', text: route.target }),
          el('td', {
            class: 'mono',
            text: route.onLink
              ? t('router.onLink')
              : t('router.viaGateway', { gateway: route.gateway ?? '—' }),
          }),
          el('td', {
            class: `mono ${route.port === null ? 'muted' : ''}`,
            text: route.port === null ? '—' : `eth${route.port}`,
          }),
        ),
      );
    }

    panel.append(el('table', { class: 'route-table' }, body));
    return panel;
  }

  function primaryAction(): { label: string; handler: () => void } {
    switch (snapshot.state) {
      case 'awaitingAnswer':
        return { label: t('router.send'), handler: check };
      case 'showingSolution':
        return { label: t('common.next'), handler: start };
      default:
        return { label: t('common.start'), handler: start };
    }
  }

  function actions(): HTMLElement {
    const row = el('div', { class: 'panel-actions' });
    const action = primaryAction();
    row.append(primary(action.label, action.handler, 'btn-sm'));

    if (snapshot.state === 'showingSolution') {
      row.append(ghost(t('router.explain'), () => {
        showExplain = !showExplain;
        render();
      }));
    }

    row.append(ghost(t('common.restart'), restart));
    return row;
  }

  function ghost(label: string, handler: () => void): HTMLButtonElement {
    const button = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: label });
    button.addEventListener('click', handler);
    return button;
  }

  function primary(label: string, handler: () => void, extra = ''): HTMLButtonElement {
    const button = el('button', { type: 'button', class: `btn btn-primary ${extra}`, text: label });
    button.addEventListener('click', handler);
    return button;
  }

  function toggleInterface(port: number): void {
    if (snapshot.state !== 'awaitingAnswer') return;
    if (selected.has(port)) {
      selected.delete(port);
    } else {
      selected.add(port);
    }
    render();
  }

  function start(): void {
    snapshot = game.nextPacket();
    selected = new Set();
    showExplain = false;
    render();
    void animateArrival();
  }

  function check(): void {
    snapshot = game.submit([...selected]);
    saveProgress({
      exercise: 'router',
      correct: snapshot.score.correct,
      total: snapshot.score.total,
      score: snapshot.score.score,
      updatedAt: Date.now(),
    });
    if (snapshot.result?.goalStatus === 'reached' && snapshot.goal) {
      recordPassedExam({
        exercise: 'router',
        correct: snapshot.score.correct,
        total: snapshot.score.total,
        score: snapshot.score.score,
        goalCorrect: snapshot.goal.correctAttempts,
        goalTotal: snapshot.goal.totalAttempts,
        completedAt: Date.now(),
      });
    }
    render();
    void animateDeparture();
  }

  function restart(): void {
    game.dispose();
    const current = activeSettings().router;
    game = new RouterGame(
      defaultOptions({
        examMode: current.examMode,
        goalTotal: current.examMode ? current.goalTotal : 0,
        goalCorrect: current.examMode ? current.goalCorrect : 0,
      }),
    );
    snapshot = game.snapshot();
    selected = new Set();
    showExplain = false;
    render();
  }

  /** The packet arrives from outside and parks on the router. */
  async function animateArrival(): Promise<void> {
    const token = refs?.packetToken;
    if (!token || motionDisabled()) return;

    const from = geometry.entryPoint;
    token.style.transform = `translate(${from.x}px, ${from.y}px)`;

    await Promise.all([
      animate(token, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' }),
      travel(token, from, geometry.centre, 640),
    ]);
  }

  /**
   * Walks the routing table row by row, then sends the packet out of the
   * winning interface so the decision is visible step by step.
   */
  async function animateDeparture(): Promise<void> {
    const result = snapshot.result;
    const token = refs?.packetToken;
    if (!result || !token || !refs) return;

    for (const row of result.explanation) {
      const tr = root.querySelector(`tr[data-route="${row.routeIndex}"]`);
      if (!tr) continue;
      tr.classList.add('is-evaluating');
      await wait(180);
      tr.classList.remove('is-evaluating');
    }

    if (result.expectedPort === null) {
      await shake(token);
      return;
    }

    const winner = root.querySelector(`tr[data-route="${result.chosenRouteIndex}"]`);
    if (winner) await pulse(winner);

    refs.cables.get(result.expectedPort)?.classList.add('is-active');
    await travel(token, geometry.centre, geometry.interfaceAnchor(result.expectedPort), 520);
    await travel(
      token,
      geometry.interfaceAnchor(result.expectedPort),
      geometry.exitAnchor(result.expectedPort),
      380,
    );
    refs.cables.get(result.expectedPort)?.classList.remove('is-active');
  }

  function applyVerdictStyling(): void {
    if (!refs || !snapshot.result) return;
    const { expectedPort, selectedPorts } = snapshot.result;
    for (const [port, group] of refs.interfaceGroups) {
      group.classList.toggle('is-expected', port === expectedPort);
      group.classList.toggle(
        'is-mistake',
        selectedPorts.includes(port) && port !== expectedPort,
      );
    }
  }

  render();
  return root;
}
