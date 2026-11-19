import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.runInNewContext(readFileSync(new URL('./spinner.js', import.meta.url), 'utf8'), ctx);
const { pick, unwatched } = ctx;

test('pick never returns a watched movie', () => {
  const pool = unwatched(['A', 'B', 'C'], [{ title: 'a' }, { title: 'C ' }]);
  assert.equal(pick(pool, () => 0.99), 'B');
});

test('pick returns null when everything is watched', () => {
  assert.equal(pick(unwatched(['A'], [{ title: 'A' }])), null);
});
