import { PREDEFINED_EXERCISES, type ExerciseEntry } from '../constants/exercises';
import { normalizeExerciseName } from './sessionFeatures';
type Metadata = [string[], string[], string, string];
const metadata: Record<string, Metadata> = {
  'Biceps curl': [['Biceps'], [], 'Machine', 'elbow_flexion'],
  'Biceps poulie': [['Biceps'], [], 'Poulie', 'elbow_flexion'],
  'Curl haltère': [['Biceps'], ['Avant-bras'], 'Haltères', 'elbow_flexion'],
  'Curl barre EZ': [['Biceps'], ['Avant-bras'], 'Barre', 'elbow_flexion'],
  'Avant-bras': [['Avant-bras'], [], 'Haltères', 'wrist_flexion'],
  'Triceps poulie': [['Triceps'], [], 'Poulie', 'elbow_extension'],
  'Triceps corde': [['Triceps'], [], 'Poulie', 'elbow_extension'],
  'Dips machine': [['Triceps', 'Pectoraux'], ['Épaules'], 'Machine', 'dip'],
  'Dips assistés': [['Triceps', 'Pectoraux'], ['Épaules'], 'Machine assistée', 'dip'],
  'Pompes': [['Pectoraux'], ['Triceps', 'Épaules'], 'Poids du corps', 'horizontal_push'],
  'Pec fly': [['Pectoraux'], [], 'Machine', 'chest_fly'],
  'Pec fly incliné': [['Pectoraux'], [], 'Machine', 'chest_fly'],
  'Développé couché Smith': [['Pectoraux'], ['Triceps', 'Épaules'], 'Smith', 'horizontal_push'],
  'Chest press incliné': [['Pectoraux'], ['Triceps', 'Épaules'], 'Machine', 'horizontal_push'],
  'Traction': [['Grand dorsal'], ['Biceps'], 'Poids du corps', 'vertical_pull'],
  'Traction assistée': [['Grand dorsal'], ['Biceps'], 'Machine assistée', 'vertical_pull'],
  'Lat pulldown': [['Grand dorsal'], ['Biceps'], 'Poulie', 'vertical_pull'],
  'Seated row': [['Grand dorsal'], ['Biceps', 'Trapèzes'], 'Poulie', 'horizontal_pull'],
  'Lombaires': [['Lombaires'], ['Fessiers'], 'Banc', 'back_extension'],
  'Shoulder press': [['Épaules'], ['Triceps'], 'Machine', 'vertical_push'],
  'Shoulder press Smith': [['Épaules'], ['Triceps'], 'Smith', 'vertical_push'],
  'Rear delt': [['Épaules'], ['Trapèzes'], 'Machine', 'reverse_fly'],
  'Face pull': [['Épaules'], ['Trapèzes'], 'Poulie', 'reverse_fly'],
  'Élévations latérales': [['Épaules'], [], 'Haltères', 'lateral_raise'],
  'Leg extension / curl': [['Quadriceps', 'Ischio-jambiers'], [], 'Machine', 'knee_isolation'],
  'Hack squat': [['Quadriceps'], ['Fessiers'], 'Machine', 'squat'],
  'Leg press': [['Quadriceps'], ['Fessiers'], 'Machine', 'squat'],
  'Squat Smith': [['Quadriceps'], ['Fessiers', 'Abdominaux'], 'Smith', 'squat'],
  'Squat libre': [['Quadriceps'], ['Fessiers', 'Abdominaux'], 'Barre', 'squat'],
  'Hip adduction': [['Adducteurs'], [], 'Machine', 'hip_adduction'],
  'Pistol squat': [['Quadriceps'], ['Fessiers', 'Abdominaux'], 'Poids du corps', 'squat'],
  'Triceps sural (Mollets)': [['Mollets'], [], 'Machine', 'calf_raise'],
  'Abdominaux': [['Abdominaux'], [], 'Poids du corps', 'trunk_flexion'],
  'Rameur (Cardio)': [[], [], 'Rameur', 'rowing_cardio'],
  'Marche inclinée (Cardio)': [[], [], 'Tapis', 'walking_cardio'],
};
export function getExerciseMetadata(entry: ExerciseEntry): ExerciseEntry {
  const known = Object.entries(metadata).find(([name]) => normalizeExerciseName(name) === normalizeExerciseName(entry.name))?.[1];
  return known ? { ...entry, primaryMuscles: known[0], secondaryMuscles: known[1], equipment: known[2], movementPattern: known[3] } : entry;
}
export const MAX_REPLACEMENT_SCORE = 12;
function scoreReplacement(source: ExerciseEntry, target: ExerciseEntry) {
  const entry = getExerciseMetadata(target);
  const samePattern = !!source.movementPattern && source.movementPattern === entry.movementPattern;
  const samePrimary = !!source.primaryMuscles?.some(muscle => entry.primaryMuscles?.includes(muscle));
  const sameCategory = source.category === entry.category;
  const sameSecondary = !!source.secondaryMuscles?.some(muscle => entry.secondaryMuscles?.includes(muscle));
  const score = (samePattern ? 5 : 0) + (samePrimary ? 4 : 0) + (sameCategory ? 2 : 0) + (sameSecondary ? 1 : 0);
  const scoreDetails = [samePattern ? 'Même mouvement +5' : null, samePrimary ? 'Muscle principal commun +4' : null, sameCategory ? 'Même catégorie +2' : null, sameSecondary ? 'Muscle secondaire commun +1' : null].filter((value): value is string => value !== null);
  return { ...entry, score, scoreDetails, reason: entry.equipment === 'Poids du corps' ? 'Poids du corps' : samePattern && samePrimary ? 'Très proche' : 'Alternative' };
}
export function getExerciseReplacementScore(name: string, candidate: ExerciseEntry, custom: ExerciseEntry[] = []) {
  const source = [...PREDEFINED_EXERCISES, ...custom].find(entry => normalizeExerciseName(entry.name) === normalizeExerciseName(name));
  return source ? scoreReplacement(getExerciseMetadata(source), candidate) : { ...getExerciseMetadata(candidate), score: null, scoreDetails: [], reason: 'Informations limitées' };
}
export function getExerciseAlternatives(name: string, custom: ExerciseEntry[] = []) {
  const catalog = [...PREDEFINED_EXERCISES, ...custom].map(getExerciseMetadata);
  const source = catalog.find(entry => normalizeExerciseName(entry.name) === normalizeExerciseName(name));
  if (!source) return [];
  return catalog.filter(entry => normalizeExerciseName(entry.name) !== normalizeExerciseName(name))
    .map(entry => scoreReplacement(source, entry)).filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr')).slice(0, 6);
}
