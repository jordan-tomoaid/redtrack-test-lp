import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseQuery,
  classifyParams,
  findClickId,
  pickPassThrough,
} from '../assets/js/params.js';
import { TRACKERS } from '../assets/js/trackers.js';

test('parseQuery handles a leading question mark and decodes values', () => {
  assert.deepEqual(parseQuery('?clickid=abc&sub1=hello%20world'), {
    clickid: 'abc',
    sub1: 'hello world',
  });
});

test('parseQuery tolerates missing, empty and non-string input', () => {
  assert.deepEqual(parseQuery(''), {});
  assert.deepEqual(parseQuery(undefined), {});
  assert.deepEqual(parseQuery(null), {});
  assert.deepEqual(parseQuery(42), {});
});

test('parseQuery keeps duplicate keys visible instead of dropping them', () => {
  assert.deepEqual(parseQuery('?sub1=a&sub1=b'), { sub1: 'a, b' });
});

test('parseQuery returns a frozen object', () => {
  assert.equal(Object.isFrozen(parseQuery('?a=1')), true);
});

test('classifyParams buckets tracking, sub, utm and other params', () => {
  const result = classifyParams(
    parseQuery('?clickid=x&cmpid=c1&sub1=s&sub_2=t&utm_source=fb&colour=red'),
  );
  assert.deepEqual(result.tracking.map((e) => e.name), ['clickid', 'cmpid']);
  assert.deepEqual(result.sub.map((e) => e.name), ['sub1', 'sub_2']);
  assert.deepEqual(result.utm.map((e) => e.name), ['utm_source']);
  assert.deepEqual(result.other.map((e) => e.name), ['colour']);
});

test('classifyParams is case insensitive and never throws on empty input', () => {
  assert.deepEqual(classifyParams({ ClickID: 'x' }).tracking.map((e) => e.name), ['ClickID']);
  assert.deepEqual(classifyParams(undefined).other, []);
});

test('classifyParams does not treat subid as a sub parameter', () => {
  assert.deepEqual(classifyParams({ subid: 'x' }).other.map((e) => e.name), ['subid']);
});

test('findClickId prefers rtkcid, then clickid, then rtkclickid', () => {
  assert.equal(findClickId({ rtkcid: 'a', clickid: 'b', rtkclickid: 'c' }), 'a');
  assert.equal(findClickId({ clickid: 'b', rtkclickid: 'c' }), 'b');
  assert.equal(findClickId({ rtkclickid: 'c' }), 'c');
});

test('findClickId honours the tracker priority list it is given', () => {
  assert.equal(findClickId({ cid: 'v1', clickid: 'v2' }, TRACKERS.voluum.clickParams), 'v1');
  assert.equal(findClickId({ clickid: 'v2' }, TRACKERS.voluum.clickParams), 'v2');
  assert.equal(findClickId({ rtkcid: 'r1' }, TRACKERS.voluum.clickParams), '', 'rtkcid is not a Voluum param');
});

test('classifyParams treats Voluum params as tracking params', () => {
  const r = classifyParams({ cid: 'a', payout: '1', et: 'lead', txid: 't', cep: 'x', sub1: 's' });
  assert.deepEqual(r.tracking.map((e) => e.name), ['cid', 'payout', 'et', 'txid', 'cep']);
  assert.deepEqual(r.sub.map((e) => e.name), ['sub1']);
});

test('findClickId ignores blank values and trims the result', () => {
  assert.equal(findClickId({ rtkcid: '   ', clickid: ' b ' }), 'b');
  assert.equal(findClickId({}), '');
  assert.equal(findClickId(undefined), '');
});

test('pickPassThrough forwards subs and utms but not tracking params', () => {
  assert.deepEqual(
    pickPassThrough(parseQuery('?clickid=x&sub1=a&utm_medium=cpc&colour=red')),
    { sub1: 'a', utm_medium: 'cpc' },
  );
});
