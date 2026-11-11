import { getDb, getUserSetting, setUserSetting } from './database';
import type { Session } from '../types';

/** Explicit marker excludes imported history, which has no recorded duration. */
export function getResumableSessions(): Session[] {
  return getDb().getAllSync<Session>(`SELECT s.* FROM sessions s
    JOIN user_settings p ON p.key = 'session_in_progress:' || s.id AND p.value = '1'
    WHERE NOT EXISTS (SELECT 1 FROM user_settings d WHERE d.key = 'session_duration:' || s.id)
    ORDER BY s.date DESC`);
}

export function canEditSession(session: Session, now = new Date()): boolean {
  const date = new Date(session.date);
  const today = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return today || (getUserSetting(`session_in_progress:${session.id}`) === '1' && getUserSetting(`session_duration:${session.id}`) === null);
}

// Additive preferences only: the existing schema and workout records stay intact.
export function getFavorites(): string[] {
  try { const value: unknown = JSON.parse(getUserSetting('favorite_exercises') ?? '[]'); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []; } catch { return []; }
}
export function toggleFavorite(name: string): string[] {
  const current = getFavorites();
  const next = current.includes(name) ? current.filter(n => n !== name) : [...current, name];
  setUserSetting('favorite_exercises', JSON.stringify(next));
  return next;
}
export function getPreviousPerformance(name: string, sessionId: string) {
  return getDb().getFirstSync<{ weight: number; reps: number }>(
    `SELECT st.weight, st.reps FROM sets st
     JOIN exercises e ON e.id = st.exercise_id JOIN sessions s ON s.id = e.session_id
     WHERE e.name = ? AND e.session_id != ? AND st.reps > 0
       AND s.date <= (SELECT date FROM sessions WHERE id = ?)
     ORDER BY s.date DESC, e.order_index DESC, st.set_number DESC LIMIT 1`, [name, sessionId, sessionId]);
}
export function getSessionTitle(id: string): string {
  return getUserSetting(`session_title:${id}`) ?? 'Séance libre';
}
export function setSessionTitle(id: string, title: string) { setUserSetting(`session_title:${id}`, title); }
export function finishSession(id: string, seconds: number) {
  // A second visit to an old session must not overwrite its original duration.
  if (getUserSetting(`session_duration:${id}`) === null) setUserSetting(`session_duration:${id}`, String(Math.max(0, seconds)));
  setUserSetting(`session_in_progress:${id}`, '0');
}
export function getSessionDurationLabel(id: string): string | null {
  const stored = getUserSetting(`session_duration:${id}`);
  if (stored === null) return null;
  const minutes = Math.max(1, Math.round(Number(stored) / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`;
}
