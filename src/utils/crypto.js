const bcrypt = require("bcrypt");
const crypto = require("crypto");

class CryptoUtil {
  /**
   * 使用bcrypt哈希密码
   * @param {string} password - 原始密码
   * @returns {string} - 哈希后的密码
   */
  static async hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * 验证密码
   * @param {string} password - 原始密码
   * @param {string} hash - 哈希后的密码
   * @returns {boolean} - 验证结果
   */
  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * MD5加密（保留兼容旧系统）
   * @param {string} text - 要加密的文本
   * @returns {string} - 加密后的文本
   */
  static md5(text) {
    return crypto.createHash("md5").update(text).digest("hex");
  }

  /**
   * 生成随机字符串
   * @param {number} length - 字符串长度
   * @returns {string} - 随机字符串
   */
  static generateRandomString(length = 16) {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
  }

  /**
   * 生成邀请码（6位数字）
   * @returns {string} - 6位数字邀请码
   */
  static generateInvitationCode() {
    // 生成6位随机数字
    const min = 100000; // 最小值：100000
    const max = 999999; // 最大值：999999
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * 生成订单号
   * @param {string} prefix - 前缀（可选）
   * @returns {string} - 订单号
   */
  static generateOrderNo(prefix = "") {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * 生成UUID（简化版）
   * @returns {string} - UUID字符串
   */
  static generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
}

module.exports = CryptoUtil;
