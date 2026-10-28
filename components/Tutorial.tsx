import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { BrandMark } from './BrandMark';

const STEPS = [
  { icon: 'home-outline', title: 'Ta séance commence ici.', text: 'L’accueil affiche ton programme et la prochaine séance. Appuie sur Commencer. Tu préfères improviser ? Choisis une séance libre.', hint: 'Tu peux changer de programme dans ton Profil.', preview: 'PROCHAINE SÉANCE', value: 'Commencer ma séance' },
  { icon: 'barbell-outline', title: 'Une série, quelques gestes.', text: 'Ajoute un exercice, saisis la charge et les répétitions, puis valide avec la coche. Le RPE est facultatif. Un appui long sur la coche permet de supprimer une série.', hint: 'Le repos démarre uniquement quand tu appuies sur le bouton de repos. Le bouton Terminé ferme le clavier.', preview: 'EXEMPLE DE SÉRIE', value: '80 kg  ×  8 reps' },
  { icon: 'stats-chart-outline', title: 'Regarde tes progrès.', text: 'L’historique conserve tes séances. Dans Stats, retrouve tes records, tes courbes et le bilan musculaire. Le bilan propose un programme pour les groupes moins travaillés.', hint: 'Tu as déjà un historique ? Importe ton fichier Excel depuis Historique ou Profil.', preview: 'BILAN MUSCULAIRE', value: 'Mes points forts · Mes priorités' },
  { icon: 'person-outline', title: 'Tout s’adapte à toi.', text: 'Dans Profil, modifie ton prénom, ton poids, tes objectifs, l’unité et le thème. Crée aussi tes exercices depuis Profil ou la bibliothèque.', hint: 'Tes données restent sur ton iPhone. Effacer toutes les données relance la configuration et ce guide.', preview: 'TON CARNET D’ENTRAÎNEMENT', value: 'Sans compte · Hors ligne' },
] as const;

export function Tutorial({ visible, onComplete, onDismiss }: { visible: boolean; onComplete: (skipped: boolean) => void; onDismiss?: () => void }) {
  const [step, setStep] = useState(-1);
  const [validated, setValidated] = useState(false);
  useEffect(() => { if (visible) { setStep(-1); setValidated(false); } }, [visible]);
  const data = step >= 0 ? STEPS[step] : null;
  return <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onDismiss={onDismiss} onRequestClose={() => onComplete(true)}>
    <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
      <View style={s.header}><BrandMark size={40} /><TouchableOpacity onPress={() => onComplete(true)} style={s.skip}><Text style={s.muted}>Passer</Text></TouchableOpacity></View>
      <View style={s.icon}><Ionicons name={data?.icon ?? 'sparkles-outline'} size={52} color={COLORS.primary} /></View>
      <Text style={s.eyebrow}>{step < 0 ? 'PREMIERS PAS' : `${step + 1} SUR ${STEPS.length}`}</Text>
      <Text style={s.title}>{data?.title ?? 'On te montre le chemin ?'}</Text>
      <Text style={s.description}>{data?.text ?? 'Un mini guide pour lancer ta première séance, enregistrer tes séries et comprendre tes progrès.'}</Text>
      {data && <View style={s.preview}><Text style={s.eyebrow}>{data.preview}</Text><Text style={s.previewValue}>{data.value}</Text>{step === 1 && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Essayer la validation d’une série, démonstration" onPress={() => setValidated(!validated)} style={[s.demo, validated && { backgroundColor: COLORS.primaryGlow }]}><Ionicons name={validated ? 'checkmark-circle' : 'checkmark-circle-outline'} color={COLORS.primary} size={30} /><Text style={{ color: COLORS.primary, fontWeight: '700' }}>{validated ? 'Série validée !' : 'Essaie la coche'}</Text></TouchableOpacity>}</View>}
      {data && <Text style={s.tip}>{data.hint}</Text>}
      <View style={s.dots}>{STEPS.map((_, i) => <View key={i} style={[s.dot, i === step && { backgroundColor: COLORS.primary, width: 24 }]} />)}</View>
      <TouchableOpacity accessibilityRole="button" style={s.button} onPress={() => { if (step === STEPS.length - 1) onComplete(false); else setStep(step + 1); }}><Text style={s.buttonLabel}>{step < 0 ? 'Me guider' : step === STEPS.length - 1 ? 'Je suis prêt' : 'Suivant'}</Text><Ionicons name="arrow-forward" size={22} color={COLORS.background} /></TouchableOpacity>
      {step > 0 && <TouchableOpacity style={s.back} onPress={() => setStep(step - 1)}><Text style={s.muted}>Précédent</Text></TouchableOpacity>}
      {step < 0 && <TouchableOpacity style={s.back} onPress={() => onComplete(true)}><Text style={s.muted}>Découvrir l’app par moi-même</Text></TouchableOpacity>}
    </ScrollView></SafeAreaView>
  </Modal>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 24, paddingBottom: 40, flexGrow: 1, gap: 18 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { color: COLORS.primary, fontWeight: '900', letterSpacing: 2, fontSize: 14 }, skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, muted: { color: COLORS.textSecondary, fontSize: 13 }, icon: { width: 96, height: 96, borderRadius: 30, backgroundColor: COLORS.primaryGlow, alignItems: 'center', justifyContent: 'center', marginTop: 20 }, eyebrow: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' }, title: { color: COLORS.textPrimary, fontSize: 33, fontWeight: '900', letterSpacing: -1 }, description: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 25 }, preview: { padding: 22, borderRadius: 24, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.card, gap: 16 }, previewValue: { color: COLORS.textPrimary, fontSize: 21, fontWeight: '800' }, tip: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 20 }, demo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 14, padding: 10 }, dots: { flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 10 }, dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: COLORS.cardBorder }, button: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 18, minHeight: 56, borderRadius: 18, backgroundColor: COLORS.primary }, buttonLabel: { color: COLORS.background, fontWeight: '800', fontSize: 15 }, back: { alignItems: 'center', minHeight: 44, justifyContent: 'center' } });
