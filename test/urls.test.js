import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDomain,
  buildTrackingUrl,
  buildClickUrl,
  buildPreClickUrl,
  buildPostbackUrl,
  appendParams,
} from '../assets/js/urls.js';

test('normalizeDomain strips scheme, trailing slashes and whitespace', () => {
  assert.equal(normalizeDomain('  https://track.example.com/  '), 'track.example.com');
  assert.equal(normalizeDomain('HTTP://track.example.com'), 'track.example.com');
  assert.equal(normalizeDomain('track.example.com///'), 'track.example.com');
  assert.equal(normalizeDomain(''), '');
  assert.equal(normalizeDomain(undefined), '');
});

test('buildTrackingUrl forces https and omits an empty query', () => {
  assert.equal(buildTrackingUrl('track.example.com', 'click'), 'https://track.example.com/click');
  assert.equal(buildTrackingUrl('track.example.com', '/click'), 'https://track.example.com/click');
});

test('buildTrackingUrl drops empty, null and undefined params', () => {
  assert.equal(
    buildTrackingUrl('track.example.com', 'click', { a: '1', b: '', c: null, d: undefined, e: '  ' }),
    'https://track.example.com/click?a=1',
  );
});

test('buildTrackingUrl encodes param values', () => {
  assert.equal(
    buildTrackingUrl('track.example.com', 'click', { sub1: 'a b&c' }),
    'https://track.example.com/click?sub1=a+b%26c',
  );
});

test('buildTrackingUrl fails loudly when the domain is missing', () => {
  assert.throws(() => buildTrackingUrl('', 'click'), /Tracking domain is not configured/);
  assert.throws(() => buildTrackingUrl('   ', 'click'), /Tracking domain is not configured/);
});

test('buildClickUrl and buildPreClickUrl use the right path and carry cmpid', () => {
  const config = { trackingDomain: 'track.example.com', campaignId: 'cmp1' };
  assert.equal(buildClickUrl(config), 'https://track.example.com/click?cmpid=cmp1');
  assert.equal(buildPreClickUrl(config), 'https://track.example.com/preclick?cmpid=cmp1');
  assert.equal(
    buildClickUrl(config, { sub1: 'x' }),
    'https://track.example.com/click?cmpid=cmp1&sub1=x',
  );
});

test('buildPostbackUrl requires a click ID', () => {
  assert.throws(
    () => buildPostbackUrl('track.example.com', { sum: '1' }),
    /click ID is required/,
  );
  assert.throws(() => buildPostbackUrl('track.example.com', {}), /click ID is required/);
});

test('buildPostbackUrl assembles clickid, sum and type', () => {
  assert.equal(
    buildPostbackUrl('track.example.com', { clickid: 'abc', sum: '12.50', type: 'Lead' }),
    'https://track.example.com/postback?clickid=abc&sum=12.50&type=Lead',
  );
});

test('buildPostbackUrl omits an absent sum or type', () => {
  assert.equal(
    buildPostbackUrl('track.example.com', { clickid: 'abc' }),
    'https://track.example.com/postback?clickid=abc',
  );
});

test('appendParams merges into an existing query and preserves the hash', () => {
  assert.equal(
    appendParams('https://offer.example.com/lp?a=1#top', { clickid: 'x' }),
    'https://offer.example.com/lp?a=1&clickid=x#top',
  );
});

test('appendParams lets supplied params win over existing ones', () => {
  assert.equal(
    appendParams('https://offer.example.com/lp?clickid=old', { clickid: 'new' }),
    'https://offer.example.com/lp?clickid=new',
  );
});

test('appendParams rejects an empty or relative base URL with a readable message', () => {
  assert.throws(() => appendParams(''), /Offer URL is empty/);
  assert.throws(() => appendParams('offer.example.com'), /not a valid absolute URL/);
});
