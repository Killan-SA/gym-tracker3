import { useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { getUserSetting, setUserSetting } from '../lib/database';
import { getWeeklyGoal, setWeeklyGoal } from '../lib/weeklyConsistency';
import { COLORS } from '../constants/theme';
export function TrainingPreferences() {
  const [goal, setGoal] = useState(getWeeklyGoal);
  const [auto, setAuto] = useState(() => getUserSetting('auto_rest') === '1');
  return <View style={{ gap: 20 }}><Text style={s.label}>OBJECTIF HEBDOMADAIRE</Text><View style={s.row}>{[2, 3, 4, 5].map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: goal === value }} onPress={() => { setWeeklyGoal(value); setGoal(value); }} style={[s.chip, goal === value && { borderColor: COLORS.primary }]}><Text style={{ color: goal === value ? COLORS.primary : COLORS.textPrimary }}>{value}</Text></TouchableOpacity>)}</View><Text style={s.muted}>Séances par semaine, du lundi au dimanche. Les jours de récupération sont prévus.</Text><View style={s.row}><Text style={[s.text, { flex: 1 }]}>Ouvrir le repos après validation d’une série</Text><Switch accessibilityLabel="Ouvrir automatiquement le repos" value={auto} onValueChange={value => { setUserSetting('auto_rest', value ? '1' : '0'); setAuto(value); }} trackColor={{ true: COLORS.primary }} /></View></View>;
}
const s = StyleSheet.create({ label: { color: COLORS.textMuted, fontSize: 11, letterSpacing: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, chip: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.cardBorder }, text: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 }, muted: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 19 } });
