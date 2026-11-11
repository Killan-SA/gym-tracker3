import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Action, Panel, Section } from '../components/ui';
import { MuscleMap } from '../components/MuscleMap';
import { getCoachReport, buildCoachPlan, activateCoachPlan } from '../lib/coach';
import { getCoachPreferences } from '../lib/coachStorage';
import { useAppTheme } from '../lib/themes';
import { useSettingsStore } from '../store/settings';
import { formatWeight } from '../lib/units';
import type { MuscleActivity, MuscleId } from '../lib/trainingBalance';

const labels = { progressing: 'Progression possible', stable: 'Performance stable', possible_plateau: 'Plateau possible', temporary_drop: 'Baisse récente', insufficient_data: 'Données insuffisantes' };
export default function CoachScreen() {
  const theme = useAppTheme();
  const useKg = useSettingsStore(s => s.useKg);
  const [data, setData] = useState(() => getCoachReport());
  const [selected, select] = useState<MuscleId | null>(null);
  const [showPlan, setShowPlan] = useState(false), [compare, setCompare] = useState(false), [ignored, ignore] = useState(false);
  useFocusEffect(useCallback(() => { setData(getCoachReport()); }, []));
  const prefs = getCoachPreferences();
  const plan = buildCoachPlan(data.recommendation.program, data.muscles.filter(m => m.low || m.prioritized).map(m => m.id), prefs.equipment);
  const map: MuscleActivity[] = data.muscles.map(m => ({ id: m.id, label: m.label, score: m.weightedSets, sessions: m.sessions28, ratio: 0, status: !m.sessions90 ? 'unknown' : m.low ? 'low' : 'balanced' }));
  const t = { color: '#A5B3AA', lineHeight: 20 }, title = { color: '#FFFFFF', fontSize: 18, fontWeight: '800' as const };
  const total28 = new Set(data.rows.filter(r => Date.now() - Date.parse(r.date) < 28 * 86400000).map(r => r.sessionId)).size;
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: 14 }}>
    <Text style={{ ...title, fontSize: 28 }}>Coach GymTracker</Text><Text style={t}>Calculé hors ligne. Les repères décrivent ton entraînement enregistré, sans mesurer ta croissance musculaire.</Text>
    {!prefs.enabled && <Panel><Text style={t}>Le coach est désactivé. Tes analyses restent consultables ici ; les conseils de séance et le check-in automatique sont masqués.</Text></Panel>}
    <Action title="Préférences et objectifs de force" secondary onPress={() => router.push('/coach-settings')} />
    <Section title="Ton bilan des 4 dernières semaines" />
    <Panel><Text style={title}>{total28} séances enregistrées sur 28 jours</Text><Text style={t}>Objectif : {data.weeklyGoal}/semaine · {data.trends.filter(v => v.status === 'progressing').length} exercices en progression possible · {data.trends.filter(v => v.status === 'possible_plateau').length} plateaux possibles.</Text><Text style={t}>Les tendances peuvent utiliser jusqu’à cinq séances sur 90 jours ; les fréquences ci-dessous indiquent leur période.</Text></Panel>
    <Section title="Analyse musculaire du coach" />
    <Panel><MuscleMap muscles={map} selected={selected} onSelect={select} /></Panel>
    {data.muscles.filter(m => !selected || selected === m.id).map(m => <Panel key={m.id}>
      <Text style={title}>{m.label} — {m.state}</Text>
      <Text style={t}>{m.explanation}</Text>
      <Text style={t}>Dernier entraînement : {m.daysSince === null ? 'inconnu sur les 90 jours analysés' : `il y a ${m.daysSince} jour(s)`}.</Text>
      <Text style={t}>Séances : {m.sessions7} sur 7 j · {m.sessions28} sur 28 j · {m.sessions90} sur 90 j.</Text>
      <Text style={t}>28 jours : {m.primarySets} séries principales + {m.secondarySets} secondaires × 0,5 = {m.weightedSets} séries pondérées · {formatWeight(m.volumeKg, useKg)} de volume pondéré.</Text>
      {!!m.plateaus.length && <Text style={t}>Plateau possible sur {m.plateaus.map(p => p.name).join(', ')}. Cela ne permet pas de conclure pour tout le groupe.</Text>}
    </Panel>)}
    {selected && <Action title="Revoir tous les groupes" secondary onPress={() => select(null)} />}
    <Section title="Performances et plateaux" />
    {!data.trends.length && <Panel><Text style={t}>Aucune série exploitable récemment. Le coach fonctionne aussi sans check-in ; quelques séances comparables permettront d’affiner les conseils.</Text></Panel>}
    {data.trends.map(v => <Panel key={v.name}><Text style={title}>{v.name} — {labels[v.status]}</Text><Text style={t}>{v.explanation}</Text><Text style={t}>{v.sessions} séances comparables · Fiabilité {v.confidence === 'low' ? 'limitée' : 'modérée'}.</Text><Action title="Progression et objectif personnel" secondary onPress={() => router.push({ pathname: '/coach-settings', params: { name: v.name } })} />{v.status === 'possible_plateau' && <Action title="Voir les exercices alternatifs" secondary onPress={() => router.push('/(tabs)/exercises')} />}</Panel>)}
    <Section title="Ce que le coach te conseille" />
    <Panel><Text style={t}>{data.muscles.some(m => m.low) ? 'Réexamine la fréquence des groupes moins sollicités. Un muscle peu entraîné n’est pas nécessairement faible.' : 'Conserve une progression graduelle et renseigne tes sensations quand cela t’aide.'}</Text><Text style={t}>Vérifie la récupération et consolide les performances stables avant d’augmenter le volume. Une journée de repos n’est pas un échec.</Text></Panel>
    {!ignored && <Panel>
      <Text style={title}>Programme proposé : {plan.program.name}</Text>
      <Text style={t}>Pourquoi ce programme ?</Text>{data.recommendation.reasons.map((r, i) => <Text key={i} style={t}>• {r}</Text>)}
      <Text style={t}>Les exercices déjà présents sont réordonnés pour tes priorités, sans ajout automatique de séries.</Text>
      <Action title={showPlan ? 'Masquer le programme' : 'Voir un programme adapté'} secondary onPress={() => setShowPlan(!showPlan)} />
      {showPlan && plan.program.days.map((d, i) => <View key={i} style={{ gap: 6 }}><Text style={title}>{d.label}</Text><Text style={t}>{d.exerciseNames.join(' · ')}</Text></View>)}
      {!!plan.changes.length && <Text style={t}>Adaptations au matériel : {plan.changes.join(' ; ')}</Text>}
      {!!plan.unavailable.length && <Text style={{ ...t, color: '#FFC94A' }}>Matériel incompatible ou inconnu pour : {plan.unavailable.join(', ')}. L’activation est bloquée ; ajuste tes contraintes dans les préférences.</Text>}
      <Action title="Comparer avec mon programme actuel" secondary onPress={() => setCompare(!compare)} />
      {compare && <View style={{ gap: 8 }}><Text style={title}>{data.program?.name ?? 'Mode libre'} → {plan.program.name}</Text><Text style={t}>{data.program?.daysPerWeek ?? 0} → {plan.program.daysPerWeek} séances prévues/semaine.</Text>{data.program?.days.map((d, i) => <Text key={i} style={t}>{d.label} : {d.exerciseNames.join(' · ')}</Text>)}</View>}
      <Action title="Activer ce programme" onPress={() => Alert.alert('Activer le programme proposé ?', 'Aucun historique ne sera supprimé. Les jours déjà parcourus sont conservés quand ils sont connus. Les adaptations concernent les prochaines séances.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Activer', onPress: () => { try { activateCoachPlan(plan, true); useSettingsStore.getState().loadSettings(); setData(getCoachReport()); Alert.alert('Programme activé', 'La prochaine séance est prête sur l’accueil.'); } catch (e) { Alert.alert('Coach', e instanceof Error ? e.message : String(e)); } } }])} />
      <Action title="Ignorer cette proposition" secondary onPress={() => ignore(true)} />
    </Panel>}
  </ScrollView>;
}
