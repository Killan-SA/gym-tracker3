import { resetAllData } from './database';
import { useSettingsStore } from '../store/settings';
import { useProfileStore } from '../store/profile';

export function resetAppData(): void {
  resetAllData();
  useSettingsStore.getState().loadSettings();
  useProfileStore.getState().loadProfile();
  useProfileStore.getState().requestSetup();
}
