import { BODYWEIGHT_EXERCISES } from '../constants/exercises';
export type SetPerformance = { weight: number; reps: number };
// Suggestions are display-only: they must never create a completed performance
// or increase a stored load without the user entering/validating their own set.
export function getClassicSetSuggestion(previous: SetPerformance | null, exerciseName: string, setIndex: number): SetPerformance | null {
  if (!previous || previous.reps <= 0 || setIndex < 0 || !Number.isInteger(setIndex)) return null;
  if (setIndex === 0) return { weight: previous.weight, reps: previous.reps };
  if (setIndex !== 1 && setIndex !== 2) return null;
  const increaseWeight = previous.reps >= 12 && previous.weight > 0 && !BODYWEIGHT_EXERCISES.includes(exerciseName);
  return { weight: increaseWeight ? previous.weight + 2.5 : previous.weight, reps: increaseWeight ? 8 : previous.reps + 1 };
}
