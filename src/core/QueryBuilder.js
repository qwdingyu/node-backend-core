const { Op } = require("sequelize");

class QueryBuilder {
  /**
   * 创建新的查询构建器实例
   * @param {Model} model - Sequelize 模型
   * @param {Sequelize} sequelize - Sequelize 实例
   */
  constructor(model, sequelize) {
    if (!model || !sequelize) {
      throw new Error("Model and Sequelize instance are required");
    }

    this.model = model;
    this.sequelize = sequelize;
    this._resetQueryState();
  }

  /**
   * 重置查询状态
   * @private
   */
  _resetQueryState() {
    this._where = {};
    this._order = null;
    this._limit = null;
    this._offset = null;
    this._include = [];
    this._attributes = null;
    this._group = null;
    this._having = null;
    this._distinct = false;
    this._transaction = null;
    this._paranoid = true; // 默认启用软删除过滤
  }

  // ==================== 链式方法 ====================

  /**
   * 设置 WHERE 条件
   * @param {Object} conditions - 查询条件
   * @returns {QueryBuilder}
   */
  where(conditions) {
    if (!this._isValidConditions(conditions)) {
      throw new Error("Where conditions must be a non-empty object");
    }
    Object.assign(this._where, this._parseWhere(conditions));
    return this;
  }

  /**
   * 添加 OR 条件
   * @param {Object} conditions - 查询条件
   * @returns {QueryBuilder}
   */
  orWhere(conditions) {
    if (!this._isValidConditions(conditions)) {
      throw new Error("OrWhere conditions must be a non-empty object");
    }

    if (Object.keys(this._where).length === 0) {
      return this.where(conditions);
    }

    this._where = { [Op.or]: [this._where, this._parseWhere(conditions)] };
    return this;
  }

  /**
   * 设置排序
   * @param {String|Array} order - 排序字段
   * @returns {QueryBuilder}
   */
  order(order) {
    if (typeof order === "string") {
      this._order = this._parseOrder(order);
    } else if (Array.isArray(order)) {
      this._order = order;
    } else {
      throw new Error("Order must be a string or array");
    }
    return this;
  }

  /**
   * 设置返回记录数限制
   * @param {Number} limit - 记录数
   * @returns {QueryBuilder}
   */
  limit(limit) {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error("Limit must be a positive integer");
    }
    this._limit = limit;
    return this;
  }

  /**
   * 设置偏移量
   * @param {Number} offset - 偏移量
   * @returns {QueryBuilder}
   */
  offset(offset) {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error("Offset must be a non-negative integer");
    }
    this._offset = offset;
    return this;
  }

  /**
   * 设置关联模型
   * @param {Object|Array} associations - 关联配置
   * @returns {QueryBuilder}
   */
  include(associations) {
    if (Array.isArray(associations)) {
      this._include.push(...associations);
    } else if (typeof associations === "object") {
      this._include.push(associations);
    } else {
      throw new Error("Include must be an object or array");
    }
    return this;
  }

  /**
   * 设置查询字段
   * @param {String|Array} fields - 字段列表
   * @returns {QueryBuilder}
   */
  select(fields) {
    this._attributes = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * 设置分组字段
   * @param {String|Array} fields - 分组字段
   * @returns {QueryBuilder}
   */
  group(fields) {
    this._group = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * 设置分组条件
   * @param {Object} conditions - 分组条件
   * @returns {QueryBuilder}
   */
  having(conditions) {
    if (!this._isValidConditions(conditions)) {
      throw new Error("Having conditions must be a non-empty object");
    }
    this._having = conditions;
    return this;
  }

  /**
   * 设置去重查询
   * @param {Boolean} [distinct=true] - 是否去重
   * @returns {QueryBuilder}
   */
  distinct(distinct = true) {
    this._distinct = distinct;
    return this;
  }

  /**
   * 设置是否包含软删除记录
   * @param {Boolean} [paranoid=false] - true: 排除软删除, false: 包含软删除
   * @returns {QueryBuilder}
   */
  withDeleted(paranoid = false) {
    this._paranoid = !paranoid;
    return this;
  }

  /**
   * 设置事务
   * @param {Transaction} transaction - Sequelize 事务对象
   * @returns {QueryBuilder}
   */
  withTransaction(transaction) {
    if (!transaction || typeof transaction !== "object") {
      throw new Error("Invalid transaction object");
    }
    this._transaction = transaction;
    return this;
  }

  // ==================== 执行方法 ====================

  /**
   * 查找单条记录
   * @returns {Promise<Model|null>}
   */
  async find() {
    return this._executeQuery(async () => {
      const options = this._buildOptions();
      return this.model.findOne(options);
    });
  }

  /**
   * 查找多条记录
   * @returns {Promise<Array<Model>>}
   */
  async finds() {
    return this._executeQuery(async () => {
      const options = this._buildOptions();
      return this.model.findAll(options);
    });
  }

  /**
   * 查找并计数 (分页查询)
   * @returns {Promise<{rows: Array<Model>, count: number}>}
   */
  async findAndCount() {
    return this._executeQuery(async () => {
      const options = this._buildOptions();
      return this.model.findAndCountAll(options);
    });
  }

  /**
   * 分页查询
   * @param {Number} [page=1] - 页码
   * @param {Number} [pageSize=10] - 每页记录数
   * @returns {Promise<{data: Array<Model>, pagination: Object}>}
   */
  async paginate(page = 1, pageSize = 10) {
    return this._executeQuery(async () => {
      page = Math.max(1, parseInt(page));
      pageSize = Math.max(1, parseInt(pageSize));

      const offset = (page - 1) * pageSize;
      this.limit(pageSize).offset(offset);

      const options = this._buildOptions();
      const [rows, total] = await Promise.all([this.model.findAll(options), this.model.count({ where: this._where })]);

      return {
        rows,
        total,
        page,
        pageSize,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        pages: Math.ceil(total / pageSize),
      };
    });
  }

  /**
   * 计数
   * @returns {Promise<Number>}
   */
  async count() {
    return this._executeQuery(async () => {
      return this.model.count({ where: this._where });
    });
  }

  /**
   * 求和
   * @param {String} field - 求和字段
   * @returns {Promise<Number>}
   */
  async sum(field) {
    this._validateField(field); // 添加字段验证
    return this._executeQuery(async () => {
      const result = await this.model.sum(field, { where: this._where });
      return result || 0;
    });
  }

  /**
   * 平均值
   * @param {String} field - 计算字段
   * @returns {Promise<Number>}
   */
  async avg(field) {
    console.log("avg ========", field, this._where);
    this._validateField(field); // 添加字段验证

    return this._executeQuery(async () => {
      // 现代Sequelize版本方式
      if (typeof this.model.avg === "function") {
        const result = await this.model.avg(field, { where: this._where, transaction: this._transaction });
        return parseFloat(result) || 0;
      }

      // 兼容旧版的方式
      const result = await this.model.findOne({
        attributes: [[this.sequelize.fn("AVG", this.sequelize.col(field)), "avg_value"]],
        where: this._where,
        transaction: this._transaction,
        raw: true,
      });
      return parseFloat(result?.avg_value) || 0;
    });
  }

  /**
   * 最大值
   * @param {String} field - 计算字段
   * @returns {Promise<*>}
   */
  async max(field) {
    this._validateField(field); // 添加字段验证
    return this._executeQuery(async () => {
      return this.model.max(field, { where: this._where });
    });
  }

  /**
   * 最小值
   * @param {String} field - 计算字段
   * @returns {Promise<*>}
   */
  async min(field) {
    this._validateField(field); // 添加字段验证
    return this._executeQuery(async () => {
      return this.model.min(field, { where: this._where });
    });
  }

  /**
   * 创建记录
   * @param {Object} data - 记录数据
   * @returns {Promise<Model>}
   */
  async create(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Create data must be an object");
    }
    return this._executeQuery(async () => {
      return this.model.create(data, { transaction: this._transaction });
    });
  }

  /**
   * 批量创建
   * @param {Array<Object>} records - 记录数组
   * @returns {Promise<Array<Model>>}
   */
  async bulkCreate(records) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("Records must be a non-empty array");
    }
    return this._executeQuery(async () => {
      return this.model.bulkCreate(records, { transaction: this._transaction });
    });
  }

  /**
   * 更新记录
   * @param {Object} data - 更新数据
   * @returns {Promise<Number>} 影响的行数
   */
  async update(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Update data must be an object");
    }
    // 新增字段验证逻辑
    this._validateUpdateFields(data);
    return this._executeQuery(async () => {
      const [affectedRows] = await this.model.update(data, {
        where: this._where,
        transaction: this._transaction,
      });
      // 新增受影响行数检查
      if (affectedRows === 0) {
        console.warn(
          "[QueryBuilder] 更新操作未影响任何行，可能原因:",
          "\n1. WHERE条件不匹配任何记录",
          "\n2. 新旧数据相同",
          "\n3. 数据库权限不足",
          `\nWHERE条件: ${JSON.stringify(this._where)}`
        );
      }
      return affectedRows;
    });
  }

  /**
   * 删除记录
   * @param {Boolean} [force=false] - 是否强制删除(针对软删除)
   * @returns {Promise<Number>} 删除的行数
   */
  async delete(force = false) {
    return this._executeQuery(async () => {
      return this.model.destroy({
        where: this._where,
        transaction: this._transaction,
        force,
      });
    });
  }
  /**
   * 验证更新字段是否存在于模型中
   * @private
   * @param {Object} data - 更新数据对象
   * @throws {Error} 如果字段不存在于模型中
   */
  _validateUpdateFields(data) {
    // 获取模型定义的所有字段
    const modelFields = Object.keys(this.model.rawAttributes);

    // 检查数据中的每个字段
    Object.keys(data).forEach((field) => {
      if (!modelFields.includes(field)) {
        // 特殊处理 Sequelize literal 表达式
        if (typeof data[field] === "string" && data[field].includes("literal")) {
          const literalField = data[field].match(/(\w+)\s*[+\-*/]/)?.[1];
          if (literalField && !modelFields.includes(literalField)) {
            throw new Error(
              `字段验证失败: literal表达式中的"${literalField}"不存在于模型${this.model.name}中\n` + `有效字段: ${modelFields.join(", ")}`
            );
          }
        } else {
          throw new Error(`字段验证失败: "${field}"不存在于模型${this.model.name}中\n` + `有效字段: ${modelFields.join(", ")}`);
        }
      }
    });
  }
  // 验证字段是否存在
  _validateField(field) {
    if (!Object.keys(this.model.rawAttributes).includes(field)) {
      throw new Error(`字段 "${field}" 不存在于模型 ${this.model.name} 中`);
    }
  }
  /**
   * 执行事务
   * @param {Function} callback - 事务回调函数
   * @returns {Promise<*>}
   */
  async transaction(callback) {
    if (typeof callback !== "function") {
      throw new Error("Transaction callback must be a function");
    }

    const t = await this.sequelize.transaction();
    try {
      // 创建新的builder实例并传入事务
      const transactionBuilder = new QueryBuilder(this.model, this.sequelize).withTransaction(t);

      // 只有存在条件时才添加where
      if (this._where && Object.keys(this._where).length > 0) {
        transactionBuilder.where(this._where);
      }
      // 复制其他查询状态
      Object.assign(transactionBuilder, {
        _order: this._order,
        _limit: this._limit,
        _offset: this._offset,
        _include: [...this._include],
        _attributes: this._attributes,
        _group: this._group,
        _having: this._having,
        _distinct: this._distinct,
        _paranoid: this._paranoid,
      });

      const result = await callback(transactionBuilder);
      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      throw this._handleError(error);
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 构建查询选项
   * @private
   * @returns {Object}
   */
  _buildOptions() {
    const options = {};

    if (Object.keys(this._where).length > 0) {
      options.where = this._where;
    }
    if (this._order) {
      options.order = this._order;
    }
    if (this._limit !== null) {
      options.limit = this._limit;
    }
    if (this._offset !== null) {
      options.offset = this._offset;
    }
    if (this._include.length > 0) {
      options.include = this._include;
    }
    if (this._attributes) {
      options.attributes = this._attributes;
    }
    if (this._group) {
      options.group = this._group;
    }
    if (this._having) {
      options.having = this._having;
    }
    if (this._distinct) {
      options.distinct = this._distinct;
    }
    if (this._transaction) {
      options.transaction = this._transaction;
    }
    if (!this._paranoid) {
      options.paranoid = false;
    }

    return options;
  }

  /**
   * 执行查询并处理结果
   * @private
   * @param {Function} queryFn - 查询函数
   * @returns {Promise<*>}
   */
  async _executeQuery(queryFn) {
    try {
      const result = await queryFn();
      this._resetQueryState();
      return result;
    } catch (error) {
      console.log("---error---", error);
      this._resetQueryState();
      throw this._handleError(error);
    }
  }

  /**
   * 解析 WHERE 条件
   * @private
   * @param {Object} conditions - 原始条件
   * @returns {Object}
   */
  _parseWhere(conditions) {
    const result = {};

    for (const [key, value] of Object.entries(conditions)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        // 数组格式：[operator, value]
        const [operator, val] = value;
        result[key] = this._parseOperator(operator, val);
      } else if (typeof value === "object" && !Array.isArray(value)) {
        // 对象格式：{ $operator: value }
        result[key] = this._parseObjectCondition(value);
      } else {
        // 简单等于
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 解析操作符
   * @private
   * @param {String} operator - 操作符
   * @param {*} value - 值
   * @returns {Object}
   */
  _parseOperator(operator, value) {
    const opMap = {
      "=": Op.eq,
      eq: Op.eq,
      "!=": Op.ne,
      ne: Op.ne,
      ">": Op.gt,
      gt: Op.gt,
      ">=": Op.gte,
      gte: Op.gte,
      "<": Op.lt,
      lt: Op.lt,
      "<=": Op.lte,
      lte: Op.lte,
      in: Op.in,
      "not in": Op.notIn,
      notin: Op.notIn,
      like: Op.like,
      "not like": Op.notLike,
      notlike: Op.notLike,
      between: Op.between,
      "not between": Op.notBetween,
      notbetween: Op.notBetween,
      is: Op.is,
      "is not": Op.isNot,
      isnot: Op.isNot,
    };

    const op = opMap[operator.toLowerCase()];
    if (!op) {
      throw new Error(`Unsupported operator: ${operator}`);
    }

    return { [op]: value };
  }

  /**
   * 解析对象条件
   * @private
   * @param {Object} obj - 条件对象
   * @returns {Object}
   */
  _parseObjectCondition(obj) {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("$")) {
        const operator = key.slice(1);
        Object.assign(result, this._parseOperator(operator, value));
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 解析排序字符串
   * @private
   * @param {String} orderStr - 排序字符串
   * @returns {Array}
   */
  _parseOrder(orderStr) {
    return orderStr
      .split(",")
      .map((s) => {
        const trimmed = s.trim();
        if (!trimmed) return null;

        const parts = trimmed.split(/\s+/);
        const field = parts[0];
        const direction = (parts[1] || "ASC").toUpperCase();

        if (!["ASC", "DESC"].includes(direction)) {
          throw new Error(`Invalid order direction: ${direction}`);
        }

        return [field, direction];
      })
      .filter(Boolean);
  }

  /**
   * 验证条件对象
   * @private
   * @param {*} conditions - 待验证条件
   * @returns {Boolean}
   */
  _isValidConditions(conditions) {
    return conditions && typeof conditions === "object" && !Array.isArray(conditions) && Object.keys(conditions).length > 0;
  }

  /**
   * 处理错误
   * @private
   * @param {Error} error - 原始错误
   * @returns {Error}
   */
  _handleError(error) {
    if (!error.name || !error.name.startsWith("Sequelize")) {
      return error;
    }

    const errorMap = {
      SequelizeValidationError: "数据验证失败",
      SequelizeUniqueConstraintError: "数据唯一性冲突",
      SequelizeForeignKeyConstraintError: "外键约束错误",
      SequelizeDatabaseError: "数据库操作错误",
      SequelizeTimeoutError: "查询超时",
      SequelizeConnectionError: "数据库连接错误",
    };

    const message = errorMap[error.name] || "数据库错误";
    const newError = new Error(`${message}: ${error.message}`);
    newError.name = error.name;
    newError.original = error;
    return newError;
  }
}

module.exports = QueryBuilder;
