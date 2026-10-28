import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { COLORS } from '../constants/theme';
import { useAppTheme } from '../lib/themes';

export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{action && <TouchableOpacity onPress={onPress} hitSlop={10}><Text style={s.link}>{action}</Text></TouchableOpacity>}</View>;
}
export function Metric({ value, label }: { value: string; label: string }) {
  return <View style={s.metric}><Text style={s.value}>{value}</Text><Text style={s.muted}>{label}</Text></View>;
}
export function Action({ title, onPress, secondary = false }: { title: string; onPress: () => void; secondary?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} activeOpacity={0.8} style={[s.action, secondary && s.secondary]}><Text style={[s.actionText, secondary && s.link]}>{title}</Text><Ionicons name="arrow-forward" size={20} color={secondary ? COLORS.primary : COLORS.background} /></TouchableOpacity>;
}
export function Panel({ children }: { children: ReactNode }) { const theme = useAppTheme(); return <View style={[s.panel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>{children}</View>; }
const s = StyleSheet.create({
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 14 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 19, fontWeight: '700' },
  link: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  metric: { flex: 1, gap: 7 }, value: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  muted: { color: COLORS.textSecondary, fontSize: 12 },
  action: { minHeight: 54, borderRadius: 16, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, gap: 12 },
  actionText: { color: COLORS.background, fontSize: 14, fontWeight: '800' },
  secondary: { backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.cardBorder },
  panel: { backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 20, gap: 12 },
});
