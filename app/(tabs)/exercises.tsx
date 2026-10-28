import { useCallback, useState } from 'react';
import { FlatList, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EXERCISE_CATEGORIES, PREDEFINED_EXERCISES, getExerciseCategory } from '../../constants/exercises';
import type { ExerciseEntry } from '../../constants/exercises';
import { getAllExerciseNames, getCustomExercises } from '../../lib/queries';
import { getFavorites, toggleFavorite } from '../../lib/redesign';
import { ExerciseVisual } from '../../components/ExerciseVisual';
import { COLORS } from '../../constants/theme';
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export default function ExercisesScreen() {
  const [entries, setEntries] = useState<ExerciseEntry[]>(PREDEFINED_EXERCISES);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tous');
  useFocusEffect(useCallback(() => {
    const all = new Map(PREDEFINED_EXERCISES.map(e => [e.name, e]));
    for (const e of getCustomExercises()) all.set(e.name, e);
    for (const name of getAllExerciseNames()) if (!all.has(name)) all.set(name, { name, category: getExerciseCategory(name) });
    setEntries([...all.values()]); setFavorites(getFavorites());
  }, []));
  const filtered = entries.filter(e => normalize(e.name).includes(normalize(query)) && (category === 'Tous' || category === 'Favoris' ? category !== 'Favoris' || favorites.includes(e.name) : e.category === category));
  return <View style={s.container}>
    <TouchableOpacity accessibilityRole="button" onPress={() => { setQuery(''); setCategory('Tous'); router.push('/exercises/new'); }} style={{ marginHorizontal: 20, marginTop: 12, minHeight: 50, borderRadius: 16, paddingHorizontal: 16, backgroundColor: COLORS.primaryGlow, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name="add-circle" size={22} color={COLORS.primary} /><Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}>Ajouter un exercice</Text></TouchableOpacity>
    <View style={s.search}><Ionicons name="search" size={20} color={COLORS.textMuted} /><TextInput accessibilityLabel="Rechercher un exercice" placeholder="Rechercher un exercice" placeholderTextColor={COLORS.textMuted} value={query} onChangeText={setQuery} style={s.input} autoCorrect={false} /></View>
    <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{['Tous', 'Favoris', ...EXERCISE_CATEGORIES, 'Personnalisé', 'Autre'].map(cat => <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[s.chip, cat === category && s.active]}><Text style={[s.chipText, cat === category && { color: COLORS.primary }]}>{cat === 'Favoris' ? '★ Favoris' : cat}</Text></TouchableOpacity>)}</ScrollView></View>
    <Text style={s.count}>{filtered.length} exercices · Disponibles hors ligne</Text>
    <FlatList data={filtered} keyExtractor={e => e.name} contentContainerStyle={s.list} ListEmptyComponent={<Text style={s.empty}>{category === 'Favoris' ? 'Ajoute tes exercices préférés avec l’étoile.' : 'Aucun exercice trouvé.'}</Text>} renderItem={({ item }) => <View style={s.card}><TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/exercises/${encodeURIComponent(item.name)}`)} style={s.exercise}><ExerciseVisual name={item.name} /><View style={{ flex: 1, gap: 7 }}><Text style={s.name}>{item.name}</Text><Text style={s.category}>{item.category}</Text></View></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel={`${favorites.includes(item.name) ? 'Retirer' : 'Ajouter'} ${item.name} ${favorites.includes(item.name) ? 'des' : 'aux'} favoris`} onPress={() => setFavorites(toggleFavorite(item.name))} style={{ padding: 12 }}><Ionicons name={favorites.includes(item.name) ? 'star' : 'star-outline'} size={22} color={favorites.includes(item.name) ? COLORS.warning : COLORS.textMuted} /></TouchableOpacity></View>} />
  </View>;
}
const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, search: { margin: 20, marginBottom: 16, height: 52, backgroundColor: COLORS.surface, borderColor: COLORS.cardBorder, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }, input: { flex: 1, color: COLORS.textPrimary, fontSize: 15 }, filters: { gap: 8, paddingHorizontal: 20 }, chip: { paddingHorizontal: 17, paddingVertical: 12, borderRadius: 30, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder }, active: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary }, chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }, count: { color: COLORS.textMuted, fontSize: 12, margin: 20, marginBottom: 12 }, list: { paddingHorizontal: 20, paddingBottom: 30, gap: 10 }, card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 20, padding: 10, borderWidth: 1, borderColor: COLORS.cardBorder }, exercise: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }, name: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 15 }, category: { color: COLORS.textSecondary, fontSize: 12 }, empty: { color: COLORS.textSecondary, textAlign: 'center', paddingTop: 30 } });
