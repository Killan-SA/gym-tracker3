import { EXERCISE_CATEGORIES, PREDEFINED_EXERCISES } from '../constants/exercises';
import { getAllExerciseNames, getCustomExercises, addCustomExercise } from './queries';

const normalize = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLowerCase();
export function createCustomExercise(value: string, category: string): string {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 80) throw new Error('Entre un nom de 1 à 80 caractères.');
  if (![...EXERCISE_CATEGORIES, 'Autre'].includes(category as typeof EXERCISE_CATEGORIES[number])) throw new Error('Choisis un groupe musculaire.');
  const names = [...PREDEFINED_EXERCISES.map(e => e.name), ...getCustomExercises().map(e => e.name), ...getAllExerciseNames()];
  if (names.some(known => normalize(known) === normalize(name))) throw new Error('Cet exercice existe déjà dans ta bibliothèque.');
  addCustomExercise(name, category);
  return name;
}
