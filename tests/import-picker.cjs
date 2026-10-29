const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const { createImportPickerGate, getImportFileError, isPickerAlreadyOpen } = require('../lib/importDocumentPicker.ts');
const canceled = { canceled: true, assets: null };
const selected = { canceled: false, assets: [{ name: 'seances.xlsx', uri: 'file:///cache/seances.xlsx', lastModified: 0 }] };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
let passed = 0;
async function test(name, fn) { await fn(); passed++; process.stdout.write(`OK ${name}\n`); }
async function main() {
  await test('Two taps in one frame invoke the native picker exactly once', async () => {
    const gate = createImportPickerGate(); const pending = deferred(); let calls = 0;
    const picker = options => { calls++; assert.equal(options.multiple, false); assert.equal(options.copyToCacheDirectory, true); assert.equal(options.type, '*/*'); return pending.promise; };
    const first = gate(picker); const second = gate(picker);
    assert.deepEqual(await second, { status: 'busy' }); assert.equal(calls, 1);
    pending.resolve(selected); assert.deepEqual(await first, { status: 'result', result: selected });
  });
  await test('Canceling a picker permits a fresh selection', async () => {
    const gate = createImportPickerGate();
    assert.equal((await gate(async () => canceled)).result.canceled, true);
    assert.deepEqual(await gate(async () => selected), { status: 'result', result: selected });
  });
  await test('Native rejection releases the lock and preserves the original error', async () => {
    const gate = createImportPickerGate(); const pending = deferred();
    const first = gate(() => pending.promise);
    const expected = assert.rejects(first, /native failure/);
    pending.reject(new Error('native failure')); await expected;
    assert.equal((await gate(async () => selected)).status, 'result');
  });
  await test('Synchronous failure also releases the selection lock', async () => {
    const gate = createImportPickerGate();
    await assert.rejects(gate(() => { throw new Error('sync failure'); }), /sync failure/);
    assert.equal((await gate(async () => canceled)).status, 'result');
  });
  await test('A new screen cannot start another native selection before the first settles', async () => {
    const gate = createImportPickerGate(); const pending = deferred(); let secondScreenCalls = 0;
    const abandonedScreen = gate(() => pending.promise);
    for (let i = 0; i < 3; i++) assert.equal((await gate(async () => { secondScreenCalls++; return selected; })).status, 'busy');
    assert.equal(secondScreenCalls, 0);
    pending.resolve(canceled); await abandonedScreen;
    assert.equal((await gate(async () => { secondScreenCalls++; return selected; })).status, 'result');
    assert.equal(secondScreenCalls, 1);
  });
  await test('Picker-busy errors produce recovery guidance instead of a false Excel-reading error', async () => {
    const error = new Error("Error calling the 'getDocumentAsync' function has failed. Caused by: Different document picking in progress. Await other document picking first.");
    assert.equal(isPickerAlreadyOpen(error), true);
    assert.equal(isPickerAlreadyOpen({ code: 'ERR_PICKING_IN_PROGRESS' }), true);
    assert.equal(isPickerAlreadyOpen(new Error('Unreadable file')), false);
    const message = getImportFileError(error, 'picking');
    assert.ok(message.includes('ferme complètement GymTracker'));
    assert.ok(message.includes('Ne désinstalle pas'));
    assert.ok(getImportFileError(new Error('File missing'), 'reading').includes('sélectionné'));
  });
  process.stdout.write(`${passed} document-picker checks passed.\n`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
