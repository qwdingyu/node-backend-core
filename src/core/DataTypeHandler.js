/**
 * 数据类型处理器
 * 
 * 为 Sequelize 模型提供统一的数据类型处理和 getter/setter 方法
 * 解决 IP 项目中大量重复的数据转换代码问题
 * 
 * @author Backend Core Team
 * @version 1.0.0
 * @since 2024-07-17
 */

const { FinancialUtils } = require('../utils');

class DataTypeHandler {
  /**
   * 创建 DECIMAL 字段的 getter 方法
   * 统一处理货币和数值字段的精度问题
   * 
   * @param {string} fieldName - 字段名
   * @param {number} defaultValue - 默认值
   * @param {number} precision - 小数位精度
   * @returns {Function} getter 函数
   */
  static createDecimalGetter(fieldName, defaultValue = 0.0, precision = 2) {
    return function() {
      const value = this.getDataValue(fieldName);
      
      if (value === null || value === undefined || value === '') {
        return defaultValue;
      }
      
      try {
        // 使用 FinancialUtils 确保精度
        return FinancialUtils.round(parseFloat(value), precision);
      } catch (error) {
        console.warn(`DECIMAL字段 ${fieldName} 转换失败:`, error);
        return defaultValue;
      }
    };
  }

  /**
   * 创建 INTEGER 字段的 getter 方法
   * 
   * @param {string} fieldName - 字段名
   * @param {number} defaultValue - 默认值
   * @returns {Function} getter 函数
   */
  static createIntegerGetter(fieldName, defaultValue = 0) {
    return function() {
      const value = this.getDataValue(fieldName);
      
      if (value === null || value === undefined || value === '') {
        return defaultValue;
      }
      
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    };
  }

  /**
   * 创建 JSON 字段的 getter 方法
   * 统一处理 JSON 字段的解析和错误处理
   * 
   * @param {string} fieldName - 字段名
   * @param {*} defaultValue - 默认值
   * @returns {Function} getter 函数
   */
  static createJsonGetter(fieldName, defaultValue = {}) {
    return function() {
      const value = this.getDataValue(fieldName);
      
      if (!value) {
        return defaultValue;
      }
      
      try {
        // 如果已经是对象，直接返回
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        
        // 尝试解析字符串
        if (typeof value === 'string') {
          return JSON.parse(value);
        }
        
        return defaultValue;
      } catch (error) {
        console.warn(`JSON字段 ${fieldName} 解析失败:`, error);
        return defaultValue;
      }
    };
  }

  /**
   * 创建 BOOLEAN 字段的 getter 方法
   * 统一处理布尔值的转换
   * 
   * @param {string} fieldName - 字段名
   * @param {boolean} defaultValue - 默认值
   * @returns {Function} getter 函数
   */
  static createBooleanGetter(fieldName, defaultValue = false) {
    return function() {
      const value = this.getDataValue(fieldName);
      
      if (value === null || value === undefined) {
        return defaultValue;
      }
      
      // 处理各种布尔值表示
      if (typeof value === 'boolean') {
        return value;
      }
      
      if (typeof value === 'number') {
        return value === 1;
      }
      
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
      }
      
      return defaultValue;
    };
  }

  /**
   * 创建日期字段的 getter 方法
   * 统一处理日期格式化
   * 
   * @param {string} fieldName - 字段名
   * @param {string} format - 格式化类型 ('iso', 'timestamp', 'friendly')
   * @returns {Function} getter 函数
   */
  static createDateGetter(fieldName, format = 'iso') {
    return function() {
      const value = this.getDataValue(fieldName);
      
      if (!value) {
        return null;
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return null;
      }
      
      switch (format) {
        case 'timestamp':
          return date.getTime();
        case 'friendly':
          return this._formatDateFriendly(date);
        case 'iso':
        default:
          return date.toISOString();
      }
    };
  }

  /**
   * 创建枚举字段的 getter 方法
   * 提供枚举值的验证和转换
   * 
   * @param {string} fieldName - 字段名
   * @param {Array} allowedValues - 允许的值列表
   * @param {*} defaultValue - 默认值
   * @returns {Function} getter 函数
   */
  static createEnumGetter(fieldName, allowedValues = [], defaultValue = null) {
    return function() {
      const value = this.getDataValue(fieldName);
      
      if (value === null || value === undefined) {
        return defaultValue;
      }
      
      // 验证值是否在允许的范围内
      if (allowedValues.length > 0 && !allowedValues.includes(value)) {
        console.warn(`枚举字段 ${fieldName} 值 ${value} 不在允许范围内:`, allowedValues);
        return defaultValue;
      }
      
      return value;
    };
  }

  /**
   * 创建格式化的货币显示 getter
   * 
   * @param {string} fieldName - 字段名
   * @param {string} currency - 货币符号
   * @param {number} precision - 小数位精度
   * @returns {Function} getter 函数
   */
  static createCurrencyGetter(fieldName, currency = '¥', precision = 2) {
    return function() {
      const value = this.getDataValue(fieldName);
      
      if (value === null || value === undefined) {
        return `${currency}0.00`;
      }
      
      try {
        const numValue = parseFloat(value);
        return FinancialUtils.formatCurrency(numValue, precision, currency);
      } catch (error) {
        console.warn(`货币字段 ${fieldName} 格式化失败:`, error);
        return `${currency}0.00`;
      }
    };
  }

  /**
   * 创建百分比字段的 getter 方法
   * 
   * @param {string} fieldName - 字段名
   * @param {number} precision - 小数位精度
   * @param {boolean} showSymbol - 是否显示百分号
   * @returns {Function} getter 函数
   */
  static createPercentageGetter(fieldName, precision = 2, showSymbol = true) {
    return function() {
      const value = this.getDataValue(fieldName);
      
      if (value === null || value === undefined) {
        return showSymbol ? '0.00%' : 0;
      }
      
      try {
        const numValue = parseFloat(value);
        const rounded = FinancialUtils.round(numValue, precision);
        return showSymbol ? `${rounded}%` : rounded;
      } catch (error) {
        console.warn(`百分比字段 ${fieldName} 转换失败:`, error);
        return showSymbol ? '0.00%' : 0;
      }
    };
  }

  /**
   * 批量创建字段定义
   * 简化模型定义过程
   * 
   * @param {Object} fieldDefinitions - 字段定义对象
   * @returns {Object} Sequelize 字段定义
   */
  static createFields(fieldDefinitions) {
    const fields = {};
    
    Object.entries(fieldDefinitions).forEach(([fieldName, definition]) => {
      const { type, handler, ...options } = definition;
      
      if (handler && typeof this[handler] === 'function') {
        fields[fieldName] = {
          ...options,
          get: this[handler](fieldName, options.defaultValue, options.precision)
        };
      } else {
        fields[fieldName] = definition;
      }
    });
    
    return fields;
  }

  /**
   * 验证模型字段类型配置
   * 检查 DECIMAL 字段是否有对应的 getter
   * 
   * @param {Object} modelClass - 模型类
   * @returns {Array} 验证错误列表
   */
  static validateModelFields(modelClass) {
    const errors = [];
    const attributes = modelClass.rawAttributes || {};
    
    Object.entries(attributes).forEach(([fieldName, field]) => {
      const fieldType = field.type.toString();
      
      // 检查 DECIMAL 字段
      if (fieldType.includes('DECIMAL')) {
        if (!field.get) {
          errors.push({
            field: fieldName,
            type: 'DECIMAL',
            issue: '缺少 getter 方法，可能存在精度问题',
            suggestion: `使用 DataTypeHandler.createDecimalGetter('${fieldName}')`
          });
        }
      }
      
      // 检查 JSON 字段
      if (fieldType.includes('JSON')) {
        if (!field.get) {
          errors.push({
            field: fieldName,
            type: 'JSON',
            issue: '缺少 getter 方法，可能存在解析问题',
            suggestion: `使用 DataTypeHandler.createJsonGetter('${fieldName}')`
          });
        }
      }
    });
    
    return errors;
  }

  /**
   * 自动修复模型字段配置
   * 为缺少 getter 的字段自动添加处理方法
   * 
   * @param {Object} modelClass - 模型类
   * @returns {Object} 修复结果
   */
  static autoFixModelFields(modelClass) {
    const errors = this.validateModelFields(modelClass);
    const fixes = [];
    
    errors.forEach(error => {
      try {
        const { field, type } = error;
        const attribute = modelClass.rawAttributes[field];
        
        if (type === 'DECIMAL') {
          attribute.get = this.createDecimalGetter(field);
          fixes.push(`${field}: 添加了 DECIMAL getter`);
        } else if (type === 'JSON') {
          attribute.get = this.createJsonGetter(field);
          fixes.push(`${field}: 添加了 JSON getter`);
        }
      } catch (fixError) {
        console.warn(`自动修复字段 ${error.field} 失败:`, fixError);
      }
    });
    
    return {
      totalErrors: errors.length,
      fixedCount: fixes.length,
      fixes,
      remainingErrors: errors.length - fixes.length
    };
  }
}

module.exports = DataTypeHandler;
