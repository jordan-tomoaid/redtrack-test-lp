import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKERS, TRACKER_KEYS, DEFAULT_TRACKER, trackerOf, isKnownTracker } from '../assets/js/trackers.js';

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
  }
});

test('RedTrack profile keeps the names its docs mandate', () => {
  const t = TRACKERS.redtrack;
  assert.equal(t.cookie, 'rtkclickid-store');
  assert.deepEqual([...t.clickParams], ['rtkcid', 'clickid', 'rtkclickid']);
  assert.deepEqual({ ...t.postback }, { clickid: 'clickid', sum: 'sum', type: 'type', txid: null });
  assert.equal(t.campaignParam, 'cmpid');
  assert.equal(t.paths.preclick, 'preclick');
});

test('Voluum profile uses cid / payout / et / txid and has no preclick or campaign param', () => {
  const t = TRACKERS.voluum;
  assert.deepEqual({ ...t.postback }, { clickid: 'cid', sum: 'payout', type: 'et', txid: 'txid' });
  assert.equal(t.clickParams[0], 'cid');
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

test('isKnownTracker rejects prototype keys and non-strings', () => {
  assert.equal(isKnownTracker('redtrack'), true);
  assert.equal(isKnownTracker('toString'), false);
  assert.equal(isKnownTracker(42), false);
});
