import test from 'node:test';
import assert from 'node:assert/strict';

import { clamp } from './clamp.mjs';

test('区间内的值原样返回', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
  assert.equal(clamp(-3, -5, -1), -3);
});

test('低于下界的值截断为下界', () => {
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(-100, -10, 10), -10);
  assert.equal(clamp(0.1, 0.5, 1), 0.5);
});

test('高于上界的值截断为上界', () => {
  assert.equal(clamp(11, 0, 10), 10);
  assert.equal(clamp(100, -10, 10), 10);
  assert.equal(clamp(1.5, 0, 1), 1);
});

test('支持浮点数与负数区间', () => {
  assert.equal(clamp(0.5, -0.25, 0.25), 0.25);
  assert.equal(clamp(-0.75, -0.5, 0.5), -0.5);
  assert.equal(clamp(0.125, 0, 1), 0.125);
});

test('下界等于上界时恒为该值', () => {
  assert.equal(clamp(5, 3, 3), 3);
  assert.equal(clamp(-1, 3, 3), 3);
  assert.equal(clamp(9, 3, 3), 3);
});

test('极端有限值不会溢出', () => {
  assert.equal(clamp(0, -Number.MAX_VALUE, Number.MAX_VALUE), 0);
  assert.equal(clamp(Number.MAX_VALUE, 0, 1), 1);
  assert.equal(clamp(-Number.MAX_VALUE, -1, 1), -1);
});

test('非数字参数抛出 TypeError', () => {
  assert.throws(() => clamp('5', 0, 10), TypeError);
  assert.throws(() => clamp(5, '0', 10), TypeError);
  assert.throws(() => clamp(5, 0, '10'), TypeError);
  assert.throws(() => clamp(null, 0, 10), TypeError);
  assert.throws(() => clamp(5, null, 10), TypeError);
  assert.throws(() => clamp(5, 0, undefined), TypeError);
});

test('NaN 或 Infinity 参数抛出 TypeError', () => {
  assert.throws(() => clamp(Number.NaN, 0, 10), TypeError);
  assert.throws(() => clamp(Number.POSITIVE_INFINITY, 0, 10), TypeError);
  assert.throws(() => clamp(5, Number.NEGATIVE_INFINITY, 10), TypeError);
  assert.throws(() => clamp(5, 0, Number.POSITIVE_INFINITY), TypeError);
});

test('下界大于上界时抛出 RangeError', () => {
  assert.throws(() => clamp(5, 10, 0), RangeError);
  assert.throws(() => clamp(5, 1, 0), RangeError);
});
