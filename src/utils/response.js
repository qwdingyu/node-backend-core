/**
 * 统一API响应格式工具 - 暂时没有使用
 *
 * 标准响应格式：
 * {
 *   success: boolean,           // 请求是否成功
 *   code: string,              // 业务状态码
 *   message: string,           // 响应消息
 *   data: any,                 // 响应数据
 *   meta?: {                   // 元数据（可选）
 *     pagination?: {...},      // 分页信息
 *     total?: number,          // 总数
 *     filters?: {...}          // 筛选条件
 *   },
 *   timestamp: string,         // 响应时间戳
 *   requestId?: string         // 请求ID（可选）
 * }
 */

// 业务状态码定义
const RESPONSE_CODES = {
  // 成功状态码
  SUCCESS: "SUCCESS",
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  DELETED: "DELETED",

  // 客户端错误状态码
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",

  // 服务器错误状态码
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",
};

/**
 * 基础响应构建器
 * @param {Object} res - Express响应对象
 * @param {boolean} success - 是否成功
 * @param {string} code - 业务状态码
 * @param {string} message - 响应消息
 * @param {*} data - 响应数据
 * @param {Object} meta - 元数据
 * @param {number} statusCode - HTTP状态码
 * @param {string} requestId - 请求ID
 */
const buildResponse = (res, success, code, message, data = null, meta = null, statusCode = 200, requestId = null) => {
  const response = {
    success,
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  // 添加元数据（如果存在）
  if (meta) {
    response.meta = meta;
  }

  // 添加请求ID（如果存在）
  if (requestId) {
    response.requestId = requestId;
  }

  return res.status(statusCode).json(response);
};

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {string} code - 业务状态码
 * @param {number} statusCode - HTTP状态码
 */
const success = (res, data = null, message = "操作成功", code = RESPONSE_CODES.SUCCESS, statusCode = 200) => {
  return buildResponse(res, true, code, message, data, null, statusCode, res.requestId);
};

/**
 * 错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @param {*} error - 错误详情
 */
const error = (res, message = "服务器内部错误", code = RESPONSE_CODES.INTERNAL_ERROR, statusCode = 500, details = null) => {
  const meta = {};

  // 开发环境包含错误详情
  if (process.env.NODE_ENV === "development" && details) {
    meta.error = details;
  }

  return buildResponse(res, false, code, message, null, Object.keys(meta).length > 0 ? meta : null, statusCode, res.requestId);
};

/**
 * 分页响应
 * @param {Object} res - Express响应对象
 * @param {Array} data - 数据数组
 * @param {number} total - 总数
 * @param {number} page - 当前页
 * @param {number} limit - 每页数量
 * @param {string} message - 响应消息
 */
const paginated = (res, items, total, page, limit, message = "获取数据成功", filters = null) => {
  const totalPages = Math.ceil(total / limit);
  const currentPage = parseInt(page);
  const pageSize = parseInt(limit);

  // 构建分页数据结构
  const data = {
    items,
    total,
    page: currentPage,
    pageSize,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    startIndex: (currentPage - 1) * pageSize + 1,
    endIndex: Math.min(currentPage * pageSize, total),
  };

  // 构建元数据
  const meta = {
    pagination: {
      total,
      page: currentPage,
      pageSize,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    },
  };

  // 添加筛选条件（如果存在）
  if (filters) {
    meta.filters = filters;
  }

  return buildResponse(res, true, RESPONSE_CODES.SUCCESS, message, data, meta, 200, res.requestId);
};

/**
 * 验证错误响应
 * @param {Object} res - Express响应对象
 * @param {Array} errors - 验证错误数组
 */
/**
 * 创建响应（201状态码）
 */
const created = (res, data = null, message = "创建成功") => {
  return buildResponse(res, true, RESPONSE_CODES.CREATED, message, data, null, 201, res.requestId);
};

/**
 * 更新响应
 */
const updated = (res, data = null, message = "更新成功") => {
  return buildResponse(res, true, RESPONSE_CODES.UPDATED, message, data, null, 200, res.requestId);
};

/**
 * 删除响应
 */
const deleted = (res, message = "删除成功") => {
  return buildResponse(res, true, RESPONSE_CODES.DELETED, message, null, null, 200, res.requestId);
};

const validationError = (res, errors, message = "数据验证失败") => {
  const meta = { errors };

  return buildResponse(res, false, RESPONSE_CODES.VALIDATION_ERROR, message, null, meta, 400, res.requestId);
};

const unauthorized = (res, message = "未授权访问") => {
  return buildResponse(res, false, RESPONSE_CODES.UNAUTHORIZED, message, null, null, 401, res.requestId);
};

const forbidden = (res, message = "禁止访问") => {
  return buildResponse(res, false, RESPONSE_CODES.FORBIDDEN, message, null, null, 403, res.requestId);
};

const notFound = (res, message = "资源不存在") => {
  return buildResponse(res, false, RESPONSE_CODES.NOT_FOUND, message, null, null, 404, res.requestId);
};

/**
 * 请求参数错误响应 (400)
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} errors - 错误详情（如验证错误）
 */
const badRequest = (res, message = "请求参数错误", errors = null) => {
  const meta = errors ? { errors } : null;

  return buildResponse(res, false, RESPONSE_CODES.BAD_REQUEST, message, null, meta, 400, res.requestId);
};

const conflict = (res, message = "资源冲突") => {
  return buildResponse(res, false, RESPONSE_CODES.CONFLICT, message, null, null, 409, res.requestId);
};

/**
 * 服务器内部错误响应 (500)
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情（仅开发环境显示）
 */
const internalError = (res, message = "服务器内部错误", details = null) => {
  const meta = {};

  // 开发环境包含错误详情
  if (process.env.NODE_ENV === "development" && details) {
    meta.error = details;
  }

  return buildResponse(res, false, RESPONSE_CODES.INTERNAL_ERROR, message, null, Object.keys(meta).length > 0 ? meta : null, 500, res.requestId);
};

/**
 * 服务不可用响应 (503)
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const serviceUnavailable = (res, message = "服务暂时不可用") => {
  return buildResponse(res, false, RESPONSE_CODES.SERVICE_UNAVAILABLE, message, null, null, 503, res.requestId);
};

/**
 * 数据库错误响应 (500)
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情（仅开发环境显示）
 */
const databaseError = (res, message = "数据库操作失败", details = null) => {
  const meta = {};

  // 开发环境包含错误详情
  if (process.env.NODE_ENV === "development" && details) {
    meta.error = details;
  }

  return buildResponse(res, false, RESPONSE_CODES.DATABASE_ERROR, message, null, Object.keys(meta).length > 0 ? meta : null, 500, res.requestId);
};

module.exports = {
  // 响应状态码
  RESPONSE_CODES,

  // 基础响应方法
  buildResponse,
  success,
  error,

  // 特定操作响应
  created,
  updated,
  deleted,

  // 分页响应
  paginated,

  // 错误响应
  validationError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  conflict,
  internalError,
  serviceUnavailable,
  databaseError,
};
