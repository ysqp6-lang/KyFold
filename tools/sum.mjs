/**
 * 求和辅助函数：对任意可迭代的数字集合求和。
 *
 * 只接受有限数字，遇到非数字、NaN 或 Infinity 时抛 TypeError，
 * 避免把坏数据静默算成 NaN 或 Infinity。
 *
 * @param {Iterable<number>} values 待求和的数字集合
 * @returns {number} 总和；空集合返回 0
 */
export function sum(values) {
  let total = 0;
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError('sum 只接受有限数字');
    }
    total += value;
  }
  return total;
}

export default sum;
