/**
 * 查询条件构建器
 * 
 * 不替换现有的 BaseService.paginateWithFmt，而是提供查询条件构建的通用方法
 * 遵循 Swiss Army Knife 哲学：小巧、实用、功能完整
 * 
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

const { Op } = require("sequelize");

class QueryBuilder {
  /**
   * 构建查询条件 - 与现有 BaseService.paginateWithFmt 配合使用
   * @param {Object} options 查询选项
   * @returns {Object} 查询条件对象
   */
  static buildWhere(options = {}) {
    const {
      baseWhere = {},
      search = '',
      searchFields = [],
      startDate,
      endDate,
      dateField = 'created_at',
      filters = {}
    } = options;

    let where = { ...baseWhere };

    // 添加搜索条件
    if (search && searchFields.length > 0) {
      const searchConditions = this.buildSearchConditions(search, searchFields);
      where = { ...where, ...searchConditions };
    }

    // 添加日期范围条件
    if (startDate || endDate) {
      const dateConditions = this.buildDateRangeConditions(startDate, endDate, dateField);
      where = { ...where, ...dateConditions };
    }

    // 添加其他过滤条件
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        where[key] = filters[key];
      }
    });

    return where;
  }

  /**
   * 构建排序条件 - 与现有 BaseService 配合使用
   * @param {string} sortField 排序字段
   * @param {string} sortOrder 排序方向
   * @param {Array} validSortFields 有效排序字段列表
   * @param {Array} defaultOrder 默认排序
   * @returns {Array} 排序条件
   */
  static buildOrder(sortField = 'created_at', sortOrder = 'DESC', validSortFields = [], defaultOrder = [['created_at', 'DESC']]) {
    // 如果指定了有效字段列表，检查排序字段是否有效
    if (validSortFields.length > 0 && !validSortFields.includes(sortField)) {
      return defaultOrder;
    }

    // 确保排序方向有效
    const validOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) 
      ? sortOrder.toUpperCase() 
      : 'DESC';

    return [[sortField, validOrder]];
  }

  /**
   * 构建搜索条件
   * @param {string} search 搜索关键词
   * @param {Array} searchFields 搜索字段
   * @returns {Object} 搜索条件
   */
  static buildSearchConditions(search, searchFields) {
    if (!search || !searchFields.length) return {};

    return {
      [Op.or]: searchFields.map(field => ({
        [field]: { [Op.like]: `%${search}%` }
      }))
    };
  }

  /**
   * 构建日期范围条件
   * @param {string} startDate 开始日期
   * @param {string} endDate 结束日期
   * @param {string} dateField 日期字段名
   * @returns {Object} 日期范围条件
   */
  static buildDateRangeConditions(startDate, endDate, dateField) {
    if (!startDate && !endDate) return {};

    const dateCondition = {};
    if (startDate) {
      dateCondition[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      dateCondition[Op.lte] = new Date(endDate);
    }

    return {
      [dateField]: dateCondition
    };
  }

  /**
   * 构建状态过滤条件
   * @param {*} status 状态值
   * @param {string} statusField 状态字段名
   * @returns {Object} 状态条件
   */
  static buildStatusCondition(status, statusField = 'status') {
    if (status === undefined || status === null || status === '') {
      return {};
    }
    return { [statusField]: status };
  }

  /**
   * 构建数值范围条件
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @param {string} field 字段名
   * @returns {Object} 数值范围条件
   */
  static buildRangeCondition(min, max, field) {
    if (min === undefined && max === undefined) return {};

    const rangeCondition = {};
    if (min !== undefined) {
      rangeCondition[Op.gte] = min;
    }
    if (max !== undefined) {
      rangeCondition[Op.lte] = max;
    }

    return {
      [field]: rangeCondition
    };
  }

  /**
   * 构建 IN 条件
   * @param {Array} values 值数组
   * @param {string} field 字段名
   * @returns {Object} IN 条件
   */
  static buildInCondition(values, field) {
    if (!Array.isArray(values) || values.length === 0) {
      return {};
    }
    return {
      [field]: { [Op.in]: values }
    };
  }

  /**
   * 构建模糊匹配条件
   * @param {string} value 匹配值
   * @param {string} field 字段名
   * @returns {Object} 模糊匹配条件
   */
  static buildLikeCondition(value, field) {
    if (!value) return {};
    return {
      [field]: { [Op.like]: `%${value}%` }
    };
  }

  /**
   * 合并多个查询条件
   * @param {...Object} conditions 多个条件对象
   * @returns {Object} 合并后的条件
   */
  static mergeConditions(...conditions) {
    return Object.assign({}, ...conditions.filter(condition => 
      condition && typeof condition === 'object' && Object.keys(condition).length > 0
    ));
  }

  /**
   * 验证排序参数
   * @param {string} sortField 排序字段
   * @param {string} sortOrder 排序方向
   * @param {Array} validFields 有效字段列表
   * @returns {Object} 验证结果
   */
  static validateSortParams(sortField, sortOrder, validFields = []) {
    const validatedField = validFields.length > 0 && !validFields.includes(sortField) 
      ? 'created_at' 
      : sortField;
    
    const validatedOrder = ['ASC', 'DESC'].includes(sortOrder?.toUpperCase()) 
      ? sortOrder.toUpperCase() 
      : 'DESC';

    return {
      field: validatedField,
      order: validatedOrder,
      isValid: validFields.length === 0 || validFields.includes(sortField)
    };
  }

  /**
   * 构建完整的查询配置 - 兼容现有 BaseService 使用方式
   * @param {Object} options 查询选项
   * @returns {Object} 查询配置
   */
  static buildQueryOptions(options = {}) {
    const {
      baseWhere = {},
      include = [],
      attributes,
      distinct = false,
      // 搜索相关
      search = '',
      searchFields = [],
      // 排序相关
      sortField = 'created_at',
      sortOrder = 'DESC',
      validSortFields = [],
      // 日期范围
      startDate,
      endDate,
      dateField = 'created_at',
      // 其他过滤条件
      filters = {}
    } = options;

    const where = this.buildWhere({
      baseWhere,
      search,
      searchFields,
      startDate,
      endDate,
      dateField,
      filters
    });

    const order = this.buildOrder(sortField, sortOrder, validSortFields);

    return {
      where,
      include,
      order,
      attributes,
      distinct
    };
  }
}

module.exports = QueryBuilder;
