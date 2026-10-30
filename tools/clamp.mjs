/**
 * 值域截断辅助函数：把数字限制在闭区间 [min, max] 内。
 *
 * 只接受有限数字，遇到非数字、NaN 或 Infinity 时抛 TypeError；
 * 区间下界大于上界时抛 RangeError。值本身已经落在区间内时原样返回。
 *
 * @param {number} value 待截断的数值
 * @param {number} min 区间下界（含）
 * @param {number} max 区间上界（含）
 * @returns {number} 截断后的数值
 * @throws {TypeError} 任一参数不是有限数字
 * @throws {RangeError} min 大于 max
 */
export function clamp(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('clamp 的 value 必须是有限数字');
  }
  if (typeof min !== 'number' || !Number.isFinite(min)) {
    throw new TypeError('clamp 的 min 必须是有限数字');
  }
  if (typeof max !== 'number' || !Number.isFinite(max)) {
    throw new TypeError('clamp 的 max 必须是有限数字');
  }
  if (min > max) {
    throw new RangeError('clamp 要求 min 不能大于 max');
  }

  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export default clamp;
