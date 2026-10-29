import { getDb, nowISO } from './database';
import { addExerciseToSession, getSessionWithExercises } from './queries';

export function normalizeExerciseName(name: string) {
  return name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
export type PersistentExerciseNote = { exercise_name: string; note: string; show_in_session: number; updated_at: string };
export function getPersistentExerciseNote(name: string): PersistentExerciseNote | null {
  return getDb().getAllSync<PersistentExerciseNote>('SELECT * FROM exercise_notes')
    .find(row => normalizeExerciseName(row.exercise_name) === normalizeExerciseName(name)) ?? null;
}
export function setPersistentExerciseNote(name: string, note: string, showInSession = true) {
  if (!name.trim() || note.length > 4000) throw new Error('Note invalide (4 000 caractères maximum).');
  const existing = getPersistentExerciseNote(name);
  if (!note.trim()) { deletePersistentExerciseNote(name); return; }
  getDb().runSync(`INSERT INTO exercise_notes (exercise_name, note, show_in_session, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(exercise_name) DO UPDATE SET note=excluded.note, show_in_session=excluded.show_in_session, updated_at=excluded.updated_at`,
    [existing?.exercise_name ?? name.trim(), note.trim(), showInSession ? 1 : 0, nowISO()]);
}
export function deletePersistentExerciseNote(name: string) {
  const existing = getPersistentExerciseNote(name);
  if (existing) getDb().runSync('DELETE FROM exercise_notes WHERE exercise_name = ?', [existing.exercise_name]);
}
export function setSessionExerciseNote(id: string, note: string) {
  if (note.length > 4000) throw new Error('Note trop longue.');
  getDb().runSync('UPDATE exercises SET notes = ? WHERE id = ?', [note.trim() || null, id]);
}

export function reorderExercises(sessionId: string, orderedExerciseIds: string[]) {
  const db = getDb();
  db.withTransactionSync(() => writeExerciseOrder(sessionId, orderedExerciseIds));
}
// Called within an existing transaction. Expo SQLite uses BEGIN/COMMIT and
// does not support nesting withTransactionSync calls.
function writeExerciseOrder(sessionId: string, orderedExerciseIds: string[]) {
    const db = getDb();
    const rows = db.getAllSync<{ id: string }>('SELECT id FROM exercises WHERE session_id = ?', [sessionId]);
    const valid = new Set(rows.map(row => row.id));
    if (orderedExerciseIds.length !== valid.size || new Set(orderedExerciseIds).size !== valid.size || orderedExerciseIds.some(id => !valid.has(id))) {
      throw new Error('La liste doit contenir exactement les exercices de cette séance.');
    }
    orderedExerciseIds.forEach((id, index) => db.runSync('UPDATE exercises SET order_index = ? WHERE id = ? AND session_id = ?', [index, id, sessionId]));
}

// Even unconfirmed entries may contain real work (the old app saved on blur).
// Never rename or delete an exercise that already has repetitions recorded.
export function replaceSessionExercise(sessionId: string, exerciseId: string, newName: string, mode: 'keep' | 'remaining' = 'keep') {
  const db = getDb();
  let replacementId = exerciseId;
  db.withTransactionSync(() => {
    const session = getSessionWithExercises(sessionId);
    const exercise = session?.exercises.find(row => row.id === exerciseId);
    if (!session || !exercise || !newName.trim() || normalizeExerciseName(newName) === normalizeExerciseName(exercise.name)) throw new Error('Remplacement invalide.');
    const performed = exercise.sets.filter(set => set.reps > 0);
    if (!performed.length) {
      // Draft sets are specific to the previous exercise/pyramid. Keep the instance
      // (and its session note), but remove zero-rep drafts rather than relabel them.
      db.runSync('DELETE FROM sets WHERE exercise_id = ? AND reps = 0', [exerciseId]);
      db.runSync('UPDATE exercises SET name = ? WHERE id = ?', [newName.trim(), exerciseId]);
      db.runSync('DELETE FROM user_settings WHERE key = ?', ['pyramid:' + exerciseId]);
    } else {
      const replacement = addExerciseToSession(sessionId, newName);
      replacementId = replacement.id;
      const ids = session.exercises.map(row => row.id);
      ids.splice(ids.indexOf(exerciseId) + 1, 0, replacement.id);
      writeExerciseOrder(sessionId, ids);
      if (mode === 'remaining') {
        // Zero-rep drafts move as empty targets: no previous machine load or
        // pyramid metadata is attributed to the replacement.
        const drafts = exercise.sets.filter(set => set.reps === 0);
        drafts.forEach((set, i) => db.runSync('UPDATE sets SET exercise_id = ?, set_number = ?, weight = 0, notes = NULL WHERE id = ?', [replacement.id, i + 1, set.id]));
      }
    }
  });
  return replacementId;
}
