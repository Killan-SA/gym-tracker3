import { getDb, getUserSetting, setUserSetting } from './database';
import { MUSCLES, type MuscleId, getRecruitment } from './trainingBalance';
import { getExerciseMetadata } from './exerciseAlternatives';
import { PREDEFINED_EXERCISES, BODYWEIGHT_EXERCISES } from '../constants/exercises';
import { normalizeExerciseName } from './sessionFeatures';
import type { CheckIn, CheckInHistory, CoachPreferences, CoachSet, ProgressionConfig, StrengthGoal } from './coachTypes';

const keyFor = (kind: string, name: string) => `coach:${kind}:${normalizeExerciseName(name)}`;
function read(key: string): unknown { try { return JSON.parse(getUserSetting(key) ?? 'null'); } catch { return null; } }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isMuscle = (v: unknown): v is MuscleId => MUSCLES.some(m => m.id === v);
export const EQUIPMENT = ['Machine', 'Poulie', 'Haltères', 'Barre', 'Smith', 'Machine assistée', 'Banc', 'Poids du corps'];
export function getCoachPreferences(): CoachPreferences {
  const v = read('coach:preferences');
  // Temporarily suspended, including installations which previously enabled it.
  return { enabled: !object(v) || v.enabled !== false, autoCheckIn: false, equipment: object(v) && Array.isArray(v.equipment) ? v.equipment.filter((s): s is string => typeof s === 'string' && EQUIPMENT.includes(s)) : [] };
}
export function saveCoachPreferences(value: CoachPreferences) {
  if (typeof value.enabled !== 'boolean' || typeof value.autoCheckIn !== 'boolean' || !Array.isArray(value.equipment) || value.equipment.some(s => !EQUIPMENT.includes(s))) throw new Error('Préférences invalides.');
  setUserSetting('coach:preferences', JSON.stringify(value));
}
export function defaultProgressionConfig(name: string): ProgressionConfig {
  const entry = PREDEFINED_EXERCISES.find(e => normalizeExerciseName(e.name) === normalizeExerciseName(name));
  const meta = entry ? getExerciseMetadata(entry) : null;
  const isolation = /curl|raise|fly|extension|flexion|calf/.test(meta?.movementPattern ?? '');
  return { minReps: 6, maxReps: 10, targetRpe: 8, incrementKg: meta?.equipment === 'Haltères' || isolation ? 1 : 2.5, mode: BODYWEIGHT_EXERCISES.includes(name) ? 'reps' : 'double' };
}
export function validateProgressionConfig(v: unknown): v is ProgressionConfig {
  return object(v) && Number.isInteger(v.minReps) && Number.isInteger(v.maxReps) && Number(v.minReps) >= 1 && Number(v.maxReps) <= 50 && Number(v.minReps) <= Number(v.maxReps) && typeof v.targetRpe === 'number' && v.targetRpe >= 6 && v.targetRpe <= 10 && typeof v.incrementKg === 'number' && Number.isFinite(v.incrementKg) && v.incrementKg > 0 && v.incrementKg <= 50 && ['double', 'reps', 'load', 'off'].includes(String(v.mode));
}
export function getProgressionConfig(name: string): ProgressionConfig { const v = read(keyFor('progression', name)); return validateProgressionConfig(v) ? v : defaultProgressionConfig(name); }
export function saveProgressionConfig(name: string, v: ProgressionConfig) { if (!validateProgressionConfig(v)) throw new Error('Fourchette, RPE ou incrément invalide.'); setUserSetting(keyFor('progression', name), JSON.stringify(v)); }

export function validateCheckIn(v: unknown): v is CheckIn {
  return object(v) && typeof v.recordedAt === 'string' && Number.isFinite(Date.parse(v.recordedAt)) && (v.energy === null || ['good', 'normal', 'tired'].includes(String(v.energy))) && object(v.soreness) && Object.entries(v.soreness).every(([id, level]) => isMuscle(id) && Number.isInteger(level) && Number(level) >= 0 && Number(level) <= 3) && Array.isArray(v.pain) && v.pain.every(isMuscle);
}
export function getSessionCheckIns(id: string): CheckInHistory {
  const v = read(`coach:checkin:${id}`);
  if (!object(v)) return { initial: null, updates: [], skipped: false };
  return { initial: validateCheckIn(v.initial) ? v.initial : null, updates: Array.isArray(v.updates) ? v.updates.filter(validateCheckIn) : [], skipped: v.skipped === true };
}
export function saveSessionCheckIn(id: string, value: CheckIn | null, update = false) {
  if (!getDb().getFirstSync('SELECT id FROM sessions WHERE id = ?', [id])) throw new Error('Séance introuvable.');
  if (value && !validateCheckIn(value)) throw new Error('Check-in invalide.');
  const history = getSessionCheckIns(id);
  if (update) { if (!value) return; history.updates.push(value); }
  else if (!history.initial && !history.skipped) { history.initial = value; history.skipped = value === null; }
  setUserSetting(`coach:checkin:${id}`, JSON.stringify(history));
}
/** An old check-in stays attached to its session, but is not current recovery data. */
export function currentCheckIn(history: CheckInHistory, now = Date.now()): CheckIn | null {
  const v = history.updates.at(-1) ?? history.initial;
  return v && now >= Date.parse(v.recordedAt) && now - Date.parse(v.recordedAt) <= 12 * 3600000 ? v : null;
}
export function getCoachSets(now = new Date(), excludeSessionId = '', allTime = false): CoachSet[] {
  const since = new Date(now); since.setDate(since.getDate() - 89); since.setHours(0, 0, 0, 0);
  const rows = getDb().getAllSync<CoachSet>(`SELECT st.id, e.name, c.category, e.session_id AS sessionId, s.date, st.set_number AS setNumber, st.weight, st.reps, st.rpe, st.notes
    FROM sets st JOIN exercises e ON e.id = st.exercise_id JOIN sessions s ON s.id = e.session_id
    LEFT JOIN custom_exercises c ON c.name = e.name
    WHERE st.reps > 0 AND st.weight >= 0 AND s.date >= ? AND s.date <= ? AND s.id != ?
      AND NOT EXISTS (SELECT 1 FROM user_settings p WHERE p.key = 'session_in_progress:' || s.id AND p.value = '1')
    ORDER BY s.date, s.id, e.order_index, st.set_number`, [allTime ? '0000' : since.toISOString(), now.toISOString(), excludeSessionId]);
  const sessions = new Map<string, CheckInHistory>();
  return rows.map(row => {
    if (!sessions.has(row.sessionId)) sessions.set(row.sessionId, getSessionCheckIns(row.sessionId));
    const c = sessions.get(row.sessionId)?.initial;
    const ids = getRecentMuscleIds(row.name, row.category);
    return { ...row, fatigueReported: !!c && (c.energy === 'tired' || ids.some(id => (c.soreness[id] ?? -1) >= 2 || c.pain.includes(id))) };
  });
}
export function latestCurrentCheckIn(now = Date.now()): CheckIn | null {
  const sessions = getDb().getAllSync<{ id: string }>('SELECT id FROM sessions WHERE date <= ? ORDER BY date DESC LIMIT 100', [new Date(now).toISOString()]);
  return sessions.map(s => currentCheckIn(getSessionCheckIns(s.id), now)).filter((c): c is CheckIn => c !== null).sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0] ?? null;
}
export function getRecentMuscleIds(name: string, category?: string | null) { const r = getRecruitment(name, category); return [...r.primary, ...r.secondary]; }
export function getStrengthGoal(name: string): StrengthGoal | null {
  const v = read(keyFor('goal', name));
  return validateStrengthGoal(v) ? v : null;
}
export function validateStrengthGoal(v: unknown): v is StrengthGoal {
  return object(v) && ['max_load', 'load_reps', 'estimated_1rm'].includes(String(v.metric)) && typeof v.targetKg === 'number' && Number.isFinite(v.targetKg) && v.targetKg > 0 && v.targetKg <= 2000 && (v.metric === 'load_reps' ? Number.isInteger(v.reps) && Number(v.reps) > 0 && Number(v.reps) <= 50 : v.reps === null) && typeof v.createdAt === 'string' && Number.isFinite(Date.parse(v.createdAt));
}
export function saveStrengthGoal(name: string, goal: StrengthGoal | null) { if (goal && !validateStrengthGoal(goal)) throw new Error('Objectif invalide.'); setUserSetting(keyFor('goal', name), JSON.stringify(goal)); }
