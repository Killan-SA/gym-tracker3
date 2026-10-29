import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getProgramsForGoals } from '../lib/programs';
import { completeOnboarding, parseBodyweight, type InitialDataSource } from '../lib/onboarding';
import { getUserBodyweight } from '../lib/queries';
import { useSettingsStore } from '../store/settings';
import { useProfileStore, cleanName } from '../store/profile';
import type { TrainingGoal } from '../constants/goals';
import { COLORS } from '../constants/theme';
import { KeyboardDoneAccessory } from './KeyboardDoneAccessory';
import { GoalSelector } from './GoalSelector';
import { fromKg, roundWeight } from '../lib/units';
import { BrandMark } from './BrandMark';

interface Props { visible: boolean; onComplete: (source: InitialDataSource) => void; onDismiss: () => void }

export function Onboarding({ visible, onComplete, onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [program, setProgram] = useState<string | null | undefined>(undefined);
  const [weight, setWeight] = useState('');
  const [importSource, setImportSource] = useState<InitialDataSource>('none');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const useKg = useSettingsStore(state => state.useKg);
  const saving = useRef(false);

  useEffect(() => {
    if (!visible) return;
    const profile = useProfileStore.getState();
    const settings = useSettingsStore.getState();
    const bodyweight = getUserBodyweight();
    setName(profile.name); setGoals(profile.goals);
    setProgram(settings.currentProgramId ?? undefined);
    setWeight(bodyweight > 0 ? String(roundWeight(fromKg(bodyweight, settings.useKg))) : '');
    setStep(0); setImportSource('none'); saving.current = false;
  }, [visible]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);

  const next = () => {
    Keyboard.dismiss();
    if (step === 0 && !cleanName(name)) { Alert.alert('Ton prénom', 'Entre ton prénom pour personnaliser ton accueil.'); return; }
    if (step === 1 && program === undefined) { Alert.alert('Ton entraînement', 'Choisis un programme ou le mode libre.'); return; }
    setStep(step + 1);
  };
  const finish = (skipWeight = false) => {
    if (saving.current || program === undefined) return;
    const kg = skipWeight ? null : parseBodyweight(weight, useKg);
    if (!skipWeight && kg === null) { Alert.alert('Ton poids corporel', `Entre un poids valide en ${useKg ? 'kg' : 'lbs'}, ou renseigne-le plus tard.`); return; }
    saving.current = true;
    try {
      completeOnboarding(program, kg, name, goals);
      Keyboard.dismiss(); onComplete(importSource);
    } catch (error) { saving.current = false; Alert.alert('Configuration', error instanceof Error ? error.message : 'Impossible de sauvegarder. Réessaie.'); }
  };
  const back = () => { Keyboard.dismiss(); setStep(value => Math.max(0, value - 1)); };

  return <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onDismiss={onDismiss} onRequestClose={back}>
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          <BrandMark size={48} />
          <View style={s.progressRow}>{[0, 1, 2].map(index => <View key={index} style={[s.progressSegment, index <= step && { backgroundColor: COLORS.primary }]} />)}</View>
          <Text style={s.eyebrow}>FAISONS CONNAISSANCE · {step + 1}/3</Text>
          {step > 0 && <TouchableOpacity onPress={back} style={s.back}><Ionicons name="arrow-back" size={20} color={COLORS.primary} /><Text style={{ color: COLORS.primary }}>Retour</Text></TouchableOpacity>}

          {step === 0 && <>
            <Text style={s.title}>{'Bienvenue.\nComment t’appelles-tu ?'}</Text>
            <Text style={s.description}>Ton prénom apparaîtra sur ton accueil. Tout reste enregistré sur ton iPhone.</Text>
            <Text style={s.eyebrow}>TON PRÉNOM</Text>
            <TextInput accessibilityLabel="Ton prénom" value={name} onChangeText={setName} placeholder="Ton prénom" placeholderTextColor={COLORS.textMuted} autoCapitalize="words" autoCorrect={false} textContentType="givenName" maxLength={40} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} style={s.nameInput} />
            <Text style={s.sectionTitle}>Qu’aimerais-tu travailler ?</Text>
            <Text style={s.description}>Sélectionne une ou plusieurs priorités, ou choisis tout le corps.</Text>
            <GoalSelector value={goals} onChange={setGoals} />
            <TouchableOpacity accessibilityRole="button" onPress={next} disabled={!cleanName(name)} style={[s.primary, !cleanName(name) && { opacity: 0.4 }]}><Text style={s.primaryLabel}>Découvrir mes programmes</Text><Ionicons name="arrow-forward" size={20} color={COLORS.background} /></TouchableOpacity>
          </>}

          {step === 1 && <>
            <Text style={s.title}>À ta façon, {cleanName(name)}.</Text>
            <Text style={s.description}>Les programmes correspondant à tes priorités apparaissent d’abord. Les classiques et le mode libre restent disponibles.</Text>
            {getProgramsForGoals(goals).map(p => {
              const recommended = goals.some(goal => p.id === `focus-${goal}`);
              const selected = program === p.id;
              return <TouchableOpacity key={p.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setProgram(p.id)} style={[s.choice, selected && s.selected]}>
                <View style={{ flex: 1, gap: 7 }}>
                  {recommended && <Text style={s.recommended}>POUR TES OBJECTIFS</Text>}
                  <Text style={s.choiceTitle}>{p.name}</Text>
                  <Text style={s.small}>{p.daysPerWeek} jours par semaine · {p.days.length} séances types</Text>
                  <Text style={s.small}>{p.description}</Text>
                </View>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected ? COLORS.primary : COLORS.textMuted} />
              </TouchableOpacity>;
            })}
            <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: program === null }} onPress={() => setProgram(null)} style={[s.choice, program === null && s.selected]}>
              <View style={{ flex: 1, gap: 7 }}><Text style={s.choiceTitle}>Entraînement libre</Text><Text style={s.small}>Je choisis mes exercices à chaque séance.</Text></View>
              <Ionicons name={program === null ? 'radio-button-on' : 'radio-button-off'} size={24} color={program === null ? COLORS.primary : COLORS.textMuted} />
            </TouchableOpacity>
          </>}

          {step === 2 && <>
            <Text style={s.title}>{'Dernière étape.\nTon poids corporel.'}</Text>
            <Text style={s.description}>Il sert de charge par défaut pour les exercices au poids du corps. Tu pourras le modifier dans ton profil.</Text>
            <Text style={s.eyebrow}>POIDS CORPOREL</Text>
            <View style={s.weightRow}>
              <TextInput accessibilityLabel={`Poids corporel en ${useKg ? 'kg' : 'lbs'}`} value={weight} onChangeText={setWeight} placeholder={useKg ? '72,5' : '160'} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" inputAccessoryViewID="onboarding-weight" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} style={s.weightInput} />
              <TouchableOpacity accessibilityLabel="Changer l’unité de poids" style={s.unit} onPress={() => { const previous = parseBodyweight(weight, useKg); if (previous !== null) setWeight(String(roundWeight(fromKg(previous, !useKg)))); else if (weight.trim()) setWeight(''); useSettingsStore.getState().setUseKg(!useKg); }}><Text style={s.choiceTitle}>{useKg ? 'kg' : 'lbs'} ↔</Text></TouchableOpacity>
            </View>
            <Text style={s.sectionTitle}>As-tu déjà des données ?</Text>
            {([
              { value: 'none', title: 'Je commence sans historique', description: 'Créer mes premières séances dans GymTracker.' },
              { value: 'excel', title: 'J’ai un historique Excel', description: 'Importer un fichier .xlsx ou .xls après la configuration.' },
              { value: 'backup', title: 'J’ai une ancienne sauvegarde GymTracker', description: 'Restaurer mes séances, mes notes et mes réglages depuis un fichier .json.' },
            ] as const).map(option => <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityState={{ checked: importSource === option.value }} onPress={() => { Keyboard.dismiss(); setImportSource(option.value); }} style={[s.choice, importSource === option.value && s.selected]}>
              <Ionicons name={importSource === option.value ? 'radio-button-on' : 'radio-button-off'} size={26} color={COLORS.primary} />
              <View style={{ flex: 1, gap: 6 }}><Text style={s.choiceTitle}>{option.title}</Text><Text style={s.small}>{option.description}</Text></View>
            </TouchableOpacity>)}
            <TouchableOpacity accessibilityRole="button" style={s.primary} onPress={() => finish()}><Text style={s.primaryLabel}>{importSource === 'excel' ? 'Continuer vers l’import Excel' : importSource === 'backup' ? 'Continuer vers ma sauvegarde' : 'Ouvrir mon accueil'}</Text><Ionicons name="checkmark" size={22} color={COLORS.background} /></TouchableOpacity>
            <TouchableOpacity style={s.later} onPress={() => finish(true)}><Text style={s.small}>Renseigner mon poids plus tard</Text></TouchableOpacity>
            <Text style={s.privacy}>Sans compte · Sans publicité · Données locales</Text>
          </>}
        </ScrollView>
        {step === 1 && <View style={s.fixedFooter}>
          <Text numberOfLines={2} style={s.small}>{program === undefined ? 'Choisis un programme ou le mode libre.' : program === null ? 'Entraînement libre sélectionné' : getProgramsForGoals(goals).find(p => p.id === program)?.name}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: program === undefined }} disabled={program === undefined} onPress={next} style={[s.primary, program === undefined && { opacity: 0.4 }]}><Text style={s.primaryLabel}>Continuer</Text><Ionicons name="arrow-forward" size={20} color={COLORS.background} /></TouchableOpacity>
        </View>}
        <KeyboardDoneAccessory id="onboarding-weight" />
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  fixedFooter: { backgroundColor: COLORS.background, borderTopWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, gap: 4 },
  safe: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 24, paddingBottom: 32, gap: 14 }, brand: { color: COLORS.primary, fontSize: 15, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  progressRow: { flexDirection: 'row', gap: 7, marginBottom: 8 }, progressSegment: { flex: 1, height: 4, borderRadius: 3, backgroundColor: COLORS.cardBorder }, eyebrow: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  title: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: -1 }, sectionTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 16 }, description: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 8 },
  nameInput: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 18, padding: 18, fontSize: 22, fontWeight: '600', color: COLORS.textPrimary },
  choice: { padding: 18, borderRadius: 20, backgroundColor: COLORS.card, borderColor: COLORS.cardBorder, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 16 }, selected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow }, choiceTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' }, small: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 19 }, recommended: { color: COLORS.primary, fontWeight: '800', fontSize: 9, letterSpacing: 1 },
  primary: { backgroundColor: COLORS.primary, borderRadius: 18, minHeight: 56, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 12 }, primaryLabel: { color: COLORS.background, fontSize: 15, fontWeight: '800', flexShrink: 1 }, back: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44 },
  weightRow: { flexDirection: 'row', gap: 12, marginBottom: 20 }, weightInput: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 20, padding: 20, color: COLORS.textPrimary, fontSize: 36, fontWeight: '800' }, unit: { backgroundColor: COLORS.surface, borderRadius: 20, justifyContent: 'center', padding: 18 }, later: { alignItems: 'center', minHeight: 44, justifyContent: 'center' }, privacy: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12 },
});
