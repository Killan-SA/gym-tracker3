import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRestTimerStore } from '../store/restTimerStore';
import { secondsRemaining } from '../lib/restTimer';
import { useSettingsStore } from '../store/settings';
import { formatWeight } from '../lib/units';

export default function RestScreen() {
  const { timer, adjust, preset, stop } = useRestTimerStore();
  const useKg = useSettingsStore(state => state.useKg);
  const [, refresh] = useState(0);
  const remaining = secondsRemaining(timer);
  useEffect(() => {
    const tick = () => refresh(value => value + 1);
    tick(); const interval = setInterval(tick, 250);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(interval); listener.remove(); };
  }, []);
  const back = (finish = false) => { if (finish) stop(); if (router.canGoBack()) router.back(); else if (timer?.sessionId) router.replace(`/session/${timer.sessionId}`); else router.replace('/(tabs)'); };
  return <SafeAreaView style={s.container}><TouchableOpacity style={s.back} onPress={() => back()}><Text style={s.green}>← Séance</Text></TouchableOpacity><View style={s.main}>
    <Text style={s.label}>{!timer ? 'AUCUN REPOS EN COURS' : remaining > 0 ? 'REPOS' : 'REPOS TERMINÉ ✓'}</Text>
    <Text adjustsFontSizeToFit numberOfLines={1} style={s.time}>{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</Text>
    <View style={s.track}><View style={[s.fill, { width: `${timer ? Math.min(100, remaining / timer.duration * 100) : 0}%` }]} /></View>
    {timer && remaining > 0 && <><View style={s.row}><TouchableOpacity style={s.adjust} onPress={() => adjust(-15)}><Text style={s.green}>−15 s</Text></TouchableOpacity><TouchableOpacity style={s.adjust} onPress={() => adjust(30)}><Text style={s.green}>+30 s</Text></TouchableOpacity></View><View style={s.row}>{[60, 90, 120, 180].map(duration => <TouchableOpacity key={duration} style={s.preset} onPress={() => preset(duration)}><Text style={s.white}>{duration} s</Text></TouchableOpacity>)}</View></>}
    <TouchableOpacity style={s.action} onPress={() => back(true)}><Text style={s.actionText}>{remaining > 0 ? 'PASSER' : 'REVENIR À LA SÉANCE'}</Text></TouchableOpacity>
  </View>{timer && <View style={s.context}><Text style={s.white}>{timer.exerciseName}</Text><Text style={s.muted}>{timer.setNumber > 0 ? `Série ${timer.setNumber} terminée` : 'Repos libre'}</Text>{timer.reps > 0 && <Text style={s.muted}>{formatWeight(timer.weight, useKg)} × {timer.reps}</Text>}</View>}</SafeAreaView>;
}
const s = StyleSheet.create({ container: { flex: 1, backgroundColor: '#080B0D', paddingHorizontal: 24 }, back: { paddingVertical: 18, minHeight: 48 }, green: { color: '#4ADE80', fontSize: 17, fontWeight: '600' }, main: { flex: 1, justifyContent: 'center', gap: 28 }, label: { color: '#4ADE80', letterSpacing: 3, textAlign: 'center', fontSize: 15, fontWeight: '700' }, time: { color: '#F4F8F6', fontSize: 100, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] }, track: { height: 7, backgroundColor: '#1D2922', borderRadius: 4, overflow: 'hidden' }, fill: { height: 7, backgroundColor: '#4ADE80' }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, adjust: { flex: 1, alignItems: 'center', padding: 16 }, preset: { flex: 1, alignItems: 'center', borderRadius: 16, backgroundColor: '#152019', paddingVertical: 16 }, white: { color: '#F4F8F6', fontSize: 15, fontWeight: '600' }, action: { backgroundColor: '#4ADE80', borderRadius: 20, padding: 20, alignItems: 'center' }, actionText: { color: '#080B0D', fontSize: 14, fontWeight: '800' }, context: { alignItems: 'center', gap: 9, paddingBottom: 32 }, muted: { color: '#8C9B92', fontSize: 14 } });
