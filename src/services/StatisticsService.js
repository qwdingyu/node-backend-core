/**
 * 通用数据统计服务
 *
 * 遵循"瑞士军刀"原则：小巧、实用、功能完整
 * 提供常用的数据统计方法，支持多项目复用
 *
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

const { Op } = require("sequelize");

class StatisticsService {
  /**
   * 基础统计 - 总数、按状态统计
   * @param {Model} model Sequelize模型
   * @param {Object} options 统计选项
   * @returns {Object} 统计结果
   */
  static async getBasicStats(model, options = {}) {
    const {
      statusField = "status",
      statusValues = [0, 1, 2],
      statusLabels = ["inactive", "active", "ended"],
      where = {},
      includeTotal = true,
    } = options;

    const results = {};

    // 总数统计
    if (includeTotal) {
      results.total = await model.count({ where });
    }

    // 按状态统计
    for (let i = 0; i < statusValues.length; i++) {
      const statusValue = statusValues[i];
      const statusLabel = statusLabels[i] || `status_${statusValue}`;

      results[statusLabel] = await model.count({
        where: {
          ...where,
          [statusField]: statusValue,
        },
      });
    }

    return results;
  }

  /**
   * 聚合统计 - SUM、AVG、MIN、MAX
   * @param {Model} model Sequelize模型
   * @param {string} field 统计字段
   * @param {Object} options 统计选项
   * @returns {Object} 聚合统计结果
   */
  static async getAggregateStats(model, field, options = {}) {
    const { where = {}, operations = ["sum", "avg", "min", "max", "count"], defaultValue = 0 } = options;

    const results = {};

    for (const operation of operations) {
      try {
        let value;
        switch (operation) {
          case "sum":
            value = (await model.sum(field, { where })) || defaultValue;
            break;
          case "avg":
            value = (await model.aggregate(field, "avg", { where })) || defaultValue;
            break;
          case "min":
            value = (await model.min(field, { where })) || defaultValue;
            break;
          case "max":
            value = (await model.max(field, { where })) || defaultValue;
            break;
          case "count":
            value = (await model.count({ where })) || defaultValue;
            break;
          default:
            continue;
        }

        results[operation] = typeof value === "number" ? parseFloat(value.toFixed(2)) : value;
      } catch (error) {
        console.warn(`聚合统计 ${operation} 失败:`, error.message);
        results[operation] = defaultValue;
      }
    }

    return results;
  }

  /**
   * 分组统计
   * @param {Model} model Sequelize模型
   * @param {string} groupField 分组字段
   * @param {Object} options 统计选项
   * @returns {Array} 分组统计结果
   */
  static async getGroupStats(model, groupField, options = {}) {
    const {
      where = {},
      aggregateField = "id",
      aggregateOperation = "count",
      orderBy = "count",
      orderDirection = "DESC",
      limit = null,
      includeLabels = false,
      labelMapping = {},
    } = options;

    let aggregateFunction;
    switch (aggregateOperation) {
      case "count":
        aggregateFunction = model.sequelize.fn("COUNT", model.sequelize.col(aggregateField));
        break;
      case "sum":
        aggregateFunction = model.sequelize.fn("SUM", model.sequelize.col(aggregateField));
        break;
      case "avg":
        aggregateFunction = model.sequelize.fn("AVG", model.sequelize.col(aggregateField));
        break;
      default:
        aggregateFunction = model.sequelize.fn("COUNT", model.sequelize.col("id"));
    }

    const queryOptions = {
      where,
      attributes: [groupField, [aggregateFunction, aggregateOperation]],
      group: [groupField],
      order: [[model.sequelize.col(aggregateOperation), orderDirection]],
      raw: true,
    };

    if (limit) {
      queryOptions.limit = limit;
    }

    const results = await model.findAll(queryOptions);

    // 添加标签映射
    if (includeLabels) {
      return results.map((item) => ({
        ...item,
        label: labelMapping[item[groupField]] || item[groupField],
      }));
    }

    return results;
  }

  /**
   * 时间范围统计 - 数据库兼容性优化
   * @param {Model} model Sequelize模型
   * @param {Object} options 统计选项
   * @returns {Object} 时间范围统计结果
   */
  static async getTimeRangeStats(model, options = {}) {
    const {
      dateField = "created_at",
      where = {},
      periods = ["today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "lastMonth"],
      aggregateField = "id",
      aggregateOperation = "count",
    } = options;

    const results = {};
    const now = new Date();

    for (const period of periods) {
      const timeRange = this.getTimeRange(period, now);
      if (!timeRange) continue;

      // 使用数据库兼容的时间查询方式
      const periodWhere = this.buildDatabaseCompatibleTimeWhere(dateField, timeRange.start, timeRange.end, where, model.sequelize);

      try {
        let value;
        switch (aggregateOperation) {
          case "count":
            value = await model.count({ where: periodWhere });
            break;
          case "sum":
            value = (await model.sum(aggregateField, { where: periodWhere })) || 0;
            break;
          case "avg":
            value = (await model.aggregate(aggregateField, "avg", { where: periodWhere })) || 0;
            break;
          default:
            value = await model.count({ where: periodWhere });
        }

        results[period] = typeof value === "number" ? parseFloat(value.toFixed(2)) : value;
      } catch (error) {
        console.warn(`时间范围统计 ${period} 失败:`, error.message);
        results[period] = 0;
      }
    }

    return results;
  }

  /**
   * 趋势统计 - 按天/周/月统计
   * @param {Model} model Sequelize模型
   * @param {Object} options 统计选项
   * @returns {Array} 趋势统计结果
   */
  static async getTrendStats(model, options = {}) {
    const { dateField = "created_at", where = {}, days = 7, aggregateField = "id", aggregateOperation = "count", fillMissingDates = true } = options;

    const results = [];
    const endDate = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayWhere = {
        ...where,
        [dateField]: {
          [Op.gte]: dayStart,
          [Op.lt]: dayEnd,
        },
      };

      try {
        let value;
        switch (aggregateOperation) {
          case "count":
            value = await model.count({ where: dayWhere });
            break;
          case "sum":
            value = (await model.sum(aggregateField, { where: dayWhere })) || 0;
            break;
          case "avg":
            value = (await model.aggregate(aggregateField, "avg", { where: dayWhere })) || 0;
            break;
          default:
            value = await model.count({ where: dayWhere });
        }

        results.push({
          date: dateStr,
          value: typeof value === "number" ? parseFloat(value.toFixed(2)) : value,
        });
      } catch (error) {
        console.warn(`趋势统计 ${dateStr} 失败:`, error.message);
        if (fillMissingDates) {
          results.push({
            date: dateStr,
            value: 0,
          });
        }
      }
    }

    return results;
  }

  /**
   * 复合统计 - 多个模型的关联统计
   * @param {Array} modelConfigs 模型配置数组
   * @returns {Object} 复合统计结果
   */
  static async getCompositeStats(modelConfigs) {
    const results = {};

    const promises = modelConfigs.map(async (config) => {
      const { key, model, type = "basic", field = "id", ...options } = config;

      try {
        let stats;
        switch (type) {
          case "basic":
            stats = await this.getBasicStats(model, options);
            break;
          case "aggregate":
            stats = await this.getAggregateStats(model, field, options);
            break;
          case "group":
            stats = await this.getGroupStats(model, field, options);
            break;
          case "timeRange":
            stats = await this.getTimeRangeStats(model, options);
            break;
          case "trend":
            stats = await this.getTrendStats(model, options);
            break;
          default:
            stats = await this.getBasicStats(model, options);
        }

        return { key, stats };
      } catch (error) {
        console.warn(`复合统计 ${key} 失败:`, error.message);
        return { key, stats: {} };
      }
    });

    const resolvedStats = await Promise.all(promises);
    resolvedStats.forEach(({ key, stats }) => {
      results[key] = stats;
    });

    return results;
  }

  /**
   * 获取时间范围
   * @param {string} period 时间周期
   * @param {Date} now 当前时间
   * @returns {Object} 时间范围对象
   */
  static getTimeRange(period, now = new Date()) {
    const ranges = {
      today: () => {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return { start, end };
      },
      yesterday: () => {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return { start, end };
      },
      thisWeek: () => {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { start, end };
      },
      lastWeek: () => {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { start, end };
      },
      thisMonth: () => {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { start, end };
      },
      lastMonth: () => {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end };
      },
    };

    return ranges[period] ? ranges[period]() : null;
  }

  /**
   * 计算增长率
   * @param {number} current 当前值
   * @param {number} previous 之前值
   * @param {boolean} asPercentage 是否返回百分比格式
   * @returns {number|string} 增长率
   */
  static calculateGrowthRate(current, previous, asPercentage = false) {
    if (previous === 0) {
      const rate = current > 0 ? 100 : 0;
      return asPercentage ? `+${rate}%` : rate;
    }

    const rate = ((current - previous) / previous) * 100;
    const formattedRate = parseFloat(rate.toFixed(1));

    if (asPercentage) {
      return formattedRate > 0 ? `+${formattedRate}%` : `${formattedRate}%`;
    }

    return formattedRate;
  }

  /**
   * 格式化统计结果
   * @param {Object} stats 统计数据
   * @param {Object} formatOptions 格式化选项
   * @returns {Object} 格式化后的统计数据
   */
  static formatStats(stats, formatOptions = {}) {
    const {
      numberFormat = "default", // 'default', 'currency', 'percentage'
      decimalPlaces = 2,
      currencySymbol = "¥",
      addLabels = false,
      labelMapping = {},
    } = formatOptions;

    const formatted = {};

    Object.entries(stats).forEach(([key, value]) => {
      let formattedValue = value;

      if (typeof value === "number") {
        switch (numberFormat) {
          case "currency":
            formattedValue = `${currencySymbol}${value.toFixed(decimalPlaces)}`;
            break;
          case "percentage":
            formattedValue = `${value.toFixed(decimalPlaces)}%`;
            break;
          default:
            formattedValue = parseFloat(value.toFixed(decimalPlaces));
        }
      }

      formatted[key] = {
        value: formattedValue,
        raw: value,
      };

      if (addLabels && labelMapping[key]) {
        formatted[key].label = labelMapping[key];
      }
    });

    return formatted;
  }
  /**
   * 构建数据库兼容的时间查询条件
   * @param {string} dateField 日期字段名
   * @param {Date} startDate 开始时间
   * @param {Date} endDate 结束时间
   * @param {Object} baseWhere 基础查询条件
   * @param {Object} sequelize Sequelize实例
   * @returns {Object} 数据库兼容的查询条件
   */
  static buildDatabaseCompatibleTimeWhere(dateField, startDate, endDate, baseWhere = {}, sequelize) {
    if (!sequelize) {
      // 如果没有sequelize实例，使用默认的Op操作符
      return {
        ...baseWhere,
        [dateField]: {
          [Op.gte]: startDate,
          [Op.lt]: endDate,
        },
      };
    }

    const dialect = sequelize.getDialect();

    // 根据不同数据库类型优化时间查询
    switch (dialect) {
      case "mysql":
        // MySQL 优化：使用本地时间格式，避免时区转换问题
        return {
          ...baseWhere,
          [dateField]: {
            [Op.gte]: this.formatDateForDatabase(startDate, "mysql"),
            [Op.lt]: this.formatDateForDatabase(endDate, "mysql"),
          },
        };

      case "postgres":
        // PostgreSQL 优化：使用 TIMESTAMP 类型
        return {
          ...baseWhere,
          [dateField]: {
            [Op.gte]: this.formatDateForDatabase(startDate, "postgres"),
            [Op.lt]: this.formatDateForDatabase(endDate, "postgres"),
          },
        };

      case "mssql":
        // SQL Server 优化：使用 DATETIME2 格式
        return {
          ...baseWhere,
          [dateField]: {
            [Op.gte]: this.formatDateForDatabase(startDate, "mssql"),
            [Op.lt]: this.formatDateForDatabase(endDate, "mssql"),
          },
        };

      case "sqlite":
        // SQLite 优化：使用字符串格式比较
        return {
          ...baseWhere,
          [dateField]: {
            [Op.gte]: this.formatDateForDatabase(startDate, "sqlite"),
            [Op.lt]: this.formatDateForDatabase(endDate, "sqlite"),
          },
        };

      default:
        // 默认使用标准格式
        return {
          ...baseWhere,
          [dateField]: {
            [Op.gte]: startDate,
            [Op.lt]: endDate,
          },
        };
    }
  }

  /**
   * 根据数据库类型格式化日期
   * @param {Date} date 日期对象
   * @param {string} dialect 数据库类型
   * @returns {string|Date} 格式化后的日期
   */
  static formatDateForDatabase(date, dialect) {
    if (!date || !(date instanceof Date)) {
      return date;
    }

    switch (dialect) {
      case "mysql":
        // MySQL: YYYY-MM-DD HH:MM:SS 格式
        return date.toISOString().slice(0, 19).replace("T", " ");

      case "postgres":
        // PostgreSQL: 支持 ISO 8601 格式
        return date.toISOString();

      case "mssql":
        // SQL Server: YYYY-MM-DD HH:MM:SS.mmm 格式
        return date.toISOString().slice(0, 23).replace("T", " ");

      case "sqlite":
        // SQLite: YYYY-MM-DD HH:MM:SS 格式
        return date.toISOString().slice(0, 19).replace("T", " ");

      default:
        // 默认返回 ISO 格式
        return date.toISOString();
    }
  }
}

module.exports = StatisticsService;
