/**
 * BaseController v3.1 - 修复版
 *
 * 基于现有BaseController的增量改进版本，保持完全向后兼容
 * 修复了v3.0版本的所有问题：
 * 1. 完全兼容现有response.config.js配置
 * 2. 保留所有核心功能方法
 * 3. 完善错误处理机制
 * 4. 支持现有控制器无缝迁移
 *
 * @author Investment Platform Team
 * @version 3.1.0
 * @since 2024-06-22
 */

const ResponseFormatter = require("../response/ResponseFormatter");
const { getResponseFormat, setDeepProperty, getDeepProperty } = require("../response/response.config");
const { getClientFormatterType } = require("../config/constants");

class BaseController extends ResponseFormatter {
  /**
   * 构造函数 - 支持轻量级依赖注入和配置路径传递
   * @param {string|Object} projectConfigPathOrOptions 项目配置路径或配置选项对象
   */
  constructor(projectConfigPathOrOptions = null) {
    let projectConfigPath = null;
    let options = {};

    // 兼容两种调用方式：
    // 1. new BaseController(configPath) - 直接传递配置路径
    // 2. new BaseController({projectResponseConfigPath: configPath, ...}) - 传递选项对象
    if (typeof projectConfigPathOrOptions === "string") {
      projectConfigPath = projectConfigPathOrOptions;
    } else if (projectConfigPathOrOptions && typeof projectConfigPathOrOptions === "object") {
      options = projectConfigPathOrOptions;
      projectConfigPath = options.projectResponseConfigPath;
    }

    // 调用父类构造函数，传递项目配置路径
    super(projectConfigPath);

    // 轻量级依赖注入 - 提供灵活性但保持默认行为
    this.logger = options.logger || this._createDefaultLogger();

    this._autoBindMethods();
  }

  /**
   * 创建默认日志记录器
   * @private
   */
  _createDefaultLogger() {
    try {
      const logger = require("../utils/logger");
      return logger.child(this.constructor.name);
    } catch (error) {
      // 降级到console，确保框架在任何环境下都能工作
      return {
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
      };
    }
  }

  /**
   * 自动绑定方法到this上下文
   * @private
   */
  _autoBindMethods() {
    const prototype = Object.getPrototypeOf(this);
    const methodNames = Object.getOwnPropertyNames(prototype).filter((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      return name !== "constructor" && typeof descriptor.value === "function" && !name.startsWith("_");
    });

    methodNames.forEach((methodName) => {
      this[methodName] = this[methodName].bind(this);
    });
  }

  // ==================== 权限检查方法 ====================

  checkUserPermission(req, requiredLevel = 1) {
    const user = this.getCurrentUser(req);
    if (!user) throw new Error("用户未登录");
    if (user.user_type < requiredLevel) throw new Error("权限不足");
    return true;
  }

  checkUserAuthentication(req) {
    const user = this.getCurrentUser(req);
    if (!user) throw new Error("用户未登录");
    if (!user.is_auth) throw new Error("用户未实名认证");
    return true;
  }

  checkUserStatus(req) {
    const user = this.getCurrentUser(req);
    if (!user) throw new Error("用户未登录");
    if (user.status !== 1) throw new Error("用户账户已被禁用");
    if (user.is_freeze === 1) throw new Error("用户账户已被冻结");
    return true;
  }

  // ==================== 修复版错误处理方法 ====================

  /**
   * 创建错误返回对象（不直接操作res）
   * @param {string} message 错误消息
   * @param {string} code 错误代码
   * @param {number} statusCode HTTP状态码
   * @returns {Object} 错误对象
   */
  createError(message, code = "ERROR", statusCode = 400) {
    return {
      __isControllerError: true,
      message,
      code,
      statusCode,
    };
  }

  /**
   * 返回参数错误 - 修复版，支持配置化响应
   */
  paramError(message = "参数错误", code = "INVALID_PARAMETER") {
    return this.createError(message, code, 400);
  }

  /**
   * 返回权限错误 - 修复版，支持配置化响应
   */
  permissionError(message = "权限不足", code = "INSUFFICIENT_PERMISSION") {
    return this.createError(message, code, 403);
  }

  /**
   * 返回未找到错误 - 修复版，支持配置化响应
   */
  notFoundError(message = "资源不存在", code = "NOT_FOUND") {
    return this.createError(message, code, 404);
  }

  /**
   * 返回业务错误 - 修复版，支持配置化响应
   */
  businessError(message, code = "BUSINESS_ERROR") {
    return this.createError(message, code, 400);
  }

  // ==================== 核心API包装方法（保持兼容） ====================

  /**
   * 自动包装API方法，提供日志记录、异常处理和配置化响应
   * @param {Function} handler 业务逻辑函数
   * @param {Object} options 配置选项
   * @param {string} options.responseType 响应类型 (entity, list, pagination)
   * @param {string} options.errorMsg 错误消息
   * @returns {Function} Express中间件
   */
  apiMethod(handler, options = {}) {
    const { responseType = "entity", errorMsg = null } = options;

    return async (req, res) => {
      // 自动获取方法名
      const methodName = handler.name || "anonymous";

      try {
        // 记录请求开始
        this.logApiCall(req, methodName, "start");

        // 执行业务逻辑
        const result = await handler.call(this, req, res);

        // 检查是否是控制器错误对象
        if (result && result.__isControllerError) {
          this.logApiCall(req, methodName, "error");
          return this.error(res, result.message, result.code, result.statusCode);
        }

        // 记录请求成功
        this.logApiCall(req, methodName, "success");

        // 使用配置化响应格式（保持与现有系统兼容）
        return this.handleConfigurableResponse(res, result, responseType);
      } catch (error) {
        // 记录请求失败
        this.logApiCall(req, methodName, "error");

        // 统一错误处理
        const message = errorMsg || `${methodName}失败`;
        return this.handleError(res, error, message);
      }
    };
  }

  /**
   * 分页API方法包装器
   */
  paginatedApiMethod(handler, options = {}) {
    return this.apiMethod(handler, {
      responseType: "pagination",
      ...options,
    });
  }

  /**
   * 实体API方法包装器
   */
  entityApiMethod(handler, options = {}) {
    return this.apiMethod(handler, {
      responseType: "entity",
      ...options,
    });
  }

  /**
   * 列表API方法包装器（无分页）
   */
  listApiMethod(handler, options = {}) {
    return this.apiMethod(handler, {
      responseType: "list",
      ...options,
    });
  }

  /**
   * 操作结果API方法包装器（增删改操作）
   */
  operationApiMethod(handler, options = {}) {
    return this.apiMethod(handler, {
      responseType: "operation",
      ...options,
    });
  }

  /**
   * 实体操作API方法包装器（create/update操作，返回实体+操作信息）
   */
  entityOperationApiMethod(handler, options = {}) {
    return this.apiMethod(handler, {
      responseType: "entityOperation",
      ...options,
    });
  }

  // ==================== 保留现有核心响应处理方法 ====================

  /**
   * 配置化响应处理 - 根据客户端类型返回不同格式
   * @param {Object} res Express响应对象
   * @param {Object} serviceResult 服务层返回结果或直接数据
   * @param {string} responseType 响应类型 (entity, list, pagination)
   */
  handleConfigurableResponse(res, serviceResult, responseType = "entity") {
    // 处理直接返回数据的情况（非服务层包装格式）
    if (serviceResult && typeof serviceResult === "object" && !serviceResult.hasOwnProperty("success")) {
      // 直接返回的数据，包装成标准格式
      const wrappedResult = { success: true, data: serviceResult, message: "操作成功" };
      serviceResult = wrappedResult;
    }

    // 检查服务层返回的结果
    if (!serviceResult || serviceResult.success === false) {
      const errorMessage = serviceResult?.message || "操作失败";
      const errorCode = serviceResult?.code || "SERVICE_ERROR";
      return this.error(res, errorMessage, errorCode, 400);
    }

    // ✅ 使用ResponseFormatter处理成功响应
    const internalResponse = {
      type: responseType,
      success: true,
      data: serviceResult.data,
      message: serviceResult.message || "操作成功",
    };
    return this.formatResponse(res, internalResponse);
  }
  /**
   * 构建错误响应数据 - 配置化模式
   * @param {Object} formatConfig 错误格式配置对象
   * @param {Object} errorData 错误数据
   * @returns {Object} 格式化的错误响应
   */
  buildErrorResponse(formatConfig, errorData) {
    const { template, mapping = {} } = formatConfig;
    const response = JSON.parse(JSON.stringify(template)); // 深拷贝模板

    // 1. 处理字段映射
    Object.entries(mapping).forEach(([targetPath, sourcePath]) => {
      const value = getDeepProperty(errorData, sourcePath);
      if (value !== undefined) {
        setDeepProperty(response, targetPath, value);
      }
    });

    // 2. 处理时间戳
    if (response.timestamp && typeof response.timestamp === "function") {
      response.timestamp = response.timestamp();
    }

    // 3. 在生产环境中移除debug信息
    if (process.env.NODE_ENV === "production" && response.debug !== undefined) {
      delete response.debug;
    }

    return response;
  }

  // ==================== 完整的错误处理机制 ====================

  /**
   * 通用的错误处理 - 配置化错误响应
   * 开发环境显示详细错误信息，生产环境隐藏敏感信息
   */
  handleError(res, error, message = "操作失败") {
    const context = this._buildErrorContext(res, error, message);
    const mapping = this._findErrorMapping(error);
    const response = this._buildErrorResponse(context, mapping);

    this._logError(context);
    return this._sendErrorResponse(res, response, mapping.response.status);
  }

  /**
   * 构建错误上下文信息
   * @private
   */
  _buildErrorContext(res, error, message) {
    return {
      error: {
        message: error?.message || error || message,
        name: error?.name || "UnknownError",
        stack: error?.stack,
        code: error?.code,
        sql: error?.sql,
        original: error?.original,
      },
      request: {
        url: res.req?.originalUrl,
        method: res.req?.method,
        body: res.req?.body,
        query: res.req?.query,
        params: res.req?.params,
        user: res.req?.user?.id,
        ip: res.req?.ip,
        userAgent: res.req?.get("User-Agent"),
      },
      environment: {
        isDevelopment: process.env.NODE_ENV === "development",
        timestamp: new Date().toISOString(),
        clientFormatterType: this._getClientFormatterType(res),
      },
    };
  }

  /**
   * 查找错误映射配置
   * @private
   */
  _findErrorMapping(error) {
    const errorMappings = this._getErrorMappings();
    const errorName = error?.name || "UnknownError";
    const errorMsg = error?.message || "";

    for (const mapping of errorMappings) {
      if (this._matchError(error, errorName, errorMsg, mapping.pattern)) {
        return mapping;
      }
    }

    // 返回默认映射
    return {
      response: {
        code: "INTERNAL_ERROR",
        status: 500,
        message: null,
      },
    };
  }

  /**
   * 构建错误响应数据
   * @private
   */
  _buildErrorResponse(context, mapping) {
    const { error, environment } = context;
    const clientFormatterType = environment.clientFormatterType;

    try {
      const errorFormat = this._getErrorResponseFormat(clientFormatterType);
      const errorCode = this._mapErrorCodeForClient(mapping.response.code, clientFormatterType);

      const errorData = {
        code: mapping.response.code,
        statusCode: mapping.response.status,
        errorCode: errorCode,
        message: mapping.response.message || error.message,
        debug: environment.isDevelopment ? this._buildDebugInfo(context) : null,
      };

      return this.buildErrorResponse(errorFormat, errorData);
    } catch (formatError) {
      // 格式化失败时的降级处理
      this.logger.warn("错误响应格式化失败，使用降级格式", { error: formatError.message });
      return this._buildFallbackErrorResponse(context, mapping);
    }
  }

  /**
   * 构建调试信息
   * @private
   */
  _buildDebugInfo(context) {
    const { error, request } = context;

    return {
      originalError: error.message,
      errorName: error.name,
      stack: error.stack,
      sql: error.sql,
      context: {
        url: request.url,
        method: request.method,
        body: request.body,
        query: request.query,
        params: request.params,
      },
    };
  }

  /**
   * 降级错误响应（当格式化失败时）
   * @private
   */
  _buildFallbackErrorResponse(context, mapping) {
    const { error, environment } = context;

    return {
      success: false,
      code: mapping.response.code,
      message: environment.isDevelopment ? error.message : "系统内部错误",
      timestamp: environment.timestamp,
    };
  }

  /**
   * 记录错误日志
   * @private
   */
  _logError(context) {
    const { error, request, environment } = context;

    this.logger.error("API错误", {
      error: error.message,
      name: error.name,
      stack: error.stack,
      sql: error.sql,
      url: request.url,
      method: request.method,
      user: request.user,
      ip: request.ip,
      timestamp: environment.timestamp,
    });
  }

  /**
   * 发送错误响应
   * @private
   */
  _sendErrorResponse(res, response, statusCode) {
    // 检查响应是否已经发送，避免重复发送
    if (res.headersSent) {
      console.warn("响应头已发送，跳过错误响应");
      return;
    }
    return res.status(statusCode).json(response);
  }

  /**
   * 获取客户端类型（缓存优化）
   * @private
   */
  _getClientFormatterType(res) {
    if (!res._cachedClientFormatterType) {
      // 修复：getClientFormatterType 需要 req 对象，从 res.req 获取
      const req = res.req || res;
      res._cachedClientFormatterType = getClientFormatterType(req);
    }
    return res._cachedClientFormatterType;
  }

  /**
   * 获取错误映射配置 - 支持子类扩展
   * @protected
   */
  _getErrorMappings() {
    try {
      // 获取基础错误映射
      const baseErrorMappings = this._getBaseErrorMappings();

      // 允许子类扩展错误映射
      const customErrorMappings = this._getCustomErrorMappings();

      return [...baseErrorMappings, ...customErrorMappings];
    } catch (error) {
      this.logger.warn("无法加载错误映射配置，使用默认配置");
      return this._getFallbackErrorMappings();
    }
  }

  /**
   * 获取基础错误映射
   * @protected
   */
  _getBaseErrorMappings() {
    return [
      // 数据库相关错误
      { pattern: { name: "ValidationError" }, response: { code: "VALIDATION_ERROR", status: 400 } },
      { pattern: { name: "SequelizeValidationError" }, response: { code: "VALIDATION_ERROR", status: 400 } },
      { pattern: { name: "SequelizeUniqueConstraintError" }, response: { message: "数据已存在", code: "DUPLICATE_ERROR", status: 409 } },
      { pattern: { name: "SequelizeForeignKeyConstraintError" }, response: { message: "关联数据不存在", code: "REFERENCE_ERROR", status: 400 } },

      // JWT相关错误
      { pattern: { name: "JsonWebTokenError" }, response: { message: "Token无效", code: "INVALID_TOKEN", status: 401 } },
      { pattern: { name: "TokenExpiredError" }, response: { message: "Token已过期", code: "TOKEN_EXPIRED", status: 401 } },

      // 通用错误
      { pattern: { message: ["not found", "不存在"] }, response: { code: "NOT_FOUND", status: 404 } },
      { pattern: { message: ["unauthorized", "权限"] }, response: { code: "UNAUTHORIZED", status: 403 } },
    ];
  }

  /**
   * 子类可重写此方法添加自定义错误映射
   * @protected
   */
  _getCustomErrorMappings() {
    return [];
  }

  /**
   * 降级错误映射（当配置加载失败时）
   * @private
   */
  _getFallbackErrorMappings() {
    return [
      { pattern: { name: "ValidationError" }, response: { code: "VALIDATION_ERROR", status: 400 } },
      { pattern: { name: "JsonWebTokenError" }, response: { code: "INVALID_TOKEN", status: 401 } },
    ];
  }

  /**
   * 匹配错误模式
   * @private
   */
  _matchError(error, errorName, errorMsg, pattern) {
    if (pattern.name && errorName === pattern.name) return true;
    if (pattern.message && Array.isArray(pattern.message)) {
      return pattern.message.some((msg) => typeof errorMsg === "string" && errorMsg.includes(msg));
    }
    return false;
  }

  /**
   * 获取错误响应格式 - 优先使用配置系统，支持子类扩展
   * @param {string} clientFormatterType 客户端类型
   * @returns {Object} 错误响应格式配置
   * @private
   */
  _getErrorResponseFormat(clientFormatterType) {
    try {
      // 优先从 response.config.js 获取
      return getResponseFormat(clientFormatterType, "error");
    } catch (error) {
      // 如果配置系统中没有，尝试从子类获取
      const customFormat = this._getCustomErrorFormat(clientFormatterType);
      if (customFormat) {
        return customFormat;
      }

      this.logger.warn(`未找到客户端 ${clientFormatterType} 的错误响应配置，使用默认格式`);
      // 最后降级到默认配置
      try {
        return getResponseFormat("default", "error");
      } catch (fallbackError) {
        // 如果连默认配置都没有，返回基础格式
        return {
          template: {
            success: false,
            code: "",
            message: "",
            debug: null,
          },
          mapping: {
            code: "code",
            message: "message",
            debug: "debug",
          },
        };
      }
    }
  }

  /**
   * 子类可重写此方法提供自定义错误格式
   * @param {string} clientFormatterType 客户端类型
   * @returns {Object|null} 自定义错误格式配置
   * @protected
   */
  _getCustomErrorFormat(clientFormatterType) {
    // 子类可以重写此方法来提供 mobile、miniapp 等格式
    return null;
  }

  /**
   * 映射错误代码 - 优先使用配置系统，支持子类扩展
   * @param {string} code 通用错误代码
   * @param {string} clientFormatterType 客户端类型
   * @returns {string|number} 客户端特定的错误代码
   * @private
   */
  _mapErrorCodeForClient(code, clientFormatterType) {
    try {
      // 优先从配置系统的错误格式中获取映射
      const errorFormat = getResponseFormat(clientFormatterType, "error");
      if (errorFormat.errorCodeMapping) {
        const mapping = errorFormat.errorCodeMapping[code];
        if (mapping !== undefined) {
          return mapping;
        }
      }
    } catch (error) {
      // 配置系统中没有，尝试从子类获取
    }

    // 从子类获取自定义映射
    const customMapping = this._getCustomErrorCodeMapping(clientFormatterType, code);
    if (customMapping !== null) {
      return customMapping;
    }

    // 降级处理：返回原始代码
    this.logger.warn(`无法获取客户端 ${clientFormatterType} 的错误代码映射，使用原始代码: ${code}`);
    return code;
  }

  /**
   * 子类可重写此方法提供自定义错误代码映射
   * @param {string} clientFormatterType 客户端类型
   * @param {string} code 错误代码
   * @returns {string|number|null} 映射后的错误代码，返回null表示没有自定义映射
   * @protected
   */
  _getCustomErrorCodeMapping(clientFormatterType, code) {
    // 子类可以重写此方法来提供 mobile、miniapp 等的错误代码映射
    return null;
  }
  // ==================== 保留现有工具方法 ====================

  /**
   * 获取当前用户信息
   * @param {Object} req Express请求对象
   * @returns {Object|null} 用户信息
   */
  getCurrentUser(req) {
    return req.user || null;
  }

  /**
   * 获取当前用户ID
   * @param {Object} req Express请求对象
   * @returns {number|null} 用户ID
   */
  getCurrentUserId(req) {
    return req.user?.id || null;
  }

  /**
   * 解析分页参数
   * @param {Object} query 查询参数
   * @returns {Object} 分页参数对象
   */
  parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * 解析排序参数
   * @param {Object} query 查询参数
   * @param {Array} allowedFields 允许排序的字段
   * @returns {Array} Sequelize排序数组
   */
  parseSort(query, allowedFields = []) {
    const { sort, order = "ASC" } = query;
    if (!sort || !allowedFields.includes(sort)) {
      return [];
    }

    const direction = order.toUpperCase() === "DESC" ? "DESC" : "ASC";
    return [[sort, direction]];
  }

  /**
   * 解析搜索参数
   * @param {Object} query 查询参数
   * @param {Array} searchFields 可搜索的字段
   * @returns {Object} Sequelize where条件
   */
  parseSearch(query, searchFields = []) {
    const { search } = query;
    if (!search || searchFields.length === 0) {
      return {};
    }

    const { Op } = require("sequelize");
    return {
      [Op.or]: searchFields.map((field) => ({
        [field]: { [Op.like]: `%${search}%` },
      })),
    };
  }

  /**
   * 解析过滤参数
   * @param {Object} query 查询参数
   * @param {Array} filterFields 可过滤的字段
   * @returns {Object} Sequelize where条件
   */
  parseFilters(query, filterFields = []) {
    const filters = {};
    filterFields.forEach((field) => {
      if (query[field] !== undefined && query[field] !== "") {
        filters[field] = query[field];
      }
    });
    return filters;
  }

  /**
   * 解析日期范围参数
   * @param {Object} query 查询参数
   * @param {string} field 日期字段名
   * @returns {Object} Sequelize日期范围条件
   */
  parseDateRange(query, field = "created_at") {
    const { start_date, end_date } = query;
    if (!start_date && !end_date) {
      return {};
    }

    const { Op } = require("sequelize");
    const conditions = {};

    if (start_date) {
      conditions[Op.gte] = new Date(start_date);
    }
    if (end_date) {
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999); // 设置为当天结束时间
      conditions[Op.lte] = endDate;
    }

    return { [field]: conditions };
  }

  // ==================== 事务支持 ====================

  /**
   * 在事务中执行操作 - 保持与现有系统兼容
   * @param {Function} operation 要执行的操作函数
   * @param {Object} options 事务选项
   * @returns {Promise} 操作结果
   */
  async executeInTransaction(operation, options = {}) {
    const sequelize = this.getSequelize();
    if (!sequelize) {
      throw new Error("Sequelize实例不可用，无法执行事务");
    }

    return await sequelize.transaction(options, async (transaction) => {
      return await operation(transaction);
    });
  }

  // ==================== API调用日志记录 ====================

  /**
   * 记录API调用日志
   * @param {Object} req Express请求对象
   * @param {string} action 操作名称
   * @param {string} result 操作结果 (start, success, error)
   * @param {number} duration 执行时间（毫秒）
   */
  logApiCall(req, action, result, duration = 0) {
    const logData = {
      action,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      clientType: req.get("clientType") || req.headers["x-client-type"],
      result,
    };

    if (duration > 0) {
      logData.duration = `${duration}ms`;
    }

    if (result === "error") {
      this.logger.error("API调用失败", logData);
    } else {
      this.logger.info("API调用", logData);
    }
  }

  // ==================== 验证方法 ====================

  /**
   * 验证必需参数
   * @param {Object} data 数据对象
   * @param {Array} requiredFields 必需字段数组
   * @returns {Object|null} 如果验证失败返回错误对象，成功返回null
   */
  validateRequired(data, requiredFields) {
    // 添加安全检查
    if (!data || typeof data !== "object") {
      return this.paramError("请求数据格式错误");
    }

    const missingFields = requiredFields.filter((field) => {
      const value = data[field];
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      return this.paramError(`缺少必需参数: ${missingFields.join(", ")}`);
    }

    return null; // 验证通过
  }

  /**
   * 验证数字参数
   * @param {any} value 要验证的值
   * @param {string} fieldName 字段名称
   * @param {Object} options 验证选项
   * @returns {Object|null} 如果验证失败返回错误对象，成功返回null
   */
  validateNumber(value, fieldName, options = {}) {
    const { min, max, integer = false } = options;

    if (value === undefined || value === null || value === "") {
      return null; // 允许空值，由required验证处理
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      return this.paramError(`${fieldName}必须是有效数字`);
    }

    if (integer && !Number.isInteger(num)) {
      return this.paramError(`${fieldName}必须是整数`);
    }

    if (min !== undefined && num < min) {
      return this.paramError(`${fieldName}不能小于${min}`);
    }

    if (max !== undefined && num > max) {
      return this.paramError(`${fieldName}不能大于${max}`);
    }

    return null; // 验证通过
  }

  /**
   * 验证字符串参数
   * @param {any} value 要验证的值
   * @param {string} fieldName 字段名称
   * @param {Object} options 验证选项
   * @returns {Object|null} 如果验证失败返回错误对象，成功返回null
   */
  validateString(value, fieldName, options = {}) {
    const { minLength, maxLength, pattern } = options;

    if (value === undefined || value === null) {
      return null; // 允许空值，由required验证处理
    }

    const str = String(value);

    if (minLength !== undefined && str.length < minLength) {
      return this.paramError(`${fieldName}长度不能少于${minLength}个字符`);
    }

    if (maxLength !== undefined && str.length > maxLength) {
      return this.paramError(`${fieldName}长度不能超过${maxLength}个字符`);
    }

    if (pattern && !pattern.test(str)) {
      return this.paramError(`${fieldName}格式不正确`);
    }

    return null; // 验证通过
  }
}

module.exports = BaseController;
