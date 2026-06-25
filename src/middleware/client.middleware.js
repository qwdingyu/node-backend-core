/**
 * 统一客户端中间件
 *
 * 基于URL路径识别客户端类型，集成多端定制化响应和权限验证功能
 * 路径格式：/api/{client}/...
 *
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-06-23
 */

const logger = require("../utils/logger");
const { CLIENT_TYPES, CLIENT_AUTH_CONFIG } = require("../config/constants");

// 导入新的服务类
const ClientDetector = require("../services/ClientDetector");
const ClientPermission = require("../services/ClientPermission");

// 导入工具模块
const responseSetup = require("./utils/responseSetup");

/**
 * 统一客户端识别中间件（使用工具模块简化版）
 */
const clientMiddleware = (req, res, next) => {
  try {
    // 0. 空值检查
    if (!req || !res) {
      return next && next();
    }

    // 1. 检测客户端类型
    const clientType = ClientDetector.detect(req);

    // 开发环境下的调试日志
    if (process.env.NODE_ENV === "development") {
      logger.debug("客户端识别", {
        originalPath: req.originalPath,
        currentPath: req.path,
        identifiedClientType: clientType,
      });
    }

    // 2. 设置客户端配置
    const clientConfig = CLIENT_AUTH_CONFIG[clientType] || CLIENT_AUTH_CONFIG[CLIENT_TYPES.COMMON];

    // 3. 设置客户端信息
    req.client = { type: clientType, name: clientConfig.name, config: clientConfig };
    req.clientType = clientType;

    // 4. 设置响应相关功能（使用工具模块）
    responseSetup.setupResponse(req, res, clientType);

    // 开发环境下记录格式化类型
    if (process.env.NODE_ENV === "development") {
      logger.debug("设置客户端格式化类型", {
        clientType,
        clientFormatterType: req.clientFormatterType,
      });
    }

    // 5. 设置权限验证功能（使用新服务）
    const formatter = responseSetup.getSharedFormatter();
    ClientPermission.setupPermissionValidator(req, res, formatter);

    next();
  } catch (error) {
    // 记录错误日志
    logger.error("统一客户端中间件错误", {
      error: error.message,
      stack: error.stack,
      path: req?.path,
      originalPath: req?.originalPath,
    });

    // 设置默认客户端类型
    req.client = {
      type: CLIENT_TYPES.COMMON,
      name: CLIENT_AUTH_CONFIG[CLIENT_TYPES.COMMON].name,
      config: CLIENT_AUTH_CONFIG[CLIENT_TYPES.COMMON],
    };
    req.clientType = CLIENT_TYPES.COMMON;
    req.clientFormatterType = "default";

    // 确保在错误情况下也设置权限验证功能
    try {
      responseSetup.setupResponse(req, res, CLIENT_TYPES.COMMON);
      const formatter = responseSetup.getSharedFormatter();
      ClientPermission.setupPermissionValidator(req, res, formatter);
    } catch (setupError) {
      logger.error("设置默认权限验证功能失败", { error: setupError.message });
      // 设置一个基本的权限验证方法作为后备
      req.validateClientPermission = (requiredClientTypes = []) => ({
        valid: true,
        clientType: CLIENT_TYPES.COMMON,
        message: "使用默认权限验证",
      });
    }

    next();
  }
};

/**
 * 验证客户端权限中间件工厂
 */
const validateClientPermission = (requiredClientTypes = []) => {
  return (req, res, next) => {
    // 检查 validateClientPermission 方法是否存在
    if (typeof req.validateClientPermission !== "function") {
      logger.error("权限验证方法未设置", {
        path: req.path,
        clientType: req.clientType,
        hasMethod: typeof req.validateClientPermission,
      });

      // 检查响应是否已经发送，避免重复发送
      if (res.headersSent) {
        console.warn("响应头已发送，跳过权限验证错误响应");
        return next();
      }

      // 使用ResponseFormatter统一格式化响应
      const ResponseFormatter = require("../response/ResponseFormatter");
      const formatter = new ResponseFormatter();
      return formatter.internalError(res, "权限验证服务未正确初始化");
    }

    const validation = req.validateClientPermission(requiredClientTypes);

    if (!validation.valid) {
      // 检查响应是否已经发送，避免重复发送
      if (res.headersSent) {
        console.warn("响应头已发送，跳过权限验证失败响应");
        return next();
      }

      // 使用预准备的响应数据或创建新的响应
      if (validation.responseData) {
        // 使用ClientPermission准备的响应数据
        const ResponseFormatter = require("../response/ResponseFormatter");
        const formatter = new ResponseFormatter();
        res.status(validation.responseData.statusCode || 403);
        return formatter.formatResponse(res, validation.responseData);
      } else {
        // 后备方案：使用传统方式
        const ResponseFormatter = require("../response/ResponseFormatter");
        const formatter = new ResponseFormatter();
        const message = validation.message || "权限不足";
        const code = validation.error?.code || "PERMISSION_DENIED";
        return formatter.forbidden(res, message, code);
      }
    }

    next();
  };
};

/**
 * 检查是否为管理员客户端
 */
const isAdminClient = (req) => {
  return ClientPermission.isAdminClient(req.client?.type || req.clientType);
};

/**
 * 检查是否为移动端客户端
 */
const isAppClient = (req) => {
  return ClientPermission.isAppClient(req.client?.type || req.clientType);
};

/**
 * 获取客户端配置
 */
const getClientConfig = (clientType) => {
  return ClientPermission.getClientConfig(clientType);
};

module.exports = {
  CLIENT_TYPES,
  CLIENT_AUTH_CONFIG,
  clientMiddleware,
  validateClientPermission,
  isAdminClient,
  isAppClient,
  getClientConfig,
  resetFormatter: responseSetup.resetFormatter, // 导出重置方法，供全局配置变更时使用
};
