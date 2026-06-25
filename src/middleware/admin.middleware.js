/**
 * 管理员权限中间件
 *
 * 处理管理员权限验证，确保只有管理员可以访问特定功能
 * 严格按照数据库字段定义，确保与ThinkPHP兼容
 *
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-06-20
 */

const ResponseFormatter = require("../response/ResponseFormatter");
const logger = require("../utils/logger");

class AdminMiddleware extends ResponseFormatter {
  constructor() {
    super();
    this.logger = logger.child("AdminMiddleware");
  }

   /**
    * 要求管理员权限 - 使用 is_admin 字段（与 rbb 项目规范一致）
    * 兼容：同时支持 is_admin === 1 和 user_type >= 2
    */
  requireAdmin = (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return this.unauthorized(res, "用户未登录");
      }

      // 检查管理员权限 - 优先使用 is_admin 字段（rbb 规范）
      // 兼容 user_type 字段（IP 老项目遗留）
      const isAdmin = user.is_admin === 1 || user.is_admin === true || user.user_type >= 2;
      if (!isAdmin) {
        this.logger.warn(`用户 ${user.id} 尝试访问管理员功能，权限不足`, {
          userId: user.id,
          username: user.username,
          isAdmin: user.is_admin,
          userType: user.user_type,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });

        return this.forbidden(res, "需要管理员权限");
      }

      // 记录管理员操作日志
      this.logger.info(`管理员操作`, {
        userId: user.id,
        username: user.username,
        userType: user.user_type,
        action: `${req.method} ${req.originalUrl}`,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      next();
    } catch (error) {
      this.logger.error("管理员权限检查失败:", error);
      return this.forbidden(res, "权限检查失败");
    }
  };

   /**
    * 要求超级管理员权限 - 使用 is_admin 或 user_type >= 3
    */
  requireSuperAdmin = (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return this.unauthorized(res, "用户未登录");
      }

      // 检查超级管理员权限
      const isSuperAdmin = user.user_type >= 3;
      if (!isSuperAdmin) {
        this.logger.warn(`用户 ${user.id} 尝试访问超级管理员功能，权限不足`, {
          userId: user.id,
          username: user.username,
          userType: user.user_type,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });

        return this.forbidden(res, "需要超级管理员权限");
      }

      // 记录超级管理员操作日志
      this.logger.info(`超级管理员操作`, {
        userId: user.id,
        username: user.username,
        userType: user.user_type,
        action: `${req.method} ${req.originalUrl}`,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      next();
    } catch (error) {
      this.logger.error("超级管理员权限检查失败:", error);
      return this.forbidden(res, "权限检查失败");
    }
  };

  /**
   * 检查是否为资源所有者或管理员
   * @param {string} resourceUserIdField 资源中用户ID字段名
   */
  requireOwnerOrAdmin = (resourceUserIdField = "user_id") => {
    return (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          return this.unauthorized(res, "用户未登录");
        }

        // 管理员可以访问所有资源（兼容 is_admin 和 user_type）
        if (user.is_admin === 1 || user.is_admin === true || user.user_type >= 2) {
          return next();
        }

        // 检查是否为资源所有者
        const resourceUserId = req.params.userId || req.body[resourceUserIdField] || req.query[resourceUserIdField];

        if (!resourceUserId) {
          return this.badRequest(res, "缺少资源用户ID");
        }

        if (parseInt(resourceUserId) !== user.id) {
          this.logger.warn(`用户 ${user.id} 尝试访问其他用户资源`, {
            userId: user.id,
            targetUserId: resourceUserId,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
          });

          return this.forbidden(res, "只能访问自己的资源");
        }

        next();
      } catch (error) {
        this.logger.error("资源所有权检查失败:", error);
        return this.forbidden(res, "权限检查失败");
      }
    };
  };

  /**
   * 操作频率限制 - 防止管理员操作过于频繁
   */
  rateLimit = (maxRequests = 100, windowMs = 60000) => {
    const requests = new Map();

    return (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          return this.unauthorized(res, "用户未登录");
        }

        const key = `admin_${user.id}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        // 清理过期记录
        if (requests.has(key)) {
          const userRequests = requests.get(key).filter((time) => time > windowStart);
          requests.set(key, userRequests);
        } else {
          requests.set(key, []);
        }

        const userRequests = requests.get(key);

        // 检查是否超过限制
        if (userRequests.length >= maxRequests) {
          this.logger.warn(`管理员 ${user.id} 操作频率过高`, {
            userId: user.id,
            requestCount: userRequests.length,
            maxRequests,
            windowMs,
            url: req.originalUrl,
            method: req.method,
          });

          return this.error(res, "操作过于频繁，请稍后再试", "RATE_LIMIT_EXCEEDED", 429);
        }

        // 记录本次请求
        userRequests.push(now);
        requests.set(key, userRequests);

        next();
      } catch (error) {
        this.logger.error("频率限制检查失败:", error);
        return next(); // 频率限制失败时不阻止请求
      }
    };
  };

  /**
   * 审计日志中间件 - 记录所有管理员操作
   */
  auditLog = (req, res, next) => {
    try {
      const user = req.user;

      if (!user || (user.is_admin !== 1 && user.is_admin !== true && user.user_type < 2)) {
        return next();
      }

      // 记录请求开始时间
      req.startTime = Date.now();

      // 保存原始的 res.json 方法
      const originalJson = res.json;

      // 重写 res.json 方法以记录响应
      res.json = function (data) {
        const endTime = Date.now();
        const duration = endTime - req.startTime;

        // 记录审计日志
        logger.info("管理员操作审计", {
          userId: user.id,
          username: user.username,
          userType: user.user_type,
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          requestBody: req.method !== "GET" ? req.body : undefined,
          responseStatus: res.statusCode,
          responseSuccess: data?.success,
          duration,
          timestamp: new Date().toISOString(),
        });

        // 调用原始的 json 方法
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error("审计日志记录失败:", error);
      return next(); // 审计失败时不阻止请求
    }
  };
}

// 导出单例实例
const adminMiddleware = new AdminMiddleware();

module.exports = adminMiddleware;
