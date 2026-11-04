const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const plans = require('../lib/notificationPlans.ts');
const live = require('../lib/restActivity.ts');
const reminder = { enabled: false, hour: 9, minute: 0 };
const rest = { duration: 90, endTime: 100000, sessionId: 's', exerciseId: 'e', exerciseName: 'Pompes', setNumber: 2, weight: 70, reps: 10 };
function deferred() { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; }
let passed = 0;
async function test(name, fn) { await fn(); passed++; process.stdout.write(`OK ${name}\n`); }
async function main() {
  await test('Rest alarm uses the absolute deadline and daily reminder stays opt-in', async () => {
    const result = plans.buildNotificationPlans(reminder, rest, 10000);
    assert.equal(result[plans.CREATINE_NOTIFICATION_ID], null);
    assert.equal(result[plans.REST_NOTIFICATION_ID].trigger.timestamp, rest.endTime);
    assert.equal(plans.buildNotificationPlans(reminder, rest, rest.endTime)[plans.REST_NOTIFICATION_ID], null);
    const daily = plans.buildNotificationPlans({ enabled: true, hour: 23, minute: 59 }, null);
    assert.deepEqual(daily[plans.CREATINE_NOTIFICATION_ID].trigger, { type: 'daily', hour: 23, minute: 59 });
  });
  await test('Changing the daily time replaces one identifier and disabling it preserves other notifications', async () => {
    const scheduled = new Map([['another-app-feature', {}]]); let calls = 0;
    const sync = plans.createNotificationPlanSync({ schedule: async plan => { calls++; scheduled.set(plan.identifier, plan); }, cancel: async id => scheduled.delete(id) });
    const first = plans.buildNotificationPlans({ ...reminder, enabled: true }, null);
    await sync(first); await sync(first); assert.equal(calls, 1);
    await sync(plans.buildNotificationPlans({ enabled: true, hour: 18, minute: 30 }, null));
    assert.equal(scheduled.size, 2); assert.equal(scheduled.get(plans.CREATINE_NOTIFICATION_ID).trigger.hour, 18);
    await sync(plans.buildNotificationPlans(reminder, null));
    assert.equal(scheduled.size, 1); assert.ok(scheduled.has('another-app-feature'));
  });
  await test('Rapid rest changes followed by skip cancel even an in-flight native schedule', async () => {
    const entered = deferred(); const release = deferred(); const scheduled = new Map(); let first = true;
    const sync = plans.createNotificationPlanSync({ schedule: async plan => { if (first) { first = false; entered.resolve(); await release.promise; } scheduled.set(plan.identifier, plan); }, cancel: async id => scheduled.delete(id) });
    const pending = sync(plans.buildNotificationPlans(reminder, rest, 0)); await entered.promise;
    const changed = sync(plans.buildNotificationPlans(reminder, { ...rest, endTime: 130000 }, 0));
    const skipped = sync(plans.buildNotificationPlans(reminder, null)); release.resolve();
    await Promise.all([pending, changed, skipped]); assert.equal(scheduled.size, 0);
  });
  await test('A native failure does not poison notification retries or reset cleanup', async () => {
    const scheduled = new Map(); let fail = true;
    const sync = plans.createNotificationPlanSync({ schedule: async plan => { if (fail) { fail = false; throw new Error('native failure'); } scheduled.set(plan.identifier, plan); }, cancel: async id => scheduled.delete(id) });
    const desired = plans.buildNotificationPlans({ ...reminder, enabled: true }, rest, 0);
    await assert.rejects(sync(desired), /native failure/); await sync(desired);
    assert.equal(scheduled.size, 2); await sync(plans.buildNotificationPlans(reminder, null), true); assert.equal(scheduled.size, 0);
  });
  function makeFactory() {
    const instances = []; const events = [];
    return { instances, events,
      getInstances: () => [...instances],
      start(props, url, staleDate) { const instance = { update: async (next, stale) => events.push(['update', next, stale]), end: async (policy, next) => { events.push(['end', policy, next]); instances.splice(instances.indexOf(instance), 1); } }; instances.push(instance); events.push(['start', props, url, staleDate]); return instance; },
    };
  }
  await test('Live Activity creates once, updates the deadline and reuses an existing native instance', async () => {
    const factory = makeFactory(); const sync = live.createRestActivitySync(factory);
    await sync(rest, 0); await sync(rest, 0); assert.equal(factory.events.length, 1);
    assert.equal(factory.events[0][2], 'gymtracker:///rest');
    assert.equal(factory.events[0][3].getTime(), rest.endTime);
    await sync({ ...rest, endTime: 130000, duration: 120 }, 0);
    assert.equal(factory.instances.length, 1); assert.equal(factory.events[1][0], 'update');
    assert.equal(factory.events[1][1].startedAt, 10000);
    const resumed = live.createRestActivitySync(factory); await resumed(rest, 0);
    assert.equal(factory.instances.length, 1); assert.equal(factory.events.at(-1)[0], 'update');
  });
  await test('Skip and expiration end all native rest activities without starting an expired one', async () => {
    const factory = makeFactory(); const sync = live.createRestActivitySync(factory);
    factory.start(live.getRestActivityProps(rest), '', new Date(rest.endTime)); factory.start(live.getRestActivityProps(rest), '', new Date(rest.endTime));
    await sync(rest, rest.endTime); assert.equal(factory.instances.length, 0);
    assert.equal(factory.events.filter(event => event[0] === 'end').length, 2);
    assert.equal(factory.events.at(-1)[2].finished, true);
    await sync(rest, 0); await sync(null, 0); assert.equal(factory.instances.length, 0);
  });
  await test('A start immediately superseded by stop never creates an orphan Live Activity', async () => {
    const factory = makeFactory(); const sync = live.createRestActivitySync(factory);
    await Promise.all([sync(rest, 0), sync(null, 0)]);
    assert.equal(factory.events.length, 0); assert.equal(factory.instances.length, 0);
  });
  await test('Native Live Activity denial leaves the queue usable for the next rest', async () => {
    const factory = makeFactory(); let fail = true; const start = factory.start.bind(factory);
    factory.start = (...args) => { if (fail) { fail = false; throw new Error('activities disabled'); } return start(...args); };
    const sync = live.createRestActivitySync(factory); await assert.rejects(sync(rest, 0), /activities disabled/);
    await sync(rest, 0); assert.equal(factory.instances.length, 1);
  });
  process.stdout.write(`${passed} system-feature checks passed.\n`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
