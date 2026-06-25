const winston = require("winston");
const path = require("path");
const fs = require("fs");
const { format, transports } = winston;

// 增加 EventEmitter 的最大监听器数量，防止内存泄漏警告
// 在测试环境中可能会有更多的监听器，设置为50应该足够
require("events").EventEmitter.defaultMaxListeners = 50;

// 确保日志目录存在 - 适配投资理财平台路径
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志格式
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ["message", "level", "timestamp", "label"] }),
  format.printf(({ timestamp, level, message, metadata, stack }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  defaultMeta: { service: "api" },
  transports: [
    // 控制台输出
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
    }),
    // 错误日志文件
    new transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // 所有日志文件
    new transports.File({
      filename: path.join(logDir, "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
  // 处理未捕获的异常和拒绝
  exceptionHandlers: [new transports.File({ filename: path.join(logDir, "exceptions.log") })],
  rejectionHandlers: [new transports.File({ filename: path.join(logDir, "rejections.log") })],
});

// 创建子日志器的方法 - 修复循环调用问题
const originalChild = logger.child.bind(logger);
logger.child = (label) => {
  if (typeof label === "string") {
    return originalChild({ service: label });
  }
  return originalChild(label);
};

/**
 * 日志管理扩展功能
 */
class LoggerManager {
  constructor(winstonLogger) {
    this.logger = winstonLogger;
    this.logStats = {
      total: 0,
      byLevel: {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
      },
      byModule: new Map(),
      startTime: Date.now(),
    };
  }

  /**
   * 记录日志并更新统计
   */
  log(level, message, meta = {}) {
    // 更新统计
    this.logStats.total++;
    this.logStats.byLevel[level] = (this.logStats.byLevel[level] || 0) + 1;

    // 模块统计
    const module = meta.module || "unknown";
    if (!this.logStats.byModule.has(module)) {
      this.logStats.byModule.set(module, { total: 0, byLevel: {} });
    }
    const moduleStats = this.logStats.byModule.get(module);
    moduleStats.total++;
    moduleStats.byLevel[level] = (moduleStats.byLevel[level] || 0) + 1;

    // 记录日志
    this.logger[level](message, meta);
  }

  /**
   * 获取日志统计
   */
  getStats() {
    return {
      ...this.logStats,
      byModule: Object.fromEntries(this.logStats.byModule),
      uptime: Date.now() - this.logStats.startTime,
    };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.logStats = {
      total: 0,
      byLevel: {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
      },
      byModule: new Map(),
      startTime: Date.now(),
    };
  }

  // 代理winston方法
  error(message, meta) {
    this.log("error", message, meta);
  }
  warn(message, meta) {
    this.log("warn", message, meta);
  }
  info(message, meta) {
    this.log("info", message, meta);
  }
  debug(message, meta) {
    this.log("debug", message, meta);
  }

  // 代理winston的其他方法
  child(options) {
    return this.logger.child(options);
  }

  // 代理其他可能需要的winston方法
  profile(id) {
    return this.logger.profile(id);
  }

  startTimer() {
    return this.logger.startTimer();
  }

  // ==================== 调试增强功能 ====================

  /**
   * API调试日志
   */
  api(message, meta = {}) {
    return this.info(`🌐 API: ${message}`, { ...meta, category: "api" });
  }

  /**
   * 数据库调试日志
   */
  db(message, meta = {}) {
    return this.info(`🗄️ DB: ${message}`, { ...meta, category: "database" });
  }

  /**
   * 认证调试日志
   */
  auth(message, meta = {}) {
    return this.info(`🔐 AUTH: ${message}`, { ...meta, category: "auth" });
  }

  /**
   * 性能调试日志
   */
  performance(message, meta = {}) {
    return this.info(`⚡ PERF: ${message}`, { ...meta, category: "performance" });
  }

  /**
   * 业务逻辑调试日志
   */
  business(message, meta = {}) {
    return this.info(`💼 BIZ: ${message}`, { ...meta, category: "business" });
  }

  /**
   * 请求调试日志
   */
  request(message, meta = {}) {
    return this.debug(`📤 REQ: ${message}`, { ...meta, category: "request" });
  }

  /**
   * 响应调试日志
   */
  response(message, meta = {}) {
    return this.debug(`📥 RES: ${message}`, { ...meta, category: "response" });
  }

  /**
   * 缓存调试日志
   */
  cache(message, meta = {}) {
    return this.debug(`💾 CACHE: ${message}`, { ...meta, category: "cache" });
  }

  /**
   * 队列调试日志
   */
  queue(message, meta = {}) {
    return this.info(`📋 QUEUE: ${message}`, { ...meta, category: "queue" });
  }

  /**
   * 记录慢操作
   */
  slow(operation, duration, threshold = 1000, meta = {}) {
    if (duration > threshold) {
      this.warn(`🐌 慢操作: ${operation} 耗时 ${duration}ms`, {
        ...meta,
        duration,
        threshold,
        category: "performance",
      });
    }
  }

  /**
   * 记录内存使用
   */
  memory(operation, memoryUsage, meta = {}) {
    const { heapUsed, heapTotal, external } = memoryUsage;
    this.debug(`💾 内存使用: ${operation}`, {
      ...meta,
      heapUsed: `${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(external / 1024 / 1024).toFixed(2)}MB`,
      category: "memory",
    });
  }

  /**
   * 记录用户操作
   */
  userAction(userId, action, meta = {}) {
    this.info(`👤 用户操作: ${action}`, {
      ...meta,
      userId,
      action,
      category: "user",
    });
  }

  /**
   * 记录安全事件
   */
  security(event, meta = {}) {
    this.warn(`🔒 安全事件: ${event}`, {
      ...meta,
      event,
      category: "security",
    });
  }
}

// 创建增强的日志管理器
const loggerManager = new LoggerManager(logger);

module.exports = loggerManager;
