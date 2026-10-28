import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import { COLORS } from '../constants/theme';
import type { MuscleActivity, MuscleId, MuscleStatus } from '../lib/trainingBalance';

export const MUSCLE_COLORS: Record<MuscleStatus, string> = { strong: '#51E985', balanced: '#368C64', low: '#FFC94A', unknown: '#3B4851' };
const shapes: { id: MuscleId; front?: string; back?: string }[] = [
  { id: 'shoulders', front: 'M104 82 Q88 78 78 96 L76 112 87 119 99 106 Z', back: 'M104 82 Q88 78 78 96 L76 112 87 119 99 106 Z' },
  { id: 'chest', front: 'M115 91 Q103 89 91 100 L89 120 Q102 130 114 126 L118 109 Z' },
  { id: 'biceps', front: 'M76 117 L86 123 83 148 Q77 158 69 157 L67 148 Z' },
  { id: 'triceps', back: 'M76 117 L86 123 83 148 Q77 158 69 157 L67 148 Z' },
  { id: 'back', back: 'M115 85 L103 88 90 104 91 122 99 145 113 163 117 121 Z' },
  { id: 'abs', front: 'M108 134 L117 132 117 147 107 147 Z M107 151 L117 151 117 166 106 165 Z M106 170 L117 170 117 185 108 184 Z M108 188 L117 189 117 204 111 201 Z' },
  { id: 'glutes', back: 'M112 172 L118 179 118 207 Q106 221 91 207 L89 192 97 179 Z' },
  { id: 'quads', front: 'M98 208 L114 211 113 248 105 278 94 282 86 263 88 232 Z' },
  { id: 'hamstrings', back: 'M96 216 L114 217 111 249 104 279 94 282 86 263 89 236 Z' },
  { id: 'calves', front: 'M94 292 L105 290 104 312 96 344 89 340 86 320 Z', back: 'M94 289 Q106 285 107 304 L100 328 94 345 88 337 85 316 Z' },
];
const outline = 'M120 62 L108 62 104 75 Q85 76 76 92 L69 117 64 145 54 177 59 188 66 178 78 155 88 128 92 151 86 185 84 210 83 245 85 272 82 310 88 352 85 367 79 375 Q86 383 103 378 L107 361 108 332 116 293 115 264 120 229 Z';

export function MuscleMap({ muscles, selected, onSelect }: { muscles: MuscleActivity[]; selected: MuscleId | null; onSelect: (id: MuscleId) => void }) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  useEffect(() => { if (selected) setSide(['back', 'triceps', 'hamstrings', 'glutes'].includes(selected) ? 'back' : 'front'); }, [selected]);
  return <View>
    <View style={s.toggle}>{(['front', 'back'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: side === value }} onPress={() => setSide(value)} style={[s.side, side === value && s.active]}><Text style={{ color: side === value ? COLORS.primary : COLORS.textSecondary, fontWeight: '700' }}>{value === 'front' ? 'Face' : 'Dos'}</Text></TouchableOpacity>)}</View>
    <Svg width="100%" height={360} viewBox="20 0 200 400" accessibilityLabel={`Répartition musculaire, vue de ${side === 'front' ? 'face' : 'dos'}`}>
      <Ellipse cx={120} cy={35} rx={17} ry={22} fill={COLORS.cardBorder} stroke="#52616B" />
      {[false, true].map(mirror => <G key={String(mirror)} transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
        <Path d={outline} fill="#1B252C" stroke="#52616B" strokeWidth={1.2} strokeLinejoin="round" />
        {shapes.map(shape => {
          const d = shape[side]; if (!d) return null;
          const activity = muscles.find(m => m.id === shape.id);
          return <Path key={shape.id} d={d} fill={MUSCLE_COLORS[activity?.status ?? 'unknown']} stroke={selected === shape.id ? COLORS.textPrimary : COLORS.background} strokeWidth={selected === shape.id ? 2 : 1.5} strokeLinejoin="round" onPress={() => onSelect(shape.id)} />;
        })}
        <Path d="M65 162 L73 165 63 183 58 184 Z" fill="#34434D" />
      </G>)}
    </Svg>
    <View style={s.legend}>{([['strong', 'Très sollicité'], ['balanced', 'Sollicité'], ['low', 'À rééquilibrer'], ['unknown', 'À découvrir']] as const).map(([status, label]) => <View key={status} style={s.legendItem}><View style={[s.dot, { backgroundColor: MUSCLE_COLORS[status] }]} /><Text style={s.label}>{label}</Text></View>)}</View>
    <Text style={s.hint}>Touche un muscle ou choisis un groupe ci-dessous.</Text>
  </View>;
}
const s = StyleSheet.create({ toggle: { flexDirection: 'row', gap: 8, justifyContent: 'center' }, side: { minWidth: 84, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder }, active: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }, legendItem: { flexDirection: 'row', gap: 6, alignItems: 'center' }, dot: { width: 9, height: 9, borderRadius: 5 }, label: { color: COLORS.textSecondary, fontSize: 10 }, hint: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11, marginTop: 16 } });
