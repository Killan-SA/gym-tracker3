import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import dayjs from 'dayjs';
import { getAllSessions, getDashboardStats, getTotalVolumeAllTime, getVolumeByMuscleGroup, getAllExerciseNames, getWeightHistory } from '../../lib/queries';
import { useSettingsStore } from '../../store/settings';
import { formatWeight, formatVolume, fromKg } from '../../lib/units';
import { COLORS } from '../../constants/theme';
import { Action, Metric, Panel, Section } from '../../components/ui';
export default function StatsScreen() {
  const useKg = useSettingsStore(s => s.useKg);
  const { width } = useWindowDimensions();
  const [data, setData] = useState<ReturnType<typeof readData> | null>(null);
  const [selected, setSelected] = useState('');
  useFocusEffect(useCallback(() => { const next = readData(); setData(next); setSelected(current => next.names.includes(current) ? current : next.names[0] ?? ''); }, []));
  const history = selected ? getWeightHistory(selected).map(p => ({ value: fromKg(p.value, useKg), label: p.label ?? '' })) : [];
  const days = Array.from({ length: 84 }, (_, i) => dayjs().startOf('day').subtract(83 - i, 'day'));
  const counts = new Map<string, number>();
  for (const session of data?.sessions ?? []) { const key = dayjs(session.date).format('YYYY-MM-DD'); counts.set(key, (counts.get(key) ?? 0) + 1); }
  const maxVolume = Math.max(1, ...(data?.groups.map(g => g.volume) ?? []));
  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <Panel><View style={s.row}><Metric value={String(data?.stats.totalSessionCount ?? 0)} label="Séances au total" /><Metric value={formatVolume(data?.volume ?? 0, useKg)} label="Volume total" /></View></Panel>
    <Section title="Ta régularité" /><Panel><View style={s.row}><Text style={s.muted}>12 dernières semaines</Text><Text style={s.muted}>Aujourd’hui →</Text></View><View style={s.heatmap}>{Array.from({ length: 12 }, (_, week) => <View key={week} style={s.week}>{days.slice(week * 7, week * 7 + 7).map(date => { const count = counts.get(date.format('YYYY-MM-DD')) ?? 0; return <View key={date.toISOString()} accessible accessibilityLabel={`${date.format('D MMMM')} : ${count} séances`} style={[s.day, { backgroundColor: count > 1 ? COLORS.primary : count ? '#286A40' : COLORS.cardBorder }]} />; })}</View>)}</View><Text style={s.muted}>Chaque carré représente une journée.</Text></Panel>
    <Section title="Volume par groupe" /><Panel>{data?.groups.length ? data.groups.map(g => <View key={g.category} style={{ gap: 8, marginBottom: 9 }}><View style={s.row}><Text style={s.text}>{g.category}</Text><Text style={s.muted}>{formatWeight(g.volume, useKg)}</Text></View><View style={s.track}><View style={[s.fill, { width: `${g.volume / maxVolume * 100}%` }]} /></View></View>) : <Text style={s.muted}>Enregistre une séance pour voir ton volume.</Text>}</Panel>
    <Section title="Records personnels" />{data?.stats.personalRecords.length ? data.stats.personalRecords.map(pr => <TouchableOpacity key={pr.name} onPress={() => router.push(`/exercises/${encodeURIComponent(pr.name)}`)} style={s.record}><Text style={[s.text, { flex: 1 }]}>{pr.name}</Text><Text style={{ color: COLORS.warning, fontWeight: '800' }}>{formatWeight(pr.weight, useKg)}</Text></TouchableOpacity>) : <Panel><Text style={s.muted}>Tes premiers records t’attendent.</Text></Panel>}
    <Section title="Progression" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>{data?.names.map(name => <TouchableOpacity key={name} style={[s.select, selected === name && { borderColor: COLORS.primary }]} onPress={() => setSelected(name)}><Text style={{ color: selected === name ? COLORS.primary : COLORS.textSecondary }}>{name}</Text></TouchableOpacity>)}</ScrollView>
    <Panel>{history.length >= 2 ? <LineChart data={history} width={Math.max(160, width - 125)} height={175} color={COLORS.primary} thickness={3} dataPointsColor={COLORS.primary} yAxisTextStyle={s.muted} xAxisLabelTextStyle={s.muted} rulesColor={COLORS.cardBorder} yAxisColor={COLORS.cardBorder} xAxisColor={COLORS.cardBorder} /> : <Text style={s.muted}>Deux séances avec le même exercice permettent de tracer ta progression.</Text>}{selected && <Action title="Voir la fiche complète" secondary onPress={() => router.push(`/exercises/${encodeURIComponent(selected)}`)} />}</Panel>
    <Section title="Aller plus loin" /><Action title="Mon bilan musculaire détaillé" secondary onPress={() => router.push('/report')} />
  </ScrollView>;
}
function readData() { return { sessions: getAllSessions(), stats: getDashboardStats(), volume: getTotalVolumeAllTime(), groups: getVolumeByMuscleGroup(), names: getAllExerciseNames() }; }
const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 20, paddingBottom: 40 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }, text: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' }, muted: { color: COLORS.textSecondary, fontSize: 11 }, heatmap: { flexDirection: 'row', gap: 5 }, week: { flex: 1, gap: 5 }, day: { aspectRatio: 1, borderRadius: 4 }, track: { height: 7, backgroundColor: COLORS.cardBorder, borderRadius: 4 }, fill: { height: 7, backgroundColor: COLORS.primary, borderRadius: 4 }, record: { backgroundColor: COLORS.card, padding: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 }, select: { padding: 12, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder } });
