const jwt = require("jsonwebtoken");

class JwtUtil {
  constructor(config = {}) {
    // 支持配置注入，同时保持向后兼容
    this.jwtSecret = config.jwtSecret || process.env.JWT_SECRET;
    this.jwtExpiresIn = config.jwtExpiresIn || process.env.JWT_EXPIRES_IN || "30d";
  }

  /**
   * 生成JWT Token
   * @param {Object} payload - Token负载数据
   * @returns {string} - 生成的Token
   */
  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  /**
   * 验证JWT Token
   * @param {string} token - 要验证的Token
   * @returns {Object|null} - 验证成功返回解码后的数据，失败返回null
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  // ==================== 静态方法（向后兼容） ====================

  /**
   * 静态方法：生成JWT Token（向后兼容）
   * @param {Object} payload - Token负载数据
   * @param {Object} config - 配置选项
   * @returns {string} - 生成的Token
   */
  static generateToken(payload, config = {}) {
    const instance = new JwtUtil(config);
    return instance.generateToken(payload);
  }

  /**
   * 静态方法：验证JWT Token（向后兼容）
   * @param {string} token - 要验证的Token
   * @param {Object} config - 配置选项
   * @returns {Object|null} - 验证成功返回解码后的数据，失败返回null
   */
  static verifyToken(token, config = {}) {
    const instance = new JwtUtil(config);
    return instance.verifyToken(token);
  }

  /**
   * 从请求头中获取Token
   * @param {Object} req - Express请求对象
   * @returns {string|null} - 获取到的Token，如果没有则返回null
   */
  static getTokenFromHeader(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;

    return parts[1];
  }
}

module.exports = JwtUtil;
