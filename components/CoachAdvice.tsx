import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { applyCoachSuggestion, getExerciseAdvice } from '../lib/coach';
import { getCoachPreferences, getProgressionConfig, getStrengthGoal } from '../lib/coachStorage';
import { getPreviousPerformance } from '../lib/redesign';
import { formatWeight } from '../lib/units';
import { useAppTheme } from '../lib/themes';
import { useSettingsStore } from '../store/settings';
import type { ExerciseWithSets } from '../types';
import { parsePyramidSet, getPyramidPlan } from '../lib/pyramid';
import { getUserSetting } from '../lib/database';

export function CoachAdvice({ exercise, onReload }: { exercise: ExerciseWithSets; onReload: () => void }) {
  const theme = useAppTheme();
  const useKg = useSettingsStore(s => s.useKg);
  const [ignored, setIgnored] = useState('');
  const prefs = getCoachPreferences();
  const classic = !getPyramidPlan(exercise.id)?.enabled && !exercise.sets.some(s => parsePyramidSet(s.notes));
  const advice = classic && prefs.enabled ? getExerciseAdvice(exercise) : null;
  const completed = exercise.sets.filter(s => s.reps > 0 && getUserSetting(`set_confirmed:${s.id}`) === '1');
  const signature = JSON.stringify({ advice, completed: completed.map(s => [s.id, s.weight, s.reps, s.rpe]) });
  const goal = getStrengthGoal(exercise.name);
  if (!advice || getProgressionConfig(exercise.name).mode === 'off' || signature === ignored) return null;
  const reference = completed.length ? null : getPreviousPerformance(exercise.name, exercise.session_id);
  const shown = completed.length ? advice : reference;
  const nextNumber = Math.max(0, ...exercise.sets.filter(s => s.reps > 0).map(s => s.set_number)) + 1;
  const link = { color: theme.primary, fontWeight: '700' as const, paddingVertical: 12 };
  return <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 14, gap: 8, marginVertical: 12 }}>
    <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 11 }}>COACH · {completed.length ? `OBJECTIF POUR LA SÉRIE ${nextNumber}` : 'PROCHAINE SÉANCE · SÉRIE 1 DE RÉFÉRENCE'}</Text>
    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 19 }}>{shown?.weight != null && shown.reps != null ? `${formatWeight(shown.weight, useKg)} × ${shown.reps}` : 'Prends tes repères'}</Text>
    <Text style={{ color: '#A5B3AA', fontSize: 12, lineHeight: 18 }}>{completed.length || advice.blocked ? advice.explanation : 'Commence par ta référence. Les conseils à appliquer apparaissent après validation de ta première série.'}</Text>
    {goal && <Text style={{ color: '#A5B3AA', fontSize: 12 }}>Objectif personnel : {formatWeight(goal.targetKg, useKg)}{goal.metric === 'load_reps' ? ` × ${goal.reps}` : goal.metric === 'estimated_1rm' ? ' de 1RM estimé' : ' de charge réalisée'}. Il ne force aucune hausse du conseil.</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 }}>
      {!!completed.length && !advice.blocked && <TouchableOpacity accessibilityRole="button" onPress={() => { try { applyCoachSuggestion(exercise.id, advice); onReload(); } catch (error) { Alert.alert('Coach', error instanceof Error ? error.message : String(error)); } }}><Text style={link}>Appliquer à la série {nextNumber}</Text></TouchableOpacity>}
      <TouchableOpacity onPress={() => Alert.alert('Pourquoi cet objectif ?', `${advice.explanation}\n\nFiabilité indicative : ${advice.confidence === 'low' ? 'limitée' : 'modérée'}. Le RPE est subjectif. Appliquer préremplit un brouillon ; seule la validation enregistre la performance.`)}><Text style={link}>Pourquoi ?</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setIgnored(signature)}><Text style={link}>Ignorer</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => router.push({ pathname: '/coach-settings', params: { name: exercise.name } })}><Text style={link}>Régler</Text></TouchableOpacity>
    </View>
  </View>;
}
