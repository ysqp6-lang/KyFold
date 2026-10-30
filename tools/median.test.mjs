import test from 'node:test';
import assert from 'node:assert/strict';

import { median } from './median.mjs';

test('奇数个元素返回中间值', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([5]), 5);
  assert.equal(median([9, -1, 4, 2, 7]), 4);
});

test('偶数个元素返回中间两值的平均', () => {
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([4, 2]), 3);
  assert.equal(median([-2, -1, 1, 2]), 0);
});

test('输入无序时先排序再取值', () => {
  assert.equal(median([100, -5, 7, 7, 0]), 7);
  assert.equal(median([10, 2, 8, 4]), 6);
});

test('支持浮点数', () => {
  assert.equal(median([0.5, 0.25, 0.125]), 0.25);
  assert.equal(median([0.5, 0.25]), 0.375);
});

test('极端有限值不会溢出', () => {
  assert.equal(median([Number.MAX_VALUE, Number.MAX_VALUE]), Number.MAX_VALUE);
  assert.equal(median([-Number.MAX_VALUE, Number.MAX_VALUE]), 0);
  assert.equal(median([Number.MIN_VALUE, Number.MIN_VALUE]), Number.MIN_VALUE);
});

test('支持任意可迭代对象', () => {
  assert.equal(median(new Set([9, 1, 5])), 5);
  assert.equal(median(new Uint8Array([4, 2, 6, 8])), 5);

  function* numbers() {
    yield 3;
    yield 1;
    yield 2;
  }
  assert.equal(median(numbers()), 2);
});

test('不修改传入的数组', () => {
  const values = [3, 1, 2];
  median(values);
  assert.deepEqual(values, [3, 1, 2]);
});

test('空集合抛出 RangeError', () => {
  assert.throws(() => median([]), RangeError);
  assert.throws(() => median(new Set()), RangeError);
});

test('非可迭代输入抛出 TypeError', () => {
  assert.throws(() => median(null), TypeError);
  assert.throws(() => median(undefined), TypeError);
  assert.throws(() => median(42), TypeError);
  assert.throws(() => median({}), TypeError);
});

test('遇到非数字时抛出 TypeError', () => {
  assert.throws(() => median([1, '2']), TypeError);
  assert.throws(() => median([1, null]), TypeError);
  assert.throws(() => median([1, undefined]), TypeError);
});

test('遇到 NaN 或 Infinity 时抛出 TypeError', () => {
  assert.throws(() => median([1, Number.NaN]), TypeError);
  assert.throws(() => median([1, Number.POSITIVE_INFINITY]), TypeError);
  assert.throws(() => median([1, Number.NEGATIVE_INFINITY]), TypeError);
});
