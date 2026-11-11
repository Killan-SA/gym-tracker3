import type { TrainingProgram } from '../types';
import type { TrainingGoal } from '../constants/goals';
import { getUserSetting } from './database';

// ============================================================
// Programmes d'entraînement statiques
// ============================================================

/**
 * Programmes d'entraînement prédéfinis. Les noms d'exercices correspondent
 * exactement à ceux de PREDEFINED_EXERCISES (constants/exercises.ts) pour
 * que l'autocomplete et les stats (historique, 1RM...) s'appliquent direct.
 */
export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Le classique en 6 jours : pousser, tirer, jambes. Idéal si tu peux t\'entraîner souvent.',
    daysPerWeek: 6,
    days: [
      {
        label: 'Push (Pecs/Épaules/Triceps)',
        emoji: '🫸',
        muscleGroups: ['Pectoraux', 'Épaules', 'Triceps'],
        exerciseNames: [
          'Développé couché Smith',
          'Chest press incliné',
          'Shoulder press',
          'Pec fly incliné',
          'Triceps poulie',
          'Dips machine',
        ],
      },
      {
        label: 'Pull (Dos/Biceps)',
        emoji: '🫷',
        muscleGroups: ['Dos', 'Biceps'],
        exerciseNames: [
          'Traction',
          'Lat pulldown',
          'Seated row',
          'Biceps curl',
          'Curl haltère',
          'Face pull',
        ],
      },
      {
        label: 'Legs (Jambes)',
        emoji: '🦵',
        muscleGroups: ['Jambes'],
        exerciseNames: [
          'Squat libre',
          'Leg press',
          'Hack squat',
          'Leg extension / curl',
          'Triceps sural (Mollets)',
          'Abdominaux',
        ],
      },
      {
        label: 'Push B (Pecs/Épaules/Triceps)',
        emoji: '🫸',
        muscleGroups: ['Pectoraux', 'Épaules', 'Triceps'],
        exerciseNames: [
          'Chest press incliné',
          'Pec fly',
          'Shoulder press',
          'Élévations latérales',
          'Dips assistés',
          'Triceps corde',
        ],
      },
      {
        label: 'Pull B (Dos/Biceps)',
        emoji: '🫷',
        muscleGroups: ['Dos', 'Biceps'],
        exerciseNames: [
          'Traction',
          'Seated row',
          'Rear delt',
          'Curl barre EZ',
          'Curl haltère',
          'Face pull',
        ],
      },
      {
        label: 'Legs B (Jambes)',
        emoji: '🦵',
        muscleGroups: ['Jambes'],
        exerciseNames: [
          'Squat Smith',
          'Hack squat',
          'Leg extension / curl',
          'Hip adduction',
          'Triceps sural (Mollets)',
          'Abdominaux',
        ],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body 3j',
    description: 'Tout le corps à chaque séance, 3 fois par semaine. Parfait pour débuter ou avec peu de temps.',
    daysPerWeek: 3,
    days: [
      {
        label: 'Séance A',
        emoji: '💪',
        muscleGroups: ['Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Biceps'],
        exerciseNames: [
          'Squat libre',
          'Développé couché Smith',
          'Seated row',
          'Shoulder press',
          'Biceps curl',
          'Abdominaux',
        ],
      },
      {
        label: 'Séance B',
        emoji: '🔥',
        muscleGroups: ['Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Triceps'],
        exerciseNames: [
          'Leg press',
          'Chest press incliné',
          'Traction',
          'Rear delt',
          'Triceps poulie',
          'Abdominaux',
        ],
      },
      {
        label: 'Séance C',
        emoji: '⚡',
        muscleGroups: ['Jambes', 'Pectoraux', 'Dos', 'Épaules', 'Biceps'],
        exerciseNames: [
          'Hack squat',
          'Pec fly incliné',
          'Lat pulldown',
          'Face pull',
          'Curl haltère',
          'Abdominaux',
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Haut/Bas 4j',
    description: 'Haut du corps / bas du corps en 4 jours par semaine. Bon compromis fréquence/récupération.',
    daysPerWeek: 4,
    days: [
      {
        label: 'Haut du corps A',
        emoji: '💪',
        muscleGroups: ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps'],
        exerciseNames: [
          'Développé couché Smith',
          'Seated row',
          'Shoulder press',
          'Lat pulldown',
          'Biceps curl',
          'Triceps poulie',
        ],
      },
      {
        label: 'Bas du corps A',
        emoji: '🦵',
        muscleGroups: ['Jambes'],
        exerciseNames: [
          'Squat libre',
          'Leg press',
          'Leg extension / curl',
          'Hip adduction',
          'Triceps sural (Mollets)',
          'Abdominaux',
        ],
      },
      {
        label: 'Haut du corps B',
        emoji: '🔥',
        muscleGroups: ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps'],
        exerciseNames: [
          'Chest press incliné',
          'Traction',
          'Pec fly',
          'Rear delt',
          'Curl barre EZ',
          'Dips assistés',
        ],
      },
      {
        label: 'Bas du corps B',
        emoji: '⚡',
        muscleGroups: ['Jambes'],
        exerciseNames: [
          'Hack squat',
          'Squat Smith',
          'Leg extension / curl',
          'Pistol squat',
          'Triceps sural (Mollets)',
          'Abdominaux',
        ],
      },
    ],
  },
];

const focusDays: Record<TrainingGoal, { name: string; muscles: string[]; days: string[][] }> = {
  biceps: { name: 'Priorité biceps', muscles: ['Biceps', 'Dos', 'Pectoraux', 'Jambes'], days: [
    ['Biceps curl', 'Curl haltère', 'Seated row', 'Chest press incliné', 'Leg press', 'Abdominaux'],
    ['Curl barre EZ', 'Biceps poulie', 'Lat pulldown', 'Shoulder press', 'Squat Smith', 'Abdominaux'],
    ['Curl haltère', 'Biceps curl', 'Traction assistée', 'Pec fly', 'Leg extension / curl', 'Abdominaux'],
  ] },
  chest: { name: 'Priorité pectoraux', muscles: ['Pectoraux', 'Triceps', 'Dos', 'Jambes'], days: [
    ['Développé couché Smith', 'Pec fly', 'Seated row', 'Leg press', 'Triceps poulie', 'Abdominaux'],
    ['Chest press incliné', 'Pec fly incliné', 'Lat pulldown', 'Squat Smith', 'Biceps curl', 'Abdominaux'],
    ['Développé couché Smith', 'Pompes', 'Seated row', 'Leg extension / curl', 'Face pull', 'Abdominaux'],
  ] },
  back: { name: 'Priorité dos', muscles: ['Dos', 'Biceps', 'Pectoraux', 'Jambes'], days: [
    ['Lat pulldown', 'Seated row', 'Chest press incliné', 'Leg press', 'Biceps curl', 'Abdominaux'],
    ['Traction assistée', 'Face pull', 'Développé couché Smith', 'Squat Smith', 'Triceps poulie', 'Abdominaux'],
    ['Seated row', 'Lat pulldown', 'Pec fly', 'Leg extension / curl', 'Curl haltère', 'Abdominaux'],
  ] },
  glutes: { name: 'Jambes & fessiers', muscles: ['Fessiers', 'Jambes', 'Dos', 'Pectoraux'], days: [
    ['Squat Smith', 'Leg press', 'Seated row', 'Chest press incliné', 'Biceps curl', 'Abdominaux'],
    ['Squat libre', 'Leg extension / curl', 'Lat pulldown', 'Shoulder press', 'Triceps poulie', 'Abdominaux'],
    ['Hack squat', 'Leg press', 'Seated row', 'Pec fly', 'Face pull', 'Abdominaux'],
  ] },
};

for (const [goal, focus] of Object.entries(focusDays)) {
  TRAINING_PROGRAMS.push({
    id: `focus-${goal}`, name: focus.name, daysPerWeek: 3,
    description: '3 séances de tout le corps, avec tes exercices prioritaires en début de séance. Adapte les charges à ton niveau.',
    days: focus.days.map((exerciseNames, i) => ({ label: `${focus.name} · ${String.fromCharCode(65 + i)}`, muscleGroups: focus.muscles, exerciseNames })),
  });
}

export function getProgramsForGoals(goals: readonly TrainingGoal[]): TrainingProgram[] {
  const recommended = new Set(goals.map(goal => `focus-${goal}`));
  return TRAINING_PROGRAMS.map(p => getProgramById(p.id) ?? p).sort((a, b) => Number(recommended.has(b.id)) - Number(recommended.has(a.id)));
}

/** Retourne un programme par son id */
export function getProgramById(id: string): TrainingProgram | undefined {
  const base = TRAINING_PROGRAMS.find((p) => p.id === id);
  if (!base) return undefined;
  try {
    const value = JSON.parse(getUserSetting(`coach:program:${id}`) ?? 'null');
    if (value?.version === 1 && Array.isArray(value.days) && value.days.length === base.days.length && value.days.every((day: unknown) => Array.isArray(day) && day.length > 0 && day.length <= 15 && day.every((n: unknown) => typeof n === 'string' && n.length > 0 && n.length < 150))) {
      return { ...base, name: `${base.name} · Coach`, days: base.days.map((d, i) => ({ ...d, exerciseNames: value.days[i] })) };
    }
  } catch { /* Old backups have no coach plan; corrupt preferences use the original. */ }
  return base;
}
