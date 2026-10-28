export const TRAINING_GOALS = [
  { id: 'biceps', label: 'Biceps', description: 'Mettre les bras en priorité' },
  { id: 'chest', label: 'Pectoraux', description: 'Priorité au haut du corps' },
  { id: 'back', label: 'Dos', description: 'Priorité aux tirages' },
  { id: 'glutes', label: 'Fessiers', description: 'Priorité au bas du corps' },
] as const;
export type TrainingGoal = typeof TRAINING_GOALS[number]['id'];
export function isTrainingGoal(value: unknown): value is TrainingGoal {
  return TRAINING_GOALS.some(goal => goal.id === value);
}
