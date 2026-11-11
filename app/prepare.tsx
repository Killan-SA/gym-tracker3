import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Action, Panel, Section } from '../components/ui';
import { CoachCheckIn, emptyCheckIn } from '../components/CoachCheckIn';
import { currentCheckIn, getCoachPreferences, getSessionCheckIns, saveCoachPreferences, saveSessionCheckIn } from '../lib/coachStorage';
import { startCoachWorkout, getSessionMuscles } from '../lib/coach';
import { getProgramById } from '../lib/programs';
import { getSessionWithExercises, getNextProgramDayIndex } from '../lib/queries';
import { getCoachSets } from '../lib/coachStorage';
import { analyzeRecovery } from '../lib/coachEngine';
import { useAppTheme } from '../lib/themes';
import { useSettingsStore } from '../store/settings';
import { canEditSession } from '../lib/redesign';
import { MUSCLES } from '../lib/trainingBalance';

export default function PrepareScreen() {
  const params = useLocalSearchParams<{ programId?: string; dayIndex?: string; names?: string; title?: string; sessionId?: string }>();
  const theme = useAppTheme();
  const [value, setValue] = useState(() => params.sessionId ? currentCheckIn(getSessionCheckIns(params.sessionId)) ?? emptyCheckIn() : emptyCheckIn());
  const [dayIndex, setDayIndex] = useState(() => Number(params.dayIndex ?? getNextProgramDayIndex()));
  const [alternative, setAlternative] = useState(false);
  const [reorder, setReorder] = useState(false);
  const busy = useRef(false);
  const program = params.programId ? getProgramById(params.programId) : null;
  let names: string[] = [];
  try { const v: unknown = JSON.parse(params.names ?? '[]'); if (Array.isArray(v)) names = v.filter((n): n is string => typeof n === 'string').slice(0, 30); } catch { /* free session */ }
  if (params.sessionId) names = getSessionWithExercises(params.sessionId)?.exercises.map(e => e.name) ?? [];
  else if (program) names = program.days[dayIndex]?.exerciseNames ?? [];
  const recovery = analyzeRecovery(names.length ? getSessionMuscles(names) : MUSCLES.map(m => m.id), value, getCoachSets());
  const start = (skip = false) => {
    if (busy.current) return; busy.current = true;
    try {
      if (params.sessionId) {
        const session = getSessionWithExercises(params.sessionId);
        if (!session || !canEditSession(session)) throw new Error('Cette séance n’est plus modifiable.');
        if (!skip) saveSessionCheckIn(params.sessionId, { ...value, recordedAt: new Date().toISOString() }, true);
        router.back(); return;
      }
      const id = startCoachWorkout({ programId: params.programId, dayIndex, names, title: params.title, checkIn: skip ? null : { ...value, recordedAt: new Date().toISOString() } });
      useSettingsStore.getState().loadSettings();
      router.replace(`/session/${id}`);
    } catch (error) { busy.current = false; Alert.alert('Coach GymTracker', error instanceof Error ? error.message : String(error)); }
  };
  useEffect(() => {
    const prefs = getCoachPreferences();
    if (!params.sessionId && (!prefs.enabled || !prefs.autoCheckIn)) start(true);
  }, []);
  const preferences = getCoachPreferences();
  if (!params.sessionId && (!preferences.enabled || !preferences.autoCheckIn)) return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: 16 }} keyboardShouldPersistTaps="handled">
    {params.sessionId && <Text style={{ color: '#A5B3AA', lineHeight: 20 }}>Actualisation horodatée pour cette séance. Le check-in initial reste conservé. Une réponse vieille de plus de 12 h n’est pas utilisée comme sensation actuelle.</Text>}
    <Panel><CoachCheckIn value={value} onChange={setValue} /></Panel>
    <Panel><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{program?.days[dayIndex]?.label ?? params.title ?? (params.sessionId ? 'Séance en cours' : 'Séance libre')}</Text><Text style={{ color: '#A5B3AA', lineHeight: 20 }}>{recovery.explanation}</Text>
      {!!names.length && <Text style={{ color: '#A5B3AA', lineHeight: 20 }}>{names.join(' · ')}</Text>}
    </Panel>
    {!params.sessionId && (recovery.cautious || recovery.pain) && <Panel>
      <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Adapter ma séance</Text>
      <Action title="Choisir une autre séance" secondary onPress={() => setAlternative(!alternative)} />
      <Action title="Réorganiser mes prochaines séances" secondary onPress={() => { setAlternative(true); setReorder(true); }} />
      {reorder && <Text style={{ color: '#A5B3AA' }}>Choisis le jour à faire aujourd’hui. Après son démarrage, le cycle reprendra au jour suivant. Aucun changement avant confirmation.</Text>}
      {alternative && (program ? program.days.map((d, i) => <Action key={i} title={`${d.label}${i === dayIndex ? ' · sélectionné' : ''}`} secondary onPress={() => setDayIndex(i)} />) : <Text style={{ color: '#A5B3AA' }}>En mode libre, choisis des exercices d’autres zones après le démarrage.</Text>)}
      <Action title="Prendre un jour de repos" secondary onPress={() => Alert.alert('Repos aujourd’hui', 'Aucune séance ne sera créée et le programme ne sera pas avancé. Le repos fait partie de l’entraînement.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Revenir à l’accueil', onPress: () => router.dismissTo('/(tabs)') }])} />
    </Panel>}
    <Action title={params.sessionId ? 'Enregistrer mes sensations actuelles' : recovery.cautious || recovery.pain ? 'Conserver ce choix et commencer' : 'Enregistrer et commencer'} onPress={() => start()} />
    <Action title={params.sessionId ? 'Annuler' : 'Passer et commencer sans check-in'} secondary onPress={() => start(true)} />
    {!params.sessionId && <Action title="Ne plus demander automatiquement" secondary onPress={() => { const prefs = getCoachPreferences(); saveCoachPreferences({ ...prefs, autoCheckIn: false }); start(true); }} />}
    <Section title="Coach GymTracker" /><Text style={{ color: '#A5B3AA' }}>Conseils facultatifs et calculés hors ligne. Tu gardes le contrôle de ta séance.</Text>
  </ScrollView>;
}
