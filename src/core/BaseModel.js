const { Model, DataTypes, Op } = require("sequelize");
const TimestampManager = require("../utils/TimestampManager");
const DataTypeHandler = require("./DataTypeHandler");
const QueryBuilder = require("./QueryBuilder");

class BaseModel extends Model {
  /**
   * 重写 init 方法 - 集成时间戳处理和 Sequelize 兼容性修复
   */
  static init(attributes, options) {
    // 使用 TimestampManager 增强模型初始化
    const result = TimestampManager.enhanceModelInit(this, attributes, options);

    // 确保 Sequelize 内部标识正确设置
    if (options.sequelize && options.sequelize.Sequelize && options.sequelize.Sequelize.Model) {
      // 确保原型链指向正确的 Sequelize.Model
      Object.setPrototypeOf(this.prototype, options.sequelize.Sequelize.Model.prototype);
      Object.setPrototypeOf(this, options.sequelize.Sequelize.Model);
    }

    // 确保 BaseModel 的静态方法存在
    if (!this._copyStaticMethods) {
      this._copyStaticMethods = BaseModel._copyStaticMethods;
    }
    // 自动复制所有静态方法
    this._copyStaticMethods();

    // 添加 Sequelize 内部标识
    this._isSequelizeModel = true;
    this.isSequelizeModel = true;

    return result;
  }

  static _copyStaticMethods() {
    // 获取BaseModel的所有静态方法
    const staticMethods = Object.getOwnPropertyNames(BaseModel)
      .filter((prop) => typeof BaseModel[prop] === "function" && prop !== "init")
      .filter((prop) => !this.hasOwnProperty(prop)); // 避免覆盖子类自有方法

    // 复制到当前类
    staticMethods.forEach((method) => {
      this[method] = BaseModel[method];
    });
  }
  // 在BaseModel中添加
  static query() {
    return new QueryBuilder(this, this.sequelize);
  }
  /**
   * 分页查询
   */
  static async findByPage(options = {}) {
    const { page = 1, limit = 20, where = {}, ...otherOptions } = options;
    const offset = (page - 1) * limit;

    const result = await this.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      ...otherOptions,
    });
    // findAndCountAll 标准格式
    // {
    //   count: 14,
    //   rows: [],
    // };
    return {
      rows: result.rows,
      total: result.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(result.count / limit),
    };
  }

  /**
   * 软删除（如果表有deleted_at字段）
   */
  async softDelete() {
    if (this.constructor.rawAttributes.deleted_at) {
      return await this.update({ deleted_at: new Date() });
    }
    return await this.destroy();
  }
  /**
   * 验证时间戳字段配置
   * @returns {Object} 验证结果
   */
  static validateTimestamps() {
    return TimestampManager.validateModel(this);
  }

  /**
   * 修复时间戳字段配置
   * @returns {Object} 修复结果
   */
  static fixTimestamps() {
    return TimestampManager.fixModel(this);
  }

  /**
   * 获取标准的时间戳字段定义
   * @returns {Object} 时间戳字段定义
   */
  static getTimestampFields() {
    return TimestampManager.getStandardFields();
  }

  /**
   * 批量验证所有模型的时间戳配置
   * @param {Object} models 模型对象集合
   * @returns {Object} 验证结果
   */
  static validateAllModelsTimestamps(models) {
    return TimestampManager.fixAllModels(models);
  }

  /**
   * 批量修复所有模型的时间戳配置
   * @param {Object} models 模型对象集合
   * @param {boolean} verbose 是否显示详细信息
   * @returns {Object} 修复结果
   */
  static fixAllModelsTimestamps(models, verbose = false) {
    return TimestampManager.autoFix(models, verbose);
  }

  /**
   * 获取格式化的创建时间
   */
  getFormattedCreatedAt() {
    return this.created_at ? this.created_at.toISOString() : null;
  }

  /**
   * 获取格式化的更新时间
   */
  getFormattedUpdatedAt() {
    return this.updated_at ? this.updated_at.toISOString() : null;
  }

  /**
   * 获取记录的年龄（天数）
   * @returns {number} 记录的年龄（天数）
   */
  getAge() {
    if (!this.created_at) return 0;

    const now = new Date();
    const created = new Date(this.created_at);
    const diffMs = now - created;

    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * 检查记录是否为新创建的（1小时内）
   * @returns {boolean} 是否为新记录
   */
  isNew() {
    if (!this.created_at) return false;

    const now = new Date();
    const created = new Date(this.created_at);
    const diffMs = now - created;
    const oneHour = 1000 * 60 * 60; // 1小时的毫秒数

    return diffMs < oneHour;
  }

  /**
   * 检查记录是否最近更新过（1小时内）
   * @returns {boolean} 是否最近更新过
   */
  isRecentlyUpdated() {
    if (!this.updated_at) return false;

    const now = new Date();
    const updated = new Date(this.updated_at);
    const diffMs = now - updated;
    const oneHour = 1000 * 60 * 60; // 1小时的毫秒数

    return diffMs < oneHour;
  }

  /**
   * 获取创建时间的友好显示
   * @returns {string} 友好的时间显示
   */
  getCreatedAtFriendly() {
    if (!this.created_at) return "未知";

    const now = new Date();
    const created = new Date(this.created_at);
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "今天";
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;

    return `${Math.floor(diffDays / 365)}年前`;
  }

  /**
   * 获取更新时间的友好显示
   * @returns {string} 友好的时间显示
   */
  getUpdatedAtFriendly() {
    if (!this.updated_at) return "未知";

    const now = new Date();
    const updated = new Date(this.updated_at);
    const diffMs = now - updated;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "刚刚";
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}天前`;

    return this.getCreatedAtFriendly(); // 使用创建时间的逻辑
  }

  /**
   * 转换为安全的JSON（移除敏感字段）
   */
  toSafeJSON() {
    const json = this.toJSON();
    // 移除密码相关敏感字段
    delete json.pwd;
    delete json.safe_pwd;
    delete json.mw_pwd;
    delete json.mw_safe_pwd;
    return json;
  }

  /**
   * 检查记录是否存在
   */
  static async exists(where) {
    const count = await this.count({ where });
    return count > 0;
  }

  /**
   * 批量创建（忽略重复）
   */
  static async bulkCreateIgnore(records, options = {}) {
    return await this.bulkCreate(records, {
      ignoreDuplicates: true,
      ...options,
    });
  }

  /**
   * 增加字段值
   */
  static async incrementField(field, value, where, options = {}) {
    return await this.increment(field, {
      by: value,
      where,
      ...options,
    });
  }

  /**
   * 减少字段值
   */
  static async decrementField(field, value, where, options = {}) {
    return await this.decrement(field, {
      by: value,
      where,
      ...options,
    });
  }

  // ==================== Mixin 支持 ====================

  /**
   * 应用单个 Mixin
   * @param {Object} mixin - Mixin 对象
   * @returns {Function} 模型类（支持链式调用）
   */
  static applyMixin(mixin) {
    // 复制实例方法到原型
    Object.getOwnPropertyNames(mixin).forEach((name) => {
      if (name !== "constructor" && typeof mixin[name] === "function") {
        this.prototype[name] = mixin[name];
      } else if (name !== "constructor" && typeof mixin[name] !== "function") {
        // 复制属性
        Object.defineProperty(this.prototype, name, {
          value: mixin[name],
          writable: true,
          enumerable: false,
          configurable: true,
        });
      }
    });

    // 复制静态方法到类
    Object.getOwnPropertyNames(mixin).forEach((name) => {
      if (typeof mixin[name] === "function" && name.startsWith("static_")) {
        const staticName = name.replace("static_", "");
        this[staticName] = mixin[name];
      }
    });

    return this;
  }

  /**
   * 应用多个 Mixin
   * @param {...Object} mixins - Mixin 对象列表
   * @returns {Function} 模型类（支持链式调用）
   */
  static applyMixins(...mixins) {
    mixins.forEach((mixin) => this.applyMixin(mixin));
    return this;
  }

  // ==================== 字段定义便捷方法 ====================

  /**
   * 定义 DECIMAL 字段
   * @param {string} fieldName - 字段名
   * @param {Object} options - 字段选项
   * @returns {Object} 字段定义
   */
  static defineDecimalField(fieldName, options = {}) {
    const { precision = 2, defaultValue = 0.0, ...otherOptions } = options;
    return {
      type: DataTypes.DECIMAL(22, 2),
      allowNull: false,
      defaultValue,
      get: DataTypeHandler.createDecimalGetter(fieldName, defaultValue, precision),
      ...otherOptions,
    };
  }

  /**
   * 定义 JSON 字段
   * @param {string} fieldName - 字段名
   * @param {Object} options - 字段选项
   * @returns {Object} 字段定义
   */
  static defineJsonField(fieldName, options = {}) {
    const { defaultValue = {}, ...otherOptions } = options;
    return {
      type: DataTypes.JSON,
      allowNull: true,
      get: DataTypeHandler.createJsonGetter(fieldName, defaultValue),
      ...otherOptions,
    };
  }

  /**
   * 定义 INTEGER 字段
   * @param {string} fieldName - 字段名
   * @param {Object} options - 字段选项
   * @returns {Object} 字段定义
   */
  static defineIntegerField(fieldName, options = {}) {
    const { defaultValue = 0, ...otherOptions } = options;
    return {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue,
      get: DataTypeHandler.createIntegerGetter(fieldName, defaultValue),
      ...otherOptions,
    };
  }

  /**
   * 定义枚举字段
   * @param {string} fieldName - 字段名
   * @param {Array} allowedValues - 允许的值
   * @param {Object} options - 字段选项
   * @returns {Object} 字段定义
   */
  static defineEnumField(fieldName, allowedValues, options = {}) {
    const { defaultValue = allowedValues[0], ...otherOptions } = options;
    return {
      type: DataTypes.ENUM(...allowedValues),
      allowNull: false,
      defaultValue,
      get: DataTypeHandler.createEnumGetter(fieldName, allowedValues, defaultValue),
      ...otherOptions,
    };
  }

  // ==================== 字段验证和修复 ====================

  /**
   * 验证模型字段类型配置
   * @returns {Array} 验证错误列表
   */
  static validateFieldTypes() {
    return DataTypeHandler.validateModelFields(this);
  }

  /**
   * 自动修复字段类型配置
   * @returns {Object} 修复结果
   */
  static autoFixFieldTypes() {
    return DataTypeHandler.autoFixModelFields(this);
  }

  /**
   * 获取字段类型统计
   * @returns {Object} 字段类型统计
   */
  static getFieldTypeStats() {
    const attributes = this.rawAttributes || {};
    const stats = {
      total: 0,
      decimal: 0,
      json: 0,
      integer: 0,
      string: 0,
      boolean: 0,
      date: 0,
      enum: 0,
      other: 0,
      withGetters: 0,
      withoutGetters: 0,
    };

    Object.entries(attributes).forEach(([fieldName, field]) => {
      stats.total++;

      const fieldType = field.type.toString().toLowerCase();

      if (fieldType.includes("decimal")) {
        stats.decimal++;
      } else if (fieldType.includes("json")) {
        stats.json++;
      } else if (fieldType.includes("integer")) {
        stats.integer++;
      } else if (fieldType.includes("string") || fieldType.includes("text")) {
        stats.string++;
      } else if (fieldType.includes("boolean")) {
        stats.boolean++;
      } else if (fieldType.includes("date")) {
        stats.date++;
      } else if (fieldType.includes("enum")) {
        stats.enum++;
      } else {
        stats.other++;
      }

      if (field.get) {
        stats.withGetters++;
      } else {
        stats.withoutGetters++;
      }
    });

    return stats;
  }
}

module.exports = BaseModel;
