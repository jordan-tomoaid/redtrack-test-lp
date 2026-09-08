import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCookies,
  serializeCookie,
  resolveClickId,
  persistClickId,
  readStoredClickId,
} from '../assets/js/clickid.js';
import { CLICKID_COOKIE, CLICKID_STORAGE_KEY } from '../assets/js/constants.js';

test('parseCookies splits pairs and decodes values', () => {
  assert.deepEqual(parseCookies('a=1; b=hello%20world'), { a: '1', b: 'hello world' });
});

test('parseCookies survives malformed input without losing the rest', () => {
  assert.deepEqual(parseCookies(''), {});
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies('=nokey; a=1; justflag'), { a: '1' });
});

test('parseCookies keeps a raw value when percent-decoding fails', () => {
  assert.deepEqual(parseCookies('a=%E0%A4%A'), { a: '%E0%A4%A' });
});

test('parseCookies reads a value containing an equals sign', () => {
  assert.deepEqual(parseCookies('token=ab=cd'), { token: 'ab=cd' });
});

test('serializeCookie sets path, SameSite and an expiry, and no Domain', () => {
  const cookie = serializeCookie(CLICKID_COOKIE, 'abc', { days: 1, now: new Date('2026-01-01T00:00:00Z') });
  assert.match(cookie, /^rtkclickid-store=abc;/);
  assert.match(cookie, /expires=Fri, 02 Jan 2026 00:00:00 GMT/);
  assert.match(cookie, /path=\//);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Domain=/);
});

test('serializeCookie encodes the value', () => {
  assert.match(serializeCookie('k', 'a b&c'), /^k=a%20b%26c;/);
});

test('resolveClickId prefers the URL over the cookie and localStorage', () => {
  const result = resolveClickId({
    params: { clickid: 'from-url' },
    cookies: { [CLICKID_COOKIE]: 'from-cookie' },
    stored: 'from-storage',
  });
  assert.deepEqual(result, { clickid: 'from-url', source: 'url' });
});

test('resolveClickId falls back to the cookie, then localStorage, then none', () => {
  assert.deepEqual(
    resolveClickId({ cookies: { [CLICKID_COOKIE]: 'c' }, stored: 's' }),
    { clickid: 'c', source: 'cookie' },
  );
  assert.deepEqual(resolveClickId({ stored: 's' }), { clickid: 's', source: 'localStorage' });
  assert.deepEqual(resolveClickId({}), { clickid: '', source: 'none' });
  assert.deepEqual(resolveClickId(), { clickid: '', source: 'none' });
});

test('resolveClickId ignores whitespace-only values at every level', () => {
  assert.deepEqual(
    resolveClickId({ params: { clickid: '  ' }, cookies: { [CLICKID_COOKIE]: '   ' }, stored: '  ' }),
    { clickid: '', source: 'none' },
  );
});

test('persistClickId writes both the cookie and localStorage', () => {
  const doc = { cookie: '' };
  const written = new Map();
  const result = persistClickId(doc, { setItem: (k, v) => written.set(k, v) }, 'abc');
  assert.equal(result.ok, true);
  assert.match(doc.cookie, /^rtkclickid-store=abc;/);
  assert.equal(written.get(CLICKID_STORAGE_KEY), 'abc');
});

test('persistClickId refuses a blank click ID with a reason', () => {
  const result = persistClickId({ cookie: '' }, { setItem: () => {} }, '   ');
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ['No click ID to persist.']);
});

test('persistClickId collects a storage failure without losing the cookie write', () => {
  const doc = { cookie: '' };
  const result = persistClickId(doc, { setItem: () => { throw new Error('blocked'); } }, 'abc');
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /localStorage: blocked/);
  assert.match(doc.cookie, /^rtkclickid-store=abc;/);
});

test('readStoredClickId returns null rather than throwing when storage is blocked', () => {
  assert.equal(readStoredClickId({ getItem: () => { throw new Error('nope'); } }), null);
  assert.equal(readStoredClickId(undefined), null);
  assert.equal(readStoredClickId({ getItem: () => 'abc' }), 'abc');
});
