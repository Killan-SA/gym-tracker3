import { useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { EXERCISE_CATEGORIES } from '../../constants/exercises';
import { COLORS } from '../../constants/theme';
import { createCustomExercise } from '../../lib/customExercises';
import { Action, Panel, Section } from '../../components/ui';
import { TouchableOpacity } from 'react-native';

export default function NewExerciseScreen() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Autre');
  const saving = useRef(false);
  const save = () => {
    if (saving.current) return;
    saving.current = true;
    try { createCustomExercise(name, category); Keyboard.dismiss(); router.back(); }
    catch (error) { saving.current = false; Alert.alert('Nouvel exercice', error instanceof Error ? error.message : 'Impossible de créer l’exercice.'); }
  };
  return <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <Text style={s.title}>Un exercice à toi.</Text>
      <Text style={s.description}>Ajoute ta machine ou ta variante. Tu la retrouveras dans la bibliothèque et dans le choix des exercices pendant une séance.</Text>
      <Section title="Nom de l’exercice" />
      <Panel><TextInput accessibilityLabel="Nom du nouvel exercice" value={name} onChangeText={setName} placeholder="Ex. Hip thrust à la machine" placeholderTextColor={COLORS.textMuted} maxLength={80} autoCapitalize="sentences" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} style={s.input} /><Text style={s.hint}>{name.length}/80 caractères</Text></Panel>
      <Section title="Groupe musculaire" />
      <View style={s.categories}>{[...EXERCISE_CATEGORIES, 'Autre'].map(cat => <TouchableOpacity key={cat} accessibilityRole="radio" accessibilityState={{ checked: category === cat }} onPress={() => { Keyboard.dismiss(); setCategory(cat); }} style={[s.chip, category === cat && s.selected]}><Text style={{ color: category === cat ? COLORS.primary : COLORS.textSecondary, fontWeight: '600' }}>{cat}</Text></TouchableOpacity>)}</View>
      <View style={{ marginTop: 30 }}><Action title="Créer l’exercice" onPress={save} /></View>
      <Text style={[s.hint, { textAlign: 'center', marginTop: 18 }]}>Enregistré localement · Disponible hors ligne</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 20, paddingBottom: 40 }, title: { color: COLORS.textPrimary, fontSize: 30, fontWeight: '800' }, description: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 12 }, input: { color: COLORS.textPrimary, fontSize: 18, minHeight: 50 }, hint: { color: COLORS.textMuted, fontSize: 12 }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, chip: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.card }, selected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow } });
