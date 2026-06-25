/**
 * Sequelize 配置增强器
 *
 * 提供统一的 Sequelize 配置增强功能
 * 自动应用时间戳处理和其他标准配置
 * 支持多项目复用
 *
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

const TimestampManager = require("../utils/TimestampManager");

class SequelizeEnhancer {
  /**
   * 增强 Sequelize 配置
   * 自动应用时间戳处理和其他标准配置
   * @param {Object} config 原始配置
   * @returns {Object} 增强后的配置
   */
  static enhanceConfig(config) {
    const enhancedConfig = {
      ...config,
      define: {
        // 默认配置
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        underscored: false, // 使用驼峰命名
        freezeTableName: true, // 禁用表名复数化
        charset: "utf8mb4",
        dialectOptions: {
          collate: "utf8mb4_unicode_ci",
        },
        // 合并用户自定义配置
        ...config.define,
        // 应用全局时间戳 hooks
        hooks: this.mergeGlobalHooks(config.define?.hooks || {}),
      },
      // 数据库连接池优化
      pool: {
        max: 50,
        min: 5,
        acquire: 30000,
        idle: 10000,
        ...config.pool,
      },
      // 日志配置
      logging: config.logging !== undefined ? config.logging : this.getDefaultLogging(),
      // MySQL 方言特定配置
      dialectOptions: {
        connectTimeout: 60000, // 连接超时
        charset: "utf8mb4",
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: false,
        typeCast: true,
        ...config.dialectOptions,
      },
    };

    return enhancedConfig;
  }

  /**
   * 合并全局 hooks
   * @param {Object} userHooks 用户自定义 hooks
   * @returns {Object} 合并后的 hooks
   */
  static mergeGlobalHooks(userHooks) {
    const timestampHooks = TimestampManager.getGlobalHooks();
    const mergedHooks = {};

    // 合并时间戳 hooks
    Object.keys(timestampHooks).forEach((hookName) => {
      const timestampHook = timestampHooks[hookName];
      const userHook = userHooks[hookName];

      if (!userHook) {
        mergedHooks[hookName] = timestampHook;
      } else if (typeof userHook === "function") {
        // 创建组合 hook：先执行时间戳 hook，再执行用户 hook
        mergedHooks[hookName] = async (...args) => {
          await timestampHook(...args);
          await userHook(...args);
        };
      } else {
        // 其他情况使用时间戳 hook
        mergedHooks[hookName] = timestampHook;
      }
    });

    // 添加用户定义的其他 hooks
    Object.keys(userHooks).forEach((hookName) => {
      if (!mergedHooks[hookName]) {
        mergedHooks[hookName] = userHooks[hookName];
      }
    });

    return mergedHooks;
  }

  /**
   * 获取默认的日志配置
   * @returns {Function|boolean} 日志配置
   */
  static getDefaultLogging() {
    // 在开发环境显示 SQL 日志，生产环境关闭
    if (process.env.NODE_ENV === "production") {
      return false;
    }

    // 开发环境的 SQL 日志格式化
    return (sql, timing) => {
      if (process.env.DEBUG_SQL === "true") {
        console.log(`🔍 SQL [${timing}ms]: ${sql}`);
      }
    };
  }

  /**
   * 自动修复所有模型的时间戳配置
   * @param {Sequelize} sequelize Sequelize 实例
   * @param {boolean} verbose 是否显示详细信息
   * @returns {Object} 修复结果
   */
  static autoFixModels(sequelize, verbose = false) {
    if (!sequelize || !sequelize.models) {
      console.warn("⚠️ 无效的 Sequelize 实例或模型集合");
      return { total: 0, fixed: 0, alreadyValid: 0, errors: 0 };
    }

    return TimestampManager.autoFix(sequelize.models, verbose);
  }

  /**
   * 验证数据库连接
   * @param {Sequelize} sequelize Sequelize 实例
   * @returns {Promise<boolean>} 连接是否成功
   */
  static async validateConnection(sequelize) {
    try {
      await sequelize.authenticate();
      console.log("✅ 数据库连接验证成功");
      return true;
    } catch (error) {
      console.error("❌ 数据库连接验证失败:", error.message);
      return false;
    }
  }

  /**
   * 同步数据库表结构
   * @param {Sequelize} sequelize Sequelize 实例
   * @param {Object} options 同步选项
   * @returns {Promise<boolean>} 同步是否成功
   */
  static async syncDatabase(sequelize, options = {}) {
    try {
      const syncOptions = {
        force: false, // 默认不强制重建表
        alter: false, // 默认不自动修改表结构
        ...options,
      };

      if (syncOptions.force) {
        console.warn("⚠️ 强制同步模式：将删除并重建所有表");
      }

      await sequelize.sync(syncOptions);
      console.log("✅ 数据库表结构同步成功");
      return true;
    } catch (error) {
      console.error("❌ 数据库表结构同步失败:", error.message);
      return false;
    }
  }

  /**
   * 获取数据库连接状态
   * @param {Sequelize} sequelize Sequelize 实例
   * @returns {Object} 连接状态信息
   */
  static getConnectionStatus(sequelize) {
    try {
      const connectionManager = sequelize.connectionManager;
      const pool = connectionManager.pool;

      return {
        isConnected: !!sequelize.connectionManager.pool,
        poolSize: pool ? pool.size : 0,
        poolUsed: pool ? pool.used : 0,
        poolWaiting: pool ? pool.pending : 0,
        dialect: sequelize.getDialect(),
        database: sequelize.config.database,
        host: sequelize.config.host,
        port: sequelize.config.port,
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error.message,
      };
    }
  }

  /**
   * 获取所有模型的统计信息
   * @param {Sequelize} sequelize Sequelize 实例
   * @returns {Promise<Object>} 模型统计信息
   */
  static async getModelsStats(sequelize) {
    const stats = {
      totalModels: 0,
      modelStats: {},
      errors: [],
    };

    if (!sequelize || !sequelize.models) {
      stats.errors.push("无效的 Sequelize 实例或模型集合");
      return stats;
    }

    const models = Object.keys(sequelize.models);
    stats.totalModels = models.length;

    for (const modelName of models) {
      try {
        const Model = sequelize.models[modelName];
        if (Model && typeof Model.count === "function") {
          const total = await Model.count();
          stats.modelStats[modelName] = {
            total,
            modelName,
            tableName: Model.tableName,
          };
        } else {
          stats.modelStats[modelName] = {
            total: 0,
            modelName,
            error: "模型不支持 count 方法",
          };
        }
      } catch (error) {
        stats.errors.push(`获取模型 ${modelName} 统计信息失败: ${error.message}`);
        stats.modelStats[modelName] = {
          total: 0,
          modelName,
          error: error.message,
        };
      }
    }

    return stats;
  }

  /**
   * 执行数据库健康检查
   * @param {Sequelize} sequelize Sequelize 实例
   * @returns {Promise<Object>} 健康检查结果
   */
  static async healthCheck(sequelize) {
    const result = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      checks: {},
      errors: [],
    };

    try {
      // 1. 连接检查
      result.checks.connection = await this.validateConnection(sequelize);

      // 2. 连接状态检查
      result.checks.connectionStatus = this.getConnectionStatus(sequelize);

      // 3. 时间戳配置检查
      const timestampCheck = this.autoFixModels(sequelize, false);
      result.checks.timestamps = {
        total: timestampCheck.total,
        fixed: timestampCheck.fixed,
        errors: timestampCheck.errors,
        isHealthy: timestampCheck.errors === 0,
      };

      // 4. 模型统计检查
      result.checks.models = await this.getModelsStats(sequelize);

      // 5. 基础查询测试
      try {
        await sequelize.query("SELECT 1+1 AS result");
        result.checks.basicQuery = true;
      } catch (error) {
        result.checks.basicQuery = false;
        result.errors.push(`基础查询测试失败: ${error.message}`);
      }

      // 判断整体健康状态
      const hasErrors = result.errors.length > 0 || !result.checks.connection || !result.checks.basicQuery || result.checks.timestamps.errors > 0;

      result.status = hasErrors ? "unhealthy" : "healthy";
    } catch (error) {
      result.status = "error";
      result.errors.push(`健康检查执行失败: ${error.message}`);
    }

    return result;
  }

  /**
   * 打印健康检查报告
   * @param {Object} healthResult 健康检查结果
   */
  static printHealthReport(healthResult) {
    console.log("\n🏥 数据库健康检查报告");
    console.log("=".repeat(50));
    console.log(`📊 状态: ${healthResult.status === "healthy" ? "✅ 健康" : "❌ 异常"}`);
    console.log(`🕐 时间: ${healthResult.timestamp}`);

    if (healthResult.checks.connection) {
      console.log("✅ 数据库连接正常");
    } else {
      console.log("❌ 数据库连接异常");
    }

    if (healthResult.checks.timestamps) {
      const ts = healthResult.checks.timestamps;
      console.log(`🔧 时间戳检查: ${ts.total} 个模型, ${ts.fixed} 个已修复, ${ts.errors} 个错误`);
    }

    if (healthResult.checks.models) {
      const models = healthResult.checks.models;
      console.log(`📋 模型统计: ${models.totalModels} 个模型, ${models.errors.length} 个错误`);
    }

    if (healthResult.errors.length > 0) {
      console.log("\n❌ 错误详情:");
      healthResult.errors.forEach((error) => {
        console.log(`  - ${error}`);
      });
    }

    console.log("=".repeat(50));
  }
}

module.exports = SequelizeEnhancer;
