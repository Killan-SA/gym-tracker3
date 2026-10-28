import { getUserSetting, setUserSetting } from './database';
import { setUserBodyweight } from './queries';
import { getProgramById } from './programs';
import { useSettingsStore } from '../store/settings';
import { toKg } from './units';
import { useProfileStore, cleanName } from '../store/profile';
import type { TrainingGoal } from '../constants/goals';

const KEY = 'onboarding_v1';

export function needsOnboarding(): boolean {
  const status = getUserSetting(KEY);
  return status !== 'complete' || !cleanName(getUserSetting('display_name') ?? '');
}

export function beginOnboarding() { setUserSetting(KEY, 'in_progress'); }

export function parseBodyweight(input: string, useKg: boolean): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const kg = toKg(Number(normalized), useKg);
  return Number.isFinite(kg) && kg > 0 && kg <= 300 ? kg : null;
}

export function completeOnboarding(programId: string | null, weightKg: number | null, name: string, goals: TrainingGoal[] = []) {
  if (!cleanName(name)) throw new Error('Entre ton prénom pour continuer.');
  if (programId !== null && !getProgramById(programId)) throw new Error('Choisis un programme proposé ou le mode libre.');
  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 300)) throw new Error('Entre un poids corporel valide.');
  beginOnboarding();
  if (weightKg !== null) setUserBodyweight(weightKg);
  // Preserve the day when an existing user keeps their current program.
  if (programId !== useSettingsStore.getState().currentProgramId) useSettingsStore.getState().setCurrentProgram(programId);
  useProfileStore.getState().saveProfile(name, goals);
  setUserSetting(KEY, 'complete');
}
