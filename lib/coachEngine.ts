import { BODYWEIGHT_EXERCISES } from '../constants/exercises';
import { normalizeExerciseName } from './sessionFeatures';
import { getRecruitment, summarizeBalance, MUSCLES, type MuscleId } from './trainingBalance';
import { parsePyramidSet } from './pyramid';
import { TRAINING_PROGRAMS } from './programs';
import type { TrainingProgram } from '../types';
import type { CheckIn, CoachSet, ExerciseTrend, Performance, ProgressionConfig, ProgressionRecommendation, StrengthGoal } from './coachTypes';

const dayMs = 86400000;
const sameName = (a: string, b: string) => normalizeExerciseName(a) === normalizeExerciseName(b);
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
export function analyzeRecovery(ids: MuscleId[], checkIn: CheckIn | null, rows: CoachSet[], now = new Date()) {
  const relevant = rows.filter(r => [...getRecruitment(r.name, r.category).primary, ...getRecruitment(r.name, r.category).secondary].some(id => ids.includes(id)) && new Date(r.date) <= now);
  const recent = relevant.filter(r => now.getTime() - Date.parse(r.date) < 48 * 3600000);
  const pain = ids.length ? ids.some(id => checkIn?.pain.includes(id)) : !!checkIn?.pain.length;
  const sore = ids.some(id => (checkIn?.soreness[id] ?? -1) >= 2);
  const highEffort = recent.filter(r => r.rpe !== null && r.rpe >= 9).length >= 3;
  const missing = !checkIn || (checkIn.energy === null && ids.every(id => checkIn.soreness[id] === undefined) && !pain);
  const cautious = sore || checkIn?.energy === 'tired' || highEffort;
  const state = pain ? 'pain' : sore && recent.length ? 'potentially_incomplete' : cautious ? 'fatigue' : missing ? 'insufficient' : 'no_signal';
  const explanation = pain ? 'Douleur inhabituelle déclarée : évite l’exercice douloureux, sans chercher à augmenter la charge. Si elle persiste ou t’inquiète, demande un avis médical.'
    : sore && recent.length ? 'Cette zone a été sollicitée récemment et tu déclares des courbatures modérées ou importantes. Une autre zone ou du repos peut être préférable.'
      : cautious ? `${checkIn?.energy === 'tired' ? 'Tu déclares de la fatigue. ' : ''}${sore ? 'Tu signales des courbatures. ' : ''}${highEffort ? 'Plusieurs séries récentes étaient à RPE élevé. ' : ''}Consolide ou réduis l’effort aujourd’hui.`
        : missing ? 'Sensations non renseignées ou anciennes : récupération indéterminée.' : 'Aucun signal particulier dans les informations déclarées ; cela ne garantit pas une récupération complète.';
  return { state, pain, cautious, explanation, recentSets: recent.length, recentHighEffort: highEffort };
}

/** Compare the same first classic set number; pyramid sets are never mixed in. */
export function analyzeExerciseTrend(name: string, rows: CoachSet[], checkIn: CheckIn | null = null): ExerciseTrend {
  const usable = rows.filter(r => sameName(r.name, name) && r.reps > 0 && !parsePyramidSet(r.notes));
  const grouped = new Map<string, CoachSet[]>();
  for (const row of usable) grouped.set(row.sessionId, [...(grouped.get(row.sessionId) ?? []), row]);
  const sessions = [...grouped.values()].sort((a, b) => Date.parse(a[0].date) - Date.parse(b[0].date));
  const baselineNumber = sessions.at(-1)?.reduce((min, s) => Math.min(min, s.setNumber), Infinity);
  const comparable = sessions.map(sets => ({ set: sets.find(s => s.setNumber === baselineNumber), count: sets.length })).filter((s): s is { set: CoachSet; count: number } => !!s.set).slice(-5);
  const result = (status: ExerciseTrend['status'], explanation: string, rpeImprovement = false): ExerciseTrend => ({ name, status, explanation, sessions: comparable.length, confidence: comparable.length >= 4 ? 'medium' : 'low', rpeImprovement });
  if (comparable.length < 3) return result('insufficient_data', 'Il faut au moins trois séances comparables. Les pyramides sont analysées séparément du mode classique.');
  const values = comparable.map(v => v.set);
  const first = values[0], last = values.at(-1)!;
  const counts = comparable.map(s => s.count);
  if (Math.max(...counts) - Math.min(...counts) > 1 || Math.max(...values.map(s => s.reps)) > Math.min(...values.map(s => s.reps)) * 1.5 || values.some(s => s.reps > 15)) return result('insufficient_data', 'Nombre de séries ou fourchettes trop différents pour conclure à une stagnation.');
  const exact = values.every(s => Math.abs(s.weight - first.weight) < 0.01 && s.reps === first.reps);
  const rpes = values.filter((s): s is CoachSet & { rpe: number } => s.rpe !== null);
  if (exact && rpes.length >= 3 && rpes[0].rpe - rpes.at(-1)!.rpe >= 1) return result('progressing', 'Cette performance semble devenir plus facile : charge et répétitions identiques, avec un RPE en baisse. Cet indice reste subjectif.', true);
  const score = (s: Performance) => BODYWEIGHT_EXERCISES.includes(name) || s.weight === 0 ? s.reps : s.weight * (1 + s.reps / 30);
  const before = mean(values.slice(0, -1).map(score));
  const lastScore = score(last);
  if (lastScore < before * 0.97 || (exact && rpes.length >= 3 && rpes.at(-1)!.rpe - rpes[0].rpe >= 1)) return result('temporary_drop', `${checkIn?.energy === 'tired' || Object.values(checkIn?.soreness ?? {}).some(v => v! >= 2) ? 'La fatigue ou les courbatures déclarées peuvent contribuer à cette baisse. ' : ''}Baisse récente : il est trop tôt pour conclure à un plateau. Vérifie la récupération.`);
  if (lastScore > score(first) * 1.02 || (last.weight >= first.weight && last.reps > first.reps)) return result('progressing', 'La charge ou les répétitions augmentent sur des séries comparables.');
  const span = Date.parse(last.date) - Date.parse(first.date);
  const spread = Math.max(...values.map(score)) / Math.max(0.01, Math.min(...values.map(score)));
  if (!values.some(s => s.fatigueReported) && values.length >= 4 && span >= 14 * dayMs && spread <= 1.02 && rpes.length === values.length && Math.max(...rpes.map(s => s.rpe)) - Math.min(...rpes.map(s => s.rpe)) <= 0.5 && checkIn?.energy !== 'tired' && !Object.values(checkIn?.soreness ?? {}).some(v => v! >= 2)) return result('possible_plateau', 'Au moins quatre séances sur deux semaines restent proches en charge, répétitions, séries et RPE. Consolide, vérifie la récupération ou essaie une autre fourchette / un exercice proche ; ajouter du volume n’est pas automatique.');
  return result('stable', rpes.length < values.length ? 'Performances stables. RPE incomplet : impossible de savoir si cet effort devient plus facile.' : 'Performance stable : les données ne suffisent pas à signaler un plateau probable.');
}

export function recommendProgression(input: { name: string; category?: string | null; previous: Performance | null; completed: Performance[]; config: ProgressionConfig; checkIn: CheckIn | null; history: CoachSet[]; now?: Date }): ProgressionRecommendation {
  const { name, previous, completed, config, checkIn, history } = input;
  const source = completed.length ? 'current' : 'history';
  const base = completed.at(-1) ?? previous;
  const answer = (weight: number | null, reps: number | null, explanation: string, blocked = false): ProgressionRecommendation => ({ weight, reps, explanation, blocked, confidence: base?.rpe == null ? 'low' : 'medium', source });
  if (config.mode === 'off') return answer(null, null, 'Recommandations désactivées pour cet exercice.', true);
  const recruitment = getRecruitment(name, input.category);
  const recovery = analyzeRecovery([...recruitment.primary, ...recruitment.secondary], checkIn, history, input.now);
  if (recovery.pain) return answer(null, null, recovery.explanation, true);
  if (!base || base.reps <= 0 || !Number.isFinite(base.weight) || base.weight < 0) return answer(null, null, 'Valide une première série de référence pour recevoir un objectif.', true);
  const bodyweight = BODYWEIGHT_EXERCISES.includes(name) || base.weight === 0;
  const fatigue = completed.length >= 3 || completed.some(s => (s.rpe ?? 0) >= 9) || (completed.length > 1 && (base.reps < completed[0].reps || (base.rpe !== null && completed[0].rpe !== null && base.rpe > completed[0].rpe)));
  if (recovery.cautious || (base.rpe ?? 0) >= 10) return answer(bodyweight ? base.weight : Math.max(0, Math.round((base.weight - config.incrementKg) * 1000) / 1000), Math.max(1, Math.min(base.reps, config.maxReps) - 1), `${recovery.cautious ? recovery.explanation : 'RPE 10 : effort maximal déclaré.'} Proposition plus légère, sans recherche de record.`);
  if (fatigue || (base.rpe !== null && base.rpe >= 9)) return answer(base.weight, Math.min(base.reps, config.maxReps), 'La fatigue peut s’accumuler entre les séries. Maintiens cette référence plutôt que d’augmenter systématiquement.');
  const trend = analyzeExerciseTrend(name, history, checkIn);
  if (trend.status === 'possible_plateau') return answer(base.weight, Math.min(base.reps, config.maxReps), trend.explanation);
  if (base.rpe === null) return answer(base.weight, base.reps >= config.maxReps ? config.maxReps : base.reps + 1, 'RPE non renseigné : conserve la charge ; une répétition supplémentaire reste facultative.');
  const margin = base.rpe <= config.targetRpe - 1;
  const canIncreaseLoad = !bodyweight && config.mode !== 'reps' && (config.mode === 'load' ? margin : base.reps >= config.maxReps && base.rpe <= config.targetRpe);
  if (canIncreaseLoad) return answer(Math.round((base.weight + config.incrementKg) * 1000) / 1000, config.mode === 'load' ? base.reps : config.minReps, config.mode === 'double' ? 'Haut de ta fourchette atteint avec un RPE adapté : augmente d’un incrément puis repars au bas de la fourchette.' : 'RPE inférieur à ta cible : tu peux tester un incrément, si tes sensations restent bonnes.');
  if (base.reps < config.maxReps && base.rpe <= config.targetRpe) return answer(base.weight, base.reps + 1, 'Conserve la charge et tente une répétition de plus dans ta fourchette, si tu te sens capable.');
  return answer(base.weight, Math.min(base.reps, config.maxReps), 'Consolide cette performance. Le RPE et la fourchette ne justifient pas une hausse systématique.');
}

export function analyzeMuscles(rows: CoachSet[], goals: string[], weeklyGoal: number, program: TrainingProgram | null, checkIn: CheckIn | null, now = new Date()) {
  const valid = rows.filter(r => r.reps > 0 && Number.isFinite(Date.parse(r.date)) && Date.parse(r.date) <= now.getTime());
  const balance = summarizeBalance(valid.filter(r => now.getTime() - Date.parse(r.date) < 28 * dayMs).map(r => ({ name: r.name, category: r.category, session_id: r.sessionId, setCount: 1 })));
  const dayCounts = new Map<MuscleId, number>();
  for (const day of program?.days ?? []) {
    const covered = new Set(day.exerciseNames.flatMap(name => { const r = getRecruitment(name); return [...r.primary, ...r.secondary]; }));
    for (const id of covered) dayCounts.set(id, (dayCounts.get(id) ?? 0) + 1);
  }
  const trends = [...new Set(valid.map(r => r.name))].map(name => analyzeExerciseTrend(name, valid, checkIn));
  return MUSCLES.map(m => {
    const hits = valid.flatMap(row => { const r = getRecruitment(row.name, row.category); const credit = r.primary.includes(m.id) ? 1 : r.secondary.includes(m.id) ? 0.5 : 0; return credit ? [{ row, credit }] : []; });
    const count = (days: number) => new Set(hits.filter(h => now.getTime() - Date.parse(h.row.date) < days * dayMs).map(h => h.row.sessionId)).size;
    const last = hits.reduce<string | null>((d, h) => !d || h.row.date > d ? h.row.date : d, null);
    const since = last ? Math.floor((now.getTime() - Date.parse(last)) / dayMs) : null;
    const prioritized = goals.includes(m.id);
    const expected = Math.max(prioritized ? 1 : 0, program ? weeklyGoal * (dayCounts.get(m.id) ?? 0) / program.days.length : prioritized ? Math.min(2, weeklyGoal) : 1);
    const sets28 = hits.filter(h => now.getTime() - Date.parse(h.row.date) < 28 * dayMs);
    const weightedSets = sets28.reduce((s, h) => s + h.credit, 0);
    const primarySets = sets28.filter(h => h.credit === 1).length;
    const secondarySets = sets28.filter(h => h.credit === 0.5).length;
    const volumeKg = sets28.reduce((sum, h) => sum + h.row.weight * h.row.reps * h.credit, 0);
    const totalSessions = new Set(valid.filter(r => now.getTime() - Date.parse(r.date) < 28 * dayMs).map(r => r.sessionId)).size;
    const expectedGap = Math.max(7, Math.ceil(7 / Math.max(0.5, expected)) + 3);
    const lowVolume = prioritized && balance.enoughData && balance.muscles.find(v => v.id === m.id)?.status === 'low';
    const lowFrequency = totalSessions >= 3 && ((since !== null && since > expectedGap) || count(28) < expected * 4 * 0.5);
    const low = lowFrequency || lowVolume;
    const related = trends.filter(t => valid.some(r => sameName(r.name, t.name) && getRecruitment(r.name, r.category).primary.includes(m.id)));
    const progressing = related.filter(t => t.status === 'progressing');
    const plateaus = related.filter(t => t.status === 'possible_plateau');
    const recovery = analyzeRecovery([m.id], checkIn, valid, now);
    const state = recovery.pain ? 'Douleur signalée' : recovery.cautious ? 'Effort à adapter' : hits.length === 0 ? 'Pas de séance identifiable' : low ? 'Peu entraîné récemment' : progressing.length ? 'Progression observée' : totalSessions < 3 ? 'Données insuffisantes' : 'Fréquence à suivre';
    const explanation = recovery.pain || recovery.cautious ? recovery.explanation : !hits.length ? 'Aucun exercice enregistré ne permet de confirmer un travail de ce groupe. Cela ne signifie pas qu’il est faible.' : low ? `${count(28)} séances sur 28 jours ; repère de fréquence : ${Math.round(expected * 10) / 10}/semaine d’après ${program ? 'le programme et ton objectif hebdomadaire' : 'tes priorités (repère local modifiable par ton programme)'}.` : progressing.length ? `Progression sur ${progressing.map(t => t.name).join(', ')} ; ce constat ne mesure pas la croissance du muscle.` : 'La fréquence seule ne mesure ni la force ni la récupération.';
    return { ...m, lastDate: last, daysSince: since, sessions7: count(7), sessions28: count(28), sessions90: count(90), weightedSets, primarySets, secondarySets, volumeKg, expectedWeekly: expected, prioritized, low, lowVolume, lowFrequency, state: lowVolume && !lowFrequency && !recovery.cautious && !recovery.pain ? 'Travail relatif limité' : state, explanation: lowVolume ? `${explanation} Le travail pondéré de cette priorité est inférieur à 35 % de celui du groupe le plus sollicité (repère du bilan existant).` : explanation, plateaus, recovery };
  });
}

export function recommendCoachProgram(muscles: ReturnType<typeof analyzeMuscles>, weeklyGoal: number, current: TrainingProgram | null, goals: string[], unavailableByProgram: Record<string, number> = {}) {
  const priorities = muscles.filter(m => m.low || m.prioritized);
  const ranked = TRAINING_PROGRAMS.map(program => {
    const coverage = new Set(program.days.flatMap(d => d.exerciseNames.flatMap(n => getRecruitment(n).primary)));
    const matching = priorities.filter(m => coverage.has(m.id));
    const score = matching.reduce((s, m) => s + (m.low ? 3 : 1), 0) - Math.abs(program.daysPerWeek - weeklyGoal) * 3 + (goals.some(g => program.id === `focus-${g}`) ? 2 : 0) - (unavailableByProgram[program.id] ?? 0) * 100;
    return { program, score, matching };
  }).sort((a, b) => b.score - a.score || a.program.id.localeCompare(b.program.id));
  const best = ranked[0];
  return { ...best, current, reasons: [`Objectif déclaré : ${weeklyGoal} séances par semaine ; ce programme en propose ${best.program.daysPerWeek}.`, ...best.matching.map(m => `${m.label} : ${m.lowFrequency ? 'fréquence enregistrée sous le repère attendu' : m.lowVolume ? 'travail relatif limité pour ta priorité' : 'priorité choisie'}.`), ...muscles.filter(m => m.plateaus.length).map(m => `Stabilité sur ${m.plateaus.map(t => t.name).join(', ')} : revois récupération et fourchette avant d’ajouter du volume.`), ...muscles.filter(m => m.recovery.cautious || m.recovery.pain).map(m => `${m.label} : adapte la séance du jour selon tes sensations.`)] };
}

export function calculateGoalProgress(goal: StrengthGoal, rows: CoachSet[], name: string) {
  const timeline = new Map<string, { date: string; value: number }>();
  for (const row of rows.filter(r => sameName(r.name, name) && r.reps > 0 && !parsePyramidSet(r.notes))) {
    if (goal.metric === 'load_reps' && row.reps !== goal.reps) continue;
    if (goal.metric === 'estimated_1rm' && (row.reps > 12 || row.weight <= 0)) continue;
    const value = goal.metric === 'estimated_1rm' ? row.weight * (1 + row.reps / 30) : row.weight;
    const old = timeline.get(row.sessionId);
    if (!old || value > old.value) timeline.set(row.sessionId, { date: row.date, value });
  }
  const history = [...timeline.values()].sort((a, b) => a.date.localeCompare(b.date));
  const best = history.length ? Math.max(...history.map(h => h.value)) : null;
  return { best, percent: best === null ? null : Math.min(100, Math.round(best / goal.targetKg * 100)), history };
}
