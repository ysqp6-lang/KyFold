/**
 * 中位数辅助函数：计算任意可迭代数字集合的中位数。
 *
 * 只接受有限数字，遇到非数字、NaN 或 Infinity 时抛 TypeError；
 * 空集合没有中位数，抛 RangeError。输入集合本身不会被修改。
 *
 * @param {Iterable<number>} values 待计算中位数的数字集合
 * @returns {number} 中位数；偶数个元素时取中间两个数的平均值
 * @throws {TypeError} 输入不可迭代或包含非有限数字
 * @throws {RangeError} 输入为空集合
 */
export function median(values) {
  const numbers = [];
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError('median 只接受有限数字');
    }
    numbers.push(value);
  }

  if (numbers.length === 0) {
    throw new RangeError('median 不能计算空集合');
  }

  numbers.sort((a, b) => a - b);
  const middle = Math.floor(numbers.length / 2);

  if (numbers.length % 2 === 1) {
    return numbers[middle];
  }

  const lower = numbers[middle - 1];
  const upper = numbers[middle];
  const sum = lower + upper;

  // 两个超大数相加会溢出成 Infinity，改成分开取半以避免丢精度。
  return Number.isFinite(sum) ? sum / 2 : lower / 2 + upper / 2;
}

export default median;
