import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendByFetch, parseReply, curlFor } from '../assets/js/postback.js';

const okResponse = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => body });

test('sendByFetch reads status and JSON reply when the tracker allows CORS', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push(init.mode); return okResponse('{"status":1,"message":"OK"}'); };
  const r = await sendByFetch('https://t.example.com/postback?clickid=a', fetchImpl);
  assert.deepEqual(calls, ['cors']);
  assert.equal(r.sent, true);
  assert.equal(r.readable, true);
  assert.equal(r.status, 200);
  assert.equal(r.ok, true);
  assert.deepEqual(r.reply, { status: 1, message: 'OK' });
});

test('sendByFetch reports a rejection with its status and body', async () => {
  const r = await sendByFetch('u', async () => okResponse('Forbidden', 403));
  assert.equal(r.sent, true);
  assert.equal(r.readable, true);
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
  assert.equal(r.reply, null);
  assert.equal(r.body, 'Forbidden');
});

test('sendByFetch falls back to an opaque send when CORS blocks the read, and says so', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(init.mode);
    if (init.mode === 'cors') throw new TypeError('Failed to fetch');
    return { type: 'opaque', status: 0 };
  };
  const r = await sendByFetch('u', fetchImpl);
  assert.deepEqual(calls, ['cors', 'no-cors']);
  assert.equal(r.sent, true);
  assert.equal(r.readable, false);
  assert.equal(r.status, null);
  assert.match(r.note, /could not be read/);
});

test('sendByFetch reports a total failure when even the opaque send throws', async () => {
  const r = await sendByFetch('u', async () => { throw new TypeError('offline'); });
  assert.equal(r.sent, false);
  assert.match(r.error, /offline/);
});

test('sendByFetch handles a missing fetch', async () => {
  const r = await sendByFetch('u', null); // undefined would fall through to the default param
  assert.equal(r.sent, false);
  assert.match(r.error, /unavailable/);
});

test('parseReply returns an object for JSON objects and null otherwise', () => {
  assert.deepEqual(parseReply('{"a":1}'), { a: 1 });
  assert.equal(parseReply('OK'), null);
  assert.equal(parseReply('[1]') === null, false, 'arrays are objects too');
  assert.equal(parseReply(''), null);
});

test('curlFor shows headers and escapes double quotes', () => {
  assert.equal(curlFor('https://t/postback?clickid=a&sum=1'), 'curl -i "https://t/postback?clickid=a&sum=1"');
  assert.equal(curlFor('https://t/?q="x"'), 'curl -i "https://t/?q=%22x%22"');
});
