import { Text, View } from 'react-native';
import { getWeeklyConsistency } from '../lib/weeklyConsistency';
import { COLORS } from '../constants/theme';
export function WeeklyConsistency({ data }: { data: ReturnType<typeof getWeeklyConsistency> }) {
  return <View style={{ gap: 14 }}><Text style={{ color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' }}>🔥 {data.streakWeeks} semaine{data.streakWeeks > 1 ? 's' : ''} régulière{data.streakWeeks > 1 ? 's' : ''}</Text><Text style={{ color: COLORS.textSecondary }}>Cette semaine · {data.currentWeekCount} / {data.target} séances</Text><View style={{ flexDirection: 'row', gap: 10 }}>{Array.from({ length: data.target }, (_, index) => <View key={index} style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: index < data.currentWeekCount ? COLORS.primary : COLORS.cardBorder }} />)}</View><Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Lundi → dimanche · une séance compte dès qu’elle contient des répétitions enregistrées.</Text></View>;
}
