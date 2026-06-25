/**
 * 开发调试中间件
 * 提供请求/响应调试信息，仅在开发环境启用
 *
 * @author Backend Team
 * @version 1.0.0
 * @since 2024-06-24
 */

const { getClientFormatterType } = require("../config/constants");

/**
 * 请求调试中间件
 * 记录请求详细信息，包括参数、头部、客户端类型等
 */
function requestDebugMiddleware(options = {}) {
  const {
    enabled = process.env.NODE_ENV === "development",
    logBody = true,
    logHeaders = true,
    logQuery = true,
    logParams = true,
    maxBodySize = 1024 * 10, // 10KB
    sensitiveFields = ["password", "pwd", "token", "secret"],
  } = options;

  return (req, res, next) => {
    // 生产环境直接跳过
    if (!enabled) {
      return next();
    }

    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);

    // 添加请求ID到请求对象
    req.debugId = requestId;

    console.log("\n🔍 ===== 请求调试信息 =====");
    console.log(`📋 请求ID: ${requestId}`);
    console.log(`🌐 ${req.method} ${req.originalUrl || req.url}`);
    console.log(`🕐 时间: ${new Date().toISOString()}`);
    console.log(`📱 客户端类型: ${getClientFormatterType(req)}`);
    console.log(`🔗 用户代理: ${req.get("User-Agent") || "Unknown"}`);
    console.log(`📍 IP地址: ${req.ip || req.connection.remoteAddress}`);

    // 记录查询参数
    if (logQuery && Object.keys(req.query).length > 0) {
      console.log(`❓ 查询参数:`, req.query);
    }

    // 记录路由参数
    if (logParams && Object.keys(req.params).length > 0) {
      console.log(`🎯 路由参数:`, req.params);
    }

    // 记录请求头
    if (logHeaders) {
      const headers = { ...req.headers };
      // 过滤敏感头部信息
      sensitiveFields.forEach((field) => {
        Object.keys(headers).forEach((key) => {
          if (key.toLowerCase().includes(field)) {
            headers[key] = "***";
          }
        });
      });
      console.log(`📤 请求头:`, headers);
    }

    // 记录请求体
    if (logBody && req.body) {
      const bodyStr = JSON.stringify(req.body);
      if (bodyStr.length > maxBodySize) {
        console.log(`📦 请求体: [太大，已截断] ${bodyStr.substring(0, maxBodySize)}...`);
      } else {
        const sanitizedBody = _sanitizeObject(req.body, sensitiveFields);
        console.log(`📦 请求体:`, sanitizedBody);
      }
    }

    // 监听响应结束
    const originalSend = res.send;
    res.send = function (data) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log("\n📤 ===== 响应调试信息 =====");
      console.log(`📋 请求ID: ${requestId}`);
      console.log(`⏱️ 处理时间: ${duration}ms`);
      console.log(`📊 状态码: ${res.statusCode}`);

      // 记录响应数据（限制大小）
      if (data) {
        const dataStr = typeof data === "string" ? data : JSON.stringify(data);
        if (dataStr.length > maxBodySize) {
          console.log(`📦 响应数据: [太大，已截断] ${dataStr.substring(0, maxBodySize)}...`);
        } else {
          try {
            const parsedData = typeof data === "string" ? JSON.parse(data) : data;
            console.log(`📦 响应数据:`, parsedData);
          } catch (e) {
            console.log(`📦 响应数据: ${dataStr}`);
          }
        }
      }

      console.log("🔍 ===== 调试信息结束 =====\n");

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * 性能监控中间件
 * 监控请求处理时间和内存使用情况
 */
function performanceDebugMiddleware(options = {}) {
  const {
    enabled = process.env.NODE_ENV === "development",
    slowRequestThreshold = 1000, // 1秒
    memoryWarningThreshold = 100 * 1024 * 1024, // 100MB
  } = options;

  return (req, res, next) => {
    if (!enabled) {
      return next();
    }

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    // 监听响应结束
    res.on("finish", () => {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();

      const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
      const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;

      // 性能警告
      if (duration > slowRequestThreshold) {
        console.warn(`⚠️ 慢请求警告: ${req.method} ${req.originalUrl} 耗时 ${duration.toFixed(2)}ms`);
      }

      if (memoryDiff > memoryWarningThreshold) {
        console.warn(`⚠️ 内存使用警告: ${req.method} ${req.originalUrl} 内存增长 ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
      }

      // 详细性能信息
      if (req.debugId) {
        console.log(`⚡ 性能信息 [${req.debugId}]:`);
        console.log(`   - 处理时间: ${duration.toFixed(2)}ms`);
        console.log(`   - 内存变化: ${(memoryDiff / 1024).toFixed(2)}KB`);
        console.log(`   - 当前内存: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      }
    });

    next();
  };
}

/**
 * 错误调试中间件
 * 提供详细的错误堆栈和上下文信息
 */
function errorDebugMiddleware(options = {}) {
  const { enabled = process.env.NODE_ENV === "development", includeStack = true, includeRequest = true } = options;

  return (err, req, res, next) => {
    if (!enabled) {
      return next(err);
    }

    console.error("\n💥 ===== 错误调试信息 =====");
    console.error(`📋 请求ID: ${req.debugId || "Unknown"}`);
    console.error(`🌐 请求: ${req.method} ${req.originalUrl}`);
    console.error(`❌ 错误: ${err.message}`);

    if (includeStack && err.stack) {
      console.error(`📚 堆栈:`, err.stack);
    }

    if (includeRequest) {
      console.error(`📦 请求上下文:`);
      console.error(`   - 查询参数:`, req.query);
      console.error(`   - 路由参数:`, req.params);
      console.error(`   - 请求体:`, _sanitizeObject(req.body, ["password", "pwd", "token"]));
    }

    console.error("💥 ===== 错误信息结束 =====\n");

    next(err);
  };
}

/**
 * 数据库查询调试中间件
 * 监控数据库查询性能
 */
function dbDebugMiddleware(options = {}) {
  const {
    enabled = process.env.NODE_ENV === "development",
    slowQueryThreshold = 500, // 500ms
  } = options;

  return (req, res, next) => {
    if (!enabled) {
      return next();
    }

    // 如果有Sequelize实例，添加查询日志
    if (req.app.locals.sequelize) {
      const originalQuery = req.app.locals.sequelize.query;
      const queries = [];

      req.app.locals.sequelize.query = function (...args) {
        const startTime = Date.now();
        const sql = args[0];

        return originalQuery.apply(this, args).then((result) => {
          const duration = Date.now() - startTime;
          queries.push({ sql, duration });

          if (duration > slowQueryThreshold) {
            console.warn(`⚠️ 慢查询警告: ${duration}ms - ${sql.substring(0, 100)}...`);
          }

          return result;
        });
      };

      // 在响应结束时恢复原始方法并输出查询统计
      res.on("finish", () => {
        req.app.locals.sequelize.query = originalQuery;

        if (queries.length > 0 && req.debugId) {
          console.log(`🗄️ 数据库查询统计 [${req.debugId}]:`);
          console.log(`   - 查询数量: ${queries.length}`);
          console.log(`   - 总耗时: ${queries.reduce((sum, q) => sum + q.duration, 0)}ms`);
          console.log(`   - 平均耗时: ${(queries.reduce((sum, q) => sum + q.duration, 0) / queries.length).toFixed(2)}ms`);
        }
      });
    }

    next();
  };
}

/**
 * 创建调试中间件组合
 */
function createDebugMiddleware(options = {}) {
  const middlewares = [];

  if (options.request !== false) {
    middlewares.push(requestDebugMiddleware(options.request));
  }

  if (options.performance !== false) {
    middlewares.push(performanceDebugMiddleware(options.performance));
  }

  if (options.database !== false) {
    middlewares.push(dbDebugMiddleware(options.database));
  }

  return middlewares;
}

// ==================== 工具函数 ====================

/**
 * 清理敏感信息
 * @private
 */
function _sanitizeObject(obj, sensitiveFields) {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some((field) => lowerKey.includes(field));

      if (isSensitive) {
        sanitized[key] = "***";
      } else if (typeof obj[key] === "object") {
        sanitized[key] = _sanitizeObject(obj[key], sensitiveFields);
      } else {
        sanitized[key] = obj[key];
      }
    }
  }

  return sanitized;
}

module.exports = {
  requestDebugMiddleware,
  performanceDebugMiddleware,
  errorDebugMiddleware,
  dbDebugMiddleware,
  createDebugMiddleware,
};
