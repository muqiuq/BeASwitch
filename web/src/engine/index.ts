import init, {
  QuizSession as WasmQuiz,
  RouterGame as WasmRouter,
  SwitchGame as WasmSwitch,
  version,
} from '../wasm/wasm_api.js';
import type {
  QuizSnapshot,
  RouterSnapshot,
  SessionOptions,
  SwitchAnswer,
  SwitchSnapshot,
} from './types.js';

let ready: Promise<void> | null = null;

/** Loads the wasm module once; safe to await from anywhere. */
export function loadEngine(): Promise<void> {
  ready ??= init().then(() => undefined);
  return ready;
}

export function engineVersion(): string {
  return version();
}

/** Seeds the engine from the platform CSPRNG so sessions are unpredictable. */
export function randomSeed(): number {
  const buffer = new Uint32Array(2);
  crypto.getRandomValues(buffer);
  return (buffer[0] ?? 0) * 4294967296 + (buffer[1] ?? 0);
}

export function defaultOptions(overrides: Partial<SessionOptions> = {}): SessionOptions {
  return {
    seed: randomSeed(),
    examMode: false,
    goalTotal: 0,
    goalCorrect: 0,
    useVlan: true,
    ipv4: true,
    ipv6: true,
    portCount: 6,
    interfaceCount: 5,
    ...overrides,
  };
}

export class SwitchGame {
  readonly #inner: WasmSwitch;

  constructor(options: SessionOptions) {
    this.#inner = new WasmSwitch(options);
  }

  snapshot(): SwitchSnapshot {
    return this.#inner.snapshot() as SwitchSnapshot;
  }

  nextRound(): SwitchSnapshot {
    return this.#inner.nextRound() as SwitchSnapshot;
  }

  submit(answer: SwitchAnswer): SwitchSnapshot {
    return this.#inner.submit(answer) as SwitchSnapshot;
  }

  restart(): SwitchSnapshot {
    return this.#inner.restart() as SwitchSnapshot;
  }

  dispose(): void {
    this.#inner.free();
  }
}

export class RouterGame {
  readonly #inner: WasmRouter;

  constructor(options: SessionOptions) {
    this.#inner = new WasmRouter(options);
  }

  snapshot(): RouterSnapshot {
    return this.#inner.snapshot() as RouterSnapshot;
  }

  nextPacket(): RouterSnapshot {
    return this.#inner.nextPacket() as RouterSnapshot;
  }

  submit(selectedPorts: number[]): RouterSnapshot {
    return this.#inner.submit(new Uint32Array(selectedPorts)) as RouterSnapshot;
  }

  restart(): RouterSnapshot {
    return this.#inner.restart() as RouterSnapshot;
  }

  dispose(): void {
    this.#inner.free();
  }
}

export class QuizSession {
  readonly #inner: WasmQuiz;

  constructor(options: SessionOptions) {
    this.#inner = new WasmQuiz(options);
  }

  snapshot(): QuizSnapshot {
    return this.#inner.snapshot() as QuizSnapshot;
  }

  nextQuestion(): QuizSnapshot {
    return this.#inner.nextQuestion() as QuizSnapshot;
  }

  submit(response: string): QuizSnapshot {
    return this.#inner.submit(response) as QuizSnapshot;
  }

  restart(): QuizSnapshot {
    return this.#inner.restart() as QuizSnapshot;
  }

  dispose(): void {
    this.#inner.free();
  }
}
