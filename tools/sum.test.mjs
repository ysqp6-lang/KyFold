import test from 'node:test';
import assert from 'node:assert/strict';

import { sum } from './sum.mjs';

test('空集合求和为 0', () => {
  assert.equal(sum([]), 0);
});

test('正整数与负数累加', () => {
  assert.equal(sum([1, 2, 3, 4]), 10);
  assert.equal(sum([-1, 1, -2, 2]), 0);
  assert.equal(sum([5]), 5);
});

test('支持浮点数', () => {
  assert.equal(sum([0.5, 0.25, 0.125]), 0.875);
});

test('支持任意可迭代对象', () => {
  assert.equal(sum(new Set([2, 4, 6])), 12);
  assert.equal(sum(new Uint8Array([1, 2, 3])), 6);
});

test('遇到非数字时抛出 TypeError', () => {
  assert.throws(() => sum([1, '2']), TypeError);
  assert.throws(() => sum([1, null]), TypeError);
  assert.throws(() => sum([1, undefined]), TypeError);
});

test('遇到 NaN 或 Infinity 时抛出 TypeError', () => {
  assert.throws(() => sum([1, Number.NaN]), TypeError);
  assert.throws(() => sum([1, Number.POSITIVE_INFINITY]), TypeError);
  assert.throws(() => sum([1, Number.NEGATIVE_INFINITY]), TypeError);
});
