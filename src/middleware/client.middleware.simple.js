/**
 * 简化的统一客户端中间件
 * 
 * 保持与原版本完全相同的功能，但代码结构更清晰
 * 基于URL路径识别客户端类型，集成多端定制化响应和权限验证功能
 * 
 * @author Investment Platform Team
 * @version 2.0.0 (简化版)
 * @since 2025-07-06
 */

const logger = require("../utils/logger");
const { CLIENT_TYPES, CLIENT_AUTH_CONFIG } = require("../config/constants");

// 导入工具模块
const clientDetector = require("./utils/clientDetector");
const responseSetup = require("./utils/responseSetup");
const clientPermission = require("./utils/clientPermission");

/**
 * 统一客户端识别中间件（简化版，功能完全一致）
 */
const clientMiddleware = (req, res, next) => {
  try {
    // 1. 检测客户端类型
    const clientType = clientDetector.detectClientType(req);

    // 开发环境下的调试日志（保持原有逻辑）
    if (process.env.NODE_ENV === "development") {
      logger.debug("客户端识别", {
        originalPath: req.originalPath,
        currentPath: req.path,
        identifiedClientType: clientType,
      });
    }

    // 2. 设置客户端配置
    const clientConfig = CLIENT_AUTH_CONFIG[clientType] || CLIENT_AUTH_CONFIG[CLIENT_TYPES.COMMON];

    // 3. 设置客户端信息（新格式，保持原有结构）
    req.client = { 
      type: clientType, 
      name: clientConfig.name, 
      config: clientConfig 
    };
    req.clientType = clientType;

    // 4. 设置响应相关功能
    responseSetup.setupResponse(req, res, clientType);

    // 开发环境下记录格式化类型（保持原有逻辑）
    if (process.env.NODE_ENV === "development") {
      logger.debug("设置客户端格式化类型", { 
        clientType, 
        clientFormatterType: req.clientFormatterType 
      });
    }

    // 5. 设置权限验证功能
    const formatter = responseSetup.getSharedFormatter();
    clientPermission.setupPermissionValidator(req, res, formatter);

    next();
  } catch (error) {
    // 记录错误日志（保持原有逻辑）
    logger.error("统一客户端中间件错误", {
      error: error.message,
      stack: error.stack,
      path: req.path,
      originalPath: req.originalPath,
    });

    // 设置默认客户端类型（保持原有逻辑）
    req.client = {
      type: CLIENT_TYPES.COMMON,
      name: CLIENT_AUTH_CONFIG[CLIENT_TYPES.COMMON].name,
      config: CLIENT_AUTH_CONFIG[CLIENT_TYPES.COMMON],
    };
    req.clientFormatterType = "default";

    next();
  }
};

// 导出所有功能（保持与原版本完全一致的API）
module.exports = {
  CLIENT_TYPES,
  CLIENT_AUTH_CONFIG,
  clientMiddleware,
  validateClientPermission: clientPermission.createPermissionMiddleware,
  isAdminClient: clientPermission.isAdminClient,
  isAppClient: clientPermission.isAppClient,
  getClientConfig: clientPermission.getClientConfig,
  resetFormatter: responseSetup.resetFormatter, // 导出重置方法，供全局配置变更时使用
};
