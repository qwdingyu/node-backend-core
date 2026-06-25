/**
 * 客户端配置常量 - 向后兼容层
 *
 * 此文件现在作为向后兼容层，重新导出新配置系统的内容
 * 新代码应该直接使用 clientConfig.js 和对应的服务类
 *
 * @author Investment Platform Team
 * @version 3.0.0 (重构版 - 向后兼容层)
 * @since 2025-07-06
 */

// 从新配置系统导入
const { CLIENT_TYPES, CLIENT_FORMATTER_MAPPING, CLIENT_AUTH_CONFIG } = require("./clientConfig");

// 从新服务系统导入
const ClientDetector = require("../services/ClientDetector");

/**
 * 向后兼容的工具函数（委托给新服务）
 */

/**
 * 从URL路径识别客户端类型
 * @param {string} path - 请求路径
 * @returns {string|null} 客户端类型
 */
function identifyClientFromPath(path) {
  // 创建模拟请求对象
  const mockReq = { originalPath: path, path: path, url: path };
  return ClientDetector.detectByPath(mockReq);
}

/**
 * 从请求头识别客户端类型
 * @param {Object} req - Express请求对象
 * @returns {string|null} 客户端类型
 */
function identifyClientFromHeaders(req) {
  return ClientDetector.detectByHeader(req);
}

/**
 * 从User-Agent识别客户端类型
 * @param {string} userAgent - User-Agent字符串
 * @returns {string|null} 客户端类型
 */
function identifyClientFromUserAgent(userAgent) {
  // 创建模拟请求对象
  const mockReq = {
    get: (header) => (header === "user-agent" ? userAgent : null),
  };
  return ClientDetector.detectByUserAgent(mockReq);
}

/**
 * 综合识别客户端类型
 * @param {Object} req - Express请求对象
 * @returns {string} 客户端类型
 */
function detectClientType(req) {
  return ClientDetector.detect(req);
}

/**
 * 获取客户端格式化类型
 * @param {Object} req - Express请求对象
 * @returns {string} 格式化类型
 */
function getClientFormatterType(req) {
  // 优先级：x-client-type header > req.clientFormatterType > 基于客户端类型的格式化
  const headerType = req.headers?.["x-client-type"];
  if (headerType) return headerType;

  if (req.clientFormatterType) return req.clientFormatterType;

  const clientType = req.clientType || detectClientType(req);
  return ClientDetector.getFormatterType(clientType);
}

module.exports = {
  CLIENT_TYPES,
  CLIENT_FORMATTER_MAPPING,
  CLIENT_AUTH_CONFIG,

  // 工具函数
  identifyClientFromPath,
  identifyClientFromHeaders,
  identifyClientFromUserAgent,
  detectClientType,
  getClientFormatterType,
};
