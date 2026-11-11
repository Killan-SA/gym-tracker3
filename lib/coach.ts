import { getDb, getUserSetting, setUserSetting } from './database';
import { getSessionWithExercises, addSet, createSession, createSessionFromProgramDay, addExerciseToSession, getActiveProgramId, getNextProgramDayIndex, setActiveProgram, getCustomExercises } from './queries';
import { getProgramById, TRAINING_PROGRAMS } from './programs';
import { getWeeklyGoal } from './weeklyConsistency';
import { analyzeExerciseTrend, analyzeMuscles, recommendCoachProgram, recommendProgression } from './coachEngine';
import { currentCheckIn, getCoachPreferences, getCoachSets, getProgressionConfig, getSessionCheckIns, saveSessionCheckIn, latestCurrentCheckIn } from './coachStorage';
import { getRecruitment } from './trainingBalance';
import { parsePyramidSet, getPyramidPlan } from './pyramid';
import { canEditSession, setSessionTitle } from './redesign';
import { normalizeExerciseName } from './sessionFeatures';
import type { ExerciseWithSets } from '../types';
import type { TrainingProgram } from '../types';
import { getExerciseAlternatives, getExerciseMetadata } from './exerciseAlternatives';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import type { CheckIn, ProgressionRecommendation } from './coachTypes';

export function getCoachReport(now = new Date(), checkIn: CheckIn | null = latestCurrentCheckIn(now.getTime())) {
  const rows = getCoachSets(now);
  let goals: string[] = [];
  try { const v: unknown = JSON.parse(getUserSetting('training_goals') ?? '[]'); if (Array.isArray(v)) goals = v.filter((s): s is string => typeof s === 'string'); } catch { /* optional */ }
  const activeId = getActiveProgramId();
  const program = activeId ? getProgramById(activeId) ?? null : null;
  const weeklyGoal = getWeeklyGoal();
  const muscles = analyzeMuscles(rows, goals, weeklyGoal, program, checkIn, now);
  const trends = [...new Set(rows.filter(r => now.getTime() - Date.parse(r.date) < 28 * 86400000).map(r => r.name))].map(name => analyzeExerciseTrend(name, rows, checkIn));
  const equipment = getCoachPreferences().equipment;
  const unavailableByProgram = equipment.length ? Object.fromEntries(TRAINING_PROGRAMS.map(p => [p.id, buildCoachPlan(p, goals, equipment).unavailable.length])) : {};
  const recommendation = recommendCoachProgram(muscles, weeklyGoal, program, goals, unavailableByProgram);
  return { rows, goals, program, weeklyGoal, muscles, trends, recommendation, count: muscles.filter(m => m.low).length + trends.filter(t => t.status === 'possible_plateau').length };
}
export function getExerciseAdvice(exercise: ExerciseWithSets) {
  const history = getCoachSets(new Date(), exercise.session_id);
  const previous = history.filter(r => normalizeExerciseName(r.name) === normalizeExerciseName(exercise.name) && !parsePyramidSet(r.notes)).at(-1) ?? null;
  const performed = exercise.sets.filter(s => s.reps > 0 && getUserSetting(`set_confirmed:${s.id}`) === '1' && !parsePyramidSet(s.notes));
  const checkIn = currentCheckIn(getSessionCheckIns(exercise.session_id));
  return recommendProgression({ name: exercise.name, category: getCustomExercises().find(e => e.name === exercise.name)?.category, previous, completed: performed, config: getProgressionConfig(exercise.name), checkIn, history });
}
export function getPendingCoachSet(id: string): { weight: number; reps: number; rpe: number | null } | null {
  try { const v = JSON.parse(getUserSetting(`coach:pending:${id}`) ?? 'null'); return v && typeof v.weight === 'number' && Number.isFinite(v.weight) && v.weight >= 0 && Number.isInteger(v.reps) && v.reps >= 0 && (v.rpe == null || typeof v.rpe === 'number' && v.rpe >= 1 && v.rpe <= 10) ? { weight: v.weight, reps: v.reps, rpe: v.rpe ?? null } : null; } catch { return null; }
}
export function saveCoachDraft(id: string, draft: { weight: number; reps: number; rpe: number | null }) {
  const row = getDb().getFirstSync<{ reps: number }>('SELECT reps FROM sets WHERE id = ?', [id]);
  if (!row || row.reps !== 0 || getUserSetting(`set_confirmed:${id}`) === '1' || !Number.isFinite(draft.weight) || draft.weight < 0 || !Number.isInteger(draft.reps) || draft.reps < 0 || (draft.rpe !== null && (!Number.isFinite(draft.rpe) || draft.rpe < 1 || draft.rpe > 10))) throw new Error('Brouillon invalide ou série déjà réalisée.');
  setUserSetting(`coach:pending:${id}`, JSON.stringify(draft));
}
/** Only the next unperformed classic row is eligible. Targets never count as work. */
export function applyCoachSuggestion(exerciseId: string, expected: ProgressionRecommendation) {
  const db = getDb();
  const row = db.getFirstSync<{ session_id: string }>('SELECT session_id FROM exercises WHERE id = ?', [exerciseId]);
  const session = row ? getSessionWithExercises(row.session_id) : null;
  const exercise = session?.exercises.find(e => e.id === exerciseId);
  if (!session || !exercise || !canEditSession(session) || !getCoachPreferences().enabled) throw new Error('Cette séance ne peut pas recevoir cet objectif.');
  if (getPyramidPlan(exerciseId)?.enabled || exercise.sets.some(s => parsePyramidSet(s.notes))) throw new Error('La pyramide conserve ses propres paliers.');
  const advice = getExerciseAdvice(exercise);
  if (!exercise.sets.some(s => s.reps > 0 && getUserSetting(`set_confirmed:${s.id}`) === '1')) throw new Error('Valide ta première série de référence avant d’appliquer un conseil.');
  if (advice.blocked || advice.weight === null || advice.reps === null || advice.weight !== expected.weight || advice.reps !== expected.reps) throw new Error('Le conseil a changé. Relis la proposition actualisée.');
  const lastPerformed = Math.max(0, ...exercise.sets.filter(s => s.reps > 0).map(s => s.set_number));
  let target = exercise.sets.find(s => s.reps === 0 && s.set_number > lastPerformed && getUserSetting(`set_confirmed:${s.id}`) !== '1');
  db.withTransactionSync(() => {
    target ??= addSet(exerciseId, 0, 0, null);
    saveCoachDraft(target.id, { weight: advice.weight!, reps: advice.reps!, rpe: null });
  });
  return target!.id;
}
export function startCoachWorkout(input: { programId?: string; dayIndex?: number; names?: string[]; title?: string; checkIn: CheckIn | null }) {
  const program = input.programId ? getProgramById(input.programId) : null;
  if (input.programId && (!program || getActiveProgramId() !== program.id)) throw new Error('Le programme actif a changé. Reviens à l’accueil.');
  const index = input.dayIndex ?? getNextProgramDayIndex();
  if (program && (!Number.isInteger(index) || index < 0 || index >= program.days.length)) throw new Error('Jour de programme invalide.');
  let id = '';
  getDb().withTransactionSync(() => {
    if (program) { const day = program.days[index]; id = createSessionFromProgramDay(day.exerciseNames, (index + 1) % program.days.length); setSessionTitle(id, day.label); }
    else { id = createSession().id; for (const name of input.names ?? []) addExerciseToSession(id, name); if (input.title) setSessionTitle(id, input.title); }
    saveSessionCheckIn(id, input.checkIn);
  });
  return id;
}
export function getSessionMuscles(names: string[]) { const custom = getCustomExercises(); return [...new Set(names.flatMap(n => { const r = getRecruitment(n, custom.find(e => e.name === n)?.category); return [...r.primary, ...r.secondary]; }))]; }

export function buildCoachPlan(program: TrainingProgram, priorities: string[], equipment: string[], custom = getCustomExercises()) {
  const allowed = (name: string) => {
    if (!equipment.length) return true;
    const entry = [...PREDEFINED_EXERCISES, ...custom].find(e => e.name === name);
    const gear = entry ? getExerciseMetadata(entry).equipment : undefined;
    return !!gear && equipment.includes(gear);
  };
  const changes: string[] = [], unavailable: string[] = [];
  const days = program.days.map(day => {
    const selected: string[] = [];
    for (const name of day.exerciseNames) {
      let target = name;
      if (!allowed(name)) {
        const alt = getExerciseAlternatives(name, custom).find(e => allowed(e.name) && !selected.includes(e.name) && e.score >= 4);
        if (alt) { target = alt.name; changes.push(`${name} → ${target}`); }
        else unavailable.push(name);
      }
      if (!selected.includes(target)) selected.push(target);
    }
    // Reorder existing exercises only: never add arbitrary volume.
    selected.sort((a, b) => Number(getRecruitment(b, custom.find(e => e.name === b)?.category).primary.some(id => priorities.includes(id))) - Number(getRecruitment(a, custom.find(e => e.name === a)?.category).primary.some(id => priorities.includes(id))));
    return { ...day, exerciseNames: selected };
  });
  return { program: { ...program, days }, changes: [...new Set(changes)], unavailable: [...new Set(unavailable)] };
}
/** Confirmation is enforced at the service boundary as well as in the UI. */
export function activateCoachPlan(plan: ReturnType<typeof buildCoachPlan>, confirmed: boolean) {
  if (!confirmed) throw new Error('Confirmation nécessaire avant activation.');
  if (plan.unavailable.length) throw new Error('Le matériel renseigné ne permet pas encore ce programme complet. Ajuste tes contraintes ou remplace les exercices indiqués.');
  getDb().withTransactionSync(() => {
    const current = getActiveProgramId();
    if (current) setUserSetting(`coach:program_day:${current}`, String(getNextProgramDayIndex()));
    setUserSetting(`coach:program:${plan.program.id}`, JSON.stringify({ version: 1, days: plan.program.days.map(d => d.exerciseNames) }));
    if (current !== plan.program.id) {
      setActiveProgram(plan.program.id);
      const saved = Number(getUserSetting(`coach:program_day:${plan.program.id}`) ?? 0) % plan.program.days.length;
      setUserSetting('currentProgramDayIndex', String(saved));
      setUserSetting('currentProgramId', plan.program.id);
    }
  });
}
