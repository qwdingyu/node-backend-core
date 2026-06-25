/**
 * 服务基类
 *
 * 提供必要的通用功能：
 * - 统一的数据库连接管理
 * - 统一的日志系统
 * - 事务处理支持
 * - 标准响应格式
 *
 * @author Investment Platform Team
 * @version 2.0.0
 * @since 2024-06-20
 * @simplified 移除复杂的配置加载逻辑
 */
const { Op } = require("sequelize");
const logger = require("../utils/logger");

class BaseService {
  // 静态属性：存储全局默认配置
  static _globalDefaults = { sequelize: null, models: null };
  /**
   * 构造函数 - 简化版本
   *
   * @param {Object} options - 初始化选项
   * @param {Object} options.models - 数据库模型对象（可选）
   * @param {Object} options.sequelize - Sequelize 实例（可选）
   */
  constructor(options = {}) {
    /** @type {string} 服务名称 */
    this.serviceName = this.constructor.name;
    /** @type {Object} 日志记录器 */
    this.logger = require("../utils/logger").child(this.serviceName);

    // 优先使用传入的 options，其次使用全局默认配置
    this._models = options.models || BaseService._globalDefaults.models;
    this._sequelize = options.sequelize || BaseService._globalDefaults.sequelize;

    // 防重复初始化检查
    if (!options._skipDuplicateCheck) {
      this._checkDuplicateInitialization();
    }

    this.logger.debug(`${this.serviceName} 服务初始化完成`);
  }

  /**
   * 设置全局默认配置
   *
   * @static
   * @param {Object} defaults - 默认配置对象
   * @param {Object} defaults.sequelize - Sequelize 实例
   * @param {Object} defaults.models - 数据库模型对象
   * @returns {void}
   */
  static setDefaults(defaults = {}) {
    if (defaults.sequelize) {
      BaseService._globalDefaults.sequelize = defaults.sequelize;
    }

    if (defaults.models) {
      BaseService._globalDefaults.models = defaults.models;
    }

    // 记录设置成功的日志

    logger.info("BaseService 全局默认配置已设置", {
      hasSequelize: !!BaseService._globalDefaults.sequelize,
      hasModels: !!BaseService._globalDefaults.models,
      modelCount: BaseService._globalDefaults.models ? Object.keys(BaseService._globalDefaults.models).length : 0,
    });
  }

  /**
   * 获取全局默认配置
   *
   * @static
   * @returns {Object} 当前的全局默认配置
   */
  static getDefaults() {
    return {
      sequelize: BaseService._globalDefaults.sequelize,
      models: BaseService._globalDefaults.models,
    };
  }

  /**
   * 清除全局默认配置
   *
   * @static
   * @returns {void}
   */
  static clearDefaults() {
    BaseService._globalDefaults.sequelize = null;
    BaseService._globalDefaults.models = null;

    logger.info("BaseService 全局默认配置已清除");
  }

  /**
   * 检查重复初始化 - 简化版本
   * @private
   */
  _checkDuplicateInitialization() {
    // 简化：只记录日志，不做复杂检查
    this.logger.debug(`${this.serviceName} 服务实例创建`);
  }

  /**
   * 获取数据库模型
   * 子类应该重写此方法或在构造函数中注入 models
   * @returns {Object} 数据库模型对象
   */
  get models() {
    if (this._models) {
      return this._models;
    }

    // 如果没有注入模型，抛出错误提示正确的使用方式
    throw new Error(`${this.serviceName}: 未找到数据库模型。请在业务项目中直接导入模型，或在构造函数中注入 models 参数。`);
  }

  /**
   * 获取 Sequelize 实例
   * 子类应该重写此方法或在构造函数中注入 sequelize
   * @returns {Object} Sequelize 实例
   */
  get sequelize() {
    if (this._sequelize) {
      return this._sequelize;
    }

    // 如果没有注入 sequelize，抛出错误提示正确的使用方式
    throw new Error(
      `${this.serviceName}: 未找到 Sequelize 实例。请在业务项目中直接导入 sequelize，或在构造函数中注入 sequelize 参数。例如：await Core.BaseService.setDefaults({ sequelize: models.sequelize, models: models });`
    );
  }
  /**
   * 创建数据库事务
   *
   * @async
   * @returns {Promise<Object>} 数据库事务对象
   */
  async createTransaction() {
    return await this.sequelize.transaction();
  }

  /**
   * 在事务中执行操作
   *
   * @async
   * @param {Function} operation - 要执行的操作函数
   * @returns {Promise<*>} 操作结果
   */
  async executeInTransaction(operation) {
    const transaction = await this.createTransaction();
    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`${this.serviceName} 事务执行失败:`, error);
      throw error;
    }
  }

  /**
   * 获取数据库模型
   *
   * @param {string} modelName - 模型名称
   * @returns {Object} 数据库模型
   */
  getModel(modelName) {
    const models = this.models;
    if (!models[modelName]) {
      throw new Error(`模型 ${modelName} 不存在`);
    }
    return models[modelName];
  }

  /**
   * 执行数据库查询
   *
   * @async
   * @param {string} sql - SQL 查询语句
   * @param {Object} options - 查询选项
   * @returns {Promise<*>} 查询结果
   */
  async query(sql, options = {}) {
    return await this.sequelize.query(sql, options);
  }

  /**
   * 统一成功响应
   * @param {*} data - 响应数据
   * @param {string} message - 成功消息
   * @returns {Object} 标准响应格式
   */
  success(data = null, message = "操作成功") {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 成功响应（包含实体数据和操作信息）
   * @param {Object} entity - 实体数据
   * @param {Object} operation - 操作信息
   * @param {string} message - 成功消息
   * @returns {Object} 标准响应格式
   */
  successWithEntity(entity, operation = {}, message = "操作成功") {
    return {
      success: true,
      data: {
        entity,
        operation: {
          affected: operation.affected || 1,
          id: operation.id || entity?.id || null,
          ids: operation.ids || null,
        },
      },
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 统一错误响应
   * @param {string|Error} error - 错误信息或错误对象
   * @param {number} code - 错误代码
   * @returns {Object} 标准响应格式
   */
  error(error, code = 500) {
    const message = error instanceof Error ? error.message : error;
    this.logger.error(`${this.serviceName} 错误:`, message);
    return {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 处理数据库错误
   * @param {Error} error - 数据库错误
   * @returns {Object} 标准错误响应
   */
  handleDatabaseError(error) {
    this.logger.error(`${this.serviceName} 数据库错误:`, error);

    // Sequelize 验证错误
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((e) => e.message);
      return this.error(`数据验证失败: ${messages.join(", ")}`, 400);
    }

    // Sequelize 唯一约束错误
    if (error.name === "SequelizeUniqueConstraintError") {
      return this.error("数据已存在，请检查唯一性约束", 409);
    }

    // 外键约束错误
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return this.error("外键约束错误，请检查关联数据", 400);
    }

    // 默认错误
    return this.error("数据库操作失败", 500);
  }

  /**
   * 获取分页信息
   * @param {Object} options - 查询选项
   * @returns {Object} 分页选项
   */
  getPageinfo(options = {}) {
    const { page = 1, limit = 20 } = options;
    return { limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit) };
  }

  /**
   * 格式化分页结果
   * @param {Object} result - 分页查询结果
   * @param {string} message - 成功消息
   * @returns {Object} 格式化的分页响应
   */
  formatPaginatedResult(result, message = "获取数据成功", formatFn = (item) => item) {
    // findAndCountAll 标准格式
    // {
    //   count: 14,
    //   rows: [],
    // };
    // 兼容不同数据结构（items/rows）
    const rawItems = result.rows || result.items || [];
    const limit = parseInt(result.limit) || 10;
    const page = parseInt(result.page) || 1;
    const total = result.count || result.total;

    // 应用 formatFn 转换数据
    const formattedItems = rawItems.map(formatFn);

    return this.success(
      {
        items: formattedItems,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
      message
    );
  }

  async paginateWithFmt(model, options = {}, message = "获取数据成功", formatFn = (item) => item) {
    const result = await model.findByPage(options);
    return await this.formatPaginatedResult(result, message, formatFn);
  }

  /**
   * 验证必需参数
   * @param {Object} data - 数据对象
   * @param {Array} requiredFields - 必需字段数组
   * @throws {Error} 当缺少必需字段时抛出错误
   */
  validateRequired(data, requiredFields) {
    const missing = requiredFields.filter((field) => data[field] === undefined || data[field] === null || data[field] === "");

    if (missing.length > 0) {
      throw new Error(`缺少必需参数: ${missing.join(", ")}`);
    }
  }

  /**
   * 事务处理包装器
   * @param {Function} operation - 要在事务中执行的操作
   * @returns {Promise<*>} 操作结果
   */
  async withTransaction(operation) {
    return await this.executeInTransaction(operation);
  }

  // ==================== CRUD 辅助方法 ====================
  // 以下方法为可选使用的 CRUD 辅助方法，不强制使用
  // 适用于简单的 CRUD 操作，复杂业务逻辑请使用自定义实现

  /**
   * 标准列表查询辅助方法
   * @param {Object} model - Sequelize 模型
   * @param {Object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.limit - 每页数量
   * @param {string} options.search - 搜索关键词
   * @param {Array} options.searchFields - 搜索字段
   * @param {Object} options.filters - 过滤条件
   * @param {string} options.sortField - 排序字段
   * @param {string} options.sortOrder - 排序方向
   * @param {Array} options.include - 关联查询
   * @param {Function} options.formatFn - 数据格式化函数
   * @returns {Promise<Object>} 分页查询结果
   */
  async standardList(model, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        searchFields = [],
        filters = {},
        sortField = "created_at",
        sortOrder = "DESC",
        include = [],
        formatFn = (item) => item.toJSON(),
      } = options;

      // 构建查询条件
      const where = {};

      // 处理过滤条件
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
          where[key] = filters[key];
        }
      });

      // 处理搜索条件
      if (search && searchFields.length > 0) {
        where[Op.or] = searchFields.map((field) => ({
          [field]: { [Op.like]: `%${search}%` },
        }));
      }

      // 构建排序
      const order = [[sortField, sortOrder.toUpperCase()]];

      // 执行查询
      const result = await model.findAndCountAll({
        where,
        order,
        include,
        ...this.getPageinfo({ page, limit }),
      });

      // 添加分页信息到结果中
      result.page = page;
      result.limit = limit;
      return this.formatPaginatedResult(result, "获取列表成功", formatFn);
    } catch (error) {
      this.logger.error("标准列表查询失败:", error);
      return this.handleDatabaseError(error);
    }
  }

  /**
   * 标准详情查询辅助方法
   * @param {Object} model - Sequelize 模型
   * @param {number|string} id - 记录ID
   * @param {Object} options - 查询选项
   * @param {Array} options.include - 关联查询
   * @param {Function} options.formatFn - 数据格式化函数
   * @param {string} options.notFoundMessage - 未找到时的错误消息
   * @returns {Promise<Object>} 查询结果
   */
  async standardDetail(model, id, options = {}) {
    try {
      const { include = [], formatFn = (item) => item.toJSON(), notFoundMessage = "记录不存在" } = options;

      const item = await model.findByPk(id, { include });

      if (!item) {
        return this.error(notFoundMessage, 404);
      }

      return this.success(formatFn(item), "获取详情成功");
    } catch (error) {
      this.logger.error("标准详情查询失败:", error);
      return this.handleDatabaseError(error);
    }
  }

  /**
   * 标准创建辅助方法
   * @param {Object} model - Sequelize 模型
   * @param {Object} data - 创建数据
   * @param {Object} options - 创建选项
   * @param {Array} options.requiredFields - 必填字段
   * @param {Array} options.allowedFields - 允许的字段
   * @param {Function} options.formatFn - 数据格式化函数
   * @param {Function} options.beforeCreate - 创建前的数据处理函数
   * @returns {Promise<Object>} 创建结果
   */
  async standardCreate(model, data, options = {}) {
    try {
      const { requiredFields = [], allowedFields = null, formatFn = (item) => item.toJSON(), beforeCreate = null } = options;

      // 验证必填字段
      if (requiredFields.length > 0) {
        const missingFields = requiredFields.filter((field) => !data[field] || (typeof data[field] === "string" && data[field].trim() === ""));

        if (missingFields.length > 0) {
          return this.error(`缺少必需字段: ${missingFields.join(", ")}`, 400);
        }
      }

      // 过滤允许的字段
      let createData = { ...data };
      if (allowedFields && Array.isArray(allowedFields)) {
        createData = {};
        allowedFields.forEach((field) => {
          if (data[field] !== undefined) {
            createData[field] = data[field];
          }
        });
      }

      // 添加时间戳
      createData.created_at = new Date();
      createData.updated_at = new Date();

      // 创建前的数据处理
      if (beforeCreate && typeof beforeCreate === "function") {
        try {
          const result = await beforeCreate(createData);

          // 检查 beforeCreate 是否返回了错误对象
          if (result && typeof result === "object" && result.success === false) {
            return result; // 直接返回错误响应
          }

          // 如果返回的是处理后的数据，则使用它
          if (result && typeof result === "object" && result.success !== false) {
            createData = result;
          }
        } catch (error) {
          // 兼容 throw new Error() 方式
          return this.error(error.message || error, 400);
        }
      }

      const item = await model.create(createData);

      return this.success(formatFn(item), "创建成功");
    } catch (error) {
      this.logger.error("标准创建失败:", error);
      return this.handleDatabaseError(error);
    }
  }

  /**
   * 标准更新辅助方法
   * @param {Object} model - Sequelize 模型
   * @param {number|string} id - 记录ID
   * @param {Object} data - 更新数据
   * @param {Object} options - 更新选项
   * @param {Array} options.allowedFields - 允许更新的字段
   * @param {Function} options.formatFn - 数据格式化函数
   * @param {Function} options.beforeUpdate - 更新前的数据处理函数
   * @param {string} options.notFoundMessage - 未找到时的错误消息
   * @returns {Promise<Object>} 更新结果
   */
  async standardUpdate(model, id, data, options = {}) {
    try {
      const { allowedFields = null, formatFn = (item) => item.toJSON(), beforeUpdate = null, notFoundMessage = "记录不存在" } = options;

      const item = await model.findByPk(id);

      if (!item) {
        return this.error(notFoundMessage, 404);
      }

      // 过滤允许更新的字段
      let updateData = { ...data };
      if (allowedFields && Array.isArray(allowedFields)) {
        updateData = {};
        allowedFields.forEach((field) => {
          if (data[field] !== undefined) {
            updateData[field] = data[field];
          }
        });
      }

      // 添加更新时间戳
      updateData.updated_at = new Date();

      // 更新前的数据处理
      if (beforeUpdate && typeof beforeUpdate === "function") {
        try {
          const result = await beforeUpdate(updateData, item);

          // 检查 beforeUpdate 是否返回了错误对象
          if (result && typeof result === "object" && result.success === false) {
            return result; // 直接返回错误响应
          }

          // 如果返回的是处理后的数据，则使用它
          if (result && typeof result === "object" && result.success !== false) {
            updateData = result;
          }
        } catch (error) {
          // 兼容 throw new Error() 方式
          return this.error(error.message || error, 400);
        }
      }

      await item.update(updateData);

      return this.success(formatFn(item), "更新成功");
    } catch (error) {
      this.logger.error("标准更新失败:", error);
      return this.handleDatabaseError(error);
    }
  }

  /**
   * 增强的标准创建方法（返回实体+操作信息）
   * @param {Object} model - Sequelize 模型
   * @param {Object} data - 创建数据
   * @param {Object} options - 创建选项
   * @returns {Promise<Object>} 创建结果
   */
  async standardCreateWithEntity(model, data, options = {}) {
    const result = await this.standardCreate(model, data, options);

    if (result.success) {
      return this.successWithEntity(result.data, { id: result.data.id, affected: 1 }, result.message);
    }

    return result;
  }

  /**
   * 增强的标准更新方法（返回实体+操作信息）
   * @param {Object} model - Sequelize 模型
   * @param {number|string} id - 记录ID
   * @param {Object} data - 更新数据
   * @param {Object} options - 更新选项
   * @returns {Promise<Object>} 更新结果
   */
  async standardUpdateWithEntity(model, id, data, options = {}) {
    const result = await this.standardUpdate(model, id, data, options);

    if (result.success) {
      return this.successWithEntity(result.data, { id: result.data.id, affected: 1 }, result.message);
    }

    return result;
  }

  /**
   * 标准删除辅助方法
   * @param {Object} model - Sequelize 模型
   * @param {number|string} id - 记录ID
   * @param {Object} options - 删除选项
   * @param {boolean} options.softDelete - 是否软删除
   * @param {Function} options.beforeDelete - 删除前的检查函数
   * @param {string} options.notFoundMessage - 未找到时的错误消息
   * @returns {Promise<Object>} 删除结果
   */
  async standardDelete(model, id, options = {}) {
    try {
      const { softDelete = null, beforeDelete = null, notFoundMessage = "记录不存在" } = options;

      const item = await model.findByPk(id);

      if (!item) {
        return this.error(notFoundMessage, 404);
      }

      // 删除前的检查
      if (beforeDelete && typeof beforeDelete === "function") {
        try {
          const checkResult = await beforeDelete(item);

          // 检查 beforeDelete 是否返回了错误对象
          if (checkResult && typeof checkResult === "object" && checkResult.success === false) {
            return checkResult; // 直接返回错误响应
          }
        } catch (error) {
          // 兼容 throw new Error() 方式
          return this.error(error.message || error, 400);
        }
      }

      // 执行删除
      if (softDelete !== false && model.rawAttributes.deleted_at) {
        // 软删除
        await item.update({ deleted_at: new Date() });
      } else {
        // 硬删除
        await item.destroy();
      }

      return this.success(null, "删除成功");
    } catch (error) {
      this.logger.error("标准删除失败:", error);
      return this.handleDatabaseError(error);
    }
  }

  /**
   * 批量操作辅助方法
   * @param {Object} model - Sequelize 模型
   * @param {Array} ids - 记录ID数组
   * @param {Object} updateData - 更新数据
   * @param {Object} options - 操作选项
   * @param {string} options.operation - 操作类型 ('update' | 'delete')
   * @param {boolean} options.softDelete - 是否软删除 (仅删除操作)
   * @param {Array} options.allowedFields - 允许更新的字段 (仅更新操作)
   * @returns {Promise<Object>} 操作结果
   */
  async standardBatch(model, ids, updateData = {}, options = {}) {
    try {
      const { operation = "update", softDelete = null, allowedFields = null } = options;

      if (!Array.isArray(ids) || ids.length === 0) {
        return this.error("请提供有效的ID数组", 400);
      }

      let affectedCount = 0;

      if (operation === "delete") {
        // 批量删除
        if (softDelete !== false && model.rawAttributes.deleted_at) {
          [affectedCount] = await model.update({ deleted_at: new Date() }, { where: { id: { [Op.in]: ids } } });
        } else {
          affectedCount = await model.destroy({
            where: { id: { [Op.in]: ids } },
          });
        }

        return this.success({ affectedCount }, `批量删除成功，影响${affectedCount}条记录`);
      } else {
        // 批量更新
        let batchUpdateData = { ...updateData };

        // 过滤允许更新的字段
        if (allowedFields && Array.isArray(allowedFields)) {
          batchUpdateData = {};
          allowedFields.forEach((field) => {
            if (updateData[field] !== undefined) {
              batchUpdateData[field] = updateData[field];
            }
          });
        }

        batchUpdateData.updated_at = new Date();

        [affectedCount] = await model.update(batchUpdateData, {
          where: { id: { [Op.in]: ids } },
        });

        return this.success({ affectedCount }, `批量更新成功，影响${affectedCount}条记录`);
      }
    } catch (error) {
      this.logger.error("批量操作失败:", error);
      return this.handleDatabaseError(error);
    }
  }

  /**
   * 执行原生SQL查询
   * 统一处理SQL查询的错误和结果格式
   *
   * @param {string} sql - SQL查询语句
   * @param {Object} options - 查询选项
   * @param {Object} options.replacements - SQL参数替换对象
   * @param {string} options.type - 查询类型，默认为SELECT
   * @param {boolean} options.raw - 是否返回原始结果，默认true
   * @returns {Promise<Array>} 查询结果数组
   */
  async executeRawQuery(sql, options = {}) {
    try {
      const { replacements = {}, type = "SELECT", raw = true } = options;

      if (!this._sequelize) {
        throw new Error("Sequelize实例未初始化，无法执行SQL查询");
      }

      // 确定查询类型
      let queryType;
      if (typeof type === "string") {
        queryType = this._sequelize.QueryTypes[type.toUpperCase()] || this._sequelize.QueryTypes.SELECT;
      } else {
        queryType = type;
      }

      // 执行查询
      const results = await this._sequelize.query(sql, {
        replacements,
        type: queryType,
        raw,
        ...options,
      });

      this.logger.debug(`SQL查询执行成功`, {
        sql: sql.substring(0, 100) + (sql.length > 100 ? "..." : ""),
        resultCount: Array.isArray(results) ? results.length : "N/A",
      });

      return results;
    } catch (error) {
      this.logger.error("SQL查询执行失败:", {
        sql: sql.substring(0, 200),
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 执行带分页的原生SQL查询
   *
   * @param {string} sql - 基础SQL查询语句（不包含LIMIT）
   * @param {Object} options - 查询选项
   * @param {Object} options.replacements - SQL参数替换对象
   * @param {number} options.page - 页码，从1开始
   * @param {number} options.pageSize - 每页大小
   * @param {string} options.countSql - 可选的计数SQL，如果不提供会自动生成
   * @returns {Promise<Object>} 包含数据和分页信息的结果对象
   */
  async executeRawQueryWithPagination(sql, options = {}) {
    try {
      const { replacements = {}, page = 1, pageSize = 10, countSql } = options;

      // 计算偏移量
      const offset = (page - 1) * pageSize;

      // 执行计数查询
      let totalCount = 0;
      if (countSql) {
        const countResults = await this.executeRawQuery(countSql, { replacements });
        totalCount = parseInt(countResults[0]?.count || countResults[0]?.total || 0);
      } else {
        // 自动生成计数SQL（简单包装）
        const autoCountSql = `SELECT COUNT(*) as count FROM (${sql}) as count_query`;
        const countResults = await this.executeRawQuery(autoCountSql, { replacements });
        totalCount = parseInt(countResults[0]?.count || 0);
      }

      // 执行分页查询
      const paginatedSql = `${sql} LIMIT ${pageSize} OFFSET ${offset}`;
      const results = await this.executeRawQuery(paginatedSql, { replacements });

      // 计算分页信息
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: results,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error("分页SQL查询执行失败:", error);
      throw error;
    }
  }

  /**
   * 执行聚合统计查询
   * 提供常用的聚合函数封装
   *
   * @param {string} tableName - 表名
   * @param {Object} options - 查询选项
   * @param {Array} options.aggregates - 聚合函数配置数组
   * @param {Object} options.where - WHERE条件对象
   * @param {Array} options.groupBy - GROUP BY字段数组
   * @param {Object} options.replacements - 参数替换对象
   * @returns {Promise<Array>} 聚合查询结果
   */
  async executeAggregateQuery(tableName, options = {}) {
    try {
      const { aggregates = [], where = {}, groupBy = [], replacements = {} } = options;

      // 构建聚合字段
      const aggregateFields = aggregates
        .map((agg) => {
          const { func, field, alias } = agg;
          return `${func.toUpperCase()}(${field}) AS ${alias || `${func}_${field}`}`;
        })
        .join(", ");

      if (!aggregateFields) {
        throw new Error("至少需要指定一个聚合函数");
      }

      // 构建WHERE条件
      let whereClause = "";
      if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where).map((key) => `${key} = :${key}`);
        whereClause = `WHERE ${conditions.join(" AND ")}`;
        Object.assign(replacements, where);
      }

      // 构建GROUP BY子句
      const groupByClause = groupBy.length > 0 ? `GROUP BY ${groupBy.join(", ")}` : "";

      // 构建完整SQL
      const sql = `
        SELECT ${groupBy.join(", ")}${groupBy.length > 0 ? ", " : ""}${aggregateFields}
        FROM ${tableName}
        ${whereClause}
        ${groupByClause}
      `.trim();

      return await this.executeRawQuery(sql, { replacements });
    } catch (error) {
      this.logger.error("聚合查询执行失败:", error);
      throw error;
    }
  }

  /**
   * 创建查询构建器
   * 提供链式查询API，简化复杂SQL构建
   *
   * @param {string} tableName - 主表名
   * @param {string} alias - 表别名（可选）
   * @returns {QueryBuilder} 查询构建器实例
   */
  queryBuilder(tableName, alias = null) {
    return new QueryBuilder(this, tableName, alias);
  }

  /**
   * 时间序列统计分析
   * 按指定时间粒度进行数据统计
   *
   * @param {string} tableName - 表名
   * @param {string} dateField - 日期字段名
   * @param {string} valueField - 数值字段名
   * @param {Object} options - 配置选项
   * @param {string} options.period - 时间粒度: 'day'|'week'|'month'|'quarter'|'year'
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @param {string} options.aggregateFunc - 聚合函数: 'SUM'|'AVG'|'COUNT'|'MAX'|'MIN'
   * @param {Object} options.where - 额外的WHERE条件
   * @returns {Promise<Array>} 时间序列统计结果
   */
  async getTimeSeriesStats(tableName, dateField, valueField, options = {}) {
    try {
      const { period = "month", startDate, endDate, aggregateFunc = "SUM", where = {} } = options;

      // 根据时间粒度确定日期格式
      const dateFormats = {
        day: "%Y-%m-%d",
        week: "%Y-%u",
        month: "%Y-%m",
        quarter: "%Y-Q%q",
        year: "%Y",
      };

      const dateFormat = dateFormats[period] || dateFormats.month;

      // 构建WHERE条件
      const whereConditions = [];
      const replacements = {};

      if (startDate) {
        whereConditions.push(`${dateField} >= :startDate`);
        replacements.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push(`${dateField} <= :endDate`);
        replacements.endDate = endDate;
      }

      // 添加自定义WHERE条件
      Object.keys(where).forEach((key) => {
        whereConditions.push(`${key} = :${key}`);
        replacements[key] = where[key];
      });

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      const sql = `
        SELECT
          DATE_FORMAT(${dateField}, '${dateFormat}') as period,
          ${aggregateFunc}(${valueField}) as value,
          COUNT(*) as count,
          MIN(${dateField}) as period_start,
          MAX(${dateField}) as period_end
        FROM ${tableName}
        ${whereClause}
        GROUP BY DATE_FORMAT(${dateField}, '${dateFormat}')
        ORDER BY period ASC
      `;

      return await this.executeRawQuery(sql, { replacements });
    } catch (error) {
      this.logger.error("时间序列统计分析失败:", error);
      throw error;
    }
  }

  /**
   * 同比环比分析
   * 计算指定指标的同比、环比增长率
   *
   * @param {string} tableName - 表名
   * @param {string} dateField - 日期字段名
   * @param {string} valueField - 数值字段名
   * @param {Object} options - 配置选项
   * @param {string} options.compareType - 对比类型: 'yoy'(同比)|'mom'(环比)
   * @param {string} options.period - 时间粒度: 'month'|'quarter'|'year'
   * @param {Object} options.where - WHERE条件
   * @returns {Promise<Array>} 同比环比分析结果
   */
  async getComparisonStats(tableName, dateField, valueField, options = {}) {
    try {
      const { compareType = "yoy", where = {} } = options;

      // 构建WHERE条件
      const whereConditions = [];
      const replacements = {};

      Object.keys(where).forEach((key) => {
        whereConditions.push(`${key} = :${key}`);
        replacements[key] = where[key];
      });

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      // 根据对比类型和时间粒度构建SQL
      let sql;
      if (compareType === "yoy") {
        // 同比分析
        sql = `
          SELECT
            current_period.period,
            current_period.value as current_value,
            previous_period.value as previous_value,
            CASE
              WHEN previous_period.value > 0 THEN
                ROUND((current_period.value - previous_period.value) / previous_period.value * 100, 2)
              ELSE NULL
            END as growth_rate
          FROM (
            SELECT
              DATE_FORMAT(${dateField}, '%Y-%m') as period,
              SUM(${valueField}) as value
            FROM ${tableName}
            ${whereClause}
            GROUP BY DATE_FORMAT(${dateField}, '%Y-%m')
          ) current_period
          LEFT JOIN (
            SELECT
              DATE_FORMAT(DATE_ADD(${dateField}, INTERVAL 1 YEAR), '%Y-%m') as period,
              SUM(${valueField}) as value
            FROM ${tableName}
            ${whereClause}
            GROUP BY DATE_FORMAT(DATE_ADD(${dateField}, INTERVAL 1 YEAR), '%Y-%m')
          ) previous_period ON current_period.period = previous_period.period
          ORDER BY current_period.period ASC
        `;
      } else {
        // 环比分析
        sql = `
          SELECT
            period,
            value as current_value,
            LAG(value) OVER (ORDER BY period) as previous_value,
            CASE
              WHEN LAG(value) OVER (ORDER BY period) > 0 THEN
                ROUND((value - LAG(value) OVER (ORDER BY period)) / LAG(value) OVER (ORDER BY period) * 100, 2)
              ELSE NULL
            END as growth_rate
          FROM (
            SELECT
              DATE_FORMAT(${dateField}, '%Y-%m') as period,
              SUM(${valueField}) as value
            FROM ${tableName}
            ${whereClause}
            GROUP BY DATE_FORMAT(${dateField}, '%Y-%m')
            ORDER BY period ASC
          ) monthly_data
        `;
      }

      return await this.executeRawQuery(sql, { replacements });
    } catch (error) {
      this.logger.error("同比环比分析失败:", error);
      throw error;
    }
  }

  /**
   * 分组统计分析
   * 按指定字段分组进行聚合统计
   *
   * @param {string} tableName - 表名
   * @param {Array|string} groupFields - 分组字段
   * @param {Array} aggregates - 聚合配置数组
   * @param {Object} options - 配置选项
   * @param {Object} options.where - WHERE条件
   * @param {string} options.having - HAVING条件
   * @param {Array} options.orderBy - 排序配置
   * @param {number} options.limit - 限制数量
   * @returns {Promise<Array>} 分组统计结果
   */
  async getGroupStats(tableName, groupFields, aggregates, options = {}) {
    try {
      const { where = {}, having, orderBy = [], limit } = options;

      // 处理分组字段
      const groupFieldsArray = Array.isArray(groupFields) ? groupFields : [groupFields];

      // 构建聚合字段
      const aggregateFields = aggregates
        .map((agg) => {
          const { func, field, alias } = agg;
          return `${func.toUpperCase()}(${field}) AS ${alias || `${func.toLowerCase()}_${field}`}`;
        })
        .join(", ");

      // 构建WHERE条件
      const whereConditions = [];
      const replacements = {};

      Object.keys(where).forEach((key) => {
        whereConditions.push(`${key} = :${key}`);
        replacements[key] = where[key];
      });

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      // 构建HAVING条件
      const havingClause = having ? `HAVING ${having}` : "";

      // 构建ORDER BY条件
      let orderByClause = "";
      if (orderBy.length > 0) {
        const orderByFields = orderBy.map((order) => {
          if (typeof order === "string") {
            return order;
          } else {
            return `${order.field} ${order.direction || "ASC"}`;
          }
        });
        orderByClause = `ORDER BY ${orderByFields.join(", ")}`;
      }

      // 构建LIMIT条件
      const limitClause = limit ? `LIMIT ${limit}` : "";

      const sql = `
        SELECT
          ${groupFieldsArray.join(", ")},
          ${aggregateFields}
        FROM ${tableName}
        ${whereClause}
        GROUP BY ${groupFieldsArray.join(", ")}
        ${havingClause}
        ${orderByClause}
        ${limitClause}
      `;

      return await this.executeRawQuery(sql, { replacements });
    } catch (error) {
      this.logger.error("分组统计分析失败:", error);
      throw error;
    }
  }

  /**
   * 排行榜统计
   * 生成指定字段的排行榜
   *
   * @param {string} tableName - 表名
   * @param {string} rankField - 排序字段
   * @param {Object} options - 配置选项
   * @param {string} options.nameField - 名称字段
   * @param {string} options.aggregateFunc - 聚合函数
   * @param {Object} options.where - WHERE条件
   * @param {number} options.topN - 返回前N名
   * @param {string} options.direction - 排序方向 ASC|DESC
   * @returns {Promise<Array>} 排行榜结果
   */
  async getRankingStats(tableName, rankField, options = {}) {
    try {
      const { nameField = "name", aggregateFunc = "SUM", where = {}, topN = 10, direction = "DESC" } = options;

      // 构建WHERE条件
      const whereConditions = [];
      const replacements = {};

      Object.keys(where).forEach((key) => {
        whereConditions.push(`${key} = :${key}`);
        replacements[key] = where[key];
      });

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      const sql = `
        SELECT
          ${nameField},
          ${aggregateFunc}(${rankField}) as value,
          ROW_NUMBER() OVER (ORDER BY ${aggregateFunc}(${rankField}) ${direction}) as \`rank\`
        FROM ${tableName}
        ${whereClause}
        GROUP BY ${nameField}
        ORDER BY value ${direction}
        LIMIT ${topN}
      `;

      return await this.executeRawQuery(sql, { replacements });
    } catch (error) {
      this.logger.error("排行榜统计失败:", error);
      throw error;
    }
  }

  /**
   * 关闭服务
   *
   * @async
   * @returns {Promise<void>}
   */
  async close() {
    this.logger.info(`${this.serviceName} 服务已关闭`);
  }
}

/**
 * 查询构建器类
 * 提供链式API构建复杂SQL查询
 */
class QueryBuilder {
  constructor(service, tableName, alias = null) {
    this.service = service;
    this.tableName = tableName;
    this.alias = alias;
    this.selectFields = [];
    this.joinClauses = [];
    this.whereClauses = [];
    this.groupByFields = [];
    this.orderByFields = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.replacements = {};
  }

  /**
   * 添加SELECT字段
   * @param {Array|string} fields - 字段列表
   * @returns {QueryBuilder} 返回自身支持链式调用
   */
  select(fields) {
    if (Array.isArray(fields)) {
      this.selectFields.push(...fields);
    } else {
      this.selectFields.push(fields);
    }
    return this;
  }

  /**
   * 添加LEFT JOIN
   * @param {string} table - 表名
   * @param {string} alias - 表别名
   * @param {string} condition - 连接条件
   * @returns {QueryBuilder} 返回自身支持链式调用
   */
  leftJoin(table, alias, condition) {
    this.joinClauses.push(`LEFT JOIN ${table} ${alias} ON ${condition}`);
    return this;
  }

  /**
   * 添加INNER JOIN
   * @param {string} table - 表名
   * @param {string} alias - 表别名
   * @param {string} condition - 连接条件
   * @returns {QueryBuilder} 返回自身支持链式调用
   */
  innerJoin(table, alias, condition) {
    this.joinClauses.push(`INNER JOIN ${table} ${alias} ON ${condition}`);
    return this;
  }

  /**
   * 添加WHERE条件
   * @param {string} field - 字段名
   * @param {string} operator - 操作符或值（如果只有两个参数）
   * @param {*} value - 值（可选）
   * @returns {QueryBuilder} 返回自身支持链式调用
   */
  where(field, operator, value = null) {
    if (value === null) {
      // 两个参数的情况：where('field', 'value')
      this.whereClauses.push(`${field} = :${this._getParamName(field)}`);
      this.replacements[this._getParamName(field)] = operator;
    } else {
      // 三个参数的情况：where('field', '>', 'value')
      this.whereClauses.push(`${field} ${operator} :${this._getParamName(field)}`);
      this.replacements[this._getParamName(field)] = value;
    }
    return this;
  }

  /**
   * 添加GROUP BY
   * @param {Array|string} fields - 分组字段
   * @returns {QueryBuilder} 返回自身支持链式调用
   */
  groupBy(fields) {
    if (Array.isArray(fields)) {
      this.groupByFields.push(...fields);
    } else {
      this.groupByFields.push(fields);
    }
    return this;
  }

  /**
   * 添加ORDER BY
   * @param {string} field - 排序字段
   * @param {string} direction - 排序方向 ASC|DESC
   * @returns {QueryBuilder} 返回自身支持链式调用
   */
  orderBy(field, direction = "ASC") {
    this.orderByFields.push(`${field} ${direction.toUpperCase()}`);
    return this;
  }

  /**
   * 设置LIMIT
   * @param {number} limit - 限制数量
   * @returns {QueryBuilder} 返回自身支持链式调用
   */
  limit(limit) {
    this.limitValue = limit;
    return this;
  }

  /**
   * 设置OFFSET
   * @param {number} offset - 偏移量
   * @returns {QueryBuilder} 返回自身支持链式调用
   */
  offset(offset) {
    this.offsetValue = offset;
    return this;
  }

  /**
   * 执行查询
   * @param {Object} additionalReplacements - 额外的参数替换
   * @returns {Promise<Array>} 查询结果
   */
  async execute(additionalReplacements = {}) {
    const sql = this._buildSQL();
    const allReplacements = { ...this.replacements, ...additionalReplacements };

    return await this.service.executeRawQuery(sql, {
      replacements: allReplacements,
    });
  }

  /**
   * 构建SQL语句
   * @private
   * @returns {string} SQL语句
   */
  _buildSQL() {
    const tableWithAlias = this.alias ? `${this.tableName} ${this.alias}` : this.tableName;

    // SELECT子句
    const selectClause = this.selectFields.length > 0 ? this.selectFields.join(", ") : "*";

    // FROM子句
    let sql = `SELECT ${selectClause} FROM ${tableWithAlias}`;

    // JOIN子句
    if (this.joinClauses.length > 0) {
      sql += " " + this.joinClauses.join(" ");
    }

    // WHERE子句
    if (this.whereClauses.length > 0) {
      sql += " WHERE " + this.whereClauses.join(" AND ");
    }

    // GROUP BY子句
    if (this.groupByFields.length > 0) {
      sql += " GROUP BY " + this.groupByFields.join(", ");
    }

    // ORDER BY子句
    if (this.orderByFields.length > 0) {
      sql += " ORDER BY " + this.orderByFields.join(", ");
    }

    // LIMIT子句
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    // OFFSET子句
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return sql;
  }

  /**
   * 生成参数名
   * @private
   * @param {string} field - 字段名
   * @returns {string} 参数名
   */
  _getParamName(field) {
    // 移除表别名和特殊字符，生成参数名
    return field.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "");
  }
}

module.exports = BaseService;
