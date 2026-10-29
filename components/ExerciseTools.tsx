import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { getCustomExercises } from '../lib/queries';
import { getExerciseAlternatives, getExerciseReplacementScore, MAX_REPLACEMENT_SCORE } from '../lib/exerciseAlternatives';
import { getPersistentExerciseNote, replaceSessionExercise, setPersistentExerciseNote, setSessionExerciseNote } from '../lib/sessionFeatures';
import { COLORS } from '../constants/theme';
import type { ExerciseWithSets } from '../types';

export function ExerciseTools({ exercise, onReload, onDelete }: { exercise: ExerciseWithSets; onReload: () => void; onDelete: () => void }) {
  const [page, setPage] = useState<'menu' | 'note' | 'replace' | null>(null);
  const [scope, setScope] = useState<'persistent' | 'session'>('persistent');
  const [note, setNote] = useState('');
  const [visible, setVisible] = useState(true);
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const persistent = getPersistentExerciseNote(exercise.name);
  const openNote = (kind: 'persistent' | 'session' = 'persistent') => {
    setScope(kind); setNote(kind === 'persistent' ? persistent?.note ?? '' : exercise.notes ?? '');
    setVisible(persistent?.show_in_session !== 0); setPage('note');
  };
  const custom = getCustomExercises();
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const choices = all ? [...PREDEFINED_EXERCISES, ...custom].filter(row => normalize(row.name) !== normalize(exercise.name)).map(row => getExerciseReplacementScore(exercise.name, row, custom)) : getExerciseAlternatives(exercise.name, custom);
  const replace = (name: string) => {
    const apply = (mode: 'keep' | 'remaining') => {
      try { replaceSessionExercise(exercise.session_id, exercise.id, name, mode); setPage(null); onReload(); }
      catch (error) { Alert.alert('Remplacement', String(error)); }
    };
    const count = exercise.sets.filter(set => set.reps > 0).length;
    if (!count) { apply('keep'); return; }
    Alert.alert(`${count} série(s) déjà enregistrée(s)`, 'Ces séries restent sur l’exercice d’origine. Le nouvel exercice sera ajouté juste après.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Garder l’exercice et ajouter le nouveau', onPress: () => apply('keep') },
      { text: 'Remplacer uniquement les séries restantes', onPress: () => apply('remaining') },
    ]);
  };
  return <>
    <View style={s.row}><TouchableOpacity accessibilityLabel={`Options pour ${exercise.name}`} onPress={() => setPage('menu')} style={s.button}><Ionicons name="ellipsis-horizontal" color={COLORS.primary} size={23} /></TouchableOpacity><TouchableOpacity style={{ flex: 1, paddingVertical: 10 }} onPress={() => openNote()}><Text numberOfLines={2} style={s.green}>{persistent?.show_in_session && persistent.note ? `📝 ${persistent.note}` : '+ Ajouter une note machine'}</Text></TouchableOpacity></View>
    {!!exercise.notes && <TouchableOpacity onPress={() => openNote('session')}><Text style={s.muted}>Cette séance : {exercise.notes}</Text></TouchableOpacity>}
    <Modal visible={page !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPage(null)}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <View style={s.row}><Text style={s.title}>{page === 'note' ? 'Note pour l’exercice' : page === 'replace' ? 'Remplacer' : 'Options'}</Text><TouchableOpacity accessibilityLabel="Fermer" onPress={() => setPage(null)} style={s.button}><Ionicons name="close" color={COLORS.textPrimary} size={25} /></TouchableOpacity></View>
        <Text style={s.name}>{exercise.name}</Text>
        {page === 'menu' && <>
          <TouchableOpacity style={s.action} onPress={() => { setPage(null); router.push(`/exercises/${encodeURIComponent(exercise.name)}`); }}><Text style={s.text}>Voir la fiche</Text></TouchableOpacity>
          <TouchableOpacity style={s.action} onPress={() => openNote()}><Text style={s.text}>Ajouter / modifier une note</Text></TouchableOpacity>
          <TouchableOpacity style={s.action} onPress={() => { setAll(false); setQuery(''); setPage('replace'); }}><Text style={s.text}>Remplacer l’exercice</Text></TouchableOpacity>
          <TouchableOpacity style={s.action} onPress={() => { setPage(null); onDelete(); }}><Text style={{ color: COLORS.danger }}>Supprimer l’exercice</Text></TouchableOpacity>
        </>}
        {page === 'note' && <>
          <View style={s.row}>{(['persistent', 'session'] as const).map(kind => <TouchableOpacity key={kind} style={[s.action, { flex: 1 }]} onPress={() => openNote(kind)}><Text style={scope === kind ? s.green : s.muted}>{kind === 'persistent' ? 'Note machine' : 'Cette séance'}</Text></TouchableOpacity>)}</View>
          <Text style={s.muted}>{scope === 'persistent' ? 'Retrouve cette configuration à chaque séance.' : 'Cette note appartient uniquement à cette séance.'}</Text>
          <TextInput accessibilityLabel="Texte de la note" style={s.input} multiline maxLength={4000} value={note} onChangeText={setNote} placeholder="Siège cran 4, prise neutre, banc à 30°…" placeholderTextColor={COLORS.textMuted} textAlignVertical="top" />
          {scope === 'persistent' && <View style={s.row}><Text style={[s.text, { flex: 1 }]}>Afficher pendant mes séances</Text><Switch value={visible} onValueChange={setVisible} trackColor={{ true: COLORS.primary }} /></View>}
          <TouchableOpacity style={s.action} onPress={() => { try { if (scope === 'persistent') setPersistentExerciseNote(exercise.name, note, visible); else setSessionExerciseNote(exercise.id, note); setPage(null); onReload(); } catch (error) { Alert.alert('Note', String(error)); } }}><Text style={s.green}>Enregistrer</Text></TouchableOpacity>
          <TouchableOpacity style={s.action} onPress={() => { if (scope === 'persistent') setPersistentExerciseNote(exercise.name, ''); else setSessionExerciseNote(exercise.id, ''); setPage(null); onReload(); }}><Text style={{ color: COLORS.danger }}>Supprimer la note</Text></TouchableOpacity>
        </>}
        {page === 'replace' && <>
          <Text style={s.muted}>{all ? 'Tous les exercices' : 'Suggestions selon les muscles et le mouvement'}</Text>
          <Text style={s.muted}>Score sur {MAX_REPLACEMENT_SCORE} : mouvement +5, muscle principal +4, catégorie +2, muscle secondaire +1. Il indique une proximité entre exercices.</Text>
          <TextInput accessibilityLabel="Rechercher un remplacement" style={[s.input, { minHeight: 48 }]} value={query} onChangeText={setQuery} placeholder="Rechercher…" placeholderTextColor={COLORS.textMuted} />
          {choices.filter(row => normalize(row.name).includes(normalize(query))).map(row => <TouchableOpacity key={row.name} style={s.action} onPress={() => replace(row.name)}><View style={s.row}><Text style={[s.text, { flex: 1 }]}>{row.name}</Text><Text style={row.score !== null && row.score >= 9 ? s.green : s.muted}>{row.score === null ? 'Score indisponible' : `${row.score} / ${MAX_REPLACEMENT_SCORE}`}</Text></View><Text style={s.muted}>{row.category} · {row.reason}</Text><Text style={s.muted}>{row.scoreDetails.length ? row.scoreDetails.join(' · ') : row.score === null ? 'Les métadonnées de cet exercice sont insuffisantes.' : 'Aucun critère commun renseigné.'}</Text></TouchableOpacity>)}
          {!choices.length && <Text style={s.muted}>Pas de suggestion pour cet exercice. Consulte la bibliothèque.</Text>}
          <TouchableOpacity style={s.action} onPress={() => { setAll(!all); setQuery(''); }}><Text style={s.green}>{all ? 'Revenir aux suggestions' : 'Voir tous les exercices'}</Text></TouchableOpacity>
        </>}
      </ScrollView></KeyboardAvoidingView>
    </Modal>
  </>;
}
const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 24, gap: 16, paddingBottom: 60 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' }, button: { padding: 10, minWidth: 44, minHeight: 44 }, title: { fontSize: 25, fontWeight: '800', color: COLORS.textPrimary }, name: { fontSize: 19, fontWeight: '700', color: COLORS.textPrimary }, text: { color: COLORS.textPrimary, fontSize: 15 }, green: { color: COLORS.primary, fontSize: 14 }, muted: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 19 }, action: { backgroundColor: COLORS.card, padding: 18, borderRadius: 16, gap: 8 }, input: { backgroundColor: COLORS.card, color: COLORS.textPrimary, borderRadius: 16, padding: 16, minHeight: 140, fontSize: 16 } });
