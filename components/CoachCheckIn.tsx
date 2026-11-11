import { useState } from 'react';
import { Text, View, Switch, TouchableOpacity } from 'react-native';
import { MuscleMap } from './MuscleMap';
import { MUSCLES, type MuscleActivity, type MuscleId } from '../lib/trainingBalance';
import type { CheckIn } from '../lib/coachTypes';
import { useAppTheme } from '../lib/themes';

export function emptyCheckIn(): CheckIn { return { recordedAt: new Date().toISOString(), energy: null, soreness: {}, pain: [] }; }
export function CoachCheckIn({ value, onChange }: { value: CheckIn; onChange: (value: CheckIn) => void }) {
  const theme = useAppTheme();
  const [selected, select] = useState<MuscleId | null>(null);
  const [showMap, setShowMap] = useState(false);
  const update = (patch: Partial<CheckIn>) => onChange({ ...value, ...patch, recordedAt: new Date().toISOString() });
  const button = { minHeight: 44, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 12, justifyContent: 'center' as const };
  const text = { color: theme.primary };
  const muscles: MuscleActivity[] = MUSCLES.map(m => ({ ...m, score: 0, sessions: 0, ratio: 0, status: value.pain.includes(m.id) || (value.soreness[m.id] ?? 0) >= 2 ? 'low' : value.soreness[m.id] === undefined ? 'unknown' : 'balanced' }));
  return <View style={{ gap: 14 }}>
    <Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '800' }}>Comment te sens-tu aujourd’hui ?</Text>
    <Text style={{ color: '#A5B3AA', lineHeight: 20 }}>Facultatif. Une zone non renseignée reste inconnue. Ces informations restent sur ton appareil.</Text>
    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Énergie générale</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([['good', 'En forme'], ['normal', 'Normal'], ['tired', 'Fatigué'], [null, 'Non renseignée']] as const).map(([id, label]) => <TouchableOpacity key={String(id)} accessibilityRole="radio" accessibilityState={{ checked: value.energy === id }} style={[button, value.energy === id && { borderColor: theme.primary, backgroundColor: theme.primaryGlow }]} onPress={() => update({ energy: id })}><Text style={text}>{label}</Text></TouchableOpacity>)}</View>
    <TouchableOpacity style={button} onPress={() => setShowMap(!showMap)}><Text style={text}>{showMap ? 'Masquer la carte' : 'Choisir une zone sur le corps'}</Text></TouchableOpacity>
    {showMap && <MuscleMap checkIn muscles={muscles} selected={selected} onSelect={select} />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{MUSCLES.map(m => <TouchableOpacity key={m.id} style={[button, selected === m.id && { borderColor: theme.primary }]} onPress={() => select(m.id)}><Text style={{ color: '#FFFFFF' }}>{m.label} · {value.soreness[m.id] ?? '?'}{value.pain.includes(m.id) ? ' ⚠' : ''}</Text></TouchableOpacity>)}</View>
    {selected && <View style={{ gap: 12, padding: 14, borderRadius: 14, backgroundColor: theme.surface }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{MUSCLES.find(m => m.id === selected)?.label} — courbatures</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([0, 1, 2, 3] as const).map(level => <TouchableOpacity key={level} accessibilityRole="radio" accessibilityState={{ checked: value.soreness[selected] === level }} style={[button, value.soreness[selected] === level && { borderColor: theme.primary }]} onPress={() => update({ soreness: { ...value.soreness, [selected]: level } })}><Text style={text}>{level} · {['Aucune', 'Légères', 'Modérées', 'Importantes'][level]}</Text></TouchableOpacity>)}</View>
      <TouchableOpacity style={button} onPress={() => { const soreness = { ...value.soreness }; delete soreness[selected]; update({ soreness }); }}><Text style={text}>Laisser cette zone inconnue</Text></TouchableOpacity>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Text style={{ color: '#FFFFFF', flex: 1 }}>Je ressens une douleur inhabituelle sur cette zone</Text><Switch accessibilityLabel="Douleur inhabituelle sur la zone sélectionnée" value={value.pain.includes(selected)} onValueChange={on => update({ pain: on ? [...value.pain, selected] : value.pain.filter(id => id !== selected) })} trackColor={{ true: theme.primary }} /></View>
    </View>}
    {!!value.pain.length && <Text style={{ color: '#FFC94A', lineHeight: 20 }}>Évite l’exercice douloureux, surtout si la douleur est vive ou articulaire. Le coach ne pose pas de diagnostic. Si la douleur persiste ou t’inquiète, demande un avis médical.</Text>}
  </View>;
}
