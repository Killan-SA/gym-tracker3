import { useCallback, useEffect, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllSessions, getCustomExercises, getUserBodyweight, setUserBodyweight } from '../../lib/queries';
import { getProgramById } from '../../lib/programs';
import { useSettingsStore } from '../../store/settings';
import { useProfileStore } from '../../store/profile';
import { useAppTheme, THEMES } from '../../lib/themes';
import { parseBodyweight } from '../../lib/onboarding';
import { resetAppData } from '../../lib/resetApp';
import { fromKg, roundWeight, unitLabel } from '../../lib/units';
import { Action, Metric, Panel, Section } from '../../components/ui';
import { GoalSelector } from '../../components/GoalSelector';
import { KeyboardDoneAccessory } from '../../components/KeyboardDoneAccessory';
import { COLORS } from '../../constants/theme';
import { Tutorial } from '../../components/Tutorial';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const settings = useSettingsStore();
  const profile = useProfileStore();
  const [name, setName] = useState(profile.name);
  const [showGuide, setShowGuide] = useState(false);
  const [bodyweight, setBodyweight] = useState('');
  const [counts, setCounts] = useState({ sessions: 0, exercises: 0 });
  useEffect(() => { setName(profile.name); }, [profile.name]);
  useFocusEffect(useCallback(() => {
    const kg = getUserBodyweight();
    setBodyweight(kg > 0 ? String(roundWeight(fromKg(kg, settings.useKg))) : '');
    setCounts({ sessions: getAllSessions().length, exercises: getCustomExercises().length });
  }, [settings.useKg, profile.setupRevision]));

  const saveName = () => {
    try { profile.saveProfile(name, profile.goals); Keyboard.dismiss(); }
    catch (error) { Alert.alert('Ton prénom', error instanceof Error ? error.message : 'Entre un prénom valide.'); }
  };
  const saveWeight = () => {
    const kg = parseBodyweight(bodyweight, settings.useKg);
    if (kg === null) { Alert.alert('Poids corporel', `Entre un poids valide en ${unitLabel(settings.useKg)} (jusqu’à ${settings.useKg ? '300 kg' : '661 lbs'}).`); return; }
    setUserBodyweight(kg); Keyboard.dismiss();
    Alert.alert('Poids enregistré', `${roundWeight(fromKg(kg, settings.useKg))} ${unitLabel(settings.useKg)}`);
  };
  const reset = () => {
    Keyboard.dismiss();
    Alert.alert('Effacer toutes mes données ?', 'Ton prénom, ton poids, tes objectifs, tes séances, tes favoris, tes exercices personnalisés et tes réglages seront effacés. La configuration de départ s’ouvrira à nouveau. Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Tout effacer', style: 'destructive', onPress: () => {
        try { resetAppData(); router.replace('/(tabs)'); }
        catch { Alert.alert('Réinitialisation', 'Impossible de réinitialiser les données. Réessaie.'); }
      } },
    ]);
  };
  const program = settings.currentProgramId ? getProgramById(settings.currentProgramId) : null;

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <View style={s.hero}>
        <View style={[s.avatar, { backgroundColor: theme.primaryGlow }]}><Text style={[s.initial, { color: theme.primary }]}>{profile.name.slice(0, 1).toUpperCase() || 'G'}</Text></View>
        <View style={{ flex: 1, gap: 7 }}><Text style={s.heroTitle}>{profile.name || 'Ton profil'}</Text><Text style={s.muted}>Ton rythme. Tes progrès.</Text></View>
      </View>
      <Panel><View style={s.row}><Metric value={String(counts.sessions)} label="Séances enregistrées" /><Metric value={String(counts.exercises)} label="Exercices créés" /></View></Panel>

      <Section title="Mes informations" />
      <Panel>
        <Text style={s.eyebrow}>MON PRÉNOM</Text>
        <View style={s.row}><TextInput accessibilityLabel="Modifier mon prénom" value={name} onChangeText={setName} maxLength={40} placeholder="Ton prénom" placeholderTextColor={COLORS.textMuted} textContentType="givenName" autoCapitalize="words" returnKeyType="done" onSubmitEditing={saveName} style={s.input} /><TouchableOpacity accessibilityLabel="Enregistrer mon prénom" onPress={saveName} style={[s.saveButton, { backgroundColor: theme.primaryGlow }]}><Ionicons name="checkmark" size={22} color={theme.primary} /></TouchableOpacity></View>
        <View style={s.divider} />
        <Text style={s.eyebrow}>POIDS CORPOREL · {unitLabel(settings.useKg).toUpperCase()}</Text>
        <View style={s.row}><TextInput accessibilityLabel={`Poids corporel en ${unitLabel(settings.useKg)}`} value={bodyweight} onChangeText={setBodyweight} placeholder={settings.useKg ? '72,5' : '160'} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" inputAccessoryViewID="profile-bodyweight" returnKeyType="done" onSubmitEditing={saveWeight} style={[s.input, s.weightInput]} /><TouchableOpacity accessibilityLabel="Enregistrer mon poids corporel" onPress={saveWeight} style={[s.saveButton, { backgroundColor: theme.primaryGlow }]}><Ionicons name="checkmark" size={22} color={theme.primary} /></TouchableOpacity></View>
        <Text style={s.hint}>Utilisé pour tes exercices au poids du corps.</Text>
        <View style={s.row}><Text style={s.label}>Unité de poids</Text><View style={s.unitRow}>{[true, false].map(kg => <TouchableOpacity key={String(kg)} accessibilityRole="radio" accessibilityState={{ checked: settings.useKg === kg }} onPress={() => { Keyboard.dismiss(); settings.setUseKg(kg); }} style={[s.unit, settings.useKg === kg && { backgroundColor: theme.primaryGlow, borderColor: theme.primary }]}><Text style={{ color: settings.useKg === kg ? theme.primary : COLORS.textSecondary, fontWeight: '700' }}>{kg ? 'kg' : 'lbs'}</Text></TouchableOpacity>)}</View></View>
      </Panel>

      <Section title="Mes priorités" />
      <Panel><Text style={s.muted}>Ce que j’ai envie de travailler en priorité.</Text><GoalSelector value={profile.goals} onChange={goals => profile.saveProfile(profile.name, goals)} /><View style={s.divider} /><Text style={s.eyebrow}>MON PROGRAMME</Text><Text style={s.programName}>{program?.name ?? 'Entraînement libre'}</Text><Action title="Voir les programmes" secondary onPress={() => router.push('/programs')} /></Panel>

      <Section title="Ma bibliothèque" />
      <Panel><MenuRow icon="add-circle-outline" title="Ajouter un exercice" description="Ma machine, ma variante, mon exercice" onPress={() => router.push('/exercises/new')} /></Panel>

      <Section title="Apparence" />
      <Panel><Text style={s.label}>Couleur principale</Text><View style={s.themes}>{Object.values(THEMES).map(option => <TouchableOpacity key={option.id} accessibilityLabel={`Thème ${option.label}`} accessibilityRole="radio" accessibilityState={{ checked: settings.themeId === option.id }} onPress={() => settings.setThemeId(option.id)} style={[s.swatch, { backgroundColor: option.swatch }, settings.themeId === option.id && { borderColor: COLORS.textPrimary }]}>{settings.themeId === option.id && <Ionicons name="checkmark" size={22} color="#fff" />}</TouchableOpacity>)}</View><Text style={s.hint}>{theme.label}</Text></Panel>

      <Section title="Mes données" />
      <Panel><MenuRow icon="document-text-outline" title="Importer mon historique Excel" description="Fichiers .xlsx et .xls" onPress={() => router.push('/import')} /><View style={s.divider} /><MenuRow icon="trash-outline" title="Effacer toutes mes données" description="Repartir de zéro et refaire la configuration" danger onPress={reset} /></Panel>
      <Section title="Un coup de main ?" /><Panel><MenuRow icon="sparkles-outline" title="Revoir le mini tutoriel" description="Séances, séries, repos et bilan musculaire" onPress={() => setShowGuide(true)} /></Panel>
      <View style={s.footer}><Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} /><Text style={s.hint}>Tes données restent sur cet iPhone.</Text></View>
    </ScrollView>
    <KeyboardDoneAccessory id="profile-bodyweight" />
    <Tutorial visible={showGuide} onComplete={() => setShowGuide(false)} />
  </KeyboardAvoidingView>;
}

function MenuRow({ icon, title, description, onPress, danger = false }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; description: string; onPress: () => void; danger?: boolean }) {
  const theme = useAppTheme();
  const color = danger ? COLORS.danger : theme.primary;
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={s.menuRow}><View style={[s.menuIcon, { backgroundColor: danger ? COLORS.dangerGlow : theme.primaryGlow }]}><Ionicons name={icon} size={23} color={color} /></View><View style={{ flex: 1, gap: 5 }}><Text style={[s.label, danger && { color }]}>{title}</Text><Text style={s.hint}>{description}</Text></View><Ionicons name="chevron-forward" size={17} color={COLORS.textMuted} /></TouchableOpacity>;
}
const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 }, hero: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 24, marginTop: 8 }, avatar: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, initial: { fontSize: 34, fontWeight: '800' }, heroTitle: { color: COLORS.textPrimary, fontSize: 29, fontWeight: '800' }, muted: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, justifyContent: 'space-between' }, eyebrow: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 }, input: { flex: 1, minHeight: 50, color: COLORS.textPrimary, fontSize: 19, fontWeight: '600', paddingHorizontal: 0 }, weightInput: { fontSize: 30, fontWeight: '800' }, saveButton: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 6 }, label: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' }, hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 }, unitRow: { flexDirection: 'row', gap: 8 }, unit: { minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.surface },
  programName: { color: COLORS.textPrimary, fontSize: 23, fontWeight: '800' }, themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, swatch: { width: 44, height: 44, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, menuRow: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 64 }, menuIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 30 },
});
