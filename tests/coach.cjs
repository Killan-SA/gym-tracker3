// Real SQLite and deterministic rule tests; never opens a user's workout file.
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const database = new DatabaseSync(':memory:');
const params = args => Array.isArray(args[0]) ? args[0] : args;
let inTransaction = false;
const adapter = {
  execSync: sql => database.exec(sql),
  runSync: (sql, ...args) => database.prepare(sql).run(...params(args)),
  getFirstSync: (sql, ...args) => database.prepare(sql).get(...params(args)) ?? null,
  getAllSync: (sql, ...args) => database.prepare(sql).all(...params(args)),
  withTransactionSync: fn => {
    if (inTransaction) throw new Error('Nested transaction');
    inTransaction = true; database.exec('SAVEPOINT coach_transaction');
    try { fn(); database.exec('RELEASE coach_transaction'); }
    catch (e) { database.exec('ROLLBACK TO coach_transaction; RELEASE coach_transaction'); throw e; }
    finally { inTransaction = false; }
  },
};
const originalLoad = Module._load;
Module._load = function(name, parent, isMain) { if (name === 'expo-sqlite') return { openDatabaseSync: () => adapter }; return originalLoad.call(this, name, parent, isMain); };
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const db = require('../lib/database.ts');
const q = require('../lib/queries.ts');
const storage = require('../lib/coachStorage.ts');
const engine = require('../lib/coachEngine.ts');
const coach = require('../lib/coach.ts');
const backup = require('../lib/backup.ts');
const redesign = require('../lib/redesign.ts');
const programs = require('../lib/programs.ts');
const units = require('../lib/units.ts');
const pyramid = require('../lib/pyramid.ts');
let passed = 0;
function test(name, fn) { database.exec('SAVEPOINT isolated'); try { fn(); passed++; process.stdout.write(`OK ${name}\n`); } finally { database.exec('ROLLBACK TO isolated; RELEASE isolated'); } }
db.getDb();
const now = new Date('2026-11-06T12:00:00Z');
const check = (patch = {}) => ({ recordedAt: now.toISOString(), energy: null, soreness: {}, pain: [], ...patch });
const config = (patch = {}) => ({ minReps: 6, maxReps: 10, targetRpe: 8, incrementKg: 2.5, mode: 'double', ...patch });
const row = (i, patch = {}) => ({ id: `r${i}`, name: 'Développé couché Smith', category: 'Poitrine', sessionId: `s${i}`, date: new Date(now.getTime() - (5 - i) * 7 * 86400000).toISOString(), setNumber: 1, weight: 80, reps: 8, rpe: 9, notes: null, ...patch });
const advice = (patch = {}) => engine.recommendProgression({ name: 'Développé couché Smith', previous: { weight: 80, reps: 8, rpe: 7 }, completed: [], config: config(), checkIn: null, history: [], now, ...patch });

for (const rpe of [6, 7, 8]) test(`RPE ${rpe} below rep ceiling suggests a gradual repetition increase`, () => { const a = advice({ previous: { weight: 80, reps: 8, rpe } }); assert.equal(a.weight, 80); assert.equal(a.reps, 9); });
test('RPE 9 does not force an increase', () => { const a = advice({ previous: { weight: 80, reps: 8, rpe: 9 } }); assert.equal(a.weight, 80); assert.equal(a.reps, 8); });
test('RPE 10 suggests less effort', () => { const a = advice({ previous: { weight: 80, reps: 8, rpe: 10 } }); assert.equal(a.weight, 77.5); assert.equal(a.reps, 7); });
test('Absent RPE never triggers a load increase even at the top of the range', () => { const a = advice({ previous: { weight: 80, reps: 10, rpe: null } }); assert.equal(a.weight, 80); assert.equal(a.confidence, 'low'); });
test('Double progression increases load at the ceiling then resets repetitions', () => { const a = advice({ previous: { weight: 80, reps: 10, rpe: 8 } }); assert.equal(a.weight, 82.5); assert.equal(a.reps, 6); });
test('Load-priority mode supports a small increase with RPE margin', () => { const a = advice({ config: config({ mode: 'load' }) }); assert.equal(a.weight, 82.5); assert.equal(a.reps, 8); });
test('Repetitions priority and bodyweight never add external load', () => { assert.equal(advice({ config: config({ mode: 'reps' }), previous: { weight: 80, reps: 10, rpe: 6 } }).weight, 80); assert.equal(advice({ name: 'Pompes', config: config({ mode: 'load' }) }).weight, 80); });
test('Disabled exercise recommendations are blocked', () => assert.equal(advice({ config: config({ mode: 'off' }) }).blocked, true));
test('No recorded repetitions yields no objective', () => assert.equal(advice({ previous: { weight: 80, reps: 0, rpe: 7 } }).blocked, true));
test('Successive series use their actual latest performance', () => { const a = advice({ completed: [{ weight: 75, reps: 7, rpe: 8 }] }); assert.equal(a.source, 'current'); assert.equal(a.weight, 75); assert.equal(a.reps, 8); });
test('Accumulated fatigue prevents a later load increase', () => { const a = advice({ config: config({ mode: 'load' }), completed: [{ weight: 80, reps: 8, rpe: 7 }, { weight: 80, reps: 7, rpe: 8 }] }); assert.equal(a.weight, 80); assert.equal(a.reps, 7); });
test('Three performed sets prevent repeated speculative increases', () => { const a = advice({ config: config({ mode: 'load' }), completed: Array(3).fill({ weight: 80, reps: 10, rpe: 7 }) }); assert.equal(a.weight, 80); });
test('Falling RPE at identical performance is progress, not a plateau', () => { const t = engine.analyzeExerciseTrend(row(1).name, [row(1, { rpe: 9 }), row(2, { rpe: 8 }), row(3, { rpe: 7 })]); assert.equal(t.status, 'progressing'); assert.equal(t.rpeImprovement, true); });
test('Four comparable sessions over two weeks can flag a possible plateau', () => assert.equal(engine.analyzeExerciseTrend(row(1).name, [1, 2, 3, 4].map(i => row(i))).status, 'possible_plateau'));
test('Three stable sessions alone are not a probable plateau', () => assert.equal(engine.analyzeExerciseTrend(row(1).name, [1, 2, 3].map(i => row(i))).status, 'stable'));
test('Missing RPE cannot establish a high-effort plateau', () => assert.equal(engine.analyzeExerciseTrend(row(1).name, [1, 2, 3, 4].map(i => row(i, { rpe: null }))).status, 'stable'));
test('Reduced repetitions and fatigue produce a temporary drop', () => { const t = engine.analyzeExerciseTrend(row(1).name, [row(1, { rpe: 8 }), row(2, { rpe: 8 }), row(3, { reps: 6, rpe: 10 })], check({ energy: 'tired', soreness: { chest: 3 } })); assert.equal(t.status, 'temporary_drop'); });
test('Two sessions and incompatible rep ranges stay inconclusive', () => { assert.equal(engine.analyzeExerciseTrend(row(1).name, [row(1), row(2)]).status, 'insufficient_data'); assert.equal(engine.analyzeExerciseTrend(row(1).name, [row(1), row(2), row(3, { reps: 20 })]).status, 'insufficient_data'); });
test('Different exercise names and first set numbers are not combined', () => { assert.equal(engine.analyzeExerciseTrend(row(1).name, [row(1), row(2, { name: 'Pec fly' }), row(3)]).status, 'insufficient_data'); assert.equal(engine.analyzeExerciseTrend(row(1).name, [row(1, { setNumber: 2 }), row(2), row(3)]).status, 'insufficient_data'); });
test('Pyramid sets cannot form a classic plateau', () => { const notes = 'pyramid:v1:abc-def:0:8'; const rows = [1, 2, 3, 4].map(i => row(i, { notes })); assert.ok(pyramid.parsePyramidSet(notes)); assert.equal(engine.analyzeExerciseTrend(row(1).name, rows).status, 'insufficient_data'); });
for (const level of [0, 1, 2, 3]) test(`Soreness ${level} is stored distinctly and changes caution only for moderate/severe reports`, () => { const c = check({ soreness: { chest: level } }); assert.equal(storage.validateCheckIn(c), true); const r = engine.analyzeRecovery(['chest'], c, [], now); assert.equal(r.cautious, level >= 2); });
test('Unknown muscles and missing energy are not equivalent to no soreness', () => { const r = engine.analyzeRecovery(['chest'], check(), [], now); assert.equal(r.state, 'insufficient'); assert.equal(r.cautious, false); assert.equal(storage.validateCheckIn(check({ soreness: { alien: 1 } })), false); });
test('Unusual pain blocks a load recommendation', () => { const a = advice({ checkIn: check({ pain: ['chest'] }) }); assert.equal(a.blocked, true); assert.equal(a.weight, null); });
test('Recent training alone is not evidence of failed recovery', () => { const r = engine.analyzeRecovery(['chest'], null, [row(4, { date: now.toISOString(), rpe: 7 })], now); assert.equal(r.cautious, false); assert.equal(r.state, 'insufficient'); });
test('Recent training plus substantial soreness is explained cautiously', () => assert.equal(engine.analyzeRecovery(['chest'], check({ soreness: { chest: 3 } }), [row(4, { date: now.toISOString() })], now).state, 'potentially_incomplete'));
test('A tired check-in reduces the suggested effort', () => assert.ok(advice({ checkIn: check({ energy: 'tired' }) }).weight < 80));
test('Skipped check-in and later updates preserve their separate meaning', () => { const s = q.createSession(); storage.saveSessionCheckIn(s.id, null); assert.equal(storage.getSessionCheckIns(s.id).skipped, true); storage.saveSessionCheckIn(s.id, check({ energy: 'normal' }), true); const h = storage.getSessionCheckIns(s.id); assert.equal(h.initial, null); assert.equal(h.updates.length, 1); assert.equal(h.skipped, true); });
test('Updating a resumed session never overwrites its original check-in', () => { const s = q.createSession(); const initial = check({ energy: 'good' }); storage.saveSessionCheckIn(s.id, initial); storage.saveSessionCheckIn(s.id, check({ energy: 'tired' }), true); const h = storage.getSessionCheckIns(s.id); assert.equal(h.initial.energy, 'good'); assert.equal(h.updates[0].energy, 'tired'); assert.equal(storage.currentCheckIn(h, now.getTime()).energy, 'tired'); assert.equal(storage.currentCheckIn(h, now.getTime() + 13 * 3600000), null); });
test('Muscle analysis includes bodyweight and custom categories but not zero-repetition rows', () => { const rows = [row(1, { name: 'Pompes', weight: 0 }), row(2, { name: 'Mon curl', category: 'Biceps' }), row(3, { name: 'Mon curl', category: 'Biceps', reps: 0 })]; const m = engine.analyzeMuscles(rows, ['biceps'], 3, null, null, now); assert.equal(m.find(v => v.id === 'chest').sessions90, 1); assert.equal(m.find(v => v.id === 'biceps').primarySets, 1); assert.equal(m.find(v => v.id === 'calves').lastDate, null); });
test('A muscle trained two days ago is not neglected solely due to 48 hours', () => { const rows = [2, 8, 15, 22].map((days, i) => row(i, { date: new Date(now.getTime() - days * 86400000).toISOString() })); const m = engine.analyzeMuscles(rows, ['chest'], 2, null, null, now).find(m => m.id === 'chest'); assert.equal(m.low, false); });
test('Configurations validate bounds and preserve independent exercises', () => { storage.saveProgressionConfig('Curl haltère', config({ incrementKg: 1 })); assert.equal(storage.getProgressionConfig('curl haltere').incrementKg, 1); assert.throws(() => storage.saveProgressionConfig('Pompes', config({ minReps: 20, maxReps: 10 }))); assert.equal(storage.defaultProgressionConfig('Pompes').mode, 'reps'); assert.notEqual(storage.defaultProgressionConfig('Curl haltère').incrementKg, storage.defaultProgressionConfig('Squat libre').incrementKg); });
test('Coach settings and check-ins roundtrip through the unchanged JSON backup', () => { const s = q.createSession(); storage.saveSessionCheckIn(s.id, check({ soreness: { back: 3 } })); storage.saveProgressionConfig('Lat pulldown', config()); storage.saveStrengthGoal('Lat pulldown', { metric: 'max_load', targetKg: 100, reps: null, createdAt: now.toISOString() }); storage.saveCoachPreferences({ enabled: true, autoCheckIn: false, equipment: ['Poulie'] }); const b = backup.createBackup(); db.resetAllData(); backup.restoreBackup(b); assert.equal(storage.getSessionCheckIns(s.id).initial.soreness.back, 3); assert.equal(storage.getCoachPreferences().autoCheckIn, false); assert.equal(storage.getStrengthGoal('Lat pulldown').targetKg, 100); });
test('Old JSON backups without any coach keys retain their original format', () => { const b = backup.createBackup(); b.settings = b.settings.filter(r => !r.key.startsWith('coach:')); backup.restoreBackup(b); assert.equal(storage.getSessionCheckIns('legacy').initial, null); assert.equal(storage.getCoachPreferences().enabled, true); assert.equal(storage.getStrengthGoal('Pompes'), null); });
test('Reset removes all coach personal data', () => { storage.saveCoachPreferences({ enabled: false, autoCheckIn: false, equipment: [] }); db.resetAllData(); assert.equal(storage.getCoachPreferences().enabled, true); });
test('Prepared sessions advance a program only when explicitly started', () => { q.setActiveProgram('ppl'); const before = q.getAllSessions().length; coach.getCoachReport(); assert.equal(q.getAllSessions().length, before); assert.equal(q.getNextProgramDayIndex(), 0); const id = coach.startCoachWorkout({ programId: 'ppl', dayIndex: 1, checkIn: check() }); assert.equal(q.getNextProgramDayIndex(), 2); assert.ok(q.getSessionWithExercises(id).exercises.length); assert.ok(storage.getSessionCheckIns(id).initial); });
test('Failed check-in creation rolls back the session and program day', () => { q.setActiveProgram('ppl'); const before = q.getAllSessions().length; assert.throws(() => coach.startCoachWorkout({ programId: 'ppl', dayIndex: 0, checkIn: check({ energy: 'invalid' }) })); assert.equal(q.getAllSessions().length, before); assert.equal(q.getNextProgramDayIndex(), 0); });
test('Applying a goal leaves completed sets unchanged and creates no phantom volume', () => { const s = q.createSession(); const ex = q.addExerciseToSession(s.id, 'Développé couché Smith'); const st = q.addSet(ex.id, 80, 8, 7); db.setUserSetting(`set_confirmed:${st.id}`, '1'); const before = q.getSessionVolume(s.id); const advice = coach.getExerciseAdvice(q.getSessionWithExercises(s.id).exercises[0]); const target = coach.applyCoachSuggestion(ex.id, advice); assert.equal(q.getSessionVolume(s.id), before); assert.equal(database.prepare('SELECT reps FROM sets WHERE id = ?').get(target).reps, 0); assert.equal(database.prepare('SELECT weight FROM sets WHERE id = ?').get(st.id).weight, 80); assert.equal(coach.getPendingCoachSet(target).reps, 9); });
test('Applying twice reuses only an unperformed draft and rejects stale advice', () => { const s = q.createSession(); const ex = q.addExerciseToSession(s.id, 'Curl haltère'); const st = q.addSet(ex.id, 20, 8, 8); db.setUserSetting(`set_confirmed:${st.id}`, '1'); const e = q.getSessionWithExercises(s.id).exercises[0]; const a = coach.getExerciseAdvice(e); assert.equal(coach.applyCoachSuggestion(ex.id, a), coach.applyCoachSuggestion(ex.id, a)); assert.throws(() => coach.applyCoachSuggestion(ex.id, { ...a, weight: 100 })); });
test('New exercise after replacement has its own history and no invented reference', () => { const s = q.createSession(); const ex = q.addExerciseToSession(s.id, 'Une nouvelle machine'); assert.equal(coach.getExerciseAdvice(q.getSessionWithExercises(s.id).exercises[0]).blocked, true); });
test('Goal metrics do not compare incompatible loads, repetitions and estimates', () => { const rows = [row(1, { weight: 80, reps: 8 }), row(2, { weight: 100, reps: 1 })]; const base = { metric: 'load_reps', targetKg: 100, reps: 8, createdAt: now.toISOString() }; assert.equal(engine.calculateGoalProgress(base, rows, rows[0].name).best, 80); assert.equal(engine.calculateGoalProgress({ ...base, metric: 'max_load', reps: null }, rows, rows[0].name).best, 100); assert.ok(engine.calculateGoalProgress({ ...base, metric: 'estimated_1rm', reps: null }, rows, rows[0].name).best > 100); });
test('Kg/lbs input and goal percentages use canonical kilograms', () => { const kg = units.toKg(units.fromKg(80, false), false); assert.ok(Math.abs(kg - 80) < 1e-9); const goal = { metric: 'max_load', targetKg: 100, reps: null, createdAt: now.toISOString() }; assert.equal(engine.calculateGoalProgress(goal, [row(1, { weight: kg })], row(1).name).percent, 80); });
test('Program recommendations preserve original day volume and require confirmation', () => { q.setActiveProgram('ppl'); const program = programs.getProgramById('ppl'); const plan = coach.buildCoachPlan(program, ['back'], []); assert.equal(plan.program.days[0].exerciseNames.length, program.days[0].exerciseNames.length); assert.throws(() => coach.activateCoachPlan(plan, false)); assert.equal(q.getActiveProgramId(), 'ppl'); });
test('Activating the same coach program preserves its next day and history', () => { q.setActiveProgram('ppl'); const id = coach.startCoachWorkout({ programId: 'ppl', dayIndex: 1, checkIn: null }); const plan = coach.buildCoachPlan(programs.getProgramById('ppl'), ['back'], []); coach.activateCoachPlan(plan, true); assert.equal(q.getNextProgramDayIndex(), 2); assert.ok(q.getSessionWithExercises(id)); assert.ok(programs.getProgramById('ppl').name.includes('Coach')); });
test('Equipment constraints cannot silently activate an incompatible plan', () => { const plan = coach.buildCoachPlan(programs.getProgramById('ppl'), [], ['Banc']); assert.ok(plan.unavailable.length); assert.throws(() => coach.activateCoachPlan(plan, true)); });
test('Coach settings recover safely from malformed optional JSON', () => { db.setUserSetting('coach:preferences', '{broken'); assert.equal(storage.getCoachPreferences().autoCheckIn, false); assert.equal(storage.getSessionCheckIns('missing').skipped, false); });
test('SQL ignores future, empty and still-running sessions in historical analysis', () => { const s = q.createSession(); const ex = q.addExerciseToSession(s.id, 'Pompes'); q.addSet(ex.id, 0, 10); assert.ok(!storage.getCoachSets().some(r => r.sessionId === s.id)); redesign.finishSession(s.id, 60); assert.ok(storage.getCoachSets().some(r => r.sessionId === s.id)); database.prepare('UPDATE sessions SET date = ? WHERE id = ?').run('2099-01-01T00:00:00Z', s.id); assert.ok(!storage.getCoachSets().some(r => r.sessionId === s.id)); });
test('Draft field edits and RPE remain pending until actual validation', () => {
  const s = q.createSession(), ex = q.addExerciseToSession(s.id, 'Curl haltère');
  const first = q.addSet(ex.id, 20, 8, 7); db.setUserSetting(`set_confirmed:${first.id}`, '1');
  const a = coach.getExerciseAdvice(q.getSessionWithExercises(s.id).exercises[0]);
  const id = coach.applyCoachSuggestion(ex.id, a), before = q.getSessionVolume(s.id);
  coach.saveCoachDraft(id, { weight: 21, reps: 9, rpe: 8 });
  assert.equal(q.getSessionVolume(s.id), before);
  assert.equal(coach.getPendingCoachSet(id).rpe, 8);
  q.updateSet(id, 21, 9, 8); db.setUserSetting(`set_confirmed:${id}`, '1');
  assert.throws(() => coach.saveCoachDraft(id, { weight: 10, reps: 5, rpe: 6 }));
  assert.equal(q.getSessionVolume(s.id), before + 189);
});
test('Applying a suggestion cannot bypass first-series validation', () => {
  const s = q.createSession(), ex = q.addExerciseToSession(s.id, 'Curl haltère');
  q.addSet(ex.id, 20, 8, 7);
  const a = coach.getExerciseAdvice(q.getSessionWithExercises(s.id).exercises[0]);
  assert.throws(() => coach.applyCoachSuggestion(ex.id, a));
});
test('Current check-in report chooses the newest update but rejects stale data', () => {
  const s = q.createSession(), actualNow = Date.now();
  const at = ms => new Date(actualNow + ms).toISOString();
  storage.saveSessionCheckIn(s.id, check({ recordedAt: at(-3600000), energy: 'good' }));
  storage.saveSessionCheckIn(s.id, check({ recordedAt: at(-1000), energy: 'tired' }), true);
  assert.equal(storage.latestCurrentCheckIn(actualNow).energy, 'tired');
  assert.equal(storage.latestCurrentCheckIn(actualNow + 13 * 3600000), null);
});
test('Historical fatigue reports prevent a confident stable-effort plateau', () => {
  assert.equal(engine.analyzeExerciseTrend(row(1).name, [row(1), row(2), row(3), row(4, { fatigueReported: true })]).status, 'stable');
});
test('Coach advice cannot replace a pyramid plan or its recorded paliers', () => {
  const s = q.createSession(), ex = q.addExerciseToSession(s.id, 'Pompes');
  pyramid.savePyramidPlan(ex.id, pyramid.DEFAULT_PYRAMID);
  const first = q.addSet(ex.id, 70, 8, 7); db.setUserSetting(`set_confirmed:${first.id}`, '1');
  const a = coach.getExerciseAdvice(q.getSessionWithExercises(s.id).exercises[0]);
  const before = JSON.stringify(q.getSessionWithExercises(s.id));
  assert.throws(() => coach.applyCoachSuggestion(ex.id, a));
  assert.equal(JSON.stringify(q.getSessionWithExercises(s.id)), before);
});
test('Program-switch confirmation retains each known program day', () => {
  q.setActiveProgram('ppl'); coach.startCoachWorkout({ programId: 'ppl', dayIndex: 1, checkIn: null });
  const next = coach.buildCoachPlan(programs.getProgramById('full-body'), [], []);
  coach.activateCoachPlan(next, true);
  const previous = coach.buildCoachPlan(programs.getProgramById('ppl'), [], []);
  coach.activateCoachPlan(previous, true);
  assert.equal(q.getNextProgramDayIndex(), 2);
});
test('Replacing an exercise clears moved coach targets from the previous machine', () => {
  const { replaceSessionExercise } = require('../lib/sessionFeatures.ts');
  const s = q.createSession(), ex = q.addExerciseToSession(s.id, 'Curl haltère');
  const first = q.addSet(ex.id, 20, 8, 7); db.setUserSetting(`set_confirmed:${first.id}`, '1');
  const a = coach.getExerciseAdvice(q.getSessionWithExercises(s.id).exercises[0]);
  const target = coach.applyCoachSuggestion(ex.id, a);
  const newId = replaceSessionExercise(s.id, ex.id, 'Biceps poulie', 'remaining');
  assert.equal(coach.getPendingCoachSet(target), null);
  assert.equal(database.prepare('SELECT weight, exercise_id FROM sets WHERE id = ?').get(target).weight, 0);
  assert.equal(database.prepare('SELECT weight, exercise_id FROM sets WHERE id = ?').get(target).exercise_id, newId);
  assert.equal(database.prepare('SELECT weight FROM sets WHERE id = ?').get(first.id).weight, 20);
});
test('Existing balance logic flags relatively low work on a user priority', () => {
  const rows = Array.from({ length: 3 }, (_, i) => row(i, { name: 'Pompes', date: new Date(now.getTime() - i * 7 * 86400000).toISOString() }));
  for (let i = 0; i < 30; i++) rows.push(row(i, { name: 'Biceps curl', category: 'Biceps', sessionId: `b${i % 3}`, date: now.toISOString() }));
  const m = engine.analyzeMuscles(rows, ['chest'], 2, null, null, now).find(m => m.id === 'chest');
  assert.equal(m.lowVolume, true);
  assert.equal(m.low, true);
});
database.close();
process.stdout.write(`${passed} coach checks passed.\n`);
