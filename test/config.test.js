import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  withDefaults,
  updateConfig,
  parseStoredConfig,
  applyUrlOverrides,
  validateConfig,
  readConfig,
  writeConfig,
} from '../assets/js/config.js';
import { DEFAULT_CONFIG, STORAGE_KEY } from '../assets/js/constants.js';

/** In-memory stand-in for localStorage. */
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    dump: () => Object.fromEntries(data),
  };
}

function throwingStorage(message) {
  return {
    getItem: () => { throw new Error(message); },
    setItem: () => { throw new Error(message); },
  };
}

const COMPLETE = Object.freeze({
  trackingDomain: 'track.example.com',
  campaignId: 'cmp1',
  offerUrl: 'https://offer.example.com',
  universalScript: '<script></script>',
  defaultSum: '1.00',
});

test('withDefaults fills every key and drops unknown ones', () => {
  const config = withDefaults({ trackingDomain: 'a.com', bogus: 'x' });
  assert.deepEqual(Object.keys(config).sort(), Object.keys(DEFAULT_CONFIG).sort());
  assert.equal(config.trackingDomain, 'a.com');
  assert.equal(config.campaignId, '');
});

test('withDefaults ignores non-string values and non-object input', () => {
  assert.equal(withDefaults({ campaignId: 42 }).campaignId, '');
  assert.deepEqual(withDefaults(null), DEFAULT_CONFIG);
  assert.deepEqual(withDefaults('nope'), DEFAULT_CONFIG);
});

test('updateConfig returns a new frozen object and leaves the original alone', () => {
  const before = withDefaults({ campaignId: 'one' });
  const after = updateConfig(before, { campaignId: 'two' });
  assert.equal(before.campaignId, 'one');
  assert.equal(after.campaignId, 'two');
  assert.equal(Object.isFrozen(after), true);
  assert.notEqual(before, after);
});

test('parseStoredConfig returns defaults for absent storage', () => {
  assert.deepEqual(parseStoredConfig(null), { config: DEFAULT_CONFIG, error: null });
  assert.deepEqual(parseStoredConfig(''), { config: DEFAULT_CONFIG, error: null });
});

test('parseStoredConfig recovers from invalid JSON and says why', () => {
  const result = parseStoredConfig('{not json');
  assert.deepEqual(result.config, DEFAULT_CONFIG);
  assert.match(result.error, /not valid JSON/);
});

test('parseStoredConfig rejects a JSON array or scalar', () => {
  assert.match(parseStoredConfig('[1,2]').error, /not an object/);
  assert.match(parseStoredConfig('"hello"').error, /not an object/);
});

test('applyUrlOverrides maps rt_ params onto config fields', () => {
  const { config, applied } = applyUrlOverrides(DEFAULT_CONFIG, '?rt_domain=t.com&rt_cmpid=c9');
  assert.equal(config.trackingDomain, 't.com');
  assert.equal(config.campaignId, 'c9');
  assert.deepEqual([...applied].sort(), ['campaignId', 'trackingDomain']);
});

test('applyUrlOverrides ignores blank overrides and reports nothing applied', () => {
  const { config, applied } = applyUrlOverrides(withDefaults({ campaignId: 'keep' }), '?rt_cmpid=');
  assert.equal(config.campaignId, 'keep');
  assert.deepEqual(applied, []);
});

test('validateConfig passes only when every required field is present', () => {
  assert.equal(validateConfig(COMPLETE).valid, true);
  assert.deepEqual(validateConfig(COMPLETE).errors, []);
});

test('validateConfig names each missing field', () => {
  const result = validateConfig(DEFAULT_CONFIG);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 4);
  assert.match(result.errors.join(' '), /Tracking domain/);
  assert.match(result.errors.join(' '), /Campaign ID/);
  assert.match(result.errors.join(' '), /Offer URL/);
  assert.match(result.errors.join(' '), /universal script/);
});

test('validateConfig treats a scheme-only domain as missing', () => {
  assert.equal(validateConfig(updateConfig(COMPLETE, { trackingDomain: 'https://' })).valid, false);
});

test('readConfig combines stored values with URL overrides', () => {
  const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify(COMPLETE) });
  const { config, applied, errors } = readConfig(storage, '?rt_cmpid=override');
  assert.equal(config.trackingDomain, 'track.example.com');
  assert.equal(config.campaignId, 'override');
  assert.deepEqual(applied, ['campaignId']);
  assert.deepEqual(errors, []);
});

test('readConfig reports a storage read failure instead of hiding it', () => {
  const { config, errors } = readConfig(throwingStorage('access denied'), '');
  assert.deepEqual(config, DEFAULT_CONFIG);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Could not read saved settings: access denied/);
});

test('writeConfig persists a normalised config and round-trips through readConfig', () => {
  const storage = fakeStorage();
  const result = writeConfig(storage, { ...COMPLETE, bogus: 'x' });
  assert.equal(result.error, null);
  assert.equal(JSON.parse(storage.dump()[STORAGE_KEY]).bogus, undefined);
  assert.deepEqual(readConfig(storage, '').config, withDefaults(COMPLETE));
});

test('writeConfig reports a storage write failure', () => {
  const result = writeConfig(throwingStorage('quota exceeded'), COMPLETE);
  assert.match(result.error, /Could not save settings: quota exceeded/);
  assert.deepEqual(result.config, withDefaults(COMPLETE));
});
