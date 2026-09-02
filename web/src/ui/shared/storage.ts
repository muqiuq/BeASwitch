/** Versioned localStorage wrapper for settings, progress and exam results. */

import { normaliseScale } from './textSize.js';

const SETTINGS_KEY = 'bea.settings.v2';
const PROGRESS_KEY = 'bea.progress.v1';
const EXAMS_KEY = 'bea.exams.v1';

export type ExerciseId = 'switch' | 'router' | 'quiz';

export const EXERCISES: ExerciseId[] = ['switch', 'router', 'quiz'];

export interface ExerciseSettings {
  examMode: boolean;
  goalTotal: number;
  goalCorrect: number;
  /** BeASwitch only. */
  useVlan: boolean;
  /** Quiz only. */
  ipv4: boolean;
  ipv6: boolean;
}

export interface Settings {
  switch: ExerciseSettings;
  router: ExerciseSettings;
  quiz: ExerciseSettings;
  reducedMotion: boolean;
  /** Root font size in percent; the steps live in `textSize.ts`. */
  textScale: number;
}

const DEFAULT_EXERCISE: ExerciseSettings = {
  examMode: false,
  goalTotal: 20,
  goalCorrect: 16,
  useVlan: true,
  ipv4: true,
  ipv6: true,
};

export const DEFAULT_SETTINGS: Settings = {
  switch: { ...DEFAULT_EXERCISE },
  router: { ...DEFAULT_EXERCISE },
  quiz: { ...DEFAULT_EXERCISE },
  reducedMotion: false,
  textScale: 100,
};

export interface ProgressEntry {
  exercise: ExerciseId;
  correct: number;
  total: number;
  score: number;
  updatedAt: number;
}

export interface ExamRecord {
  exercise: ExerciseId;
  correct: number;
  total: number;
  score: number;
  goalCorrect: number;
  goalTotal: number;
  completedAt: number;
}

const MAX_EXAM_RECORDS = 50;

function readRaw<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota: nothing persists, the app still works.
  }
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normaliseExercise(raw: unknown): ExerciseSettings {
  const source = (raw ?? {}) as Partial<ExerciseSettings>;
  const goalTotal = clamp(source.goalTotal, 1, 200, DEFAULT_EXERCISE.goalTotal);
  const settings: ExerciseSettings = {
    examMode: bool(source.examMode, DEFAULT_EXERCISE.examMode),
    goalTotal,
    goalCorrect: clamp(
      source.goalCorrect,
      0,
      goalTotal,
      Math.min(goalTotal, DEFAULT_EXERCISE.goalCorrect),
    ),
    useVlan: bool(source.useVlan, DEFAULT_EXERCISE.useVlan),
    ipv4: bool(source.ipv4, DEFAULT_EXERCISE.ipv4),
    ipv6: bool(source.ipv6, DEFAULT_EXERCISE.ipv6),
  };
  if (!settings.ipv4 && !settings.ipv6) settings.ipv4 = true;
  return settings;
}

export function loadSettings(): Settings {
  const raw = readRaw<Partial<Settings>>(SETTINGS_KEY) ?? {};
  return {
    switch: normaliseExercise(raw.switch),
    router: normaliseExercise(raw.router),
    quiz: normaliseExercise(raw.quiz),
    reducedMotion: bool(raw.reducedMotion, false),
    textScale: normaliseScale(raw.textScale),
  };
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

export function loadProgress(): Partial<Record<ExerciseId, ProgressEntry>> {
  return readRaw<Partial<Record<ExerciseId, ProgressEntry>>>(PROGRESS_KEY) ?? {};
}

export function saveProgress(entry: ProgressEntry): void {
  const all = loadProgress();
  all[entry.exercise] = entry;
  write(PROGRESS_KEY, all);
}

/** Newest first. */
export function loadExamHistory(): ExamRecord[] {
  const records = readRaw<ExamRecord[]>(EXAMS_KEY);
  if (!Array.isArray(records)) return [];
  return records
    .filter((record) => record && EXERCISES.includes(record.exercise))
    .sort((a, b) => b.completedAt - a.completedAt);
}

export function recordPassedExam(record: ExamRecord): void {
  const history = [record, ...loadExamHistory()].slice(0, MAX_EXAM_RECORDS);
  write(EXAMS_KEY, history);
}

export function clearExamHistory(): void {
  write(EXAMS_KEY, []);
}
