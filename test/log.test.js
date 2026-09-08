import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLog, appendEntry } from '../assets/js/log.js';

test('createLog starts empty and frozen', () => {
  const state = createLog();
  assert.deepEqual(state.entries, []);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.entries), true);
});

test('appendEntry returns a new state and never mutates the previous one', () => {
  const first = createLog();
  const second = appendEntry(first, { message: 'one' });
  assert.equal(first.entries.length, 0);
  assert.equal(second.entries.length, 1);
  assert.notEqual(first, second);
});

test('appendEntry records level, message, detail and an ISO timestamp', () => {
  const state = appendEntry(createLog(), {
    level: 'error',
    message: 'boom',
    detail: 'because',
    at: new Date('2026-09-08T12:34:56Z'),
  });
  assert.deepEqual(state.entries[0], {
    level: 'error',
    message: 'boom',
    detail: 'because',
    at: '2026-09-08T12:34:56.000Z',
  });
});

test('appendEntry defaults to info with a null detail', () => {
  const entry = appendEntry(createLog(), { message: 'hi' }).entries[0];
  assert.equal(entry.level, 'info');
  assert.equal(entry.detail, null);
});

test('appendEntry preserves order across several appends', () => {
  const state = ['a', 'b', 'c'].reduce((acc, message) => appendEntry(acc, { message }), createLog());
  assert.deepEqual(state.entries.map((e) => e.message), ['a', 'b', 'c']);
});
