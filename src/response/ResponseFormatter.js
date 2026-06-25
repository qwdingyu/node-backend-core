/**
 * 响应格式化基类 - 支持简化模式
 *
 * 为控制器和中间件提供统一的响应格式化功能
 * 支持多客户端适配和配置化响应格式
 * 新增：支持简化模式，无配置时使用默认输出
 *
 * @author Investment Platform Team
 * @version 2.0.0
 * @since 2024-06-22
 */

const configCache = require("./configCache");
const logger = require("../utils/logger");
const ResponseHelpers = require("./ResponseHelpers");
const ResponseBuilder = require("./ResponseBuilder");

class ResponseFormatter {
  // 全局配置
  static _globalConfig = {
    useSimpleResponse: null, // null=自动判断, true=强制简化, false=强制完整
  };

  constructor(projectResponseConfigPath = null) {
    // 判断使用模式
    this.useSimpleMode = this._shouldUseSimpleMode(projectResponseConfigPath);

    // 根据模式初始化
    if (this.useSimpleMode) {
      this._initSimpleMode();
    } else {
      this._initFullMode(projectResponseConfigPath);
    }

    // 初始化便捷方法助手
    this.helpers = new ResponseHelpers(this);
  }

  /**
   * 设置全局配置
   */
  static setDefaults(config = {}) {
    ResponseFormatter._globalConfig = {
      ...ResponseFormatter._globalConfig,
      ...config,
    };

    logger.info("ResponseFormatter 全局配置已更新", {
      useSimpleResponse: ResponseFormatter._globalConfig.useSimpleResponse,
    });
  }

  /**
   * 获取全局配置
   */
  static getDefaults() {
    return { ...ResponseFormatter._globalConfig };
  }

  /**
   * 判断是否使用简化模式
   */
  _shouldUseSimpleMode(projectConfigPath) {
    const globalConfig = ResponseFormatter._globalConfig;

    // 1. 全局配置明确指定
    if (globalConfig?.useSimpleResponse === true) return true;
    if (globalConfig?.useSimpleResponse === false) return false;

    // 2. 自动判断：无项目配置文件 = 使用简化模式
    return !projectConfigPath;
  }

  /**
   * 初始化简化模式
   */
  _initSimpleMode() {
    // 简化模式：使用内置的简单格式，不加载复杂配置文件
    this.CLIENT_FORMATTERS = {
      DEFAULT: "default",
      WEB_ADMIN: "web_admin",
      MOBILE: "mobile",
      MINIAPP: "miniapp",
    };

    this.RESPONSE_TYPES = {
      ENTITY: "entity",
      LIST: "list",
      PAGINATION: "pagination",
      OPERATION: "operation",
      ENTITY_OPERATION: "entityOperation",
      ERROR: "error",
    };

    // 简化模式不需要 finalConfig，直接使用内置模板
    this.finalConfig = null;

    if (process.env.NODE_ENV === "development") {
      logger.debug("ResponseFormatter 使用简化模式");
    }
  }

  /**
   * 初始化完整模式
   */
  _initFullMode(projectResponseConfigPath) {
    // 完整模式：加载默认配置文件
    this.defaultFormats = require("./response.config");

    // 保持现有的完整配置加载逻辑
    this.finalConfig = this._getIntegratedConfig(projectResponseConfigPath);
    this.CLIENT_FORMATTERS = this.finalConfig.CLIENT_FORMATTERS || this.defaultFormats.CLIENT_FORMATTERS;
    this.RESPONSE_TYPES = this.finalConfig.RESPONSE_TYPES || this.defaultFormats.RESPONSE_TYPES;

    if (process.env.NODE_ENV === "development") {
      logger.debug("ResponseFormatter 使用完整模式", {
        hasProjectConfig: !!projectResponseConfigPath,
      });
    }
  }

  /**
   * 获取整合后的配置（使用模块级缓存）
   * @param {string|null} projectResponseConfigPath 项目配置路径
   * @returns {Object} 整合后的配置
   * @private
   */
  _getIntegratedConfig(projectResponseConfigPath) {
    try {
      // 使用同步方法获取配置（保持向后兼容）
      return configCache.getConfigSync(projectResponseConfigPath);
    } catch (error) {
      console.error("❌ ResponseFormatter 配置获取失败:", error.message);
      console.log("📋 降级使用默认配置");
      return this.defaultFormats;
    }
  }

  /**
   * 纯数据格式化方法（用于测试和非Express环境）- 支持模式切换
   * @param {Object} serviceResult 服务层返回的标准格式数据
   * @param {string} responseType 响应类型 (entity, list, pagination, operation, error)
   * @param {string} clientFormatterType 客户端类型
   * @returns {Object} 格式化后的响应数据
   */
  format(serviceResult, responseType = "entity", clientFormatterType = "default") {
    // 开发环境下的调试日志
    this._logDebug("format", {
      useSimpleMode: this.useSimpleMode,
      clientFormatterType,
      responseType,
      hasServiceResult: !!serviceResult,
    });

    // 处理空值情况
    if (serviceResult === null || serviceResult === undefined) {
      serviceResult = { success: true, data: null, message: "操作成功" };
    }

    // 构建内部响应对象
    const internalResponse = this._buildInternalResponse(serviceResult, responseType);

    // 根据模式选择不同的处理方式
    if (this.useSimpleMode) {
      // 简化模式：固定格式，只按响应类型区分，忽略客户端类型
      return ResponseBuilder.buildSimpleResponse(internalResponse, responseType);
    } else {
      // 完整模式：使用复杂的配置系统
      try {
        const formatConfig = this.finalConfig.getResponseFormat(clientFormatterType, responseType);

        if (!formatConfig || !formatConfig.template) {
          throw new Error(`Invalid format config for ${clientFormatterType}:${responseType}`);
        }

        return ResponseBuilder.buildFullResponse(formatConfig, internalResponse, this._cloneTemplate.bind(this), this.finalConfig);
      } catch (error) {
        return ResponseBuilder.buildDefaultResponse(internalResponse, clientFormatterType, this.useSimpleMode, this.CLIENT_FORMATTERS);
      }
    }
  }

  /**
   * 格式化响应数据（Express环境）- 支持模式切换
   * @param {Object} res Express响应对象
   * @param {Object} internalResponse 内部响应对象
   * @param {string} clientFormatterType 客户端格式化类型（可选）
   * @returns {Object} Express响应对象
   */
  formatResponse(res, internalResponse, clientFormatterType = null) {
    // 获取响应类型
    const responseType = internalResponse.type || this.RESPONSE_TYPES?.ENTITY || "entity";

    // 开发环境下的调试日志
    this._logDebug("formatResponse", {
      useSimpleMode: this.useSimpleMode,
      responseType,
      clientFormatterType,
      hasInternalResponse: !!internalResponse,
    });

    // 检查响应是否已经发送，避免重复发送
    if (res.headersSent) {
      console.warn("响应头已发送，跳过ResponseFormatter.formatResponse");
      return;
    }

    // 根据模式选择不同的处理方式
    if (this.useSimpleMode) {
      // 简化模式：直接构建响应，忽略客户端类型
      const response = ResponseBuilder.buildSimpleResponse(internalResponse, responseType);
      return res.json(response);
    } else {
      // 完整模式：使用复杂的配置系统
      // const finalClientFormatterType = clientFormatterType || res.get("X-Client-Format-Type") || this.CLIENT_FORMATTERS.DEFAULT;
      const finalClientFormatterType = clientFormatterType || this.CLIENT_FORMATTERS.DEFAULT;

      try {
        const formatConfig = this.finalConfig.getResponseFormat(finalClientFormatterType, responseType);

        if (!formatConfig || !formatConfig.template) {
          throw new Error(`Invalid format config for ${finalClientFormatterType}:${responseType}`);
        }

        const response = ResponseBuilder.buildFullResponse(formatConfig, internalResponse, this._cloneTemplate.bind(this), this.finalConfig);
        return res.json(response);
      } catch (error) {
        // 配置获取失败时使用默认格式
        logger.warn("ResponseFormatter配置获取失败，使用默认格式", {
          clientFormatterType: finalClientFormatterType,
          responseType,
          error: error.message,
        });

        const defaultResponse = ResponseBuilder.buildDefaultResponse(
          internalResponse,
          finalClientFormatterType,
          this.useSimpleMode,
          this.CLIENT_FORMATTERS
        );
        return res.json(defaultResponse);
      }
    }
  }

  /**
   * 优化的模板克隆方法
   * @param {Object} template 模板对象
   * @returns {Object} 克隆的对象
   * @private
   */
  _cloneTemplate(template) {
    if (template === null || typeof template !== "object") {
      return template;
    }

    if (Array.isArray(template)) {
      return template.map((item) => this._cloneTemplate(item));
    }

    const cloned = {};
    for (const key in template) {
      if (template.hasOwnProperty(key)) {
        cloned[key] = this._cloneTemplate(template[key]);
      }
    }
    return cloned;
  }

  /**
   * 开发环境日志记录
   * @param {string} method 方法名
   * @param {Object} params 参数
   * @private
   */
  _logDebug(method, params) {
    if (process.env.NODE_ENV === "development") {
      logger.debug(`ResponseFormatter.${method}`, params);
    }
  }

  /**
   * 构建内部响应对象
   * @param {Object} serviceResult 服务结果
   * @param {string} responseType 响应类型
   * @param {Object} extraFields 额外字段
   * @returns {Object} 内部响应对象
   * @private
   */
  _buildInternalResponse(serviceResult, responseType = "entity", extraFields = {}) {
    return {
      type: responseType,
      success: serviceResult.success !== false,
      data: serviceResult.data,
      message: serviceResult.message || "操作成功",
      code: serviceResult.code,
      ...extraFields,
    };
  }

  /**
   * 向后兼容的响应构建方法
   * @param {Object} formatConfig 响应格式配置
   * @param {Object} internalResponse 内部响应对象
   * @returns {Object} 格式化的响应
   */
  buildResponse(formatConfig, internalResponse) {
    // 根据模式选择构建方法，保持向后兼容
    if (this.useSimpleMode) {
      // 简化模式：忽略 formatConfig，使用默认响应类型
      return ResponseBuilder.buildSimpleResponse(internalResponse, "entity");
    } else {
      return ResponseBuilder.buildFullResponse(formatConfig, internalResponse, this._cloneTemplate.bind(this), this.finalConfig);
    }
  }

  // 注意：buildDefaultResponse 方法已移至 ResponseBuilder.buildDefaultResponse

  // 注意：processTimestamp 和 processStatusCode 方法已移至 ResponseBuilder

  // ==================== 便捷响应方法（委托给 ResponseHelpers）====================

  /**
   * 成功响应
   * @param {Object} res Express响应对象
   * @param {*} data 响应数据
   * @param {string} message 响应消息
   */
  success(res, data = null, message = "操作成功") {
    return this.helpers.success(res, data, message);
  }

  /**
   * 错误响应
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   * @param {string} code 错误代码
   * @param {number} statusCode HTTP状态码
   */
  error(res, message = "操作失败", code = "ERROR", statusCode = 500) {
    return this.helpers.error(res, message, code, statusCode);
  }

  /**
   * 未授权响应 (401)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  unauthorized(res, message = "未授权访问") {
    return this.helpers.unauthorized(res, message);
  }

  /**
   * 禁止访问响应 (403)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   * @param {string} clientType 客户端类型
   */
  forbidden(res, message = "禁止访问") {
    return this.helpers.forbidden(res, message);
  }

  /**
   * 资源不存在响应 (404)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  notFound(res, message = "资源不存在") {
    return this.helpers.notFound(res, message);
  }

  /**
   * 参数错误响应 (400)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   * @param {string} clientType 客户端类型
   */
  badRequest(res, message = "请求参数错误") {
    return this.helpers.badRequest(res, message);
  }

  /**
   * 验证错误响应 (400)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  validationError(res, message = "数据验证失败") {
    return this.helpers.validationError(res, message);
  }

  /**
   * 冲突响应 (409)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   * @param {string} clientType 客户端类型
   */
  conflict(res, message = "资源冲突") {
    return this.helpers.conflict(res, message);
  }

  /**
   * 服务器内部错误响应 (500)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  internalError(res, message = "服务器内部错误") {
    return this.helpers.internalError(res, message);
  }
}

module.exports = ResponseFormatter;
