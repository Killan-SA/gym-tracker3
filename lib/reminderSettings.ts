import { getUserSetting, setUserSetting } from './database';
export type CreatineReminder = { enabled: boolean; hour: number; minute: number };
export const DEFAULT_CREATINE_REMINDER: CreatineReminder = { enabled: false, hour: 9, minute: 0 };
export function validateCreatineReminder(value: unknown): CreatineReminder {
  const config = value as CreatineReminder | null;
  if (!config || typeof config.enabled !== 'boolean' || !Number.isInteger(config.hour) || config.hour < 0 || config.hour > 23 || !Number.isInteger(config.minute) || config.minute < 0 || config.minute > 59) throw new Error('Choisis une heure entre 00:00 et 23:59.');
  return { enabled: config.enabled, hour: config.hour, minute: config.minute };
}
export function getCreatineReminder(): CreatineReminder {
  try { return validateCreatineReminder(JSON.parse(getUserSetting('creatine_reminder') ?? 'null')); }
  catch { return { ...DEFAULT_CREATINE_REMINDER }; }
}
export function setCreatineReminder(value: CreatineReminder) {
  setUserSetting('creatine_reminder', JSON.stringify(validateCreatineReminder(value)));
}
