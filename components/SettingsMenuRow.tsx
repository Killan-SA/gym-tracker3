import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../lib/themes';
import { COLORS } from '../constants/theme';
export function SettingsMenuRow({ icon, title, description, onPress, danger = false, disabled = false }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; title: string; description: string;
  onPress: () => void; danger?: boolean; disabled?: boolean;
}) {
  const theme = useAppTheme(); const color = danger ? COLORS.danger : theme.primary;
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.row, disabled && { opacity: 0.5 }]}>
    <View style={[s.icon, { backgroundColor: danger ? COLORS.dangerGlow : theme.primaryGlow }]}><Ionicons name={icon} size={23} color={color} /></View>
    <View style={{ flex: 1, gap: 5 }}><Text style={[s.label, danger && { color }]}>{title}</Text><Text style={s.hint}>{description}</Text></View>
    <Ionicons name="chevron-forward" size={17} color={COLORS.textMuted} />
  </TouchableOpacity>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 76, paddingVertical: 8 }, icon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, label: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' }, hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 } });
