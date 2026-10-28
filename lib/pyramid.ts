import { getDb, getUserSetting, setUserSetting, generateId } from './database';
import { addSet, getUserBodyweight } from './queries';
import { BODYWEIGHT_EXERCISES } from '../constants/exercises';
import type { Set as WorkoutSet } from '../types';

export type PyramidDirection = 'ascending' | 'descending' | 'updown';
export interface PyramidConfig { start: number; step: number; levels: number; direction: PyramidDirection }
export interface PyramidPlan extends PyramidConfig { runId: string; enabled: boolean }
export const DEFAULT_PYRAMID: PyramidConfig = { start: 2, step: 2, levels: 3, direction: 'updown' };

export function buildPyramid(config: PyramidConfig): number[] {
  const { start, step, levels, direction } = config;
  if (!Number.isInteger(start) || start < 1 || start > 100 || !Number.isInteger(step) || step < 1 || step > 20 || !Number.isInteger(levels) || levels < 2 || levels > 8 || !['ascending', 'descending', 'updown'].includes(direction) || start + step * (levels - 1) > 100) {
    throw new Error('Choisis un départ de 1 à 100 répétitions, un pas de 1 à 20 et 2 à 8 paliers. Le sommet ne peut pas dépasser 100 répétitions.');
  }
  const ascending = Array.from({ length: levels }, (_, index) => start + index * step);
  return direction === 'descending' ? [...ascending].reverse() : direction === 'ascending' ? ascending : [...ascending, ...ascending.slice(0, -1).reverse()];
}

function ensureBodyweightExercise(exerciseId: string) {
  const row = getDb().getFirstSync<{ name: string }>('SELECT name FROM exercises WHERE id = ?', [exerciseId]);
  if (!row || !BODYWEIGHT_EXERCISES.includes(row.name)) throw new Error('La pyramide est disponible pour les exercices au poids du corps.');
}
export function getPyramidPlan(exerciseId: string): PyramidPlan | null {
  try {
    const plan = JSON.parse(getUserSetting(`pyramid:${exerciseId}`) ?? 'null') as PyramidPlan | null;
    if (!plan || typeof plan.runId !== 'string' || !/^[a-f0-9-]+$/.test(plan.runId) || typeof plan.enabled !== 'boolean') return null;
    buildPyramid(plan);
    return plan;
  } catch { return null; }
}
export function savePyramidPlan(exerciseId: string, config: PyramidConfig): PyramidPlan {
  ensureBodyweightExercise(exerciseId); buildPyramid(config);
  const plan: PyramidPlan = { ...config, runId: generateId(), enabled: true };
  setUserSetting(`pyramid:${exerciseId}`, JSON.stringify(plan));
  return plan;
}
export function setPyramidEnabled(exerciseId: string, enabled: boolean): PyramidPlan | null {
  ensureBodyweightExercise(exerciseId);
  const plan = getPyramidPlan(exerciseId);
  if (!plan) return null;
  const next = { ...plan, enabled };
  setUserSetting(`pyramid:${exerciseId}`, JSON.stringify(next));
  return next;
}
export function parsePyramidSet(notes: string | null) {
  const match = notes?.match(/^pyramid:v1:([a-f0-9-]+):(\d+):(\d+)$/);
  if (!match) return null;
  const index = Number(match[2]); const targetReps = Number(match[3]);
  if (!Number.isSafeInteger(index) || index >= 15 || !Number.isInteger(targetReps) || targetReps < 1 || targetReps > 100) return null;
  return { runId: match[1], index, targetReps };
}
export function getPyramidProgress(exerciseId: string) {
  const plan = getPyramidPlan(exerciseId);
  if (!plan) return null;
  const targets = buildPyramid(plan);
  const sets = getDb().getAllSync<WorkoutSet>('SELECT * FROM sets WHERE exercise_id = ? ORDER BY set_number', [exerciseId]);
  const current = new Map<number, WorkoutSet>();
  for (const set of sets) { const meta = parsePyramidSet(set.notes); if (meta?.runId === plan.runId) current.set(meta.index, set); }
  let completed = 0;
  for (let index = 0; index < targets.length; index++) {
    const set = current.get(index);
    if (set && set.reps > 0 && getUserSetting(`set_confirmed:${set.id}`) === '1') { completed++; continue; }
    return { plan, targets, completed, nextIndex: index, pendingSet: set ?? null, finished: false };
  }
  return { plan, targets, completed, nextIndex: targets.length, pendingSet: null, finished: true };
}
export function addNextPyramidSet(exerciseId: string): WorkoutSet {
  ensureBodyweightExercise(exerciseId);
  let added: WorkoutSet | null = null;
  getDb().withTransactionSync(() => {
    const progress = getPyramidProgress(exerciseId);
    if (!progress?.plan.enabled) throw new Error('Active une pyramide avant d’ajouter un palier.');
    if (progress.finished) throw new Error('Pyramide terminée. Tu peux en recommencer une nouvelle.');
    if (progress.pendingSet) throw new Error('Valide le palier en cours avant de passer au suivant.');
    const target = progress.targets[progress.nextIndex];
    // Targets remain in metadata: unperformed repetitions must not inflate statistics.
    added = addSet(exerciseId, getUserBodyweight(), 0, null, `pyramid:v1:${progress.plan.runId}:${progress.nextIndex}:${target}`);
  });
  return added!;
}
