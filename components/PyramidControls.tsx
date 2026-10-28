import { useRef, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { DEFAULT_PYRAMID, buildPyramid, getPyramidPlan, savePyramidPlan, setPyramidEnabled, getPyramidProgress, addNextPyramidSet } from '../lib/pyramid';
import type { PyramidDirection } from '../lib/pyramid';
import { getUserBodyweight } from '../lib/queries';

export function PyramidControls({ exerciseId, onReload }: { exerciseId: string; onReload: () => void }) {
  const [plan, setPlan] = useState(() => getPyramidPlan(exerciseId));
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(String(plan?.start ?? DEFAULT_PYRAMID.start));
  const [step, setStep] = useState(String(plan?.step ?? DEFAULT_PYRAMID.step));
  const [levels, setLevels] = useState(String(plan?.levels ?? DEFAULT_PYRAMID.levels));
  const [direction, setDirection] = useState<PyramidDirection>(plan?.direction ?? 'updown');
  const busy = useRef(false);
  const fields = [{ label: 'Base', value: start, change: setStart }, { label: 'Pas', value: step, change: setStep }, { label: 'Paliers', value: levels, change: setLevels }];
  const progress = getPyramidProgress(exerciseId);
  let preview: number[] = [];
  try { preview = buildPyramid({ start: Number(start), step: Number(step), levels: Number(levels), direction }); } catch { /* Validation is shown when applying the configuration. */ }
  const chooseMode = (enabled: boolean) => {
    Keyboard.dismiss();
    if (enabled && !plan) { setEditing(true); return; }
    setPlan(setPyramidEnabled(exerciseId, enabled)); setEditing(false); onReload();
  };
  const apply = () => {
    Keyboard.dismiss();
    const config = { start: Number(start), step: Number(step), levels: Number(levels), direction };
    try { buildPyramid(config); } catch (error) { Alert.alert('Pyramide', error instanceof Error ? error.message : 'Configuration invalide.'); return; }
    const save = () => { if (busy.current) return; busy.current = true; try { setPlan(savePyramidPlan(exerciseId, config)); setEditing(false); onReload(); } catch (error) { Alert.alert('Pyramide', error instanceof Error ? error.message : 'Impossible de sauvegarder.'); } finally { busy.current = false; } };
    if (progress && (progress.completed > 0 || progress.pendingSet)) Alert.alert('Nouvelle pyramide ?', 'Tes séries déjà enregistrées seront conservées. Une nouvelle pyramide commencera au premier palier.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Commencer une nouvelle pyramide', onPress: save }]);
    else save();
  };
  const addNext = () => {
    if (busy.current) return;
    busy.current = true;
    Keyboard.dismiss();
    try { addNextPyramidSet(exerciseId); onReload(); }
    catch (error) { Alert.alert('Pyramide', error instanceof Error ? error.message : 'Impossible d’ajouter le palier.'); }
    finally { busy.current = false; }
  };
  const enabled = plan?.enabled ?? false;
  return <View style={s.container}>
    <View style={s.modes}>{[false, true].map(pyramid => <TouchableOpacity key={String(pyramid)} accessibilityRole="radio" accessibilityState={{ checked: pyramid ? enabled || editing : !enabled && !editing }} onPress={() => chooseMode(pyramid)} style={[s.mode, (pyramid ? enabled || editing : !enabled && !editing) && s.selected]}><Ionicons name={pyramid ? 'trending-up' : 'list-outline'} size={17} color={COLORS.primary} /><Text style={s.modeText}>{pyramid ? 'Pyramide' : 'Classique'}</Text></TouchableOpacity>)}</View>
    {editing && <View style={s.editor}>
      <Text style={s.title}>Une pyramide de répétitions</Text>
      <Text style={s.hint}>Le poids du corps reste la charge. Seules les répétitions changent d’un palier à l’autre.</Text>
      <View style={s.inputs}>{fields.map(({ label, value, change }) => <View key={label} style={{ flex: 1, gap: 7 }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={`Pyramide : ${label}`} style={s.input} value={value} onChangeText={change} keyboardType="number-pad" inputAccessoryViewID="session-set-input" selectTextOnFocus maxLength={3} /></View>)}</View>
      <Text style={s.hint}>La base est le nombre de répétitions du palier le plus bas.</Text>
      <View style={s.directions}>{([['ascending', 'Montante'], ['descending', 'Descendante'], ['updown', 'Aller-retour']] as const).map(([value, label]) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: direction === value }} onPress={() => { Keyboard.dismiss(); setDirection(value); }} style={[s.direction, direction === value && s.selected]}><Text style={s.label}>{label}</Text></TouchableOpacity>)}</View>
      <Text style={s.preview}>{preview.length ? preview.join(' → ') : 'Ajuste les valeurs de ta pyramide.'}</Text>
      {preview.length > 0 && <Text style={s.hint}>{preview.length} séries · {preview.reduce((sum, reps) => sum + reps, 0)} répétitions prévues</Text>}
      <TouchableOpacity accessibilityRole="button" style={s.apply} onPress={apply}><Text style={s.applyText}>Appliquer cette pyramide</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondary} onPress={() => { Keyboard.dismiss(); setEditing(false); }}><Text style={s.hint}>Annuler</Text></TouchableOpacity>
    </View>}
    {enabled && progress && !editing && <View style={s.editor}>
      <View style={s.header}><Text style={s.title}>{progress.finished ? 'Pyramide terminée ✓' : `Pyramide · ${progress.completed}/${progress.targets.length} paliers`}</Text><TouchableOpacity accessibilityLabel="Configurer une nouvelle pyramide" style={s.settings} onPress={() => setEditing(true)}><Ionicons name="options-outline" size={21} color={COLORS.primary} /></TouchableOpacity></View>
      <View style={s.targets}>{progress.targets.map((target, index) => <View key={index} style={[s.target, index < progress.completed && s.done, index === progress.nextIndex && s.selected]}><Text style={{ color: index < progress.completed ? COLORS.primary : COLORS.textPrimary, fontWeight: '700' }}>{target}</Text></View>)}</View>
      <Text style={s.hint}>Chaque nombre est un objectif de répétitions. Tu peux ajuster les répétitions réellement réalisées dans la série.</Text>
      {getUserBodyweight() === 0 && <Text style={s.hint}>Renseigne ton poids dans Profil pour calculer le volume. Sans poids, les répétitions restent enregistrées.</Text>}
      {!progress.finished && <TouchableOpacity accessibilityRole="button" disabled={!!progress.pendingSet} onPress={addNext} style={[s.apply, progress.pendingSet && { opacity: 0.45 }]}><Text style={s.applyText}>{progress.pendingSet ? 'Valide le palier en cours' : `Ajouter le palier : ${progress.targets[progress.nextIndex]} reps`}</Text></TouchableOpacity>}
      {progress.finished && <TouchableOpacity style={s.apply} onPress={() => setEditing(true)}><Text style={s.applyText}>Nouvelle pyramide</Text></TouchableOpacity>}
      <Text style={s.hint}>Le repos se lance manuellement, comme en mode classique.</Text>
    </View>}
  </View>;
}
const s = StyleSheet.create({ container: { marginBottom: 20, gap: 12 }, modes: { flexDirection: 'row', gap: 8 }, mode: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.surface, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, selected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow }, modeText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 13 }, editor: { padding: 14, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder, gap: 12 }, title: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', flexShrink: 1 }, hint: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 18 }, label: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600' }, inputs: { flexDirection: 'row', gap: 10 }, input: { minHeight: 46, borderRadius: 12, backgroundColor: COLORS.card, borderColor: COLORS.cardBorder, borderWidth: 1, textAlign: 'center', color: COLORS.textPrimary, fontSize: 21, fontWeight: '700' }, directions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, direction: { minHeight: 44, flexGrow: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 12, paddingHorizontal: 8 }, preview: { color: COLORS.primary, fontSize: 17, fontWeight: '800', lineHeight: 26 }, apply: { minHeight: 48, borderRadius: 14, padding: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }, applyText: { color: COLORS.background, fontWeight: '800', fontSize: 12, textAlign: 'center' }, secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, settings: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, targets: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, target: { minWidth: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 10 }, done: { backgroundColor: COLORS.primaryGlow } });
