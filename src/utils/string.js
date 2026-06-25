class StringUtil {
  /**
   * 生成指定长度的随机字符串
   * @param {number} length - 字符串长度
   * @param {string} chars - 可用字符集
   * @returns {string} - 随机字符串
   */
  static random(
    length = 8,
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  ) {
    let result = "";
    const charsLength = chars.length;

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * charsLength));
    }

    return result;
  }

  /**
   * 生成随机数字字符串（兼容PHP的mt_rand函数）
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {string} - 随机数字字符串
   */
  static randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * 截取字符串（支持中文）
   * @param {string} str - 原始字符串
   * @param {number} start - 开始位置
   * @param {number} length - 截取长度
   * @returns {string} - 截取后的字符串
   */
  static substr(str, start, length) {
    if (!str) return "";
    return str.substr(start, length);
  }

  /**
   * 检查字符串是否为空
   * @param {string} str - 要检查的字符串
   * @returns {boolean} - 是否为空
   */
  static isEmpty(str) {
    return !str || str.trim() === "";
  }

  /**
   * 获取字符串长度（支持中文）
   * @param {string} str - 要检查的字符串
   * @returns {number} - 字符串长度
   */
  static length(str) {
    if (!str) return 0;
    return str.length;
  }

  /**
   * 格式化金额（保留两位小数）
   * @param {number|string} amount - 金额
   * @returns {string} - 格式化后的金额
   */
  static formatMoney(amount) {
    return parseFloat(amount).toFixed(2);
  }

  /**
   * 比较两个金额大小（兼容PHP的bccomp函数）
   * @param {number|string} a - 第一个金额
   * @param {number|string} b - 第二个金额
   * @param {number} scale - 小数位数
   * @returns {number} - 比较结果：1(a>b), 0(a=b), -1(a<b)
   */
  static compareAmount(a, b, scale = 2) {
    const factor = Math.pow(10, scale);
    const aInt = Math.round(parseFloat(a) * factor);
    const bInt = Math.round(parseFloat(b) * factor);

    if (aInt > bInt) return 1;
    if (aInt < bInt) return -1;
    return 0;
  }

  /**
   * 减法运算（兼容PHP的bcsub函数）
   * @param {number|string} a - 被减数
   * @param {number|string} b - 减数
   * @param {number} scale - 小数位数
   * @returns {string} - 计算结果
   */
  static subtract(a, b, scale = 2) {
    const result = parseFloat(a) - parseFloat(b);
    return result.toFixed(scale);
  }
}

module.exports = StringUtil;
