/**
 * 状态管理Mixin
 * 
 * 遵循"瑞士军刀"原则：小巧、实用、功能完整
 * 为模型提供统一的状态检查和管理方法
 * 
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

class StatusMixin {
  /**
   * 创建状态检查器方法
   * @param {Object} statusMap 状态映射 { methodName: statusValue }
   * @returns {Object} 状态检查方法集合
   */
  static createStatusChecker(statusMap) {
    const methods = {};
    
    Object.entries(statusMap).forEach(([methodName, statusValue]) => {
      methods[methodName] = function() {
        return this.status === statusValue;
      };
    });

    return methods;
  }

  /**
   * 创建多状态检查器方法
   * @param {Object} statusMap 状态映射 { methodName: [statusValue1, statusValue2] }
   * @returns {Object} 多状态检查方法集合
   */
  static createMultiStatusChecker(statusMap) {
    const methods = {};
    
    Object.entries(statusMap).forEach(([methodName, statusValues]) => {
      methods[methodName] = function() {
        return Array.isArray(statusValues) 
          ? statusValues.includes(this.status)
          : this.status === statusValues;
      };
    });

    return methods;
  }

  /**
   * 创建状态转换方法
   * @param {Object} transitionMap 转换映射 { methodName: { from: [status], to: status } }
   * @returns {Object} 状态转换方法集合
   */
  static createStatusTransitions(transitionMap) {
    const methods = {};
    
    Object.entries(transitionMap).forEach(([methodName, config]) => {
      const { from, to, validate } = config;
      
      methods[methodName] = async function() {
        // 检查当前状态是否允许转换
        if (from && !from.includes(this.status)) {
          throw new Error(`无法从状态 ${this.status} 转换到 ${to}`);
        }

        // 自定义验证
        if (validate && typeof validate === 'function') {
          const isValid = await validate.call(this);
          if (!isValid) {
            throw new Error(`状态转换验证失败: ${methodName}`);
          }
        }

        // 执行状态转换
        const oldStatus = this.status;
        this.status = to;
        
        // 保存到数据库
        await this.save();
        
        return {
          success: true,
          oldStatus,
          newStatus: to,
          method: methodName
        };
      };
    });

    return methods;
  }

  /**
   * 创建状态历史记录方法
   * @param {Object} options 配置选项
   * @returns {Object} 状态历史方法集合
   */
  static createStatusHistory(options = {}) {
    const { 
      historyField = 'status_history',
      trackChanges = true,
      maxHistoryLength = 50
    } = options;

    return {
      /**
       * 获取状态历史
       */
      getStatusHistory() {
        try {
          const history = this[historyField];
          return typeof history === 'string' ? JSON.parse(history) : (history || []);
        } catch (error) {
          return [];
        }
      },

      /**
       * 添加状态历史记录
       */
      addStatusHistory(fromStatus, toStatus, reason = '', operator = null) {
        if (!trackChanges) return;

        const history = this.getStatusHistory();
        const record = {
          from: fromStatus,
          to: toStatus,
          reason,
          operator,
          timestamp: new Date().toISOString()
        };

        history.push(record);

        // 限制历史记录长度
        if (history.length > maxHistoryLength) {
          history.splice(0, history.length - maxHistoryLength);
        }

        this[historyField] = JSON.stringify(history);
      },

      /**
       * 获取最后一次状态变更
       */
      getLastStatusChange() {
        const history = this.getStatusHistory();
        return history.length > 0 ? history[history.length - 1] : null;
      }
    };
  }

  /**
   * 创建状态统计方法
   * @param {Object} statusMap 状态映射
   * @returns {Object} 状态统计方法集合
   */
  static createStatusStatistics(statusMap) {
    return {
      /**
       * 获取状态统计（静态方法）
       */
      async getStatusStats() {
        const stats = {};
        
        for (const [statusName, statusValue] of Object.entries(statusMap)) {
          stats[statusName] = await this.count({ where: { status: statusValue } });
        }

        stats.total = await this.count();
        return stats;
      },

      /**
       * 获取状态分布（静态方法）
       */
      async getStatusDistribution() {
        const distribution = await this.findAll({
          attributes: [
            'status',
            [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count']
          ],
          group: ['status'],
          raw: true
        });

        const result = {};
        distribution.forEach(item => {
          const statusName = Object.keys(statusMap).find(key => statusMap[key] === item.status) || `status_${item.status}`;
          result[statusName] = parseInt(item.count);
        });

        return result;
      }
    };
  }

  /**
   * 为模型添加完整的状态管理功能
   * @param {Object} modelClass 模型类
   * @param {Object} config 配置对象
   */
  static addStatusMethods(modelClass, config = {}) {
    const {
      statusMap = {},
      multiStatusMap = {},
      transitions = {},
      historyOptions = {},
      enableStatistics = true
    } = config;

    // 添加基础状态检查方法
    if (Object.keys(statusMap).length > 0) {
      Object.assign(modelClass.prototype, this.createStatusChecker(statusMap));
    }

    // 添加多状态检查方法
    if (Object.keys(multiStatusMap).length > 0) {
      Object.assign(modelClass.prototype, this.createMultiStatusChecker(multiStatusMap));
    }

    // 添加状态转换方法
    if (Object.keys(transitions).length > 0) {
      Object.assign(modelClass.prototype, this.createStatusTransitions(transitions));
    }

    // 添加状态历史方法
    if (historyOptions.enable) {
      Object.assign(modelClass.prototype, this.createStatusHistory(historyOptions));
    }

    // 添加状态统计方法
    if (enableStatistics && Object.keys(statusMap).length > 0) {
      Object.assign(modelClass, this.createStatusStatistics(statusMap));
    }

    // 添加状态变更钩子
    if (historyOptions.enable && historyOptions.trackChanges) {
      modelClass.addHook('beforeUpdate', (instance, options) => {
        if (instance.changed('status')) {
          const oldStatus = instance._previousDataValues.status;
          const newStatus = instance.status;
          instance.addStatusHistory(
            oldStatus, 
            newStatus, 
            options.statusChangeReason || '系统更新',
            options.operator || null
          );
        }
      });
    }
  }

  /**
   * 获取状态标签映射
   * @param {Object} statusMap 状态映射
   * @param {Object} labelMap 标签映射
   * @returns {Function} 获取状态标签的方法
   */
  static createStatusLabels(statusMap, labelMap = {}) {
    return function getStatusLabel() {
      const statusName = Object.keys(statusMap).find(key => statusMap[key] === this.status);
      return labelMap[statusName] || statusName || `状态_${this.status}`;
    };
  }

  /**
   * 创建状态验证器
   * @param {Object} validStatusValues 有效状态值数组
   * @returns {Function} 状态验证方法
   */
  static createStatusValidator(validStatusValues = []) {
    return function validateStatus() {
      if (!validStatusValues.includes(this.status)) {
        throw new Error(`无效的状态值: ${this.status}，有效值: ${validStatusValues.join(', ')}`);
      }
      return true;
    };
  }

  /**
   * 批量状态操作
   * @param {Object} modelClass 模型类
   * @param {Array} ids ID数组
   * @param {*} newStatus 新状态
   * @param {Object} options 选项
   * @returns {Promise<Object>} 操作结果
   */
  static async batchUpdateStatus(modelClass, ids, newStatus, options = {}) {
    const { 
      where = {},
      reason = '批量更新',
      operator = null,
      validate = true
    } = options;

    const updateWhere = {
      id: { [modelClass.sequelize.Sequelize.Op.in]: ids },
      ...where
    };

    // 如果需要验证，先查询现有记录
    if (validate) {
      const existingRecords = await modelClass.findAll({ where: updateWhere });
      if (existingRecords.length !== ids.length) {
        throw new Error('部分记录不存在或不满足条件');
      }
    }

    const [affectedCount] = await modelClass.update(
      { status: newStatus },
      { 
        where: updateWhere,
        statusChangeReason: reason,
        operator
      }
    );

    return {
      success: true,
      affected: affectedCount,
      newStatus,
      reason,
      operator
    };
  }
}

module.exports = StatusMixin;
