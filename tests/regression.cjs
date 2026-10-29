// Exercise the real SQL against an isolated in-memory SQLite database.
// The adapter exposes the synchronous Expo SQLite API used by the application.
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const database = new DatabaseSync(':memory:');
database.exec(`
  CREATE TABLE sessions (id TEXT PRIMARY KEY, date TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL);
  CREATE TABLE exercises (id TEXT PRIMARY KEY, session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE, name TEXT NOT NULL, order_index INTEGER DEFAULT 0, notes TEXT);
  CREATE TABLE sets (id TEXT PRIMARY KEY, exercise_id TEXT REFERENCES exercises(id) ON DELETE CASCADE, set_number INTEGER NOT NULL, weight REAL DEFAULT 0, reps INTEGER DEFAULT 0, notes TEXT);
  INSERT INTO sessions VALUES ('legacy', '2026-01-01T12:00:00.000Z', 'Mes anciennes données', '2026-01-01T12:00:00.000Z');
  INSERT INTO exercises VALUES ('legacy-ex', 'legacy', 'Lat pulldown', 0, NULL);
  INSERT INTO sets VALUES ('legacy-set', 'legacy-ex', 1, 80, 8, NULL);
`);
const params = args => Array.isArray(args[0]) ? args[0] : args;
let inAppTransaction = false;
const adapter = {
  execSync: sql => database.exec(sql),
  runSync: (sql, ...args) => database.prepare(sql).run(...params(args)),
  getFirstSync: (sql, ...args) => database.prepare(sql).get(...params(args)) ?? null,
  getAllSync: (sql, ...args) => database.prepare(sql).all(...params(args)),
  withTransactionSync: fn => {
    // Expo uses BEGIN/COMMIT: nested withTransactionSync is not supported.
    // Test isolation uses an outer SAVEPOINT, independent of application calls.
    if (inAppTransaction) throw new Error('Nested Expo transaction');
    inAppTransaction = true;
    database.exec('SAVEPOINT expo_transaction');
    try { fn(); database.exec('RELEASE expo_transaction'); }
    catch (error) { database.exec('ROLLBACK TO expo_transaction; RELEASE expo_transaction;'); throw error; }
    finally { inAppTransaction = false; }
  },
};
const originalLoad = Module._load;
Module._load = function(name, parent, isMain) { if (name === 'expo-sqlite') return { openDatabaseSync: () => adapter }; return originalLoad.call(this, name, parent, isMain); };
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const q = require('../lib/queries.ts');
const db = require('../lib/database.ts');
const redesign = require('../lib/redesign.ts');
const units = require('../lib/units.ts');
const { useSettingsStore } = require('../store/settings.ts');
let passed = 0;
function test(name, fn) { fn(); passed++; process.stdout.write(`OK ${name}\n`); }

test('Legacy SQLite migration preserves workout rows and adds optional RPE', () => {
  const session = q.getSessionWithExercises('legacy');
  assert.equal(session.notes, 'Mes anciennes données');
  assert.equal(session.exercises[0].sets[0].weight, 80);
  assert.equal(session.exercises[0].sets[0].rpe, null);
  assert.equal(database.prepare('PRAGMA user_version').get().user_version, 4);
});
let session, exercise, set;
test('Existing session, custom exercise and RPE CRUD work', () => {
  q.addCustomExercise('Test perso', 'Dos');
  assert.ok(q.getCustomExercises().some(e => e.name === 'Test perso'));
  session = q.createSession('Test'); exercise = q.addExerciseToSession(session.id, 'Lat pulldown');
  set = q.addSet(exercise.id, 82.5, 8, 8.5);
  assert.equal(q.getLastSetForExercise(exercise.id).rpe, 8.5);
  q.updateSet(set.id, 85, 9, 9);
  assert.equal(q.getSessionVolume(session.id), 765);
});
test('Previous performance excludes the active session and later sessions', () => {
  assert.deepEqual({ ...redesign.getPreviousPerformance('Lat pulldown', session.id) }, { weight: 80, reps: 8 });
  const future = q.createSession();
  database.prepare('UPDATE sessions SET date = ? WHERE id = ?').run('2099-01-01T12:00:00.000Z', future.id);
  const ex = q.addExerciseToSession(future.id, 'Lat pulldown'); q.addSet(ex.id, 200, 12);
  assert.equal(redesign.getPreviousPerformance('Lat pulldown', session.id).weight, 80);
  q.deleteSession(future.id);
});
test('Favorites persist locally and recover from malformed preferences', () => {
  assert.deepEqual(redesign.toggleFavorite('Lat pulldown'), ['Lat pulldown']);
  assert.deepEqual(redesign.getFavorites(), ['Lat pulldown']);
  assert.deepEqual(redesign.toggleFavorite('Lat pulldown'), []);
  db.setUserSetting('favorite_exercises', 'broken'); assert.deepEqual(redesign.getFavorites(), []);
  db.setUserSetting('favorite_exercises', '[123,"Pompes"]'); assert.deepEqual(redesign.getFavorites(), ['Pompes']);
});
test('Session names and durations are additive and duration survives a second finish', () => {
  redesign.setSessionTitle(session.id, 'PUSH'); redesign.finishSession(session.id, 3850);
  redesign.finishSession(session.id, 8000);
  assert.equal(redesign.getSessionTitle(session.id), 'PUSH');
  assert.equal(redesign.getSessionDurationLabel(session.id), '1h04');
  assert.equal(redesign.getSessionDurationLabel('legacy'), null);
});
test('Program day advances once and new sessions contain the prescribed exercises', () => {
  useSettingsStore.getState().loadSettings();
  assert.equal(useSettingsStore.getState().themeId, 'green');
  useSettingsStore.getState().setCurrentProgram('ppl');
  const programSession = q.createSessionFromProgramDay(['Pompes', 'Lat pulldown'], 1);
  useSettingsStore.getState().loadSettings();
  assert.equal(useSettingsStore.getState().currentProgramDayIndex, 1);
  assert.equal(q.getSessionWithExercises(programSession).exercises.length, 2);
  redesign.finishSession(programSession, 3600);
  assert.equal(useSettingsStore.getState().currentProgramDayIndex, 1);
  db.setUserSetting('themeId', 'purple'); useSettingsStore.getState().loadSettings();
  assert.equal(useSettingsStore.getState().themeId, 'purple');
});
test('kg/lbs conversions preserve the canonical kg value', () => {
  for (const kg of [0, 2.5, 72, 82.5, 150]) assert.ok(Math.abs(units.toKg(units.fromKg(kg, false), false) - kg) < 1e-9);
  assert.equal(units.unitLabel(false), 'lbs'); assert.equal(units.formatWeight(80, true), '80 kg');
});
test('All dashboard queries, history metrics and charts work with real SQL', () => {
  assert.ok(q.getDashboardStats().totalSessionCount >= 3);
  assert.ok(q.getTotalVolumeAllTime() >= 1405);
  assert.ok(q.getPersonalRecords().some(e => e.name === 'Lat pulldown' && e.weight === 85));
  assert.equal(q.getExerciseStats('Lat pulldown').personalRecord, 85);
  assert.ok(q.getWeightHistory('Lat pulldown').length >= 2);
  q.getWeeklyReport(); q.getVolumeByMuscleGroup(); q.getFrequentSessionTemplates(); q.getSmartSessionRecommendation(); q.getMuscleGroupFrequency();
});
test('Deleting a series or session preserves unrelated legacy data', () => {
  q.deleteSet(set.id); assert.equal(q.getSessionWithExercises(session.id).exercises[0].sets.length, 0);
  const extra = q.addSet(exercise.id, 20, 10); q.deleteExercise(exercise.id);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM sets WHERE id = ?').get(extra.id).n, 0);
  q.deleteSession(session.id); assert.equal(q.getSessionWithExercises(session.id), null);
  assert.equal(q.getSessionWithExercises('legacy').exercises[0].sets[0].weight, 80);
});
test('XLSX import preview, persistence and duplicate detection remain available', () => {
  const XLSX = require('xlsx');
  const importer = require('../lib/importXlsx.ts');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Date', 'Machine', 'Serie', 'Poids', 'Reps'],
    ['15/02/2025', 'Seated row', 1, 40, 10],
    ['15/02/2025', 'Seated row', 2, 42.5, 8],
  ]), 'Historique');
  const preview = importer.parseXlsxFile(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  assert.deepEqual(preview.errors, []);
  assert.equal(preview.previews.length, 1);
  assert.equal(preview.previews[0].totalSets, 2);
  assert.deepEqual(importer.importPreviews(preview.previews), { imported: 1, duplicates: 0 });
  assert.deepEqual(importer.importPreviews(preview.previews), { imported: 0, duplicates: 1 });
  assert.equal(q.getExercisePersonalRecord('Seated row'), 42.5);
});
test('First launch offers setup, resumes interrupted setup, and saves each program or free mode', () => {
  const onboarding = require('../lib/onboarding.ts');
  assert.equal(onboarding.needsOnboarding(), true, 'An existing installation without a name should offer profile setup without deleting workouts');
  database.exec('SAVEPOINT welcome_test; DELETE FROM sets; DELETE FROM exercises; DELETE FROM sessions; DELETE FROM app_settings; DELETE FROM user_settings;');
  try {
    useSettingsStore.getState().loadSettings();
    assert.equal(onboarding.needsOnboarding(), true);
    onboarding.beginOnboarding();
    useSettingsStore.getState().setCurrentProgram('ppl');
    q.setUserBodyweight(70);
    assert.equal(onboarding.needsOnboarding(), true, 'Interrupted setup must remain visible even after partial saves');
    for (const program of ['ppl', 'full-body', 'upper-lower', null]) {
      onboarding.completeOnboarding(program, 72.5, '  Kilian  ', ['biceps', 'back']);
      useSettingsStore.getState().loadSettings();
      assert.equal(useSettingsStore.getState().currentProgramId, program);
      assert.equal(useSettingsStore.getState().currentProgramDayIndex, 0);
      assert.equal(q.getUserBodyweight(), 72.5);
      assert.equal(onboarding.needsOnboarding(), false);
      assert.equal(db.getUserSetting('display_name'), 'Kilian');
    }
    assert.throws(() => onboarding.completeOnboarding('unknown', 75, 'Kilian'));
    assert.throws(() => onboarding.completeOnboarding(null, -2, 'Kilian'));
    assert.throws(() => onboarding.completeOnboarding(null, 75, '   '));
    assert.equal(useSettingsStore.getState().currentProgramId, null);
  } finally {
    database.exec('ROLLBACK TO welcome_test; RELEASE welcome_test;');
    useSettingsStore.getState().loadSettings();
  }
});
test('Bodyweight accepts decimal commas and lbs and rejects malformed or out-of-range entries', () => {
  const { parseBodyweight } = require('../lib/onboarding.ts');
  assert.equal(parseBodyweight('72,5', true), 72.5);
  assert.equal(parseBodyweight(' 72.5 ', true), 72.5);
  assert.ok(Math.abs(parseBodyweight('160', false) - units.toKg(160, false)) < 1e-9);
  for (const value of ['', '0', '-72', '72abc', '72,5,3', 'Infinity', '301']) assert.equal(parseBodyweight(value, true), null);
  assert.equal(parseBodyweight('700', false), null);
});
test('Every predefined and prescribed exercise has a bundled local raster image', () => {
  require.extensions['.png'] = (module, filename) => { module.exports = filename; };
  const { EXERCISE_IMAGES } = require('../assets/exercises/images.ts');
  const { PREDEFINED_EXERCISES } = require('../constants/exercises.ts');
  const { TRAINING_PROGRAMS } = require('../lib/programs.ts');
  const names = new Set([...PREDEFINED_EXERCISES.map(e => e.name), ...TRAINING_PROGRAMS.flatMap(p => p.days.flatMap(d => d.exerciseNames))]);
  for (const name of names) {
    const file = EXERCISE_IMAGES[name];
    assert.ok(file, `Missing offline image for ${name}`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', `Invalid PNG for ${name}`);
    assert.ok(bytes.readUInt32BE(16) >= 512 && bytes.readUInt32BE(20) >= 512, `Image is too small: ${name}`);
  }
  assert.equal(new Set(Object.values(EXERCISE_IMAGES)).size, names.size);
});
test('Profile and goals persist, and completing setup preserves the day of an unchanged program', () => {
  const { useProfileStore } = require('../store/profile.ts');
  const onboarding = require('../lib/onboarding.ts');
  database.exec('SAVEPOINT profile_test');
  try {
    useSettingsStore.getState().setCurrentProgram('ppl');
    useSettingsStore.getState().setProgramDayIndex(2);
    onboarding.completeOnboarding('ppl', null, '  Léa   Marie  ', ['chest', 'glutes', 'chest']);
    useProfileStore.getState().loadProfile();
    assert.equal(useProfileStore.getState().name, 'Léa Marie');
    assert.deepEqual(useProfileStore.getState().goals, ['chest', 'glutes']);
    assert.equal(useSettingsStore.getState().currentProgramDayIndex, 2);
    assert.equal(onboarding.needsOnboarding(), false);
    db.setUserSetting('training_goals', 'bad json'); useProfileStore.getState().loadProfile();
    assert.deepEqual(useProfileStore.getState().goals, []);
  } finally { database.exec('ROLLBACK TO profile_test; RELEASE profile_test'); useSettingsStore.getState().loadSettings(); useProfileStore.getState().loadProfile(); }
});
test('Goal-based recommendations retain the three classics and provide executable workouts', () => {
  const { getProgramsForGoals, TRAINING_PROGRAMS } = require('../lib/programs.ts');
  const { PREDEFINED_EXERCISES } = require('../constants/exercises.ts');
  const names = new Set(PREDEFINED_EXERCISES.map(e => e.name));
  assert.equal(TRAINING_PROGRAMS.length, 7);
  for (const goal of ['biceps', 'chest', 'back', 'glutes']) {
    const programs = getProgramsForGoals([goal]);
    assert.equal(programs[0].id, `focus-${goal}`);
    for (const id of ['ppl', 'full-body', 'upper-lower']) assert.ok(programs.some(p => p.id === id));
    assert.equal(programs[0].days.length, 3);
    for (const day of programs[0].days) {
      assert.equal(new Set(day.exerciseNames).size, day.exerciseNames.length);
      for (const name of day.exerciseNames) assert.ok(names.has(name), `Unknown exercise: ${name}`);
    }
  }
  assert.deepEqual(getProgramsForGoals(['back', 'biceps']).slice(0, 2).map(p => p.id).sort(), ['focus-back', 'focus-biceps']);
});
test('Library exercise creation persists without creating a workout and rejects normalized duplicates', () => {
  const { createCustomExercise } = require('../lib/customExercises.ts');
  const count = q.getAllSessions().length;
  const name = createCustomExercise('  Ma   machine fessiers  ', 'Jambes');
  assert.equal(name, 'Ma machine fessiers');
  assert.ok(q.getCustomExercises().some(e => e.name === name && e.category === 'Jambes'));
  assert.equal(q.getAllSessions().length, count);
  assert.throws(() => createCustomExercise('ma machine FESSIERS', 'Jambes'));
  assert.throws(() => createCustomExercise(' CURL HALTERE ', 'Biceps'));
  assert.throws(() => createCustomExercise('  ', 'Autre'));
  assert.throws(() => createCustomExercise('Exercice inconnu', 'Catégorie invalide'));
});
test('Full reset clears all personal data and requests fresh setup immediately', () => {
  const { resetAppData } = require('../lib/resetApp.ts');
  const { useProfileStore } = require('../store/profile.ts');
  const onboarding = require('../lib/onboarding.ts');
  database.exec('SAVEPOINT reset_test');
  try {
    onboarding.completeOnboarding('focus-glutes', 65, 'Léa', ['glutes']);
    useSettingsStore.getState().setUseKg(false);
    useSettingsStore.getState().setThemeId('purple');
    require('../lib/tutorial.ts').finishTutorial();
    const revision = useProfileStore.getState().setupRevision;
    resetAppData();
    for (const table of ['sessions', 'exercises', 'sets', 'exercise_names', 'custom_exercises', 'app_settings', 'user_settings']) assert.equal(database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, `Personal data remain in ${table}`);
    assert.equal(useProfileStore.getState().setupRevision, revision + 1);
    assert.equal(useProfileStore.getState().name, '');
    assert.deepEqual(useProfileStore.getState().goals, []);
    assert.equal(q.getUserBodyweight(), 0);
    assert.equal(useSettingsStore.getState().currentProgramId, null);
    assert.equal(useSettingsStore.getState().useKg, true);
    assert.equal(useSettingsStore.getState().themeId, 'green');
    assert.equal(onboarding.needsOnboarding(), true);
    assert.equal(require('../lib/tutorial.ts').needsTutorial(), true);
    onboarding.completeOnboarding(null, null, 'Alex', []);
    assert.equal(onboarding.needsOnboarding(), false);
    assert.equal(q.getUserBodyweight(), 0);
  } finally { database.exec('ROLLBACK TO reset_test; RELEASE reset_test'); useSettingsStore.getState().loadSettings(); useProfileStore.getState().loadProfile(); }
});
test('Aggregate volume uses metric tonnes from 1000 kg without changing load or lbs formatting', () => {
  assert.equal(units.formatVolume(999), '999 kg');
  assert.equal(units.formatVolume(1000), '1 t');
  assert.equal(units.formatVolume(1250), '1,25 t');
  assert.equal(units.formatVolume(1000000).replace(/[\s\u202f\u00a0]/g, ''), '1000t');
  assert.equal(units.formatVolume(-10), '0 kg');
  assert.equal(units.formatVolume(Infinity), '0 kg');
  assert.ok(units.formatVolume(1000, false).endsWith(' lbs'));
  assert.equal(units.formatWeight(1000, true), '1000 kg');
});
test('Muscle balance includes bodyweight and custom groups, ignores empty, old and future sets', () => {
  const balance = require('../lib/trainingBalance.ts');
  const dayjs = require('dayjs');
  database.exec('SAVEPOINT balance_test; DELETE FROM sets; DELETE FROM exercises; DELETE FROM sessions;');
  try {
    let lastSession;
    for (let i = 0; i < 3; i++) {
      const session = q.createSession(); lastSession = session;
      const pushup = q.addExerciseToSession(session.id, 'Pompes'); q.addSet(pushup.id, 0, 12);
      const curl = q.addExerciseToSession(session.id, 'Biceps curl'); q.addSet(curl.id, 10, 8);
      const empty = q.addExerciseToSession(session.id, 'Leg press'); q.addSet(empty.id, 150, 0);
      const cardio = q.addExerciseToSession(session.id, 'Rameur (Cardio)'); q.addSet(cardio.id, 0, 20);
      if (i === 0) assert.equal(balance.getTrainingBalance(7).enoughData, false);
    }
    q.addCustomExercise('Curl analytique', 'Biceps');
    const custom = q.addExerciseToSession(lastSession.id, 'Curl analytique'); q.addSet(custom.id, 15, 10);
    for (const date of [dayjs().subtract(50, 'day').toISOString(), dayjs().add(2, 'day').toISOString()]) {
      const session = q.createSession(); database.prepare('UPDATE sessions SET date = ? WHERE id = ?').run(date, session.id);
      const ex = q.addExerciseToSession(session.id, 'Leg press'); q.addSet(ex.id, 200, 12);
    }
    const result = balance.getTrainingBalance(7);
    assert.equal(result.enoughData, true); assert.equal(result.sessionCount, 3);
    assert.equal(result.muscles.find(m => m.id === 'chest').score, 3);
    assert.equal(result.muscles.find(m => m.id === 'chest').status, 'strong');
    assert.equal(result.muscles.find(m => m.id === 'biceps').score, 4);
    assert.equal(result.muscles.find(m => m.id === 'triceps').score, 1.5);
    assert.equal(result.muscles.find(m => m.id === 'quads').score, 0);
    assert.equal(result.muscles.find(m => m.id === 'quads').status, 'low');
    assert.equal(result.unclassifiedSets, 3);
    assert.equal(balance.getTrainingPeriodStats(7).volume, 390);
    assert.equal(balance.getTrainingPeriodStats(7).sessions, 3);
    const selection = result.muscles.map(m => ({ ...m, status: m.id === 'back' ? 'low' : 'balanced' }));
    assert.equal(balance.recommendBalanceProgram(selection).program.id, 'focus-back');
    assert.equal(balance.recommendBalanceProgram(result.muscles.map(m => ({ ...m, status: 'unknown' }))), null);
  } finally { database.exec('ROLLBACK TO balance_test; RELEASE balance_test'); }
});
test('Volume comparisons use explicit reference masses and never change the stored volume', () => {
  const { getVolumeComparisons } = require('../lib/trainingBalance.ts');
  const values = getVolumeComparisons(1500);
  assert.equal(values.find(v => v.id === 'car').count, 1.5);
  assert.equal(values.find(v => v.id === 'water').count, 250);
  assert.ok(getVolumeComparisons(0).every(v => v.count === 0));
  assert.ok(getVolumeComparisons(NaN).every(v => v.count === 0));
});
test('First-run tutorial is offered once and can be completed or skipped', () => {
  const tutorial = require('../lib/tutorial.ts');
  database.exec('SAVEPOINT tutorial_test;');
  database.prepare('DELETE FROM user_settings WHERE key = ?').run('tutorial_v1');
  try {
    assert.equal(tutorial.needsTutorial(), true);
    tutorial.finishTutorial(false); assert.equal(tutorial.needsTutorial(), false);
    assert.equal(db.getUserSetting('tutorial_v1'), 'complete');
    tutorial.finishTutorial(true); assert.equal(db.getUserSetting('tutorial_v1'), 'skipped');
    assert.equal(tutorial.needsTutorial(), false);
  } finally { database.exec('ROLLBACK TO tutorial_test; RELEASE tutorial_test'); }
});
test('Bodyweight pyramids generate ascending, descending and full patterns with a single peak', () => {
  const { buildPyramid, DEFAULT_PYRAMID } = require('../lib/pyramid.ts');
  assert.deepEqual(buildPyramid(DEFAULT_PYRAMID), [2, 4, 6, 4, 2]);
  assert.deepEqual(buildPyramid({ ...DEFAULT_PYRAMID, direction: 'ascending' }), [2, 4, 6]);
  assert.deepEqual(buildPyramid({ ...DEFAULT_PYRAMID, direction: 'descending' }), [6, 4, 2]);
  assert.deepEqual(buildPyramid({ start: 4, step: 3, levels: 4, direction: 'updown' }), [4, 7, 10, 13, 10, 7, 4]);
  for (const config of [{ start: 0 }, { start: 1.5 }, { step: 0 }, { levels: 1 }, { levels: 9 }, { start: 99, step: 2 }, { start: NaN }, { direction: 'invalid' }]) assert.throws(() => buildPyramid({ ...DEFAULT_PYRAMID, ...config }));
});
test('Pyramid progress persists, requires validation and records only performed repetitions', () => {
  const p = require('../lib/pyramid.ts');
  database.exec('SAVEPOINT pyramid_test');
  try {
    const session = q.createSession();
    const ex = q.addExerciseToSession(session.id, 'Pompes');
    const classic = q.addSet(ex.id, 60, 9);
    const baseline = q.getSessionVolume(session.id);
    q.setUserBodyweight(72.5);
    useSettingsStore.getState().setUseKg(false);
    const plan = p.savePyramidPlan(ex.id, p.DEFAULT_PYRAMID);
    assert.equal(p.getPyramidPlan(ex.id).runId, plan.runId);
    const first = p.addNextPyramidSet(ex.id);
    assert.equal(first.weight, 72.5, 'Stored weights must remain in kg with lbs display enabled');
    assert.equal(first.reps, 0);
    assert.equal(p.parsePyramidSet(first.notes).targetReps, 2);
    assert.equal(q.getSessionVolume(session.id), baseline, 'Planned repetitions must not inflate volume');
    assert.throws(() => p.addNextPyramidSet(ex.id));
    db.setUserSetting(`set_confirmed:${first.id}`, '1');
    assert.equal(p.getPyramidProgress(ex.id).completed, 0, 'A zero-rep row cannot complete a step');
    q.updateSet(first.id, 72.5, 1, 8);
    assert.equal(p.getPyramidProgress(ex.id).completed, 1);
    assert.equal(q.getSessionVolume(session.id), baseline + 72.5);
    p.setPyramidEnabled(ex.id, false);
    assert.throws(() => p.addNextPyramidSet(ex.id));
    p.setPyramidEnabled(ex.id, true);
    assert.equal(p.getPyramidProgress(ex.id).completed, 1);
    for (let index = 1; index < 5; index++) {
      const added = p.addNextPyramidSet(ex.id);
      assert.equal(p.parsePyramidSet(added.notes).index, index);
      const target = p.parsePyramidSet(added.notes).targetReps;
      q.updateSet(added.id, 72.5, target, null);
      db.setUserSetting(`set_confirmed:${added.id}`, '1');
    }
    assert.equal(p.getPyramidProgress(ex.id).finished, true);
    assert.throws(() => p.addNextPyramidSet(ex.id));
    const before = q.getSessionWithExercises(session.id).exercises[0].sets;
    assert.ok(before.some(set => set.id === classic.id));
    p.savePyramidPlan(ex.id, { ...p.DEFAULT_PYRAMID, direction: 'descending' });
    assert.equal(p.getPyramidProgress(ex.id).completed, 0);
    assert.equal(p.getPyramidProgress(ex.id).targets[0], 6);
    assert.equal(q.getSessionWithExercises(session.id).exercises[0].sets.length, before.length);
    q.setUserBodyweight(0);
    const newSet = p.addNextPyramidSet(ex.id);
    q.updateSet(newSet.id, 0, 6); db.setUserSetting(`set_confirmed:${newSet.id}`, '1');
    assert.equal(p.getPyramidProgress(ex.id).completed, 1, 'Bodyweight repetitions remain usable without a configured bodyweight');
  } finally { database.exec('ROLLBACK TO pyramid_test; RELEASE pyramid_test'); useSettingsStore.getState().loadSettings(); }
});
test('Pyramids are restricted to bodyweight exercises and handle missing or malformed plans', () => {
  const p = require('../lib/pyramid.ts');
  const session = q.createSession();
  const weighted = q.addExerciseToSession(session.id, 'Leg press');
  assert.throws(() => p.savePyramidPlan(weighted.id, p.DEFAULT_PYRAMID));
  assert.throws(() => p.addNextPyramidSet('unknown-exercise'));
  const ex = q.addExerciseToSession(session.id, 'Traction');
  assert.equal(p.getPyramidProgress(ex.id), null);
  db.setUserSetting(`pyramid:${ex.id}`, 'broken JSON'); assert.equal(p.getPyramidPlan(ex.id), null);
  db.setUserSetting(`pyramid:${ex.id}`, JSON.stringify({ ...p.DEFAULT_PYRAMID, runId: 'bad-run', enabled: true })); assert.equal(p.getPyramidPlan(ex.id), null);
  assert.equal(p.parsePyramidSet('Notes anciennes'), null);
  assert.equal(p.parsePyramidSet('pyramid:v1:abc:0:999'), null);
  q.deleteSession(session.id);
});
test('Unperformed planned sets do not create records, chart points, or exercise progress', () => {
  database.exec('SAVEPOINT draft_stats_test');
  try {
    const session = q.createSession();
    const ex = q.addExerciseToSession(session.id, 'Draft-only test');
    const draft = q.addSet(ex.id, 200, 0);
    assert.equal(q.getExercisePersonalRecord(ex.name), 0);
    assert.ok(!q.getPersonalRecords().some(record => record.name === ex.name));
    assert.deepEqual(q.getWeightHistory(ex.name), []);
    assert.deepEqual(q.getVolumeHistory(ex.name), []);
    assert.deepEqual(q.getRepsHistory(ex.name), []);
    const stats = q.getExerciseStats(ex.name);
    assert.equal(stats.personalRecord, 0); assert.equal(stats.totalSessions, 0); assert.equal(stats.firstWeight, 0);
    assert.ok(!q.getWeeklyReport().newRecords.some(record => record.exerciseName === ex.name));
    q.updateSet(draft.id, 200, 8);
    assert.equal(q.getExercisePersonalRecord(ex.name), 200);
    assert.equal(q.getWeightHistory(ex.name)[0].value, 200);
    assert.equal(q.getExerciseStats(ex.name).totalSessions, 1);
    q.addSet(ex.id, 300, 0);
    assert.equal(q.getExercisePersonalRecord(ex.name), 200);
    assert.equal(q.getExerciseStats(ex.name).personalRecord, 200);
    assert.equal(q.getWeightHistory(ex.name)[0].value, 200);
  } finally { database.exec('ROLLBACK TO draft_stats_test; RELEASE draft_stats_test'); }
});
const features = require('../lib/sessionFeatures.ts');
const alternatives = require('../lib/exerciseAlternatives.ts');
const weekly = require('../lib/weeklyConsistency.ts');
const timer = require('../lib/restTimer.ts');
const backup = require('../lib/backup.ts');
const { useRestTimerStore } = require('../store/restTimerStore.ts');
function isolated(fn) { database.exec('SAVEPOINT feature_test'); try { fn(); } finally { database.exec('ROLLBACK TO feature_test; RELEASE feature_test'); } }

test('Persistent machine notes support creation, editing, accents, visibility and deletion', () => isolated(() => {
  features.setPersistentExerciseNote('Élévations latérales', 'Banc à 30°');
  assert.equal(features.getPersistentExerciseNote('elevations LATERALES').note, 'Banc à 30°');
  features.setPersistentExerciseNote('elevations laterales', 'Siège 4', false);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM exercise_notes').get().n, 1);
  assert.equal(features.getPersistentExerciseNote('Élévations latérales').show_in_session, 0);
  features.deletePersistentExerciseNote('ELEVATIONS LATERALES');
  assert.equal(features.getPersistentExerciseNote('Élévations latérales'), null);
}));
test('Session notes stay separate from persistent machine notes', () => isolated(() => {
  const s = q.createSession(); const ex = q.addExerciseToSession(s.id, 'Lat pulldown');
  features.setPersistentExerciseNote(ex.name, 'Siège 4'); features.setSessionExerciseNote(ex.id, 'Fatigué aujourd’hui');
  assert.equal(q.getSessionWithExercises(s.id).exercises[0].notes, 'Fatigué aujourd’hui');
  assert.equal(features.getPersistentExerciseNote(ex.name).note, 'Siège 4');
}));
test('Reordering five exercises from fifth to first persists contiguous indices', () => isolated(() => {
  const s = q.createSession(); const rows = Array.from({ length: 5 }, (_, i) => q.addExerciseToSession(s.id, `Machine ${i}`));
  const ids = [rows[4].id, ...rows.slice(0, 4).map(ex => ex.id)];
  features.reorderExercises(s.id, ids);
  const loaded = q.getSessionWithExercises(s.id).exercises;
  assert.deepEqual(loaded.map(ex => ex.id), ids); assert.deepEqual(loaded.map(ex => ex.order_index), [0, 1, 2, 3, 4]);
}));
test('Reordering rejects duplicates, foreign exercises and incomplete lists without changes', () => isolated(() => {
  const s = q.createSession(); const a = q.addExerciseToSession(s.id, 'A'); const b = q.addExerciseToSession(s.id, 'B');
  for (const ids of [[a.id], [a.id, a.id], [a.id, 'foreign']]) assert.throws(() => features.reorderExercises(s.id, ids));
  assert.deepEqual(q.getSessionWithExercises(s.id).exercises.map(ex => ex.id), [a.id, b.id]);
}));
test('Replacement ranks matching vertical pulls above horizontal rows', () => {
  const rows = alternatives.getExerciseAlternatives('Lat pulldown');
  assert.ok(rows.findIndex(row => row.name === 'Traction assistée') < rows.findIndex(row => row.name === 'Seated row'));
  assert.ok(rows.find(row => row.name === 'Traction').score >= 9);
  assert.ok(rows.every(row => row.name !== 'Lat pulldown'));
});
test('Custom and unknown exercise replacement fallbacks work locally', () => {
  const custom = { name: 'Tirage personnel', category: 'Dos' };
  assert.ok(alternatives.getExerciseAlternatives(custom.name, [custom]).length > 0);
  assert.deepEqual(alternatives.getExerciseAlternatives('Inconnu'), []);
});
test('Replacement renames an empty exercise without altering existing history', () => isolated(() => {
  const s = q.createSession(); const ex = q.addExerciseToSession(s.id, 'Lat pulldown'); q.addSet(ex.id, 90, 0);
  features.replaceSessionExercise(s.id, ex.id, 'Traction');
  const loaded = q.getSessionWithExercises(s.id).exercises[0];
  assert.equal(loaded.id, ex.id); assert.equal(loaded.name, 'Traction'); assert.equal(loaded.sets.length, 0);
}));
test('Replacing completed work inserts an alternative after it and preserves all performed sets', () => isolated(() => {
  const s = q.createSession(); const ex = q.addExerciseToSession(s.id, 'Lat pulldown'); const next = q.addExerciseToSession(s.id, 'Curl haltère');
  const done = q.addSet(ex.id, 80, 8, 9); const draft = q.addSet(ex.id, 80, 0);
  const replacementId = features.replaceSessionExercise(s.id, ex.id, 'Traction', 'remaining');
  const loaded = q.getSessionWithExercises(s.id).exercises;
  assert.deepEqual(loaded.map(row => row.id), [ex.id, replacementId, next.id]);
  assert.equal(loaded[0].name, 'Lat pulldown'); assert.equal(loaded[0].sets[0].id, done.id); assert.equal(loaded[0].sets[0].weight, 80);
  assert.equal(loaded[1].sets[0].id, draft.id); assert.equal(loaded[1].sets[0].weight, 0);
  assert.equal(q.getSessionVolume(s.id), 640);
}));
test('Keeping an exercise during replacement preserves even its empty drafts', () => isolated(() => {
  const s = q.createSession(); const ex = q.addExerciseToSession(s.id, 'Lat pulldown'); q.addSet(ex.id, 80, 8); q.addSet(ex.id, 80, 0);
  features.replaceSessionExercise(s.id, ex.id, 'Traction', 'keep');
  const loaded = q.getSessionWithExercises(s.id).exercises;
  assert.equal(loaded[0].sets.length, 2); assert.equal(loaded[1].sets.length, 0);
}));
test('Weekly consistency allows an unfinished current week without losing previous regular weeks', () => {
  const now = new Date(2026, 9, 29, 12);
  const dates = [12, 13, 14, 19, 20, 21, 26, 27].map(day => new Date(2026, 9, day, 12).toISOString());
  assert.deepEqual(weekly.calculateWeeklyConsistency(dates, 3, now), { target: 3, currentWeekCount: 2, streakWeeks: 2, completedThisWeek: false });
  assert.equal(weekly.calculateWeeklyConsistency(dates, 2, now).streakWeeks, 3);
  assert.equal(weekly.calculateWeeklyConsistency(dates, 4, now).streakWeeks, 0);
});
test('Weekly consistency uses Monday boundaries, skips future dates and breaks on missed weeks', () => {
  const dates = [5, 6, 7, 19, 20, 21, 26, 27, 28, 31].map(day => new Date(2026, 9, day, 12).toISOString());
  const result = weekly.calculateWeeklyConsistency(dates, 3, new Date(2026, 9, 29, 12));
  assert.equal(result.currentWeekCount, 3); assert.equal(result.streakWeeks, 2);
  assert.equal(weekly.weekStart(new Date(2026, 9, 25, 12)).getDate(), 19);
});
test('Weekly SQL count excludes empty workouts and counts bodyweight and imported sessions', () => isolated(() => {
  db.resetAllData(); const empty = q.createSession(); const done = q.createSession(); const ex = q.addExerciseToSession(done.id, 'Pompes'); q.addSet(ex.id, 0, 10);
  const result = weekly.getWeeklyConsistency(new Date(Date.now() + 1000));
  assert.equal(result.currentWeekCount, 1); weekly.setWeeklyGoal(4); assert.equal(weekly.getWeeklyGoal(), 4);
  assert.throws(() => weekly.setWeeklyGoal(0));
}));
test('Rest timer uses a real deadline across background time and rounds partial seconds up', () => {
  const state = timer.createRestTimer({ duration: 90, sessionId: 's', exerciseId: 'e', exerciseName: 'Pompes', setNumber: 1, weight: 0, reps: 10 }, 1000);
  assert.equal(state.endTime, 91000); assert.equal(timer.secondsRemaining(state, 20200), 71);
  assert.equal(timer.secondsRemaining(state, 90000), 1); assert.equal(timer.secondsRemaining(state, 120000), 0);
  assert.equal(timer.secondsRemaining(timer.adjustRestTimer(state, 30, 20200), 20200), 101);
  assert.equal(timer.secondsRemaining(timer.adjustRestTimer(state, -15, 90000), 90000), 0);
});
test('Rest store replaces concurrent timers, persists, completes once, changes duration and skips', () => isolated(() => {
  const context = { duration: 90, sessionId: 's', exerciseId: 'e', exerciseName: 'Pompes', setNumber: 1, weight: 0, reps: 10 };
  useRestTimerStore.getState().start(context); useRestTimerStore.getState().start({ ...context, exerciseName: 'Traction' });
  assert.equal(useRestTimerStore.getState().timer.exerciseName, 'Traction');
  const end = useRestTimerStore.getState().timer.endTime; useRestTimerStore.getState().adjust(30);
  assert.equal(useRestTimerStore.getState().timer.endTime, end + 30000);
  useRestTimerStore.getState().preset(60); assert.equal(useRestTimerStore.getState().timer.duration, 60);
  useRestTimerStore.setState({ timer: null }); useRestTimerStore.getState().hydrate(); assert.equal(useRestTimerStore.getState().timer.duration, 60);
  assert.equal(useRestTimerStore.getState().complete(), true); assert.equal(useRestTimerStore.getState().complete(), false);
  useRestTimerStore.getState().stop(); assert.equal(useRestTimerStore.getState().timer, null);
}));
test('Complete backup roundtrip preserves sessions, notes, settings, favorites and pyramids', () => isolated(() => {
  features.setPersistentExerciseNote('Lat pulldown', 'Siège 3');
  db.setUserSetting('favorite_exercises', '["Pompes"]'); db.setUserSetting('pyramid:example', '{"enabled":true}');
  const exported = backup.createBackup(); const decoded = JSON.parse(JSON.stringify(exported));
  assert.equal(backup.validateBackup(decoded).version, 1);
  db.resetAllData(); assert.equal(q.getAllSessions().length, 0); backup.restoreBackup(decoded);
  assert.equal(q.getAllSessions().length, exported.sessions.length);
  assert.equal(features.getPersistentExerciseNote('Lat pulldown').note, 'Siège 3');
  assert.equal(db.getUserSetting('pyramid:example'), '{"enabled":true}');
  assert.deepEqual(backup.createBackup().sets, exported.sets);
}));
test('Backup rejects corrupt documents, wrong versions, missing tables and invalid values before writes', () => isolated(() => {
  const exported = JSON.parse(JSON.stringify(backup.createBackup()));
  assert.throws(() => backup.restoreBackup('broken')); assert.throws(() => backup.restoreBackup({ ...exported, version: 2 }));
  const incomplete = { ...exported }; delete incomplete.settings; assert.throws(() => backup.restoreBackup(incomplete));
  const invalid = structuredClone(exported); invalid.sets[0].weight = -1; assert.throws(() => backup.restoreBackup(invalid));
  const orphan = structuredClone(exported); orphan.exercises[0].session_id = 'missing'; assert.throws(() => backup.restoreBackup(orphan));
  assert.equal(q.getAllSessions().length, exported.sessions.length);
}));
test('Restoration rolls back every table if SQLite fails after deleting the current data', () => isolated(() => {
  const exported = backup.createBackup(); const before = JSON.stringify({ ...exported, createdAt: '' });
  const originalRun = adapter.runSync; let inserts = 0;
  adapter.runSync = (sql, ...args) => { if (sql.startsWith('INSERT INTO') && ++inserts === 2) throw new Error('Simulated disk failure'); return originalRun(sql, ...args); };
  try { assert.throws(() => backup.restoreBackup(exported), /disk failure/); }
  finally { adapter.runSync = originalRun; }
  assert.equal(JSON.stringify({ ...backup.createBackup(), createdAt: '' }), before);
}));
test('Reset removes machine notes and a backup excludes the temporary active timer', () => isolated(() => {
  features.setPersistentExerciseNote('Pompes', 'Prise'); db.setUserSetting('active_rest_timer', '{}');
  assert.ok(!backup.createBackup().settings.some(row => row.key === 'active_rest_timer'));
  db.resetAllData(); assert.equal(features.getPersistentExerciseNote('Pompes'), null);
}));
test('Widget summary reads the next program day and weekly goal from local data', () => isolated(() => {
  const { getWidgetSummary } = require('../lib/widgetSummary.ts');
  const { TRAINING_PROGRAMS } = require('../lib/programs.ts');
  useSettingsStore.getState().setCurrentProgram(TRAINING_PROGRAMS[0].id); weekly.setWeeklyGoal(4);
  const summary = getWidgetSummary();
  assert.equal(summary.nextWorkout, TRAINING_PROGRAMS[0].days[0].label); assert.equal(summary.weeklyGoal, 4);
}));
test('Drag geometry handles variable-height cards in both directions and persists work unchanged', () => isolated(() => {
  const drag = require('../lib/exerciseDrag.ts');
  const layouts = new Map([[0, { y: 140, height: 300 }], [1, { y: 440, height: 600 }], [2, { y: 1040, height: 400 }], [3, { y: 1440, height: 200 }], [4, { y: 1640, height: 500 }]]);
  assert.equal(drag.getExerciseDropIndex(layouts, 4, -1600, 5), 0);
  assert.equal(drag.getExerciseDropIndex(layouts, 0, 1600, 5), 4);
  assert.equal(drag.getExerciseDropIndex(layouts, 1, 100000, 5), 4);
  assert.equal(drag.getExerciseDropIndex(layouts, 1, -100000, 5), 0);
  const s = q.createSession(); const exercises = Array.from({ length: 5 }, (_, i) => q.addExerciseToSession(s.id, `Exercice ${i}`));
  const set = q.addSet(exercises[4].id, 45, 8, 7); features.setSessionExerciseNote(exercises[4].id, 'Ma configuration');
  const moved = drag.moveExerciseItem(exercises, 4, drag.getExerciseDropIndex(layouts, 4, -1600, 5));
  features.reorderExercises(s.id, moved.map(row => row.id));
  const loaded = q.getSessionWithExercises(s.id);
  assert.equal(loaded.exercises[0].id, exercises[4].id);
  assert.equal(loaded.exercises[0].sets[0].id, set.id); assert.equal(loaded.exercises[0].sets[0].weight, 45);
  assert.equal(loaded.exercises[0].notes, 'Ma configuration'); assert.equal(q.getSessionVolume(s.id), 360);
}));
test('Dragging preserves the input list, retains every item, and rejects stale destinations', () => {
  const drag = require('../lib/exerciseDrag.ts'); const original = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(drag.moveExerciseItem(original, 4, 0), ['e', 'a', 'b', 'c', 'd']);
  assert.deepEqual(drag.moveExerciseItem(original, 0, 4), ['b', 'c', 'd', 'e', 'a']);
  assert.deepEqual(original, ['a', 'b', 'c', 'd', 'e']);
  assert.throws(() => drag.moveExerciseItem(original, 5, 0));
  assert.equal(drag.getExerciseDropIndex(new Map(), 2, 100, 5), 2);
});
test('Visible replacement scores distinguish movements and expose limited custom metadata', () => {
  const exact = alternatives.getExerciseReplacementScore('Lat pulldown', { name: 'Traction assistée', category: 'Dos' });
  const row = alternatives.getExerciseReplacementScore('Lat pulldown', { name: 'Seated row', category: 'Dos' });
  assert.equal(exact.score, 12); assert.equal(exact.scoreDetails.length, 4); assert.equal(row.score, 7);
  const custom = { name: 'Ma machine', category: 'Dos' };
  assert.equal(alternatives.getExerciseReplacementScore(custom.name, { name: 'Lat pulldown', category: 'Dos' }, [custom]).score, 2);
  assert.equal(alternatives.getExerciseReplacementScore('Inconnu', custom).score, null);
  assert.ok(alternatives.getExerciseAlternatives('Lat pulldown').every(row => row.score <= alternatives.MAX_REPLACEMENT_SCORE));
});
database.close();
process.stdout.write(`${passed} regression checks passed.\n`);
