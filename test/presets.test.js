import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, REG_PRESET, SIGNUP_SOURCE, resolvePreset } from '../assets/js/presets.js';
import { buildPostbackUrl } from '../assets/js/urls.js';

const RT = { tracker: 'redtrack', trackingDomain: 'trk.example.com' };
const url = (preset, clickid = 'abc') => buildPostbackUrl(RT, resolvePreset(preset, clickid));
const byKey = (k) => PRESETS.find((p) => p.key === k);

test('eight presets with unique keys, all frozen, in verification order', () => {
  assert.equal(PRESETS.length, 8);
  assert.equal(new Set(PRESETS.map((p) => p.key)).size, 8);
  assert.deepEqual(PRESETS.map((p) => p.key), ['reg', 'reg-dup', 'ftd-20', 'ftd-20-same', 'ftd-20-new', 'redeposit-10', 'unknown', 'reg-pending']);
  for (const p of PRESETS) assert.equal(Object.isFrozen(p), true, p.key);
});

test('the sign-up reg preset produces the exact URL the spec requires', () => {
  assert.equal(
    url(REG_PRESET, 'test123'),
    'https://trk.example.com/postback?clickid=test123&sum=0&type=reg&status=approved&rdtk_event_id=reg-test123&sub1=signup_form&sub2=onclick_test',
  );
  assert.equal(SIGNUP_SOURCE, 'onclick_test');
});

test('reg (dup) sends an identical payload so the tracker can de-duplicate it', () => {
  assert.equal(url(byKey('reg-dup')), url(REG_PRESET));
});

test('ftd same-id repeats the event id; ftd new-id changes only the event id', () => {
  const a = url(byKey('ftd-20')), same = url(byKey('ftd-20-same')), fresh = url(byKey('ftd-20-new'));
  assert.equal(same, a);
  assert.notEqual(fresh, a);
  assert.equal(fresh.replace('order-1002', 'order-1001'), a);
  assert.match(a, /type=ftd&status=approved&rdtk_event_id=order-1001&sub1=card$/);
  assert.match(a, /sum=20/);
});

test('redeposit, unknown type and pending status map as specified', () => {
  assert.match(url(byKey('redeposit-10')), /sum=10&type=redeposit&status=approved&rdtk_event_id=order-1003$/);
  const unknown = url(byKey('unknown'));
  assert.match(unknown, /type=foo&status=approved$/);
  assert.doesNotMatch(unknown, /rdtk_event_id/, 'unknown type carries no event id');
  assert.match(url(byKey('reg-pending'), 'zz'), /type=reg&status=pending&rdtk_event_id=reg-pending-zz$/);
});

test('resolvePreset trims the click id and never mutates the preset', () => {
  const before = JSON.stringify(REG_PRESET);
  const r = resolvePreset(REG_PRESET, '  abc  ');
  assert.equal(r.clickid, 'abc');
  assert.equal(r.txid, 'reg-abc');
  assert.equal(JSON.stringify(REG_PRESET), before);
  assert.equal(Object.isFrozen(r), true);
});
