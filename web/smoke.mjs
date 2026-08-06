// Throwaway smoke test: drives one round of each exercise through the real wasm.
import { readFile } from 'node:fs/promises';
import init, { QuizSession, RouterGame, SwitchGame, version } from './src/wasm/wasm_api.js';

const bytes = await readFile(new URL('./src/wasm/wasm_api_bg.wasm', import.meta.url));
await init({ module_or_path: bytes });

const ok = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
};

console.log('engine version:', version());

const options = {
  seed: 12345.678,
  examMode: false,
  goalTotal: 0,
  goalCorrect: 0,
  useVlan: true,
  ipv4: true,
  ipv6: true,
  portCount: 6,
  interfaceCount: 5,
};

// ---------------------------------------------------------------- BeASwitch
const sw = new SwitchGame(options);
let s = sw.nextRound();
ok('switch: 6 ports', s.ports.length === 6);
ok('switch: 12 hosts', s.hosts.length === 12);
ok('switch: frame dealt', !!s.frame, JSON.stringify(s.frame));
ok('switch: state', s.state === 'awaitingAnswer', s.state);
ok('switch: no solution leaked before submit', s.result === null);

s = sw.submit({
  entryRequired: true,
  entryMac: s.frame.sourceLabel,
  entryPort: s.frame.sourcePort,
  ports: s.ports.map((p) => ({ port: p.number, send: false, tag: false })),
});
ok('switch: result present', !!s.result, `action=${s.result?.action}`);
ok('switch: mac table learned', s.macTables.length > 0, JSON.stringify(s.macTables));
ok('switch: expected ports revealed', Array.isArray(s.result.ports));

// ---------------------------------------------------------------- BeARouter
const rt = new RouterGame(options);
let r = rt.nextPacket();
ok('router: 5 interfaces', r.interfaces.length === 5);
ok('router: routes present', r.routes.length >= 5, `${r.routes.length} routes`);
ok('router: default route', r.routes.some((x) => x.isDefault));
ok('router: packet dealt', !!r.packet, JSON.stringify(r.packet));

// A gateway route's interface is the answer, so it must not be readable.
const leaked = r.routes.filter((x) => !x.onLink && x.port !== null);
ok('router: gateway routes hide their interface', leaked.length === 0, JSON.stringify(leaked));
ok(
  'router: connected routes show their interface',
  r.routes.filter((x) => x.onLink).every((x) => typeof x.port === 'number'),
);

r = rt.submit(new Uint32Array([0]));
ok('router: result present', !!r.result, `expectedPort=${r.result?.expectedPort}`);
ok('router: explanation covers table', r.result.explanation.length === r.routes.length);
ok('router: exactly one winner', r.result.chosenRouteIndex !== null);

// --------------------------------------------------------------------- Quiz
const qz = new QuizSession(options);
const kinds = new Set();
let q = qz.snapshot();
for (let i = 0; i < 40; i++) {
  q = qz.nextQuestion();
  if (!q.question) break;
  kinds.add(q.question.kind);
  ok(`quiz: no answer leaked (${q.question.kind})`, !('answer' in q.question));
  q = qz.submit('deliberately wrong');
  if (!q.result) break;
}
ok('quiz: many kinds seen', kinds.size >= 8, `${kinds.size} kinds`);
ok('quiz: wrong answers scored as wrong', q.score.correct === 0 && q.score.wrong === 40);
ok('quiz: expected revealed after submit', typeof q.result.expected === 'string');

console.log('\nsmoke test finished with exit code', process.exitCode ?? 0);
