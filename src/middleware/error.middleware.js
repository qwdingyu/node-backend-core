const Logger = require("../utils/logger");
const ResponseFormatter = require("../response/ResponseFormatter");

// 使用延迟实例化，确保能使用全局配置
let formatter = null;

function getFormatter() {
  if (!formatter) {
    formatter = new ResponseFormatter(); // 自动使用全局配置
  }
  return formatter;
}

// 提供重置方法，当全局配置变更时可以重置实例
function resetFormatter() {
  formatter = null;
}
/**
 * 错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  const logger = Logger.child("ErrorHandler");
  const currentFormatter = getFormatter(); // 使用延迟实例化的格式化器

  // 记录错误日志
  logger.error("API错误:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user?.id,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Sequelize 验证错误
  if (err.name === "SequelizeValidationError") {
    // const errors = err.errors.map((e) => ({ field: e.path, message: e.message, }));
    return currentFormatter.badRequest(res, "orm数据验证失败");
  }

  // Sequelize 唯一约束错误
  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors[0]?.path || "unknown";
    return currentFormatter.badRequest(res, `${field}已存在，请检查数据唯一性`);
  }

  // Sequelize 外键约束错误
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return currentFormatter.badRequest(res, "外键约束错误，请检查关联数据");
  }

  // Sequelize 数据库连接错误
  if (err.name === "SequelizeConnectionError") {
    return currentFormatter.internalError(res, "数据库连接失败");
  }

  // JWT 错误
  if (err.name === "JsonWebTokenError") {
    return currentFormatter.unauthorized(res, "Token无效");
  }

  if (err.name === "TokenExpiredError") {
    return currentFormatter.unauthorized(res, "Token已过期");
  }

  // 参数验证错误
  if (err.name === "ValidationError") {
    return currentFormatter.badRequest(res, err.message);
  }

  // 业务逻辑错误（自定义错误）
  if (err.status) {
    return currentFormatter.error(res, err.message, "INTERNAL_ERROR", err.status);
  }

  // 语法错误
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return currentFormatter.badRequest(res, "JSON格式错误");
  }

  // 文件上传错误
  if (err.code === "LIMIT_FILE_SIZE") {
    return currentFormatter.badRequest(res, "文件大小超出限制");
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return currentFormatter.badRequest(res, "文件数量超出限制");
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return currentFormatter.badRequest(res, "不支持的文件类型");
  }

  // 权限错误
  if (err.message.includes("权限") || err.message.includes("unauthorized")) {
    return currentFormatter.forbidden(res, err.message);
  }

  // 余额不足等业务错误
  if (err.message.includes("余额不足") || err.message.includes("投资金额") || err.message.includes("项目不存在")) {
    return currentFormatter.badRequest(res, err.message);
  }

  // 默认服务器错误
  const message = process.env.NODE_ENV === "production" ? "服务器内部错误" : err.message;

  return currentFormatter.internalError(res, message);
};

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res) => {
  const currentFormatter = getFormatter(); // 使用延迟实例化的格式化器
  return currentFormatter.notFound(res, "接口不存在");
};

/**
 * 异步错误捕获装饰器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 创建业务错误
 */
class BusinessError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "BusinessError";
    this.status = status;
  }
}

/**
 * 创建权限错误
 */
class PermissionError extends Error {
  constructor(message = "权限不足") {
    super(message);
    this.name = "PermissionError";
    this.status = 403;
  }
}

/**
 * 创建认证错误
 */
class AuthenticationError extends Error {
  constructor(message = "认证失败") {
    super(message);
    this.name = "AuthenticationError";
    this.status = 401;
  }
}

/**
 * 创建资源不存在错误
 */
class NotFoundError extends Error {
  constructor(message = "资源不存在") {
    super(message);
    this.name = "NotFoundError";
    this.status = 404;
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  BusinessError,
  PermissionError,
  AuthenticationError,
  NotFoundError,
  resetFormatter, // 导出重置方法，供全局配置变更时使用
};
