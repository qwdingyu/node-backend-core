/**
 * 客户端权限验证服务
 *
 * 专门负责客户端权限的验证和授权
 * 基于配置驱动，支持多层次权限检查
 *
 * @author Investment Platform Team
 * @version 3.0.0 (重构版)
 * @since 2025-07-06
 */

const { CLIENT_TYPES, CLIENT_AUTH_CONFIG, isValidClientType, getDefaultClientType } = require("../config/clientConfig");

/**
 * 客户端权限验证服务类
 */
class ClientPermission {
  /**
   * 验证客户端权限
   * @param {Object} req Express请求对象
   * @param {Array<string>} requiredClientTypes 需要的客户端类型数组
   * @param {Object} options 验证选项
   * @returns {Object} 验证结果
   */
  static validate(req, requiredClientTypes = [], options = {}) {
    // 获取当前客户端类型
    const currentClientType = this._getCurrentClientType(req);

    // 如果没有要求特定的客户端类型，则通过验证
    if (requiredClientTypes.length === 0) {
      return { valid: true, clientType: currentClientType };
    }

    // 基本类型验证
    const basicValidation = this._validateBasicType(currentClientType, requiredClientTypes);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    // 权限配置验证
    const permissionValidation = this._validatePermissions(currentClientType, requiredClientTypes, options);
    if (!permissionValidation.valid) {
      return permissionValidation;
    }

    // 路径访问验证
    if (req.path && options.checkPath !== false) {
      const pathValidation = this._validatePath(currentClientType, req.path);
      if (!pathValidation.valid) {
        return pathValidation;
      }
    }

    return {
      valid: true,
      clientType: currentClientType,
      message: "权限验证通过",
    };
  }

  /**
   * 获取当前客户端类型
   * @param {Object} req Express请求对象
   * @returns {string} 客户端类型
   * @private
   */
  static _getCurrentClientType(req) {
    return req.client?.type || req.clientType || getDefaultClientType();
  }

  /**
   * 验证基本客户端类型
   * @param {string} currentClientType 当前客户端类型
   * @param {Array<string>} requiredClientTypes 需要的客户端类型
   * @returns {Object} 验证结果
   * @private
   */
  static _validateBasicType(currentClientType, requiredClientTypes) {
    if (!isValidClientType(currentClientType)) {
      return {
        valid: false,
        error: "INVALID_CLIENT_TYPE",
        message: `无效的客户端类型: ${currentClientType}`,
        clientType: currentClientType,
      };
    }

    if (!requiredClientTypes.includes(currentClientType)) {
      return {
        valid: false,
        error: "CLIENT_TYPE_NOT_ALLOWED",
        message: `客户端类型 ${currentClientType} 不被允许访问此接口`,
        clientType: currentClientType,
        required: requiredClientTypes,
      };
    }

    return { valid: true };
  }

  /**
   * 验证权限配置
   * @param {string} currentClientType 当前客户端类型
   * @param {Array<string>} requiredClientTypes 需要的客户端类型
   * @param {Object} options 验证选项
   * @returns {Object} 验证结果
   * @private
   */
  static _validatePermissions(currentClientType, requiredClientTypes, options) {
    const clientConfig = CLIENT_AUTH_CONFIG[currentClientType];

    if (!clientConfig) {
      return {
        valid: false,
        error: "CLIENT_CONFIG_NOT_FOUND",
        message: `找不到客户端配置: ${currentClientType}`,
        clientType: currentClientType,
      };
    }

    // 检查权限标识
    if (clientConfig.permissions) {
      const hasPermission = clientConfig.permissions.some((permission) => requiredClientTypes.includes(permission) || permission === "all");

      if (!hasPermission) {
        return {
          valid: false,
          error: "INSUFFICIENT_PERMISSIONS",
          message: `客户端 ${currentClientType} 权限不足`,
          clientType: currentClientType,
          clientPermissions: clientConfig.permissions,
          required: requiredClientTypes,
        };
      }
    }

    // 检查认证要求
    if (clientConfig.requireAuth && options.checkAuth !== false) {
      // 这里可以添加认证检查逻辑
      // 例如检查 JWT token, session 等
      if (options.user === undefined && options.skipAuthCheck !== true) {
        return {
          valid: false,
          error: "AUTHENTICATION_REQUIRED",
          message: `客户端 ${currentClientType} 需要认证`,
          clientType: currentClientType,
        };
      }
    }

    // 检查管理员权限要求
    if (clientConfig.requireAdmin && options.checkAdmin !== false) {
      if (!options.isAdmin && options.skipAdminCheck !== true) {
        return {
          valid: false,
          error: "ADMIN_REQUIRED",
          message: `客户端 ${currentClientType} 需要管理员权限`,
          clientType: currentClientType,
        };
      }
    }

    return { valid: true };
  }

  /**
   * 验证路径访问权限
   * @param {string} currentClientType 当前客户端类型
   * @param {string} path 请求路径
   * @returns {Object} 验证结果
   * @private
   */
  static _validatePath(currentClientType, path) {
    const clientConfig = CLIENT_AUTH_CONFIG[currentClientType];

    if (!clientConfig || !clientConfig.allowedPaths) {
      return { valid: true }; // 如果没有配置路径限制，则允许访问
    }

    // 检查路径是否匹配允许的模式
    const isAllowed = clientConfig.allowedPaths.some((pattern) => {
      if (pattern.endsWith("/**")) {
        // 通配符模式：/api/admin/** 匹配 /api/admin/users
        const prefix = pattern.slice(0, -3);
        return path.startsWith(prefix);
      } else if (pattern.endsWith("/*")) {
        // 单级通配符：/api/admin/* 匹配 /api/admin/users 但不匹配 /api/admin/users/1
        const prefix = pattern.slice(0, -2);
        const remaining = path.slice(prefix.length);
        return path.startsWith(prefix) && !remaining.includes("/");
      } else {
        // 精确匹配
        return path === pattern;
      }
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: "PATH_NOT_ALLOWED",
        message: `客户端 ${currentClientType} 不被允许访问路径: ${path}`,
        clientType: currentClientType,
        path: path,
        allowedPaths: clientConfig.allowedPaths,
      };
    }

    return { valid: true };
  }

  /**
   * 检查是否为管理员客户端
   * @param {string} clientType 客户端类型
   * @returns {boolean} 是否为管理员客户端
   */
  static isAdminClient(clientType) {
    return clientType === CLIENT_TYPES.ADMIN;
  }

  /**
   * 检查是否为移动端客户端
   * @param {string} clientType 客户端类型
   * @returns {boolean} 是否为移动端客户端
   */
  static isAppClient(clientType) {
    return clientType === CLIENT_TYPES.APP;
  }

  /**
   * 获取客户端配置
   * @param {string} clientType 客户端类型
   * @returns {Object|null} 客户端配置
   */
  static getClientConfig(clientType) {
    return CLIENT_AUTH_CONFIG[clientType] || null;
  }

  /**
   * 创建权限验证中间件
   * @param {Array<string>} requiredClientTypes 需要的客户端类型
   * @param {Object} options 验证选项
   * @returns {Function} Express中间件函数
   */
  static createMiddleware(requiredClientTypes = [], options = {}) {
    return (req, res, next) => {
      const validation = this.validate(req, requiredClientTypes, options);

      if (!validation.valid) {
        const statusCode = this._getStatusCodeForError(validation.error);
        return res.status(statusCode).json({
          success: false,
          error: validation.error,
          message: validation.message,
          data: {
            clientType: validation.clientType,
            required: validation.required,
            path: validation.path,
          },
        });
      }

      // 将验证结果添加到请求对象
      req.clientPermission = validation;
      next();
    };
  }

  /**
   * 根据错误类型获取HTTP状态码
   * @param {string} errorType 错误类型
   * @returns {number} HTTP状态码
   * @private
   */
  static _getStatusCodeForError(errorType) {
    switch (errorType) {
      case "AUTHENTICATION_REQUIRED":
        return 401; // Unauthorized
      case "ADMIN_REQUIRED":
      case "INSUFFICIENT_PERMISSIONS":
      case "CLIENT_TYPE_NOT_ALLOWED":
      case "PATH_NOT_ALLOWED":
        return 403; // Forbidden
      case "INVALID_CLIENT_TYPE":
      case "CLIENT_CONFIG_NOT_FOUND":
        return 400; // Bad Request
      default:
        return 403; // Forbidden (默认)
    }
  }

  /**
   * 设置权限验证器到请求对象
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   * @param {Object} formatter 响应格式化器
   */
  static setupPermissionValidator(req, res, formatter) {
    // 添加权限验证方法到请求对象
    req.validateClientPermission = (requiredClientTypes = [], options = {}) => {
      const validation = this.validate(req, requiredClientTypes, options);

      if (!validation.valid && formatter) {
        // 不直接发送响应，只准备响应数据供中间件使用
        const statusCode = this._getStatusCodeForError(validation.error);
        validation.responseData = {
          type: "error",
          success: false,
          code: validation.error,
          message: validation.message,
          data: {
            clientType: validation.clientType,
            required: validation.required,
            path: validation.path,
          },
          statusCode: statusCode,
        };
      }

      return validation;
    };
  }

  /**
   * 获取权限验证统计信息
   * @param {Array<Object>} validationResults 验证结果数组
   * @returns {Object} 统计信息
   */
  static getValidationStats(validationResults) {
    const stats = {
      total: validationResults.length,
      passed: 0,
      failed: 0,
      byClientType: {},
      byError: {},
    };

    validationResults.forEach((result) => {
      if (result.valid) {
        stats.passed++;
      } else {
        stats.failed++;
        stats.byError[result.error] = (stats.byError[result.error] || 0) + 1;
      }

      const clientType = result.clientType;
      if (!stats.byClientType[clientType]) {
        stats.byClientType[clientType] = { passed: 0, failed: 0 };
      }

      if (result.valid) {
        stats.byClientType[clientType].passed++;
      } else {
        stats.byClientType[clientType].failed++;
      }
    });

    return stats;
  }
}

module.exports = ClientPermission;
