import { useCallback, useRef, useState } from 'react';
import { Alert, Keyboard, Linking, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getCreatineReminder } from '../lib/reminderSettings';
import { hasLocalNotificationPermission, saveCreatineReminder } from '../lib/localNotifications';
import { COLORS } from '../constants/theme';
import { KeyboardDoneAccessory } from './KeyboardDoneAccessory';
export function CreatineReminderSettings() {
  const [config, setConfig] = useState(getCreatineReminder);
  const [hour, setHour] = useState(() => String(config.hour).padStart(2, '0'));
  const [minute, setMinute] = useState(() => String(config.minute).padStart(2, '0'));
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  useFocusEffect(useCallback(() => {
    const saved = getCreatineReminder(); setConfig(saved); setHour(String(saved.hour).padStart(2, '0')); setMinute(String(saved.minute).padStart(2, '0'));
    let active = true;
    void hasLocalNotificationPermission().then(value => { if (active) setPermissionGranted(value); }).catch(() => { if (active) setPermissionGranted(false); });
    return () => { active = false; };
  }, []));
  const save = async (enabled = config.enabled) => {
    if (busyRef.current) return;
    if (enabled && (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute))) { Alert.alert('Heure du rappel', 'Renseigne une heure et des minutes valides.'); return; }
    busyRef.current = true; setBusy(true); Keyboard.dismiss();
    try {
      const next = enabled ? { enabled, hour: Number(hour), minute: Number(minute) } : { ...config, enabled: false };
      await saveCreatineReminder(next); setConfig(next); setHour(String(next.hour).padStart(2, '0')); setMinute(String(next.minute).padStart(2, '0'));
      if (next.enabled) setPermissionGranted(true);
    } catch (error) { Alert.alert('Rappel créatine', error instanceof Error ? error.message : 'Impossible de programmer le rappel.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <View style={{ gap: 16 }}>
    <View style={s.row}><Text style={[s.title, { flex: 1 }]}>Rappel quotidien de créatine</Text><Switch accessibilityLabel="Activer le rappel créatine" disabled={busy} value={config.enabled} onValueChange={value => { void save(value); }} trackColor={{ true: COLORS.primary }} /></View>
    <Text style={s.muted}>Si la créatine fait partie de ta routine, choisis l’heure de ton rappel quotidien, y compris les jours de repos.</Text>
    <View style={s.row}><TextInput accessibilityLabel="Heure du rappel créatine" inputAccessoryViewID="creatine-time" editable={!busy} style={s.input} keyboardType="number-pad" maxLength={2} value={hour} onChangeText={setHour} placeholder="09" /><Text style={s.title}>:</Text><TextInput accessibilityLabel="Minutes du rappel créatine" inputAccessoryViewID="creatine-time" editable={!busy} style={s.input} keyboardType="number-pad" maxLength={2} value={minute} onChangeText={setMinute} placeholder="00" /><TouchableOpacity disabled={busy} onPress={() => { void save(true); }} style={s.save}><Text style={s.green}>{busy ? 'Enregistrement…' : config.enabled ? 'Enregistrer l’heure' : 'Activer ce rappel'}</Text></TouchableOpacity></View>
    <Text style={s.muted}>{config.enabled ? `Rappel activé tous les jours à ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')}, selon l’heure locale de l’iPhone.` : 'Rappel désactivé.'}</Text>
    {config.enabled && permissionGranted === false && <Text style={{ color: COLORS.warning, fontSize: 12, lineHeight: 20 }}>Les notifications ne sont pas autorisées sur cet iPhone. Autorise-les dans les réglages pour recevoir ton rappel.</Text>}
    <TouchableOpacity onPress={() => { void Linking.openSettings(); }}><Text style={s.green}>Réglages des notifications de l’iPhone</Text></TouchableOpacity>
    <KeyboardDoneAccessory id="creatine-time" />
  </View>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', lineHeight: 22 }, muted: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 20 }, input: { width: 54, minHeight: 48, backgroundColor: COLORS.surface, borderRadius: 14, textAlign: 'center', color: COLORS.textPrimary, fontSize: 22, fontWeight: '700' }, save: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, green: { color: COLORS.primary, fontWeight: '600', fontSize: 12 } });
