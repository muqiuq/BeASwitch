/** Mirrors the serde DTOs in `engine/crates/wasm-api`. */

export interface Score {
  score: number;
  correct: number;
  wrong: number;
  total: number;
  percentCorrect: number;
}

export interface GoalInfo {
  totalAttempts: number;
  correctAttempts: number;
  remaining: number;
}

export type GoalStatus = 'inProgress' | 'reached' | 'failed';

export interface SessionOptions {
  seed: number;
  examMode: boolean;
  goalTotal: number;
  goalCorrect: number;
  useVlan: boolean;
  ipv4: boolean;
  ipv6: boolean;
  portCount: number;
  interfaceCount: number;
}

/* ---------------------------------------------------------------- BeASwitch */

export type SwitchState = 'awaitingStart' | 'awaitingAnswer' | 'showingSolution' | 'finished';
export type SwitchActionKind = 'discard' | 'broadcast' | 'unicast';
export type PortRole = 'access' | 'trunk' | 'hybrid';

export interface SwitchPort {
  number: number;
  untagged: number[];
  tagged: number[];
  role: PortRole;
}

export interface SwitchHost {
  label: string;
  vlan: number;
  port: number;
}

export interface EthernetFrame {
  sourceLabel: string;
  sourcePort: number;
  sourceVlan: number;
  destLabel: string;
  vlanTag: number | null;
  payload: string;
}

export interface MacTable {
  vlan: number;
  entries: { mac: string; port: number }[];
}

export interface PortVerdict {
  port: number;
  expectedSend: boolean;
  expectedTag: boolean;
  givenSend: boolean;
  givenTag: boolean;
  correct: boolean;
}

export interface SwitchResult {
  correct: boolean;
  action: SwitchActionKind;
  vlan: number;
  destPort: number | null;
  entryRequiredExpected: boolean;
  entryRequiredCorrect: boolean;
  expectedMac: string;
  expectedPort: number;
  macCorrect: boolean | null;
  portCorrect: boolean | null;
  ports: PortVerdict[];
  goalStatus: GoalStatus | null;
}

export interface SwitchSnapshot {
  state: SwitchState;
  useVlan: boolean;
  examMode: boolean;
  ports: SwitchPort[];
  hosts: SwitchHost[];
  vlans: number[];
  frame: EthernetFrame | null;
  macTables: MacTable[];
  score: Score;
  goal: GoalInfo | null;
  result: SwitchResult | null;
}

export interface SwitchAnswer {
  entryRequired: boolean;
  entryMac: string | null;
  entryPort: number | null;
  ports: { port: number; send: boolean; tag: boolean }[];
}

/* ---------------------------------------------------------------- BeARouter */

export type RouterState = SwitchState;

export type MatchOutcome =
  | 'match'
  | 'networkMismatch'
  | 'targetIsNetworkAddress'
  | 'targetIsBroadcast';

export interface RouterInterface {
  number: number;
  name: string;
  address: string;
  network: string;
  mask: number;
  cidr: string;
}

export interface RouteRow {
  index: number;
  target: string;
  network: string;
  mask: number;
  /** Only set for directly attached routes; otherwise it would be the answer. */
  port: number | null;
  gateway: string | null;
  src: string | null;
  onLink: boolean;
  isDefault: boolean;
  display: string;
}

export interface Packet {
  sourceMac: string;
  destMac: string;
  sourceIp: string;
  destIp: string;
}

export interface RouteMatchRow {
  routeIndex: number;
  outcome: MatchOutcome;
  matches: boolean;
  mask: number;
  dottedMask: string;
  calculatedNetwork: string;
  routeNetwork: string;
}

export interface RouterResult {
  correct: boolean;
  expectedPort: number | null;
  chosenRouteIndex: number | null;
  selectedPorts: number[];
  explanation: RouteMatchRow[];
  goalStatus: GoalStatus | null;
}

export interface RouterSnapshot {
  state: RouterState;
  examMode: boolean;
  interfaces: RouterInterface[];
  routes: RouteRow[];
  packet: Packet | null;
  score: Score;
  goal: GoalInfo | null;
  result: RouterResult | null;
}

/* --------------------------------------------------------------------- Quiz */

export type QuizState = 'awaitingAnswer' | 'showingSolution' | 'finished';
export type QuestionCategory = 'ipv4' | 'ipv6';
export type QuestionInputType = 'text' | 'singleChoice';

export interface QuizQuestion {
  kind: string;
  category: QuestionCategory;
  inputType: QuestionInputType;
  subject: string;
  subject2: string;
  responseHint: string;
  responseTemplate: string;
  options: string[];
}

export interface QuizResult {
  correct: boolean;
  expected: string;
  given: string;
  goalStatus: GoalStatus | null;
}

export interface QuizSnapshot {
  state: QuizState;
  examMode: boolean;
  ipv4: boolean;
  ipv6: boolean;
  question: QuizQuestion | null;
  score: Score;
  goal: GoalInfo | null;
  result: QuizResult | null;
}
