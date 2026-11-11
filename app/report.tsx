import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Action, Metric, Panel, Section } from '../components/ui';
import { MuscleMap, MUSCLE_COLORS } from '../components/MuscleMap';
import { COLORS } from '../constants/theme';
import { getTrainingBalance, getTrainingPeriodStats, recommendBalanceProgram, getVolumeComparisons } from '../lib/trainingBalance';
import type { MuscleId } from '../lib/trainingBalance';
import { getTotalVolumeAllTime, getWeeklyReport, getFrequentSessionTemplates, getSmartSessionRecommendation } from '../lib/queries';
import type { SessionTemplate } from '../lib/queries';
import { formatVolume, formatWeight } from '../lib/units';
import { useSettingsStore } from '../store/settings';
import { useAppTheme } from '../lib/themes';

function readReport(days: number) {
  return { balance: getTrainingBalance(days), period: getTrainingPeriodStats(days), total: getTotalVolumeAllTime(), weekly: getWeeklyReport(), templates: getFrequentSessionTemplates(), plateau: getSmartSessionRecommendation() };
}
const STATUS_LABELS = { strong: 'Très sollicité', balanced: 'Sollicité régulièrement', low: 'Moins sollicité', unknown: 'Encore trop peu de données' };

export default function ReportScreen() {
  const theme = useAppTheme();
  const { useKg, currentProgramId } = useSettingsStore();
  const [days, setDays] = useState(28);
  const [data, setData] = useState<ReturnType<typeof readReport> | null>(null);
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const [showMethod, setShowMethod] = useState(false);
  const [showProgram, setShowProgram] = useState(false);
  const load = useCallback(() => setData(readReport(days)), [days]);
  useFocusEffect(load);
  if (!data) return <View style={s.loading}><Text style={s.muted}>Préparation de ton bilan…</Text></View>;

  const { balance } = data;
  const strong = balance.muscles.filter(m => m.status === 'strong').sort((a, b) => b.score - a.score);
  const low = balance.muscles.filter(m => m.status === 'low').sort((a, b) => a.score - b.score);
  const active = balance.muscles.find(m => m.id === selected);
  const suggestion = balance.enoughData ? recommendBalanceProgram(balance.muscles) : null;
  const comparisons = getVolumeComparisons(data.total);
  const adopt = () => {
    if (!suggestion) return;
    Alert.alert('Changer de programme ?', `Choisir « ${suggestion.program.name} » ? Le cycle de ce programme commencera au premier jour. Tes séances déjà enregistrées sont conservées.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Choisir ce programme', onPress: () => { useSettingsStore.getState().setCurrentProgram(suggestion.program.id); router.push('/programs'); } },
    ]);
  };
  const startTemplate = (template: SessionTemplate) => {
    Alert.alert('Refaire cette séance ?', template.exercises.map(ex => ex.name).join('\n'), [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Commencer', onPress: () => { router.push({ pathname: '/prepare', params: { names: JSON.stringify(template.exercises.map(ex => ex.name)), title: 'Séance habituelle' } }); } },
    ]);
  };

  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.primary} />}>
    <Text style={s.eyebrow}>TON ENTRAÎNEMENT, EN PERSPECTIVE</Text>
    <Text style={s.title}>{'Ton corps.\nTon équilibre.'}</Text>
    <Text style={s.intro}>Découvre les muscles que tu sollicites le plus et ceux à remettre au cœur de tes séances.</Text>
    <View style={s.periods}>{[7, 28, 90].map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: days === value }} onPress={() => setDays(value)} style={[s.period, days === value && s.periodActive]}><Text style={{ color: days === value ? COLORS.primary : COLORS.textSecondary, fontWeight: '700' }}>{value} jours</Text></TouchableOpacity>)}</View>
    <Panel><View style={s.row}><Metric value={String(data.period.sessions)} label={`Séances sur ${days} jours`} /><Metric value={formatVolume(data.period.volume, useKg)} label="Volume sur la période" /></View></Panel>

    <Section title="Ta carte musculaire" />
    <Panel>
      {!balance.enoughData && <Text style={s.muted}>Enregistre au moins 3 séances de musculation sur cette période pour comparer les groupes. Pour l’instant, la carte reste neutre.</Text>}
      <MuscleMap muscles={balance.muscles} selected={selected} onSelect={setSelected} />
      <View style={s.muscleChips}>{balance.muscles.map(m => <TouchableOpacity key={m.id} accessibilityRole="button" accessibilityLabel={`${m.label} : ${STATUS_LABELS[m.status]}, ${m.sessions} séances`} accessibilityState={{ selected: selected === m.id }} onPress={() => setSelected(m.id)} style={[s.muscleChip, selected === m.id && { borderColor: MUSCLE_COLORS[m.status] }]}><View style={[s.dot, { backgroundColor: MUSCLE_COLORS[m.status] }]} /><Text style={s.chipText}>{m.label}</Text></TouchableOpacity>)}</View>
      {active && <View style={s.detail}><Text style={s.sectionValue}>{active.label}</Text><Text style={{ color: MUSCLE_COLORS[active.status], fontWeight: '700' }}>{STATUS_LABELS[active.status]}</Text><Text style={s.muted}>{active.sessions} séance{active.sessions > 1 ? 's' : ''} ayant sollicité ce groupe sur {days} jours.</Text></View>}
      <TouchableOpacity onPress={() => setShowMethod(!showMethod)} style={s.method}><Text style={{ color: COLORS.primary, fontSize: 12 }}>Comment est calculé ce bilan ?</Text><Ionicons name={showMethod ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.primary} /></TouchableOpacity>
      {showMethod && <Text style={s.small}>La carte compare les séries avec des répétitions enregistrées sur la période. Les muscles principaux comptent davantage que les muscles secondaires ; les exercices au poids du corps sont inclus. Elle montre ta répartition d’entraînement, pas ta force réelle ni le développement de tes muscles. Les catégories générales et les exercices non identifiables ne sont pas attribués à un muscle précis.{balance.unclassifiedSets > 0 ? ` ${balance.unclassifiedSets} séries ne sont pas classées sur cette carte, notamment le cardio et certains exercices personnalisés.` : ''}</Text>}
    </Panel>

    <Section title="Points forts" />
    <Panel><Text style={s.eyebrow}>TES GROUPES LES PLUS ENTRAÎNÉS</Text>{strong.length ? strong.map(m => <View key={m.id} style={s.balanceRow}><Ionicons name="checkmark-circle" size={21} color={COLORS.primary} /><Text style={[s.text, { flex: 1 }]}>{m.label}</Text><Text style={s.muted}>{m.sessions} séances</Text></View>) : <Text style={s.muted}>Tes points forts apparaîtront avec quelques séances supplémentaires.</Text>}</Panel>
    <Section title="À rééquilibrer" />
    <Panel><Text style={s.eyebrow}>TES GROUPES LES MOINS SOLLICITÉS</Text>{low.length ? low.map(m => <View key={m.id} style={s.balanceRow}><Ionicons name="alert-circle-outline" size={21} color={COLORS.warning} /><Text style={[s.text, { flex: 1 }]}>{m.label}</Text><Text style={s.muted}>{m.sessions === 0 ? 'Aucune série classée' : `${m.sessions} séances`}</Text></View>) : <Text style={s.muted}>{balance.enoughData ? 'Aucun groupe nettement moins sollicité sur cette période.' : 'Il faut davantage de séances pour repérer une répartition déséquilibrée.'}</Text>}</Panel>

    <Section title="Un programme pour équilibrer" />
    <Panel>{suggestion ? <>
      <Text style={s.eyebrow}>À ESSAYER SELON TON HISTORIQUE</Text>
      <Text style={s.programTitle}>{suggestion.program.name}</Text>
      <Text style={s.muted}>{suggestion.program.daysPerWeek} jours par semaine · {suggestion.program.days.length} séances types</Text>
      <Text style={s.muted}>Ce programme remet {suggestion.matching.map(m => m.label.toLowerCase()).join(', ')} dans tes séances. Il ne change pas ton programme actuel tant que tu ne le choisis pas.</Text>
      <TouchableOpacity onPress={() => setShowProgram(!showProgram)} style={s.method}><Text style={{ color: COLORS.primary }}>{showProgram ? 'Masquer les séances' : 'Voir les séances proposées'}</Text><Ionicons name={showProgram ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.primary} /></TouchableOpacity>
      {showProgram && suggestion.program.days.map(day => <View key={day.label} style={s.programDay}><Text style={s.text}>{day.label}</Text><Text style={s.small}>{day.exerciseNames.join(' · ')}</Text></View>)}
      {currentProgramId === suggestion.program.id ? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Ce programme est déjà actif. Ajuste la régularité des séances selon tes priorités.</Text> : <Action title="Choisir ce programme" onPress={adopt} />}
      <Action title="Comparer tous les programmes" secondary onPress={() => router.push('/programs')} />
    </> : <><Text style={s.muted}>{balance.enoughData ? 'Ta répartition ne fait pas ressortir de groupe à cibler en priorité. Continue avec le programme qui te convient.' : 'Avec au moins 3 séances classées sur la période, une proposition pourra être adaptée à ta répartition.'}</Text><Action title="Explorer les programmes" secondary onPress={() => router.push('/programs')} /></>}</Panel>

    <Section title="Ton volume, autrement" />
    <Panel><Text style={s.eyebrow}>DEPUIS TES DÉBUTS</Text><Text style={s.total}>{formatVolume(data.total, useKg)}</Text><Text style={s.muted}>de volume cumulé : charge × répétitions.</Text></Panel>
    {data.total > 0 ? <><View style={s.objects}>{comparisons.map(object => <View key={object.id} style={s.object}><Ionicons name={object.icon} size={28} color={COLORS.primary} /><Text style={s.objectCount}>≈ {object.count < 0.1 ? object.count.toLocaleString('fr-FR', { maximumSignificantDigits: 2 }) : object.count.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</Text><Text style={s.text}>{object.label}</Text><Text style={s.small}>Référence : {formatVolume(object.referenceKg)}</Text></View>)}</View><Text style={s.small}>Comparaisons illustratives avec des masses de référence. Ce volume est cumulé sur toutes tes répétitions : ce n’est pas une charge soulevée en une fois.</Text></> : <Text style={[s.muted, { marginTop: 14 }]}>Ta première série lancera les comparaisons avec les objets du quotidien.</Text>}

    {!!data.weekly.newRecords.length && <><Section title="Records atteints cette semaine" /><Panel>{data.weekly.newRecords.map(pr => <TouchableOpacity key={pr.exerciseName} onPress={() => router.push(`/exercises/${encodeURIComponent(pr.exerciseName)}`)} style={s.balanceRow}><Ionicons name="trophy-outline" size={22} color={COLORS.warning} /><Text style={[s.text, { flex: 1 }]}>{pr.exerciseName}</Text><Text style={{ color: COLORS.warning, fontWeight: '700' }}>{formatWeight(pr.weight, useKg)}</Text></TouchableOpacity>)}</Panel></>}
    {!!data.plateau && <><Section title="Progression à relancer" /><Panel><Text style={s.muted}>Ces exercices ont peu progressé dans les dernières séances enregistrées.</Text>{data.plateau.exercises.map(ex => <TouchableOpacity key={ex.name} onPress={() => router.push(`/exercises/${encodeURIComponent(ex.name)}`)} style={s.balanceRow}><Text style={[s.text, { flex: 1 }]}>{ex.name}</Text><Ionicons name="chevron-forward" size={18} color={COLORS.primary} /></TouchableOpacity>)}</Panel></>}
    {!!data.templates.length && <><Section title="Tes séances habituelles" />{data.templates.map((template, i) => <View key={template.exercises.map(ex => ex.name).join('|')} style={{ marginBottom: 12 }}><Panel><Text style={s.sectionValue}>Séance {i + 1}</Text><Text style={s.small}>{template.exercises.map(ex => ex.name).join(' · ')}</Text><Action title="Refaire cette séance" secondary onPress={() => startTemplate(template)} /></Panel></View>)}</>}
  </ScrollView>;
}
const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: COLORS.background, padding: 24 }, content: { padding: 20, paddingBottom: 44 }, eyebrow: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 }, title: { color: COLORS.textPrimary, fontSize: 37, fontWeight: '900', letterSpacing: -1, marginTop: 14 }, intro: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 12, marginBottom: 22 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }, periods: { flexDirection: 'row', gap: 10, marginBottom: 18 }, period: { flex: 1, minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder }, periodActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  muted: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 21 }, small: { color: COLORS.textMuted, fontSize: 11, lineHeight: 19 }, text: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' }, muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, muscleChip: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.surface }, dot: { width: 7, height: 7, borderRadius: 4 }, chipText: { color: COLORS.textSecondary, fontSize: 11 }, detail: { gap: 8, padding: 16, backgroundColor: COLORS.surface, borderRadius: 16 }, sectionValue: { color: COLORS.textPrimary, fontSize: 19, fontWeight: '800' }, method: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, minHeight: 44 }, balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42 }, programTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '800' }, programDay: { gap: 7, borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingTop: 12 }, total: { color: COLORS.primary, fontSize: 43, fontWeight: '900', fontVariant: ['tabular-nums'] }, objects: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 14 }, object: { flexGrow: 1, flexBasis: '45%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 18, borderRadius: 22, gap: 10 }, objectCount: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 27 },
});
