import { resetAllData } from './database';
import { useSettingsStore } from '../store/settings';
import { useProfileStore } from '../store/profile';
import { useRestTimerStore } from '../store/restTimerStore';

export function resetAppData(): void {
  resetAllData();
  useRestTimerStore.getState().hydrate();
  useSettingsStore.getState().loadSettings();
  useProfileStore.getState().loadProfile();
  useProfileStore.getState().requestSetup();
}
