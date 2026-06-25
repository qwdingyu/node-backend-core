/**
 * 认证中间件基类
 *
 * 提供通用的JWT Token验证逻辑
 * 子类需要实现具体的用户数据访问方法
 *
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-06-20
 */

const jwt = require("jsonwebtoken");
const ResponseFormatter = require("../response/ResponseFormatter");
const logger = require("../utils/logger");
const tokenBlacklist = require("../utils/token-blacklist");

class BaseAuthMiddleware extends ResponseFormatter {
  constructor() {
    super();
    this.logger = logger.child("AuthMiddleware");
    this.JWT_SECRET = process.env.JWT_SECRET || "investment_platform_secret_key";
  }

  /**
   * 认证中间件 - 验证JWT Token
   */
  authenticate = async (req, res, next) => {
    try {
      // 获取Token
      const token = this.extractToken(req);

      if (!token) {
        return this.unauthorized(res, "缺少认证Token");
      }

      // 检查 token 是否在黑名单中
      if (tokenBlacklist.isBlacklisted(token)) {
        return this.unauthorized(res, "Token已失效，请重新登录");
      }

      // 验证Token
      const decoded = jwt.verify(token, this.JWT_SECRET);
      console.log("decoded:================== ", decoded);

      // 支持两种格式：uid (AuthService) 和 userId (中间件)
      const userId = decoded.uid || decoded.userId;

      if (!decoded || !userId) {
        return this.unauthorized(res, "Token格式无效");
      }

      // 获取用户信息
      const user = await this.getUserById(userId);

      if (!user) {
        return this.unauthorized(res, "用户不存在");
      }

      // 验证用户状态
      const statusValidation = this.validateUserStatus(user);
      if (!statusValidation.valid) {
        return this.forbidden(res, statusValidation.reason);
      }

      // 设置用户信息到请求对象
      req.user = user;
      req.uid = user.id;

      next();
    } catch (error) {
      // 记录认证失败日志
      const errorDetails = {
        error: error.message,
        name: error.name,
        url: req.originalUrl,
        method: req.method,
        headers: req.headers,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        clientType: req.clientType || "unknown",
      };

      this.logger.error("认证失败:", errorDetails);

      // 处理特定的JWT错误
      if (error.name === "JsonWebTokenError") {
        return this.unauthorized(res, "Token无效");
      }

      if (error.name === "TokenExpiredError") {
        return this.unauthorized(res, "Token已过期，请重新登录");
      }

      // 通用认证失败
      return this.unauthorized(res, "认证失败");
    }
  };

  /**
   * 可选认证中间件 - Token存在时验证，不存在时跳过
   */
  optionalAuth = async (req, res, next) => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        // 没有Token时跳过认证
        return next();
      }

      // 有Token时进行认证
      return this.authenticate(req, res, next);
    } catch (error) {
      // 认证失败时也跳过，不阻止请求
      this.logger.warn("可选认证失败:", error);
      return next();
    }
  };

  /**
   * 权限检查中间件
   * @param {number} requiredLevel 需要的权限等级
   */
  requirePermission = (requiredLevel = 1) => {
    return (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          return this.unauthorized(res, "用户未登录");
        }

        // 检查权限等级
        if (!this.checkUserPermission(user, requiredLevel)) {
          return this.forbidden(res, "权限不足");
        }

        next();
      } catch (error) {
        this.logger.error("权限检查失败:", error);
        return this.forbidden(res, "权限检查失败");
      }
    };
  };

  /**
   * 实名认证检查中间件
   */
  requireAuth = (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return this.unauthorized(res, "用户未登录");
      }

      // 检查实名认证状态
      if (!this.checkUserAuthentication(user)) {
        return this.forbidden(res, "用户未实名认证");
      }

      next();
    } catch (error) {
      this.logger.error("实名认证检查失败:", error);
      return this.forbidden(res, "实名认证检查失败");
    }
  };

  /**
   * 从请求中提取Token
   * @private
   */
  extractToken(req) {
    // 从Authorization头获取
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // 从查询参数获取
    if (req.query?.token) {
      return req.query.token;
    }

    // 从请求体获取 - 添加安全检查
    if (req.body && req.body.token) {
      return req.body.token;
    }

    return null;
  }

  /**
   * 根据用户ID获取用户信息
   * @private
   */
  // ==================== 抽象方法 - 子类必须实现 ====================

  /**
   * 根据用户ID获取用户信息 - 抽象方法
   * @param {number} userId 用户ID
   * @returns {Promise<Object|null>} 用户信息
   */
  async getUserById(userId) {
    throw new Error("getUserById method must be implemented by subclass");
  }

  /**
   * 验证用户状态 - 抽象方法
   * @param {Object} user 用户信息
   * @returns {Object} {valid: boolean, reason?: string}
   */
  validateUserStatus(user) {
    throw new Error("validateUserStatus method must be implemented by subclass");
  }

  /**
   * 检查用户权限 - 抽象方法
   * @param {Object} user 用户信息
   * @param {number} requiredLevel 需要的权限等级
   * @returns {boolean} 是否有权限
   */
  checkUserPermission(user, requiredLevel) {
    throw new Error("checkUserPermission method must be implemented by subclass");
  }

  /**
   * 检查用户实名认证 - 抽象方法
   * @param {Object} user 用户信息
   * @returns {boolean} 是否已实名认证
   */
  checkUserAuthentication(user) {
    throw new Error("checkUserAuthentication method must be implemented by subclass");
  }

  /**
   * 生成JWT Token
   */
  generateToken(userId, expiresIn = "24h") {
    return jwt.sign({ userId, timestamp: Date.now() }, this.JWT_SECRET, {
      expiresIn,
    });
  }

  /**
   * 验证Token（不通过中间件）
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

// 导出基类
module.exports = BaseAuthMiddleware;
