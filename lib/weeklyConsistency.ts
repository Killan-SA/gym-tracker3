import { getDb, getUserSetting, setUserSetting } from './database';
export function getWeeklyGoal() {
  const value = Number(getUserSetting('weekly_session_goal') ?? 3);
  return [2, 3, 4, 5].includes(value) ? value : 3;
}
export function setWeeklyGoal(value: number) {
  if (![2, 3, 4, 5].includes(value)) throw new Error('Objectif invalide.');
  setUserSetting('weekly_session_goal', String(value));
}
export function weekStart(date: Date) {
  const result = new Date(date); result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - (result.getDay() + 6) % 7);
  return result;
}
function weekKey(date: Date) { const d = weekStart(date); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
export function calculateWeeklyConsistency(dates: string[], target: number, now = new Date()) {
  if (![2, 3, 4, 5].includes(target) || !Number.isFinite(now.getTime())) throw new Error('Objectif ou date invalide.');
  const counts = new Map<string, number>();
  for (const text of dates) {
    const date = new Date(text);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const key = weekKey(date); counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const currentWeekCount = counts.get(weekKey(now)) ?? 0;
  const completedThisWeek = currentWeekCount >= target;
  const cursor = weekStart(now);
  if (!completedThisWeek) cursor.setDate(cursor.getDate() - 7);
  let streakWeeks = 0;
  while ((counts.get(weekKey(cursor)) ?? 0) >= target) { streakWeeks++; cursor.setDate(cursor.getDate() - 7); }
  return { target, currentWeekCount, streakWeeks, completedThisWeek };
}
export function getWeeklyConsistency(now = new Date()) {
  // Count non-empty workouts, including legacy/imported workouts without a
  // finish flag. A newly opened empty workout never increases consistency.
  const rows = getDb().getAllSync<{ date: string }>(`SELECT s.date FROM sessions s
    WHERE EXISTS (SELECT 1 FROM exercises e JOIN sets st ON st.exercise_id=e.id WHERE e.session_id=s.id AND st.reps > 0)`);
  return calculateWeeklyConsistency(rows.map(row => row.date), getWeeklyGoal(), now);
}
