import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debugRequested } from '../assets/js/page.js';

test('debugRequested is true only for debug=1 or debug=true', () => {
  assert.equal(debugRequested('?debug=1'), true);
  assert.equal(debugRequested('?clickid=a&debug=true'), true);
  assert.equal(debugRequested('?debug=0'), false);
  assert.equal(debugRequested('?debug='), false);
  assert.equal(debugRequested('?clickid=a'), false);
  assert.equal(debugRequested(''), false);
  assert.equal(debugRequested(undefined), false);
});
