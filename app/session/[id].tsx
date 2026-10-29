import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Modal,
  SectionList,
  ScrollView,
  Vibration,
  Animated,
} from 'react-native';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import DraggableFlatList from '../../components/DraggableExerciseList';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ExerciseTools } from '../../components/ExerciseTools';
import { reorderExercises } from '../../lib/sessionFeatures';
import { useRestTimerStore } from '../../store/restTimerStore';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardDoneAccessory } from '../../components/KeyboardDoneAccessory';
import { PyramidControls } from '../../components/PyramidControls';
import { getPyramidPlan, parsePyramidSet } from '../../lib/pyramid';
import {
  getSessionWithExercises,
  addExerciseToSession,
  addSet,
  deleteSet,
  deleteExercise,
  getExerciseNames,
  getLastSetForExercise,
  updateSet,
  getUserBodyweight,
  getCustomExercises,
  addCustomExercise,
  getExercisePersonalRecord,
} from '../../lib/queries';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import {
  PREDEFINED_EXERCISES,
  EXERCISE_CATEGORIES,
  BODYWEIGHT_EXERCISES,
  searchExercises,
} from '../../constants/exercises';
import type { ExerciseEntry } from '../../constants/exercises';
import { useSettingsStore } from '../../lib/settingsStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseVisual } from '../../components/ExerciseVisual';
import { getPreviousPerformance, getSessionTitle, finishSession } from '../../lib/redesign';
import { getUserSetting, setUserSetting } from '../../lib/database';
import { formatWeight, fromKg, toKg, roundWeight, unitLabel } from '../../lib/units';
import { getExerciseCategory } from '../../constants/exercises';
import type { ExerciseWithSets, Set } from '../../types';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [customExercises, setCustomExercises] = useState<ExerciseEntry[]>([]);
  const [prCelebration, setPrCelebration] = useState<{ exercise: string; weight: number } | null>(null);
  // Créer un exercice custom
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExCat, setNewExCat] = useState<string>('Biceps');

  // ── Chrono de repos entre les séries ──
  const [restDuration, setRestDuration] = useState(90); // durée par défaut, mémorisée pour la séance
  const rest = useRestTimerStore(state => state.timer);
  const [lastValidated, setLastValidated] = useState<{ exercise: ExerciseWithSets; set: Set } | null>(null);
  const openingRest = useRef(false);
  const sessionStarted = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const insets = useSafeAreaInsets();
  const stopRestTimer = useRestTimerStore(state => state.stop);
  const openRest = (exercise?: ExerciseWithSets, set?: Set) => {
    if (openingRest.current || !id) return;
    openingRest.current = true;
    const targetExercise = exercise ?? lastValidated?.exercise;
    const targetSet = set ?? lastValidated?.set;
    useRestTimerStore.getState().start({ duration: restDuration, sessionId: id, exerciseId: targetExercise?.id ?? '', exerciseName: targetExercise?.name ?? 'Séance', setNumber: targetSet?.set_number ?? 0, weight: targetSet?.weight ?? 0, reps: targetSet?.reps ?? 0 });
    router.push('/rest');
    setTimeout(() => { openingRest.current = false; }, 800);
  };
  useEffect(() => {
    const elapsedInterval = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStarted.current) / 1000)), 1000);
    return () => clearInterval(elapsedInterval);
  }, []);

  const loadSession = useCallback(() => {
    if (!id) return;
    const session = getSessionWithExercises(id);
    if (session) { setExercises(session.exercises); sessionStarted.current = new Date(session.created_at).getTime(); }
    setRecentNames(getExerciseNames().slice(0, 8));
    setCustomExercises(getCustomExercises());
  }, [id]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Résultats de recherche (prédéfinis + custom)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const base = searchExercises(searchQuery);
    const customMatches = customExercises.filter(
      (ce) =>
        ce.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !base.some((b) => b.name === ce.name)
    );
    return [...base, ...customMatches];
  }, [searchQuery, customExercises]);

  // Sections pour la SectionList (prédéfinis + custom fusionnés)
  const sections = useMemo(() => {
    const s: { title: string; data: ExerciseEntry[] }[] = [];
    if (recentNames.length > 0) {
      s.push({ title: 'Récents', data: recentNames.map((n) => ({ name: n, category: 'Récents' })) });
    }
    for (const cat of EXERCISE_CATEGORIES) {
      const predefined = PREDEFINED_EXERCISES.filter((e) => e.category === cat);
      const custom = customExercises.filter((e) => e.category === cat);
      const items = [...predefined, ...custom];
      if (items.length > 0) s.push({ title: cat, data: items });
    }
    const autre = customExercises.filter((e) => !EXERCISE_CATEGORIES.includes(e.category as any));
    if (autre.length > 0) s.push({ title: 'Mes exercices', data: autre });
    return s;
  }, [recentNames, customExercises]);

  const handleSelectExercise = (name: string) => {
    if (!id || !name.trim()) return;
    addExerciseToSession(id, name.trim());
    setSearchQuery('');
    setShowAddExercise(false);
    setShowCreateExercise(false);
    loadSession();
  };

  const handleAddSet = (exerciseId: string, exerciseName: string) => {
    const last = getLastSetForExercise(exerciseId);
    const previous = id ? getPreviousPerformance(exerciseName, id) : null;
    let defaultWeight = last?.weight ?? previous?.weight ?? 0;

    // Poids du corps pour Pompes / Traction : auto-fill si pas encore de série
    if (defaultWeight === 0 && BODYWEIGHT_EXERCISES.includes(exerciseName)) {
      const bw = getUserBodyweight();
      if (bw > 0) {
        defaultWeight = bw;
      } else {
        // Demander le poids corporel si non configuré
        Alert.alert(
          '⚖️ Exercice au poids du corps',
          'Pompes et Tractions utilisent ton poids corporel comme charge. Configure-le dans Réglages → Mon profil.',
          [{ text: 'OK' }]
        );
      }
    }

    addSet(exerciseId, defaultWeight, last?.reps ?? previous?.reps ?? 0, null);
    loadSession();
    // Le chronomètre ne démarre plus automatiquement :
    // l'utilisateur le déclenche manuellement via le bouton "Temps de repos" entre chaque série.
  };

  const handleCreateExercise = () => {
    if (!newExName.trim()) {
      Alert.alert('Nom requis', 'Entre un nom pour l\'exercice.');
      return;
    }
    addCustomExercise(newExName.trim(), newExCat);
    const name = newExName.trim();
    setNewExName('');
    setShowCreateExercise(false);
    // Ajoute directement à la séance
    handleSelectExercise(name);
  };

  const handleNewRecord = useCallback((exerciseName: string, weight: number) => {
    Vibration.vibrate([0, 100, 50, 100, 50, 200]);
    setPrCelebration({ exercise: exerciseName, weight });
  }, []);

  const handleDeleteSet = (setId: string) => {
    Alert.alert('Supprimer', 'Supprimer cette série ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { deleteSet(setId); loadSession(); } },
    ]);
  };

  const handleDeleteExercise = (exerciseId: string, name: string) => {
    Alert.alert('Supprimer l\'exercice', `Supprimer "${name}" et toutes ses séries ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { deleteExercise(exerciseId); loadSession(); } },
    ]);
  };

  const handleFinish = () => {
    Alert.alert(
      'Terminer la séance',
      exercises.length === 0
        ? 'Tu n\'as enregistré aucun exercice. Terminer quand même ?'
        : `Séance terminée avec ${exercises.length} exercice(s). 💪`,
      [
        { text: 'Continuer la séance', style: 'cancel' },
        {
          text: 'Terminer ✅',
          onPress: () => {
            if (id) finishSession(id, elapsed);
            stopRestTimer();
            router.replace(`/history/${id}`);
          },
        },
      ]
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}><KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {prCelebration && (
        <PRCelebrationBanner
          data={prCelebration}
          onDone={() => setPrCelebration(null)}
        />
      )}
      <DraggableFlatList
        data={exercises}
        onDragBegin={() => { Keyboard.dismiss(); Vibration.vibrate(30); }}
        onDragEnd={({ data }) => { try { reorderExercises(id!, data.map(row => row.id)); setExercises(data); } catch (error) { Alert.alert('Ordre des exercices', String(error)); loadSession(); } }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 50 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        renderItem={({ item, dragHandle, isActive }) => (
          <ExerciseCard
            exercise={item}
            onAddSet={() => handleAddSet(item.id, item.name)}
            onDeleteSet={handleDeleteSet}
            onDeleteExercise={() => handleDeleteExercise(item.id, item.name)}
            onReload={loadSession}
            onNewRecord={handleNewRecord}
            dragHandle={dragHandle}
            isDragging={isActive}
            onValidated={(set) => { setLastValidated({ exercise: item, set }); if (getUserSetting('auto_rest') === '1') openRest(item, set); }}
          />
        )}
        ListHeaderComponent={<><View style={styles.sessionHeader}><View><Text style={styles.sessionLabel}>{getSessionTitle(id ?? '')}</Text><Text style={styles.sessionMeta}>{exercises.length} exercices · {exercises.reduce((n, e) => n + e.sets.length, 0)} séries</Text></View><Text style={styles.elapsed}>{Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}</Text></View><View style={{ gap: 12, marginBottom: 18 }}><TouchableOpacity onPress={() => openRest()} style={cardStyles.restBtn}><Text style={cardStyles.restBtnText}>{lastValidated ? 'Série validée ✓ · ' : ''}Repos {restDuration} s →</Text></TouchableOpacity><View style={{ flexDirection: 'row', gap: 14 }}>{[60, 90, 120, 180].map(duration => <TouchableOpacity key={duration} onPress={() => setRestDuration(duration)} style={cardStyles.presetPill}><Text style={{ color: duration === restDuration ? COLORS.primary : COLORS.textSecondary }}>{duration} s</Text></TouchableOpacity>)}</View>{rest?.sessionId === id && <TouchableOpacity onPress={() => router.push('/rest')}><Text style={{ color: COLORS.primary }}>Reprendre le repos en cours →</Text></TouchableOpacity>}</View>{exercises.length === 0 && <EmptySession />}</>}
        ListFooterComponent={
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowAddExercise(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color={COLORS.primary} />
              <Text style={styles.addExerciseText}>Ajouter un exercice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinish}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={22} color={COLORS.background} />
              <Text style={styles.finishButtonText}>Terminer la séance</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── Modal sélecteur d'exercice ─────────────────────── */}
      <Modal
        visible={showAddExercise}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setSearchQuery(''); setShowAddExercise(false); }}
      >
        <View style={pickerStyles.container}>
          {/* En-tête */}
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Choisir un exercice</Text>
            <TouchableOpacity
              onPress={() => { setSearchQuery(''); setShowAddExercise(false); }}
              style={pickerStyles.closeBtn}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View style={pickerStyles.searchRow}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={pickerStyles.searchInput}
              placeholder="Rechercher un exercice..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Liste par catégories ou formulaire création */}
          {showCreateExercise ? (
            /* ── Formulaire créer exercice ── */
            <ScrollView
              contentContainerStyle={pickerStyles.createForm}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={pickerStyles.backBtn}
                onPress={() => { setShowCreateExercise(false); setNewExName(''); }}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
                <Text style={pickerStyles.backBtnText}>Retour à la liste</Text>
              </TouchableOpacity>

              <Text style={pickerStyles.createLabel}>Nom de la machine / exercice</Text>
              <TextInput
                style={pickerStyles.createInput}
                placeholder="Ex : Leg curl couché"
                placeholderTextColor={COLORS.textMuted}
                value={newExName}
                onChangeText={setNewExName}
                autoFocus
                autoCorrect={false}
              />

              <Text style={pickerStyles.createLabel}>Catégorie</Text>
              <View style={pickerStyles.catGrid}>
                {([...EXERCISE_CATEGORIES, 'Autre'] as string[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      pickerStyles.catChip,
                      newExCat === cat && pickerStyles.catChipActive,
                    ]}
                    onPress={() => setNewExCat(cat)}
                  >
                    <Text style={[
                      pickerStyles.catChipText,
                      newExCat === cat && pickerStyles.catChipTextActive,
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={pickerStyles.createSaveBtn}
                onPress={handleCreateExercise}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={pickerStyles.createSaveBtnText}>
                  Créer et ajouter à la séance
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : searchQuery.trim().length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={pickerStyles.emptySearch}>
                  <Text style={pickerStyles.emptyText}>Aucun résultat</Text>
                  <TouchableOpacity
                    style={pickerStyles.customBtn}
                    onPress={() => handleSelectExercise(searchQuery.trim())}
                  >
                    <Ionicons name="add-circle" size={18} color={COLORS.primary} />
                    <Text style={pickerStyles.customBtnText}>
                      Ajouter « {searchQuery.trim()} »
                    </Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={pickerStyles.exerciseRow}
                  onPress={() => handleSelectExercise(item.name)}
                >
                  <View style={pickerStyles.categoryBadge}>
                    <Text style={pickerStyles.categoryBadgeText}>{item.category}</Text>
                  </View>
                  <Text style={pickerStyles.exerciseName}>{item.name}</Text>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            />
          ) : (
            /* Liste par catégories */
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled
              contentContainerStyle={{ paddingBottom: 40 }}
              renderSectionHeader={({ section }) => (
                <View style={pickerStyles.sectionHeader}>
                  <Text style={pickerStyles.sectionTitle}>{section.title}</Text>
                </View>
              )}
              renderItem={({ item, section }) => (
                <TouchableOpacity
                  style={pickerStyles.exerciseRow}
                  onPress={() => handleSelectExercise(item.name)}
                >
                  {section.title === 'Récents' && (
                    <Ionicons name="time-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[pickerStyles.exerciseName, { flex: 1 }]}>{item.name}</Text>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={pickerStyles.createExBtn}
                  onPress={() => setShowCreateExercise(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                  <Text style={pickerStyles.createExBtnText}>Créer un exercice / nouvelle machine</Text>
                </TouchableOpacity>
              }
            />
          )}
        </View>
      </Modal>
      <KeyboardDoneAccessory id="session-set-input" />
    </KeyboardAvoidingView></GestureHandlerRootView>
  );
}

// ============================================================
// ExerciseCard
// ============================================================

function ExerciseCard({
  exercise,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
  onReload,
  onNewRecord,
  dragHandle,
  isDragging,
  onValidated,
}: {
  exercise: ExerciseWithSets;
  onAddSet: () => void;
  onDeleteSet: (id: string) => void;
  onDeleteExercise: () => void;
  onReload: () => void;
  onNewRecord: (exerciseName: string, weight: number) => void;
  dragHandle: React.ReactNode;
  isDragging: boolean;
  onValidated: (set: Set) => void;
}) {
  // Record connu AVANT toute modification dans cette carte (recalculé à chaque reload)
  const recordSoFar = getExercisePersonalRecord(exercise.name);
  const useKg = useSettingsStore(state => state.useKg);
  const previous = useMemo(() => getPreviousPerformance(exercise.name, exercise.session_id), [exercise.name, exercise.session_id]);
  const increaseWeight = previous && previous.reps >= 12 && previous.weight > 0 && !BODYWEIGHT_EXERCISES.includes(exercise.name);
  const target = previous ? { weight: increaseWeight ? previous.weight + 2.5 : previous.weight, reps: increaseWeight ? 8 : previous.reps + 1 } : null;
  const isBodyweight = BODYWEIGHT_EXERCISES.includes(exercise.name);
  const pyramidEnabled = isBodyweight && (getPyramidPlan(exercise.id)?.enabled ?? false);

  return (
    <View style={[cardStyles.container, isDragging && { opacity: 0.8, borderColor: COLORS.primary }]}>
      <View style={cardStyles.header}>
        {dragHandle}
        <Text style={cardStyles.name}>{exercise.name}</Text>

      </View>

      <Text style={cardStyles.category}>{getExerciseCategory(exercise.name)}</Text>
      <ExerciseTools exercise={exercise} onReload={onReload} onDelete={onDeleteExercise} />
      <ExerciseVisual name={exercise.name} large />
      <View style={cardStyles.performance}><View style={{ flex: 1 }}><Text style={cardStyles.performanceLabel}>DERNIÈRE FOIS</Text><Text style={cardStyles.performanceValue}>{previous ? formatWeight(previous.weight, useKg) + ' × ' + previous.reps : 'Première séance'}</Text></View><View style={{ flex: 1 }}><Text style={cardStyles.performanceLabel}>OBJECTIF SUGGÉRÉ</Text><Text style={[cardStyles.performanceValue, { color: COLORS.primary }]}>{target ? formatWeight(target.weight, useKg) + ' × ' + target.reps : 'Trouve ton rythme'}</Text></View></View>
      {isBodyweight && <PyramidControls exerciseId={exercise.id} onReload={onReload} />}
      <View style={cardStyles.columnsHeader}>
        <Text style={[cardStyles.colLabel, { flex: 0, width: 36 }]}>Série</Text>
        <Text style={cardStyles.colLabel}>{unitLabel(useKg)}</Text>
        <Text style={cardStyles.colLabel}>Reps</Text>
        <Text style={cardStyles.colLabelRpe}>RPE</Text>
        <Text style={[cardStyles.colLabelRpe, { width: 44 }]}>OK</Text>
      </View>

      {exercise.sets.map((set, setIndex) => (
        <View key={set.id}>
          {parsePyramidSet(set.notes) && <Text style={{ color: COLORS.primary, fontSize: 10, marginTop: 12, marginBottom: 5 }}>PYRAMIDE · PALIER {parsePyramidSet(set.notes)!.index + 1} · OBJECTIF {parsePyramidSet(set.notes)!.targetReps} REPS</Text>}
          <SetRow
            set={set}
            targetReps={parsePyramidSet(set.notes)?.targetReps}
            onValidated={onValidated}
            personalRecord={recordSoFar}
            onDelete={() => onDeleteSet(set.id)}
            onReload={onReload}
            onNewRecord={(weight) => onNewRecord(exercise.name, weight)}
          />

        </View>
      ))}


      {exercise.sets.length === 0 && !pyramidEnabled && (
        <Text style={cardStyles.noSets}>Ajoute une première série 👇</Text>
      )}

      {!pyramidEnabled && <TouchableOpacity style={cardStyles.addSetButton} onPress={onAddSet}>
        <Ionicons name="add" size={18} color={COLORS.primary} />
        <Text style={cardStyles.addSetText}>Ajouter une série</Text>
      </TouchableOpacity>}
    </View>
  );
}

// ============================================================
// SetRow
// ============================================================

function SetRow({ set, personalRecord, onDelete, onReload, onNewRecord, targetReps, onValidated }: {
  set: Set; personalRecord: number; onDelete: () => void; onReload: () => void; onNewRecord: (weight: number) => void; targetReps?: number; onValidated: (set: Set) => void;
}) {
  const useKg = useSettingsStore(state => state.useKg);
  const [weight, setWeight] = useState(set.weight > 0 ? String(roundWeight(fromKg(set.weight, useKg))) : '');
  const [reps, setReps] = useState(set.reps > 0 ? String(set.reps) : '');
  const [rpe, setRpe] = useState(set.rpe != null ? String(set.rpe) : '');
  const [confirmed, setConfirmed] = useState(() => getUserSetting('set_confirmed:' + set.id) === '1');
  const saved = useRef({ weight: set.weight, reps: set.reps, rpe: set.rpe });
  const previousUnit = useRef(useKg);
  useEffect(() => {
    if (previousUnit.current !== useKg) { setWeight(saved.current.weight > 0 ? String(roundWeight(fromKg(saved.current.weight, useKg))) : ''); previousUnit.current = useKg; }
  }, [useKg]);
  const save = (validate = false) => {
    const entered = Number(weight.replace(',', '.'));
    const repetitions = validate && reps.trim() === '' && targetReps ? targetReps : Number(reps);
    const effort = rpe.trim() === '' ? null : Number(rpe.replace(',', '.'));
    if (!Number.isFinite(entered) || entered < 0 || !Number.isInteger(repetitions) || repetitions < 0 || (effort !== null && (!Number.isFinite(effort) || effort < 1 || effort > 10)) || (validate && repetitions === 0)) {
      Alert.alert('Série invalide', 'Entre une charge positive ou nulle, des répétitions entières et, si renseigné, un RPE entre 1 et 10.'); return;
    }
    // Preserve the exact stored kg when an unchanged rounded lbs field loses focus.
    const unchangedWeight = entered === roundWeight(fromKg(saved.current.weight, useKg));
    const kg = unchangedWeight ? saved.current.weight : toKg(entered, useKg);
    const changed = kg !== saved.current.weight || repetitions !== saved.current.reps || effort !== saved.current.rpe;
    if (changed) { updateSet(set.id, kg, repetitions, effort); saved.current = { weight: kg, reps: repetitions, rpe: effort }; if (kg > personalRecord && repetitions > 0) onNewRecord(kg); }
    if (validate) { setReps(String(repetitions)); setConfirmed(true); setUserSetting('set_confirmed:' + set.id, '1'); Vibration.vibrate(35); }
    if (changed || validate) onReload();
    if (validate && !confirmed) onValidated({ ...set, weight: kg, reps: repetitions, rpe: effort });
  };
  const invalidate = () => { if (confirmed) { setConfirmed(false); setUserSetting('set_confirmed:' + set.id, '0'); } };
  return <View style={[setRowStyles.row, confirmed && { backgroundColor: COLORS.primaryGlow, borderRadius: 12 }]}>
    <View style={setRowStyles.setNumberContainer}><Text style={setRowStyles.setNumber}>{set.set_number}</Text></View>
    <TextInput inputAccessoryViewID="session-set-input" accessibilityLabel={'Charge série ' + set.set_number + ' en ' + unitLabel(useKg)} style={setRowStyles.input} value={weight} onChangeText={v => { setWeight(v); invalidate(); }} onBlur={() => save()} keyboardType="decimal-pad" selectTextOnFocus placeholder="0" placeholderTextColor={COLORS.textMuted} />
    <TextInput inputAccessoryViewID="session-set-input" accessibilityLabel={'Répétitions série ' + set.set_number + (targetReps ? ', objectif ' + targetReps : '')} style={setRowStyles.input} value={reps} onChangeText={v => { setReps(v); invalidate(); }} onBlur={() => save()} keyboardType="number-pad" selectTextOnFocus placeholder={targetReps ? String(targetReps) : '0'} placeholderTextColor={COLORS.textMuted} />
    <TextInput inputAccessoryViewID="session-set-input" accessibilityLabel={'RPE série ' + set.set_number} style={setRowStyles.rpeInput} value={rpe} onChangeText={v => { setRpe(v); invalidate(); }} onBlur={() => save()} keyboardType="decimal-pad" selectTextOnFocus placeholder="—" placeholderTextColor={COLORS.textMuted} maxLength={4} />
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Valider la série. Appui long pour supprimer." accessibilityState={{ selected: confirmed }} onPress={() => save(true)} onLongPress={onDelete} style={setRowStyles.deleteButton}><Ionicons name={confirmed ? 'checkmark-circle' : 'checkmark-circle-outline'} size={28} color={confirmed ? COLORS.primary : COLORS.textMuted} /></TouchableOpacity>
  </View>;
}

// ============================================================
// PRCelebrationBanner — bannière "Nouveau record !"
// ============================================================

function PRCelebrationBanner({
  data,
  onDone,
}: {
  data: { exercise: string; weight: number };
  onDone: () => void;
}) {
  const useKg = useSettingsStore(state => state.useKg);
  const translateY = useRef(new Animated.Value(-100)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 6 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }).start(onDone);
    }, 2600);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        prStyles.container,
        { transform: [{ translateY }, { scale }] },
      ]}
    >
      <Text style={prStyles.emoji}>🎉</Text>
      <View style={{ flex: 1 }}>
        <Text style={prStyles.title}>Nouveau record !</Text>
        <Text style={prStyles.subtitle}>
          {data.exercise} · {formatWeight(data.weight, useKg)}
        </Text>
      </View>
      <Text style={prStyles.emoji}>🏆</Text>
    </Animated.View>
  );
}

function EmptySession() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>🏋️</Text>
      <Text style={emptyStyles.text}>Commence par ajouter ton premier exercice !</Text>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginBottom: 24, gap: 12 },
  sessionLabel: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '900' },
  sessionMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
  elapsed: { color: COLORS.primary, fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  listContent: { padding: SPACING.base, paddingBottom: 120 },
  footer: { gap: SPACING.md, marginTop: SPACING.lg, paddingBottom: SPACING.xl },
  addExerciseButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, padding: SPACING.base, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  addExerciseText: { fontSize: FONTS.base, fontWeight: FONTS.semibold, color: COLORS.primary },
  finishButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, padding: SPACING.base, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.success, ...SHADOWS.card,
  },
  finishButtonText: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.background },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.md, paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator,
  },
  name: { flex: 1, fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  category: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 16 },
  performance: { flexDirection: 'row', paddingVertical: 16, marginBottom: 18, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder, gap: 12 },
  performanceLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  performanceValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  columnsHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm, paddingHorizontal: 2,
  },
  colLabel: {
    flex: 1, fontSize: FONTS.xs, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: FONTS.medium,
  },
  colLabelRpe: {
    width: 44, fontSize: FONTS.xs, color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: FONTS.medium,
    textAlign: 'center',
  },
  noSets: {
    fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center',
    paddingVertical: SPACING.md, fontStyle: 'italic',
  },
  addSetButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.sm, marginTop: SPACING.sm,
  },
  addSetText: { fontSize: FONTS.sm, fontWeight: FONTS.medium, color: COLORS.primary },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
    marginBottom: 2,
  },
  restBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  restBtnActive: {
    backgroundColor: COLORS.warning + '20',
    borderColor: COLORS.warning,
  },
  restBtnText: {
    fontSize: FONTS.xs,
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
  },
  presetPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  presetPill: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  presetPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  presetPillText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },
  presetPillTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.bold,
  },
});

const setRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: SPACING.xs,
  },
  setNumberContainer: {
    width: 28, height: 32, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryGlow, alignItems: 'center', justifyContent: 'center',
  },
  setNumber: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primary },
  input: {
    flex: 1, height: 48, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, fontSize: 21, fontWeight: FONTS.bold,
    color: COLORS.textPrimary, textAlign: 'center',
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  rpeInput: {
    width: 44, height: 48, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    fontSize: FONTS.md, fontWeight: FONTS.semibold,
    color: COLORS.warning, textAlign: 'center',
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  deleteButton: { width: 44, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
});

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.base, paddingTop: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator,
  },
  title: { fontSize: FONTS.xl, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  closeBtn: { padding: SPACING.xs },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    margin: SPACING.base, backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  searchInput: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator,
  },
  sectionTitle: {
    fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator,
  },
  exerciseName: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary },
  categoryBadge: {
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  categoryBadgeText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.medium },
  emptySearch: { padding: SPACING.xl, alignItems: 'center', gap: SPACING.lg },
  emptyText: { fontSize: FONTS.base, color: COLORS.textMuted },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primaryGlow, padding: SPACING.base,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary,
  },
  customBtnText: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: FONTS.semibold },

  // Bouton "Créer un exercice" en pied de liste
  createExBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, margin: SPACING.base, padding: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow,
  },
  createExBtnText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semibold },

  // Formulaire création
  createForm: { padding: SPACING.base, gap: SPACING.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  backBtnText: { fontSize: FONTS.sm, color: COLORS.primary },
  createLabel: {
    fontSize: FONTS.sm, fontWeight: FONTS.semibold,
    color: COLORS.textSecondary, marginBottom: SPACING.xs,
  },
  createInput: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    color: COLORS.textPrimary, fontSize: FONTS.base,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  catChip: {
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.card,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  catChipTextActive: { color: '#fff', fontWeight: FONTS.bold },
  createSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, padding: SPACING.base, marginTop: SPACING.md,
  },
  createSaveBtnText: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: '#fff' },
});

const prStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: SPACING.base,
    left: SPACING.base,
    right: SPACING.base,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    ...SHADOWS.card,
  },
  emoji: { fontSize: 26 },
  title: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: '#fff' },
  subtitle: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
});

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emoji: { fontSize: 48, marginBottom: SPACING.lg },
  text: { fontSize: FONTS.base, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
