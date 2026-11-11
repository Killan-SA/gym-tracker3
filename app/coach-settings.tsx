import { useState } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { Action, Panel, Section } from '../components/ui';
import { KeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { EQUIPMENT, getCoachPreferences, getProgressionConfig, getStrengthGoal, saveCoachPreferences, saveProgressionConfig, saveStrengthGoal, getCoachSets } from '../lib/coachStorage';
import type { ProgressionConfig, StrengthGoal } from '../lib/coachTypes';
import { calculateGoalProgress } from '../lib/coachEngine';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { getCustomExercises, getAllExerciseNames } from '../lib/queries';
import { useAppTheme } from '../lib/themes';
import { useSettingsStore } from '../store/settings';
import { formatWeight, fromKg, toKg, unitLabel } from '../lib/units';

export default function CoachSettingsScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const theme = useAppTheme();
  const [prefs, setPrefs] = useState(getCoachPreferences);
  const [selected, select] = useState(name ?? '');
  const [search, setSearch] = useState('');
  const names = [...new Set([...PREDEFINED_EXERCISES.map(e => e.name), ...getCustomExercises().map(e => e.name), ...getAllExerciseNames()])].filter(n => n.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const t = { color: '#A5B3AA', lineHeight: 20 }, title = { color: '#FFFFFF', fontWeight: '700' as const };
  const savePrefs = (next: typeof prefs) => { saveCoachPreferences(next); setPrefs(next); };
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: 14 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
    <Section title="Préférences du coach" />
    <Panel>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Text style={{ ...title, flex: 1 }}>Conseils pendant l’entraînement</Text><Switch value={prefs.enabled} onValueChange={enabled => savePrefs({ ...prefs, enabled })} trackColor={{ true: theme.primary }} /></View>
      <Text style={t}>La demande de ressenti au démarrage est suspendue pour le moment. Tu peux toujours renseigner tes sensations manuellement depuis la séance.</Text>
      <Text style={t}>Les conseils sont facultatifs et locaux. RPE 6 ≈ 4 répétitions en réserve ; 7 ≈ 3 ; 8 ≈ 2 ; 9 ≈ 1 ; 10 ≈ 0. Ces repères sont subjectifs et approximatifs.</Text>
    </Panel>
    <Section title="Matériel disponible" />
    <Panel><Text style={t}>Aucune sélection = matériel inconnu, sans restriction. Une sélection limite les substitutions aux équipements identifiés. Le matériel des exercices personnalisés reste inconnu.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{EQUIPMENT.map(gear => <TouchableOpacity key={gear} accessibilityRole="checkbox" accessibilityState={{ checked: prefs.equipment.includes(gear) }} style={{ padding: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: prefs.equipment.includes(gear) ? theme.primary : theme.cardBorder }} onPress={() => savePrefs({ ...prefs, equipment: prefs.equipment.includes(gear) ? prefs.equipment.filter(g => g !== gear) : [...prefs.equipment, gear] })}><Text style={{ color: theme.primary }}>{gear}</Text></TouchableOpacity>)}</View></Panel>
    <Section title="Progression par exercice" />
    <TextInput accessibilityLabel="Rechercher un exercice à configurer" value={search} onChangeText={setSearch} placeholder="Rechercher un exercice" placeholderTextColor="#A5B3AA" style={{ color: '#FFFFFF', minHeight: 48, backgroundColor: theme.card, borderRadius: 12, padding: 12 }} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{names.map(n => <TouchableOpacity key={n} onPress={() => select(n)} style={{ padding: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: selected === n ? theme.primary : theme.cardBorder }}><Text style={title}>{n}</Text></TouchableOpacity>)}</ScrollView>
    {selected ? <ExerciseConfiguration key={selected} name={selected} /> : <Text style={t}>Choisis un exercice pour régler sa progression et son objectif personnel.</Text>}
  </ScrollView>;
}

function ExerciseConfiguration({ name }: { name: string }) {
  const theme = useAppTheme();
  const useKg = useSettingsStore(s => s.useKg);
  const [config, setConfig] = useState(() => getProgressionConfig(name));
  const [min, setMin] = useState(String(config.minReps)), [max, setMax] = useState(String(config.maxReps));
  const [rpe, setRpe] = useState(String(config.targetRpe)), [increment, setIncrement] = useState(String(fromKg(config.incrementKg, useKg)));
  const [goal, setGoal] = useState(() => getStrengthGoal(name));
  const [metric, setMetric] = useState<StrengthGoal['metric']>(goal?.metric ?? 'max_load');
  const [target, setTarget] = useState(goal ? String(fromKg(goal.targetKg, useKg)) : '');
  const [reps, setReps] = useState(goal?.reps ? String(goal.reps) : '8');
  const rows = getCoachSets(new Date(), '', true);
  const progress = goal ? calculateGoalProgress(goal, rows, name) : null;
  const t = { color: '#A5B3AA', lineHeight: 20 }, title = { color: '#FFFFFF', fontWeight: '700' as const };
  const input = (label: string, value: string, change: (s: string) => void) => <View style={{ gap: 5 }}><Text style={t}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change} keyboardType="decimal-pad" inputAccessoryViewID="coach-config" style={{ color: '#FFFFFF', minHeight: 48, backgroundColor: theme.surface, borderRadius: 12, padding: 12 }} /></View>;
  const parse = (s: string) => Number(s.replace(',', '.'));
  const save = () => {
    try { const next: ProgressionConfig = { ...config, minReps: parse(min), maxReps: parse(max), targetRpe: parse(rpe), incrementKg: toKg(parse(increment), useKg) }; saveProgressionConfig(name, next); setConfig(next); Alert.alert('Coach', 'Paramètres enregistrés pour cet exercice.'); }
    catch (e) { Alert.alert('Paramètres', e instanceof Error ? e.message : String(e)); }
  };
  return <View style={{ gap: 14 }}>
    <Panel><Text style={{ ...title, fontSize: 20 }}>{name}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['double', 'Double progression'], ['reps', 'Priorité répétitions'], ['load', 'Priorité charge'], ['off', 'Désactivé']] as const).map(([mode, label]) => <TouchableOpacity key={mode} accessibilityRole="radio" accessibilityState={{ checked: config.mode === mode }} onPress={() => setConfig({ ...config, mode })} style={{ padding: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: config.mode === mode ? theme.primary : theme.cardBorder }}><Text style={{ color: theme.primary }}>{label}</Text></TouchableOpacity>)}</View>
      {input('Répétitions minimales', min, setMin)}{input('Répétitions maximales', max, setMax)}{input('RPE cible (6 à 10)', rpe, setRpe)}{input(`Incrément de charge (${unitLabel(useKg)})`, increment, setIncrement)}
      <Text style={t}>Les valeurs initiales sont des repères modifiables. Les exercices au poids du corps progressent en répétitions ; aucun lest n’est ajouté automatiquement.</Text>
      <Action title="Enregistrer la progression" onPress={save} />
    </Panel>
    <Section title="Objectif personnel de force" />
    <Panel>
      {([['max_load', 'Charge maximale réalisée'], ['load_reps', 'Charge à répétitions précises'], ['estimated_1rm', '1RM estimé']] as const).map(([m, label]) => <TouchableOpacity key={m} accessibilityRole="radio" accessibilityState={{ checked: metric === m }} onPress={() => setMetric(m)} style={{ paddingVertical: 12, minHeight: 44 }}><Text style={{ color: metric === m ? theme.primary : '#A5B3AA' }}>{metric === m ? '● ' : '○ '}{label}</Text></TouchableOpacity>)}
      {input(`Objectif en ${unitLabel(useKg)}`, target, setTarget)}
      {metric === 'load_reps' && input('Nombre exact de répétitions', reps, setReps)}
      <Action title="Enregistrer mon objectif" onPress={() => { try { const next: StrengthGoal = { metric, targetKg: toKg(parse(target), useKg), reps: metric === 'load_reps' ? parse(reps) : null, createdAt: new Date().toISOString() }; saveStrengthGoal(name, next); setGoal(next); Alert.alert('Objectif enregistré', 'Le coach le suivra sans forcer une hausse de charge.'); } catch (e) { Alert.alert('Objectif', e instanceof Error ? e.message : String(e)); } }} />
      {goal && <Action title="Supprimer cet objectif" secondary onPress={() => { saveStrengthGoal(name, null); setGoal(null); }} />}
      {progress && <><Text style={{ ...title, fontSize: 20 }}>{progress.percent === null ? 'Pas de donnée compatible' : `${progress.percent} % de l’objectif`}</Text><Text style={t}>{progress.best === null ? 'La métrique choisie ne correspond à aucune série exploitable.' : `Meilleure valeur compatible : ${formatWeight(progress.best, useKg)} / ${formatWeight(goal!.targetKg, useKg)}.`}</Text>
        {progress.history.length >= 2 && <LineChart data={progress.history.map(h => ({ value: fromKg(h.value, useKg), label: new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' }) }))} width={220} height={140} color={theme.primary} yAxisTextStyle={{ color: '#A5B3AA' }} xAxisLabelTextStyle={{ color: '#A5B3AA' }} />}
        <Text style={t}>Le suivi utilise uniquement la métrique enregistrée avec cet objectif. Pour le 1RM : estimation Epley, charge × (1 + répétitions / 30), limitée aux séries de 1 à 12 répétitions. Ce n’est pas une charge maximale mesurée.</Text></>}
    </Panel>
    <KeyboardDoneAccessory id="coach-config" />
  </View>;
}
