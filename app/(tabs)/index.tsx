import { useCallback, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { createSession, createSessionFromProgramDay, createSessionFromTemplate, getAllSessions, getDashboardStats, getSessionVolume, getWeeklyReport, getSmartSessionRecommendation } from '../../lib/queries';
import { getProgramById } from '../../lib/programs';
import { useSettingsStore } from '../../store/settings';
import { useAppTheme } from '../../lib/themes';
import { formatWeight } from '../../lib/units';
import { getSessionTitle, setSessionTitle } from '../../lib/redesign';
import { COLORS } from '../../constants/theme';
import { Action, Metric, Panel, Section } from '../../components/ui';
import { useProfileStore } from '../../store/profile';
export default function DashboardScreen() {
  const theme = useAppTheme();
  const name = useProfileStore(state => state.name);
  const { currentProgramId, currentProgramDayIndex, useKg } = useSettingsStore();
  const [data, setData] = useState<ReturnType<typeof readData> | null>(null);
  const busy = useRef(false);
  const load = useCallback(() => { setData(readData()); busy.current = false; }, []);
  useFocusEffect(load);
  const program = currentProgramId ? getProgramById(currentProgramId) : null;
  const next = program?.days.length ? program.days[currentProgramDayIndex % program.days.length] : null;
  const start = (free = false) => {
    if (busy.current) return;
    busy.current = true;
    try {
      let sessionId: string;
      if (!free && next && program) {
        sessionId = createSessionFromProgramDay(next.exerciseNames, (currentProgramDayIndex + 1) % program.days.length);
        setSessionTitle(sessionId, next.label);
        useSettingsStore.getState().loadSettings();
      } else { sessionId = createSession().id; }
      router.push(`/session/${sessionId}`);
    } catch { busy.current = false; Alert.alert('Séance', 'Impossible de créer la séance. Réessaie.'); }
  };
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.primary} />}>
    <Text style={s.greeting}>{new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'}{name ? ` ${name}` : ''} 👋</Text>
    <Text style={s.date}>{dayjs().locale('fr').format('dddd D MMMM')}</Text>
    <View style={[s.hero, { borderColor: theme.primary + '55', backgroundColor: theme.card }]}>
      <View style={s.row}><Text style={[s.eyebrow, { color: theme.primary }]}>PROCHAINE SÉANCE</Text><Ionicons name="barbell" size={25} color={theme.primary} /></View>
      <Text style={s.heroTitle}>{next?.label.toUpperCase() ?? 'À TON RYTHME'}</Text>
      <Text style={s.subtitle}>{next ? next.muscleGroups?.join(' · ') ?? program?.name : 'Une nouvelle séance. Un pas de plus.'}</Text>
      {next && <Text style={s.subtitle}>{next.exerciseNames.length} exercices · {program?.name}</Text>}
      <Action title="COMMENCER LA SÉANCE" onPress={() => start()} />
      <TouchableOpacity onPress={() => router.push('/programs')} style={s.programLink}><Text style={{ color: theme.primary, fontSize: 13 }}>{next ? 'Voir mon programme' : 'Choisir un programme'}</Text><Ionicons name="chevron-forward" size={16} color={theme.primary} /></TouchableOpacity>
    </View>
    {next && <TouchableOpacity style={s.free} onPress={() => start(true)}><Text style={s.subtitle}>+ Démarrer une séance libre</Text></TouchableOpacity>}
    <Section title="Ces 7 derniers jours" action="Voir les stats" onPress={() => router.push('/(tabs)/stats')} />
    <Panel><View style={s.row}><Metric value={formatWeight(data?.report.totalVolume ?? 0, useKg)} label="Volume soulevé" /><Metric value={String(data?.report.sessionCount ?? 0)} label="Séances" /></View></Panel>
    {!!data?.stats.personalRecords.length && <><Section title="Ton meilleur record" /><TouchableOpacity onPress={() => router.push(`/exercises/${encodeURIComponent(data.stats.personalRecords[0].name)}`)}><Panel><View style={s.row}><Ionicons name="trophy" size={26} color={COLORS.warning} /><Text style={[s.recordName, { flex: 1 }]}>{data.stats.personalRecords[0].name}</Text></View><Text style={s.recordValue}>{formatWeight(data.stats.personalRecords[0].weight, useKg)}</Text></Panel></TouchableOpacity></>}
    <Section title="Historique récent" action="Tout voir" onPress={() => router.push('/(tabs)/history')} />
    {data?.recent.length ? data.recent.map(session => <TouchableOpacity key={session.id} onPress={() => router.push(`/history/${session.id}`)} style={s.session}><View style={s.sessionIcon}><Ionicons name="barbell" size={24} color={theme.primary} /></View><View style={{ flex: 1, gap: 5 }}><Text style={s.recordName}>{getSessionTitle(session.id)}</Text><Text style={s.subtitle}>{dayjs(session.date).locale('fr').format('D MMMM')} · {formatWeight(session.volume, useKg)}</Text></View><Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} /></TouchableOpacity>) : <Panel><Text style={s.recordName}>Tout commence ici</Text><Text style={s.subtitle}>Tes séances et tes progrès apparaîtront ici.</Text></Panel>}
    {data?.suggestion && <><Section title="Pour progresser" /><Panel><Text style={s.subtitle}>Une séance suggérée à partir de ton historique.</Text><Action title="Voir la suggestion" secondary onPress={() => { const suggestion = data.suggestion; if (!suggestion) return; Alert.alert('Séance suggérée', suggestion.exercises.map(e => e.name).join('\n'), [{ text: 'Annuler', style: 'cancel' }, { text: 'Commencer', onPress: () => router.push(`/session/${createSessionFromTemplate(suggestion)}`) }]); }} /></Panel></>}
  </ScrollView>;
}
function readData() { return { stats: getDashboardStats(), report: getWeeklyReport(), recent: getAllSessions().slice(0, 3).map(s => ({ ...s, volume: getSessionVolume(s.id) })), suggestion: getSmartSessionRecommendation() }; }
const s = StyleSheet.create({ content: { padding: 20, paddingBottom: 40 }, greeting: { fontSize: 30, fontWeight: '800', color: COLORS.textPrimary }, date: { color: COLORS.textSecondary, marginTop: 7, marginBottom: 26, textTransform: 'capitalize' }, hero: { padding: 23, borderWidth: 1, borderRadius: 28, gap: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'space-between' }, eyebrow: { fontSize: 11, letterSpacing: 2, fontWeight: '800' }, heroTitle: { color: COLORS.textPrimary, fontSize: 36, fontWeight: '900', letterSpacing: -1 }, subtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 }, programLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 32 }, free: { alignItems: 'center', paddingTop: 16 }, recordName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' }, recordValue: { color: COLORS.textPrimary, fontSize: 34, fontWeight: '800' }, session: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.card, borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardBorder }, sessionIcon: { backgroundColor: COLORS.primaryGlow, borderRadius: 16, padding: 12 } });
