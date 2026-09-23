import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKERS, TRACKER_KEYS, DEFAULT_TRACKER, trackerOf, isKnownTracker, modeOf, scriptModeActive, MODE_LABELS } from '../assets/js/trackers.js';

const REQUIRED = ['key', 'label', 'clickParams', 'cookie', 'paths', 'postback', 'campaignParam', 'script', 'notes'];

test('every profile carries the full shape and is frozen', () => {
  for (const key of TRACKER_KEYS) {
    const t = TRACKERS[key];
    assert.equal(t.key, key);
    for (const field of REQUIRED) assert.ok(field in t, `${key} is missing ${field}`);
    assert.equal(Object.isFrozen(t), true);
    assert.ok(t.clickParams.length > 0);
    assert.ok(['required', 'optional'].includes(t.script));
    assert.ok(t.paths.click && t.paths.postback, `${key} must have click and postback paths`);
    assert.ok(t.postback.clickid, `${key} must map the click ID postback param`);
    assert.ok(t.clickParams.includes(t.outParam), `${key}.outParam must be one of its own clickParams`);
  }
});

test('RedTrack profile keeps the names its docs mandate', () => {
  const t = TRACKERS.redtrack;
  assert.equal(t.cookie, 'rtkclickid-store');
  assert.deepEqual([...t.clickParams], ['rtkcid', 'clickid', 'rtkclickid']);
  assert.deepEqual({ ...t.postback }, { clickid: 'clickid', sum: 'sum', type: 'type', txid: 'rdtk_event_id', status: 'status' });
  assert.equal(t.campaignParam, 'cmpid');
  assert.equal(t.paths.preclick, 'preclick');
  assert.equal(t.outParam, 'clickid', 'lander URLs use clickid, not the rtkcid alias');
  assert.match(t.builtInScript, /^https:\/\/wmipr\.ttrk\.io\/uniclick\.js\?/);
});

test('every profile declares builtInScript explicitly (string or null)', () => {
  for (const key of TRACKER_KEYS) {
    const v = TRACKERS[key].builtInScript;
    assert.ok(v === null || (typeof v === 'string' && v.startsWith('https://')), `${key}.builtInScript`);
  }
});

test('Voluum profile uses cid / payout / et / txid and has no preclick or campaign param', () => {
  const t = TRACKERS.voluum;
  assert.deepEqual({ ...t.postback }, { clickid: 'cid', sum: 'payout', type: 'et', txid: 'txid', status: null });
  assert.equal(t.clickParams[0], 'cid');
  assert.equal(t.outParam, 'cid');
  assert.equal(t.paths.preclick, null);
  assert.equal(t.campaignParam, null);
  assert.equal(t.script, 'optional');
});

test('trackerOf falls back to the default for unknown or missing keys', () => {
  assert.equal(trackerOf({ tracker: 'voluum' }).key, 'voluum');
  assert.equal(trackerOf({ tracker: 'nope' }).key, DEFAULT_TRACKER);
  assert.equal(trackerOf({}).key, DEFAULT_TRACKER);
  assert.equal(trackerOf(undefined).key, DEFAULT_TRACKER);
});

test('every profile lists supported modes, redirect first, all labelled', () => {
  for (const key of TRACKER_KEYS) {
    const t = TRACKERS[key];
    assert.ok(t.modes.length > 0, `${key}.modes`);
    assert.equal(t.modes[0], 'redirect', `${key} should default to redirect`);
    for (const m of t.modes) assert.ok(MODE_LABELS[m], `label for ${m}`);
  }
  assert.deepEqual([...TRACKERS.redtrack.modes], ['redirect', 'script']);
  assert.deepEqual([...TRACKERS.voluum.modes], ['redirect']);
});

test('modeOf honours a supported mode and snaps an unsupported one to the tracker default', () => {
  assert.equal(modeOf({ tracker: 'redtrack', mode: 'script' }), 'script');
  assert.equal(modeOf({ tracker: 'redtrack', mode: 'bogus' }), 'redirect');
  assert.equal(modeOf({ tracker: 'voluum', mode: 'script' }), 'redirect', 'Voluum has no script mode');
  assert.equal(modeOf({}), 'redirect');
  assert.equal(scriptModeActive({ tracker: 'redtrack', mode: 'script' }), true);
  assert.equal(scriptModeActive({ tracker: 'redtrack' }), false);
});

test('isKnownTracker rejects prototype keys and non-strings', () => {
  assert.equal(isKnownTracker('redtrack'), true);
  assert.equal(isKnownTracker('toString'), false);
  assert.equal(isKnownTracker(42), false);
});
