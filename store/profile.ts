import { create } from 'zustand';
import { getUserSetting, setUserSetting } from '../lib/database';
import { isTrainingGoal, type TrainingGoal } from '../constants/goals';

export function cleanName(value: string): string { return value.trim().replace(/\s+/g, ' ').slice(0, 40); }

interface ProfileState {
  name: string;
  goals: TrainingGoal[];
  setupRevision: number;
  loadProfile: () => void;
  saveProfile: (name: string, goals: TrainingGoal[]) => void;
  requestSetup: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  name: '', goals: [], setupRevision: 0,
  loadProfile: () => {
    let goals: TrainingGoal[] = [];
    try {
      const stored: unknown = JSON.parse(getUserSetting('training_goals') ?? '[]');
      if (Array.isArray(stored)) goals = [...new Set(stored.filter(isTrainingGoal))];
    } catch { /* An invalid preference must not prevent opening the app. */ }
    set({ name: cleanName(getUserSetting('display_name') ?? ''), goals });
  },
  saveProfile: (value, selected) => {
    const name = cleanName(value);
    if (!name) throw new Error('Entre ton prénom pour continuer.');
    const goals = [...new Set(selected.filter(isTrainingGoal))];
    setUserSetting('display_name', name);
    setUserSetting('training_goals', JSON.stringify(goals));
    set({ name, goals });
  },
  requestSetup: () => set(state => ({ setupRevision: state.setupRevision + 1 })),
}));
