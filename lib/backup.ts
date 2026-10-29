import { getDb } from './database';
import { notifyDataChanged } from './dataEvents';

// All application tables, including metadata stored in settings (favorites,
// onboarding, pyramid plans, durations, goals, custom programs and unit choices).
const TABLES = {
  sessions: { sql: 'sessions', columns: ['id', 'date', 'notes', 'created_at'] },
  exercises: { sql: 'exercises', columns: ['id', 'session_id', 'name', 'order_index', 'notes'] },
  sets: { sql: 'sets', columns: ['id', 'exercise_id', 'set_number', 'weight', 'reps', 'notes', 'rpe'] },
  customExercises: { sql: 'custom_exercises', columns: ['name', 'category', 'created_at'] },
  exerciseNames: { sql: 'exercise_names', columns: ['name', 'last_used', 'use_count'] },
  appSettings: { sql: 'app_settings', columns: ['key', 'value'] },
  settings: { sql: 'user_settings', columns: ['key', 'value'] },
  exerciseNotes: { sql: 'exercise_notes', columns: ['exercise_name', 'note', 'show_in_session', 'updated_at'] },
} as const;
type TableKey = keyof typeof TABLES;
type Row = Record<string, string | number | null>;
export type GymBackup = { format: 'GymTracker'; version: 1; createdAt: string } & Record<TableKey, Row[]>;
const keys = Object.keys(TABLES) as TableKey[];
const nullable = new Set(['notes', 'rpe']);
const numeric = new Set(['order_index', 'set_number', 'weight', 'reps', 'rpe', 'use_count', 'show_in_session']);
function fail(message: string): never { throw new Error('Sauvegarde invalide : ' + message); }
export function validateBackup(input: unknown): GymBackup {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('document JSON attendu.');
  const value = input as Record<string, unknown>;
  if (value.format !== 'GymTracker' || value.version !== 1) fail('format ou version non pris en charge.');
  if (typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) fail('date absente.');
  let total = 0;
  const result = { format: 'GymTracker', version: 1, createdAt: value.createdAt } as GymBackup;
  for (const key of keys) {
    const rows = value[key];
    if (!Array.isArray(rows)) fail(`table ${key} absente.`);
    total += rows.length; if (total > 500000) fail('trop de lignes.');
    const ids = new Set<string>();
    result[key] = rows.map((raw: unknown) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(`ligne ${key}.`);
      const row = raw as Row; const clean: Row = {};
      for (const column of TABLES[key].columns) {
        const cell = row[column];
        if (cell === null && nullable.has(column)) { clean[column] = null; continue; }
        if (numeric.has(column)) {
          if (typeof cell !== 'number' || !Number.isFinite(cell) || cell < 0 || cell > 1e9) fail(`nombre ${key}.${column}.`);
          if (column !== 'weight' && column !== 'rpe' && !Number.isInteger(cell)) fail(`entier ${column}.`);
          if (column === 'rpe' && (cell < 1 || cell > 10)) fail('RPE hors limites.');
          if (column === 'show_in_session' && cell !== 0 && cell !== 1) fail('visibilité de note.');
          if ((column === 'set_number' || column === 'use_count') && cell < 1) fail(`valeur ${column}.`);
        } else {
          if (typeof cell !== 'string' || cell.length > 1000000) fail(`texte ${key}.${column}.`);
          if (['id', 'session_id', 'exercise_id', 'name', 'exercise_name', 'key'].includes(column) && (!cell.trim() || cell.length > 300)) fail(`identifiant ${column}.`);
          if (['date', 'created_at', 'last_used', 'updated_at'].includes(column) && !Number.isFinite(Date.parse(cell))) fail(`date ${column}.`);
        }
        clean[column] = cell;
      }
      const primaryKey = String(clean.id ?? clean.key ?? clean.exercise_name ?? clean.name);
      if (ids.has(primaryKey)) fail(`doublon dans ${key}.`); ids.add(primaryKey);
      return clean;
    });
  }
  const sessions = new Set(result.sessions.map(row => row.id));
  const exercises = new Set(result.exercises.map(row => row.id));
  if (result.exercises.some(row => !sessions.has(row.session_id))) fail('exercice sans séance.');
  if (result.sets.some(row => !exercises.has(row.exercise_id))) fail('série sans exercice.');
  result.settings = result.settings.filter(row => row.key !== 'active_rest_timer');
  return result;
}
export function createBackup(): GymBackup {
  const db = getDb();
  const result = { format: 'GymTracker', version: 1, createdAt: new Date().toISOString() } as GymBackup;
  db.withTransactionSync(() => { for (const key of keys) result[key] = db.getAllSync<Row>(`SELECT ${TABLES[key].columns.join(',')} FROM ${TABLES[key].sql}`); });
  // A running rest is temporary state and must not resume on another phone.
  result.settings = result.settings.filter(row => row.key !== 'active_rest_timer');
  return result;
}
export function getBackupSummary(backup: GymBackup) {
  return { createdAt: backup.createdAt, sessions: backup.sessions.length, exercises: backup.exercises.length, sets: backup.sets.length };
}
export function restoreBackup(input: unknown) {
  const backup = validateBackup(input); // Complete validation before any mutation.
  const db = getDb();
  // The UI writes a recovery file before invoking this function. SQLite rollback
  // protects the existing database even if any insert fails (disk full, etc.).
  db.withTransactionSync(() => {
    for (const key of [...keys].reverse()) db.execSync(`DELETE FROM ${TABLES[key].sql};`);
    for (const key of keys) {
      const table = TABLES[key];
      for (const row of backup[key]) db.runSync(`INSERT INTO ${table.sql} (${table.columns.join(',')}) VALUES (${table.columns.map(() => '?').join(',')})`, table.columns.map(column => row[column]));
    }
  });
  notifyDataChanged();
  return getBackupSummary(backup);
}
