import dayjs from 'dayjs';
import { getDb } from './database';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { TRAINING_PROGRAMS } from './programs';

export const MUSCLES = [
  { id: 'chest', label: 'Pectoraux' }, { id: 'back', label: 'Dos' },
  { id: 'shoulders', label: 'Épaules' }, { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' }, { id: 'abs', label: 'Abdominaux' },
  { id: 'quads', label: 'Quadriceps' }, { id: 'hamstrings', label: 'Ischio-jambiers' },
  { id: 'glutes', label: 'Fessiers' }, { id: 'calves', label: 'Mollets' },
] as const;
export type MuscleId = typeof MUSCLES[number]['id'];
export type MuscleStatus = 'strong' | 'balanced' | 'low' | 'unknown';
export interface MuscleActivity { id: MuscleId; label: string; score: number; sessions: number; ratio: number; status: MuscleStatus }
interface ActivityRow { name: string; category: string | null; session_id: string; setCount: number }
interface Recruitment { primary: MuscleId[]; secondary: MuscleId[] }
const recruitment = (primary: MuscleId[], secondary: MuscleId[] = []): Recruitment => ({ primary, secondary });

export function getRecruitment(name: string, category?: string | null): Recruitment {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/mollets|triceps sural/.test(n)) return recruitment(['calves']);
  if (/leg extension \/ curl/.test(n)) return recruitment(['quads', 'hamstrings']);
  if (/leg curl/.test(n)) return recruitment(['hamstrings']);
  if (/leg extension/.test(n)) return recruitment(['quads']);
  if (/hip thrust|glute|fessier/.test(n)) return recruitment(['glutes'], ['hamstrings']);
  if (/squat|leg press/.test(n)) return recruitment(['quads', 'glutes']);
  if (/hip adduction/.test(n)) return recruitment([]); // Adductors are outside this map.
  if (/lombaires/.test(n)) return recruitment(['back'], ['glutes', 'hamstrings']);
  if (/rear delt|face pull/.test(n)) return recruitment(['shoulders'], ['back']);
  if (/shoulder press/.test(n)) return recruitment(['shoulders'], ['triceps']);
  if (/lateral/.test(n)) return recruitment(['shoulders']);
  if (/pompes|developpe couche|chest press/.test(n)) return recruitment(['chest'], ['triceps', 'shoulders']);
  if (/pec fly/.test(n)) return recruitment(['chest']);
  if (/dips/.test(n)) return recruitment(['triceps'], ['chest']);
  if (/traction|pulldown|seated row/.test(n)) return recruitment(['back'], ['biceps']);
  const cat = category ?? PREDEFINED_EXERCISES.find(ex => ex.name === name)?.category;
  if (cat === 'Biceps') return recruitment(['biceps']);
  if (cat === 'Triceps') return recruitment(['triceps']);
  if (cat === 'Poitrine') return recruitment(['chest']);
  if (cat === 'Dos') return recruitment(['back']);
  if (cat === 'Épaules') return recruitment(['shoulders']);
  if (cat === 'Abdominaux') return recruitment(['abs']);
  // A generic custom leg exercise cannot identify a specific leg muscle reliably.
  return recruitment([]);
}

export function summarizeBalance(rows: ActivityRow[]) {
  const scores = new Map<MuscleId, number>();
  const sessions = new Map<MuscleId, Set<string>>();
  const knownSessions = new Set<string>();
  let unclassifiedSets = 0;
  for (const row of rows) {
    const muscles = getRecruitment(row.name, row.category);
    if (!muscles.primary.length) { unclassifiedSets += row.setCount; continue; }
    knownSessions.add(row.session_id);
    for (const [ids, credit] of [[muscles.primary, 1], [muscles.secondary, 0.5]] as const) {
      for (const id of ids) {
        scores.set(id, (scores.get(id) ?? 0) + row.setCount * credit);
        const dates = sessions.get(id) ?? new Set<string>(); dates.add(row.session_id); sessions.set(id, dates);
      }
    }
  }
  const max = Math.max(0, ...scores.values());
  const enoughData = knownSessions.size >= 3 && max > 0;
  const muscles: MuscleActivity[] = MUSCLES.map(m => {
    const score = scores.get(m.id) ?? 0;
    const ratio = max > 0 ? score / max : 0;
    return { ...m, score, sessions: sessions.get(m.id)?.size ?? 0, ratio, status: !enoughData ? 'unknown' : ratio >= 0.65 ? 'strong' : ratio < 0.35 ? 'low' : 'balanced' };
  });
  return { muscles, enoughData, sessionCount: knownSessions.size, unclassifiedSets };
}

export function getTrainingBalance(days: number = 28) {
  const until = dayjs().toISOString();
  const since = dayjs().subtract(days - 1, 'day').startOf('day').toISOString();
  const rows = getDb().getAllSync<ActivityRow>(
    `SELECT e.name, c.category, e.session_id, COUNT(st.id) AS setCount
     FROM sets st JOIN exercises e ON e.id = st.exercise_id JOIN sessions s ON s.id = e.session_id
     LEFT JOIN custom_exercises c ON c.name = e.name
     WHERE st.reps > 0 AND st.weight >= 0 AND s.date >= ? AND s.date <= ?
     GROUP BY e.id, e.name, c.category, e.session_id`, [since, until]);
  return summarizeBalance(rows);
}

export function getTrainingPeriodStats(days: number = 28) {
  return getDb().getFirstSync<{ sessions: number; volume: number }>(
    `SELECT COUNT(DISTINCT e.session_id) AS sessions, COALESCE(SUM(st.weight * st.reps), 0) AS volume
     FROM sets st JOIN exercises e ON e.id = st.exercise_id JOIN sessions s ON s.id = e.session_id
     WHERE st.reps > 0 AND st.weight >= 0 AND s.date >= ? AND s.date <= ?`,
    [dayjs().subtract(days - 1, 'day').startOf('day').toISOString(), dayjs().toISOString()]) ?? { sessions: 0, volume: 0 };
}

export function recommendBalanceProgram(muscles: MuscleActivity[]) {
  const priorities = muscles.filter(m => m.status === 'low').sort((a, b) => a.score - b.score);
  if (!priorities.length) return null;
  const ranked = TRAINING_PROGRAMS.map(program => {
    const covered = new Map<MuscleId, number>();
    for (const day of program.days) for (const name of day.exerciseNames) {
      const r = getRecruitment(name);
      for (const id of r.primary) covered.set(id, (covered.get(id) ?? 0) + 1);
      for (const id of r.secondary) covered.set(id, (covered.get(id) ?? 0) + 0.5);
    }
    const matching = priorities.filter(m => (covered.get(m.id) ?? 0) > 0);
    // Prefer broad coverage of neglected groups, then frequency per workout.
    const focusFor: Partial<Record<MuscleId, string>> = { biceps: 'biceps', chest: 'chest', back: 'back', glutes: 'glutes', quads: 'glutes', hamstrings: 'glutes' };
    const focusBonus = priorities.some(m => program.id === `focus-${focusFor[m.id]}`) ? 0.5 : 0;
    const score = matching.length * 10 + matching.reduce((sum, m) => sum + Math.min(1, (covered.get(m.id) ?? 0) / program.days.length), 0) + focusBonus;
    return { program, matching, score };
  }).filter(entry => entry.matching.length).sort((a, b) => b.score - a.score || a.program.daysPerWeek - b.program.daysPerWeek);
  return ranked[0] ?? null;
}

// Illustrative reference masses, not universal product specifications.
export const VOLUME_OBJECTS = [
  { id: 'water', label: 'packs de 6 L d’eau', referenceKg: 6, icon: 'water-outline' },
  { id: 'bike', label: 'vélos', referenceKg: 15, icon: 'bicycle-outline' },
  { id: 'washer', label: 'lave-linge', referenceKg: 70, icon: 'cube-outline' },
  { id: 'car', label: 'petites voitures', referenceKg: 1000, icon: 'car-sport-outline' },
] as const;
export function getVolumeComparisons(kg: number) {
  const safe = Number.isFinite(kg) ? Math.max(0, kg) : 0;
  return VOLUME_OBJECTS.map(object => ({ ...object, count: safe / object.referenceKg }));
}
