import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TRAINING_GOALS, type TrainingGoal } from '../constants/goals';
import { COLORS } from '../constants/theme';

export function GoalSelector({ value, onChange }: { value: TrainingGoal[]; onChange: (goals: TrainingGoal[]) => void }) {
  return <View style={s.grid}>
    {TRAINING_GOALS.map(goal => {
      const selected = value.includes(goal.id);
      return <TouchableOpacity key={goal.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => onChange(selected ? value.filter(id => id !== goal.id) : [...value, goal.id])} style={[s.chip, selected && s.selected]}>
        <Ionicons name={selected ? 'checkmark-circle' : 'add-circle-outline'} size={19} color={selected ? COLORS.primary : COLORS.textMuted} />
        <Text style={[s.label, selected && { color: COLORS.primary }]}>{goal.label}</Text>
      </TouchableOpacity>;
    })}
    <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: value.length === 0 }} onPress={() => onChange([])} style={[s.chip, value.length === 0 && s.selected]}>
      <Ionicons name={value.length === 0 ? 'checkmark-circle' : 'ellipse-outline'} size={19} color={value.length === 0 ? COLORS.primary : COLORS.textMuted} />
      <Text style={[s.label, value.length === 0 && { color: COLORS.primary }]}>Tout le corps</Text>
    </TouchableOpacity>
  </View>;
}
const s = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, chip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 14, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder }, selected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow }, label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' } });
