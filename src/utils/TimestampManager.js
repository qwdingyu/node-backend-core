/**
 * 时间戳管理器
 *
 * 提供统一的时间戳字段定义、hooks和验证功能
 * 支持多项目复用，解决 "Field 'created_at' doesn't have a default value" 问题
 *
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

const { DataTypes } = require("sequelize");

class TimestampManager {
  /**
   * 获取标准的时间戳字段定义
   * @returns {Object} 时间戳字段定义
   */
  static getStandardFields() {
    return {
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        // 不设置 defaultValue，在 hooks 中处理，否则increment/decrement 会出错
        comment: "创建时间",
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        // 不设置 defaultValue，在 hooks 中处理，否则increment/decrement 会出错
        comment: "更新时间",
      },
    };
  }

  /**
   * 获取标准的时间戳 hooks（数组格式）
   * @returns {Object} hooks 配置对象
   */
  static getStandardHooks() {
    return {
      beforeCreate: [
        (instance, options) => {
          const now = new Date();

          // 检查 created_at 字段
          if (
            !instance.created_at ||
            instance.created_at === "NOW" ||
            instance.created_at === DataTypes.NOW ||
            (instance.created_at && instance.created_at.constructor && instance.created_at.constructor.name === "NOW")
          ) {
            instance.created_at = now;
          }

          // 检查 updated_at 字段
          if (
            !instance.updated_at ||
            instance.updated_at === "NOW" ||
            instance.updated_at === DataTypes.NOW ||
            (instance.updated_at && instance.updated_at.constructor && instance.updated_at.constructor.name === "NOW")
          ) {
            instance.updated_at = now;
          }
        },
      ],
      beforeUpdate: [
        (instance, options) => {
          instance.updated_at = new Date();
        },
      ],
      beforeBulkCreate: [
        (instances, options) => {
          const now = new Date();
          instances.forEach((instance) => {
            // 检查 created_at 字段
            if (
              !instance.created_at ||
              instance.created_at === "NOW" ||
              instance.created_at === DataTypes.NOW ||
              (instance.created_at && instance.created_at.constructor && instance.created_at.constructor.name === "NOW")
            ) {
              instance.created_at = now;
            }

            // 检查 updated_at 字段
            if (
              !instance.updated_at ||
              instance.updated_at === "NOW" ||
              instance.updated_at === DataTypes.NOW ||
              (instance.updated_at && instance.updated_at.constructor && instance.updated_at.constructor.name === "NOW")
            ) {
              instance.updated_at = now;
            }
          });
        },
      ],
      beforeBulkUpdate: [
        (options) => {
          // 跳过 increment/decrement 操作，避免与 Sequelize 内部处理冲突
          if (options.increment || options.decrement) {
            return;
          }

          // 只在有 attributes 时设置 updated_at
          if (options.attributes) {
            options.attributes.updated_at = new Date();
          }
        },
      ],
    };
  }

  /**
   * 获取智能时间戳 hooks
   * @param {Object} timestampConfig 时间戳配置
   * @returns {Object} hooks 配置对象
   */
  static getSmartHooks(timestampConfig) {
    const hooks = {};

    // 只有启用时间戳时才添加 hooks
    if (!timestampConfig.timestamps) {
      return hooks;
    }

    const hasCreatedAt = timestampConfig.createdAt !== false;
    const hasUpdatedAt = timestampConfig.updatedAt !== false;

    if (hasCreatedAt || hasUpdatedAt) {
      hooks.beforeCreate = [
        (instance, options) => {
          const now = new Date();

          // 只处理存在的字段
          if (
            hasCreatedAt &&
            (!instance.created_at ||
              instance.created_at === "NOW" ||
              instance.created_at === DataTypes.NOW ||
              (instance.created_at && instance.created_at.constructor && instance.created_at.constructor.name === "NOW"))
          ) {
            instance.created_at = now;
          }

          if (
            hasUpdatedAt &&
            (!instance.updated_at ||
              instance.updated_at === "NOW" ||
              instance.updated_at === DataTypes.NOW ||
              (instance.updated_at && instance.updated_at.constructor && instance.updated_at.constructor.name === "NOW"))
          ) {
            instance.updated_at = now;
          }
        },
      ];
    }

    if (hasUpdatedAt) {
      hooks.beforeUpdate = [
        (instance, options) => {
          instance.updated_at = new Date();
        },
      ];
    }

    if (hasCreatedAt || hasUpdatedAt) {
      hooks.beforeBulkCreate = [
        (instances, options) => {
          const now = new Date();
          instances.forEach((instance) => {
            if (
              hasCreatedAt &&
              (!instance.created_at ||
                instance.created_at === "NOW" ||
                instance.created_at === DataTypes.NOW ||
                (instance.created_at && instance.created_at.constructor && instance.created_at.constructor.name === "NOW"))
            ) {
              instance.created_at = now;
            }

            if (
              hasUpdatedAt &&
              (!instance.updated_at ||
                instance.updated_at === "NOW" ||
                instance.updated_at === DataTypes.NOW ||
                (instance.updated_at && instance.updated_at.constructor && instance.updated_at.constructor.name === "NOW"))
            ) {
              instance.updated_at = now;
            }
          });
        },
      ];
    }

    if (hasUpdatedAt) {
      hooks.beforeBulkUpdate = [
        (options) => {
          // 跳过 increment/decrement 操作，避免与 Sequelize 内部处理冲突
          if (options.increment || options.decrement) {
            return;
          }

          // 只在有 attributes 时设置 updated_at
          if (options.attributes) {
            options.attributes.updated_at = new Date();
          }
        },
      ];
    }

    return hooks;
  }

  /**
   * 获取全局数据库配置的 hooks（函数格式）
   * @returns {Object} 全局 hooks 配置
   */
  static getGlobalHooks() {
    const standardHooks = this.getStandardHooks();
    // 将数组格式转换为函数格式，用于全局配置
    return {
      beforeCreate: standardHooks.beforeCreate[0],
      beforeUpdate: standardHooks.beforeUpdate[0],
      beforeBulkCreate: standardHooks.beforeBulkCreate[0],
      beforeBulkUpdate: standardHooks.beforeBulkUpdate[0],
    };
  }

  /**
   * 智能检测时间戳字段配置
   * @param {Object} attributes 字段定义
   * @returns {Object} 时间戳配置
   */
  static detectTimestampConfig(attributes) {
    const hasCreatedAt = !!attributes.created_at;
    const hasUpdatedAt = !!attributes.updated_at;

    return {
      timestamps: hasCreatedAt || hasUpdatedAt,
      createdAt: hasCreatedAt ? "created_at" : false,
      updatedAt: hasUpdatedAt ? "updated_at" : false,
    };
  }

  /**
   * 增强模型初始化
   * @param {Class} ModelClass 模型类
   * @param {Object} attributes 字段定义
   * @param {Object} options 选项
   * @returns {Model} 初始化后的模型
   */
  static enhanceModelInit(ModelClass, attributes, options = {}) {
    // 合并时间戳字段
    const timestampFields = this.getStandardFields();
    const enhancedAttributes = {
      ...attributes,
      // 只有当用户没有定义时才添加默认的时间戳字段
      ...(attributes.created_at ? {} : { created_at: timestampFields.created_at }),
      ...(attributes.updated_at ? {} : { updated_at: timestampFields.updated_at }),
    };

    // 智能检测时间戳配置
    const timestampConfig = this.detectTimestampConfig(enhancedAttributes);

    // 根据时间戳配置生成智能 hooks
    const timestampHooks = this.getSmartHooks(timestampConfig);
    const enhancedOptions = {
      ...timestampConfig, // 使用智能检测的配置
      ...options, // 用户配置优先级更高
      hooks: this.mergeHooks(timestampHooks, options.hooks || {}),
    };

    // 调用 Sequelize Model 的原始 init 方法
    const { Model } = require("sequelize");
    return Model.init.call(ModelClass, enhancedAttributes, enhancedOptions);
  }

  /**
   * 合并 hooks
   * @param {Object} timestampHooks 时间戳 hooks
   * @param {Object} userHooks 用户自定义 hooks
   * @returns {Object} 合并后的 hooks
   */
  static mergeHooks(timestampHooks, userHooks) {
    const mergedHooks = {};

    Object.keys(timestampHooks).forEach((hookName) => {
      const timestampHookArray = timestampHooks[hookName];
      const userHookArray = userHooks[hookName];

      if (!userHookArray) {
        // 如果用户没有定义该 hook，直接使用时间戳 hook
        mergedHooks[hookName] = timestampHookArray;
      } else if (Array.isArray(userHookArray)) {
        // 如果用户 hook 是数组，合并数组
        mergedHooks[hookName] = [...timestampHookArray, ...userHookArray];
      } else if (typeof userHookArray === "function") {
        // 如果用户 hook 是函数，转换为数组并合并
        mergedHooks[hookName] = [...timestampHookArray, userHookArray];
      } else {
        // 其他情况，使用时间戳 hook
        mergedHooks[hookName] = timestampHookArray;
      }
    });

    // 添加用户定义的其他 hooks
    Object.keys(userHooks).forEach((hookName) => {
      if (!mergedHooks[hookName]) {
        mergedHooks[hookName] = Array.isArray(userHooks[hookName]) ? userHooks[hookName] : [userHooks[hookName]];
      }
    });

    return mergedHooks;
  }

  /**
   * 验证模型的时间戳配置
   * @param {Model} model Sequelize 模型
   * @returns {Object} 验证结果
   */
  static validateModel(model) {
    if (!model || !model.rawAttributes) {
      return {
        isValid: false,
        error: "无效的模型对象",
        modelName: model?.name || "Unknown",
      };
    }

    const attributes = model.rawAttributes;
    const modelName = model.name;

    const result = {
      modelName,
      hasCreatedAt: !!attributes.created_at,
      hasUpdatedAt: !!attributes.updated_at,
      createdAtHasDefault: attributes.created_at && !!attributes.created_at.defaultValue,
      updatedAtHasDefault: attributes.updated_at && !!attributes.updated_at.defaultValue,
      timestampsEnabled: model.options.timestamps !== false,
      createdAtConfig: model.options.createdAt || "createdAt",
      updatedAtConfig: model.options.updatedAt || "updatedAt",
    };

    result.needsFix = (result.hasCreatedAt && !result.createdAtHasDefault) || (result.hasUpdatedAt && !result.updatedAtHasDefault);

    result.isValid = result.hasCreatedAt && result.hasUpdatedAt && result.createdAtHasDefault && result.updatedAtHasDefault;

    return result;
  }

  /**
   * 修复模型的时间戳配置
   * @param {Model} model Sequelize 模型
   * @returns {Object} 修复结果
   */
  static fixModel(model) {
    const validation = this.validateModel(model);

    if (validation.error) {
      return {
        success: false,
        message: validation.error,
        modelName: validation.modelName,
      };
    }

    if (validation.isValid) {
      return {
        success: true,
        message: `模型 ${validation.modelName} 的时间戳配置已正确`,
        modelName: validation.modelName,
        needsFix: false,
      };
    }

    try {
      const standardFields = this.getStandardFields();
      const standardHooks = this.getStandardHooks();

      // 修复字段定义
      if (validation.hasCreatedAt && !validation.createdAtHasDefault) {
        model.rawAttributes.created_at = {
          ...model.rawAttributes.created_at,
          ...standardFields.created_at,
        };
      } else if (!validation.hasCreatedAt) {
        model.rawAttributes.created_at = standardFields.created_at;
      }

      if (validation.hasUpdatedAt && !validation.updatedAtHasDefault) {
        model.rawAttributes.updated_at = {
          ...model.rawAttributes.updated_at,
          ...standardFields.updated_at,
        };
      } else if (!validation.hasUpdatedAt) {
        model.rawAttributes.updated_at = standardFields.updated_at;
      }

      // 修复 hooks
      if (!model.options.hooks) {
        model.options.hooks = {};
      }

      model.options.hooks = this.mergeHooks(standardHooks, model.options.hooks);

      // 确保时间戳配置正确
      model.options.timestamps = true;
      model.options.createdAt = "created_at";
      model.options.updatedAt = "updated_at";

      return {
        success: true,
        message: `模型 ${validation.modelName} 的时间戳配置已修复`,
        modelName: validation.modelName,
        needsFix: true,
        fixed: true,
      };
    } catch (error) {
      return {
        success: false,
        message: `修复模型 ${validation.modelName} 时发生错误: ${error.message}`,
        modelName: validation.modelName,
        error: error.message,
      };
    }
  }

  /**
   * 批量修复所有模型
   * @param {Object} models 模型对象集合
   * @returns {Object} 批量修复结果
   */
  static fixAllModels(models) {
    const results = {
      total: 0,
      fixed: 0,
      alreadyValid: 0,
      errors: 0,
      details: [],
    };

    if (!models || typeof models !== "object") {
      return {
        ...results,
        error: "无效的模型集合",
      };
    }

    Object.keys(models).forEach((modelName) => {
      const model = models[modelName];

      if (model && typeof model.rawAttributes === "object") {
        results.total++;
        const fixResult = this.fixModel(model);
        results.details.push(fixResult);

        if (fixResult.success) {
          if (fixResult.needsFix) {
            results.fixed++;
          } else {
            results.alreadyValid++;
          }
        } else {
          results.errors++;
        }
      }
    });

    return results;
  }

  /**
   * 自动修复入口函数
   * @param {Object} models 模型对象集合
   * @param {boolean} verbose 是否显示详细信息
   */
  static autoFix(models, verbose = false) {
    const results = this.fixAllModels(models);

    if (verbose) {
      console.log(this.generateReport(results));
    } else if (results.fixed > 0 || results.errors > 0) {
      console.log(`🔧 时间戳自动修复: ${results.fixed} 个已修复, ${results.alreadyValid} 个已正确, ${results.errors} 个错误`);
    }

    return results;
  }

  /**
   * 生成修复报告
   * @param {Object} results 修复结果
   * @returns {string} 格式化的报告
   */
  static generateReport(results) {
    let report = "\n🔧 时间戳字段修复报告\n";
    report += "=".repeat(50) + "\n";
    report += `📊 总计: ${results.total} 个模型\n`;
    report += `✅ 已修复: ${results.fixed} 个\n`;
    report += `✨ 已正确: ${results.alreadyValid} 个\n`;
    report += `❌ 错误: ${results.errors} 个\n\n`;

    if (results.details.length > 0) {
      report += "📋 详细信息:\n";
      results.details.forEach((detail) => {
        const status = detail.success ? (detail.needsFix ? "🔧 已修复" : "✅ 正确") : "❌ 错误";
        report += `  ${status} ${detail.modelName}: ${detail.message}\n`;
      });
    }

    if (results.error) {
      report += `\n❌ 批量处理错误: ${results.error}\n`;
    }

    return report;
  }
}

module.exports = TimestampManager;
