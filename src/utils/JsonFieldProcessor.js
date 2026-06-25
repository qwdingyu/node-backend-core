/**
 * JSON 字段处理器
 * 
 * 遵循"瑞士军刀"原则：小巧、实用、功能完整
 * 提供统一的 JSON 字段解析、序列化和验证功能
 * 
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

class JsonFieldProcessor {
  /**
   * 安全解析 JSON 字符串
   * @param {string} jsonString JSON 字符串
   * @param {*} defaultValue 默认值
   * @param {string} fieldName 字段名（用于日志）
   * @returns {*} 解析后的值或默认值
   */
  static safeParse(jsonString, defaultValue = {}, fieldName = 'JSON字段') {
    // 空值检查
    if (!jsonString || jsonString === '' || jsonString === null || jsonString === undefined) {
      return defaultValue;
    }

    // 如果已经是对象，直接返回
    if (typeof jsonString === 'object') {
      return jsonString;
    }

    // 尝试解析 JSON
    try {
      const parsed = JSON.parse(jsonString);
      return parsed !== null ? parsed : defaultValue;
    } catch (error) {
      console.warn(`${fieldName} JSON解析失败:`, error.message, '原始值:', jsonString);
      return defaultValue;
    }
  }

  /**
   * 安全序列化为 JSON 字符串
   * @param {*} value 要序列化的值
   * @param {string} defaultValue 默认值
   * @param {string} fieldName 字段名（用于日志）
   * @returns {string} JSON 字符串
   */
  static safeStringify(value, defaultValue = '{}', fieldName = 'JSON字段') {
    // 空值检查
    if (value === null || value === undefined) {
      return defaultValue;
    }

    // 如果已经是字符串，检查是否为有效 JSON
    if (typeof value === 'string') {
      try {
        JSON.parse(value); // 验证是否为有效 JSON
        return value;
      } catch (error) {
        console.warn(`${fieldName} 字符串不是有效JSON:`, error.message, '原始值:', value);
        return defaultValue;
      }
    }

    // 序列化对象
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn(`${fieldName} JSON序列化失败:`, error.message, '原始值:', value);
      return defaultValue;
    }
  }

  /**
   * 创建 JSON 字段的 getter 方法
   * @param {string} fieldName 字段名
   * @param {*} defaultValue 默认值
   * @returns {Function} getter 方法
   */
  static createGetter(fieldName, defaultValue = {}) {
    return function() {
      return JsonFieldProcessor.safeParse(this[fieldName], defaultValue, fieldName);
    };
  }

  /**
   * 创建 JSON 字段的 setter 方法
   * @param {string} fieldName 字段名
   * @param {string} defaultValue 默认值
   * @returns {Function} setter 方法
   */
  static createSetter(fieldName, defaultValue = '{}') {
    return function(value) {
      this[fieldName] = JsonFieldProcessor.safeStringify(value, defaultValue, fieldName);
    };
  }

  /**
   * 为模型添加 JSON 字段处理方法
   * @param {Object} modelClass 模型类
   * @param {Object} jsonFields JSON 字段配置
   * @example
   * JsonFieldProcessor.addJsonMethods(UserModel, {
   *   config_data: { defaultValue: {}, methodName: 'getConfig' },
   *   extra_info: { defaultValue: [], methodName: 'getExtraInfo' }
   * });
   */
  static addJsonMethods(modelClass, jsonFields) {
    Object.entries(jsonFields).forEach(([fieldName, config]) => {
      const { 
        defaultValue = {}, 
        methodName = `get${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())}`,
        setterName = `set${fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())}`
      } = config;

      // 添加 getter 方法
      modelClass.prototype[methodName] = function() {
        return JsonFieldProcessor.safeParse(this[fieldName], defaultValue, fieldName);
      };

      // 添加 setter 方法
      modelClass.prototype[setterName] = function(value) {
        this[fieldName] = JsonFieldProcessor.safeStringify(value, JsonFieldProcessor.safeStringify(defaultValue), fieldName);
      };
    });
  }

  /**
   * 验证 JSON 字段值
   * @param {*} value 要验证的值
   * @param {Object} schema 验证模式
   * @returns {Object} 验证结果
   */
  static validateJsonField(value, schema = {}) {
    const { 
      required = false,
      type = 'object', // 'object', 'array', 'string', 'number', 'boolean'
      properties = {},
      minLength = 0,
      maxLength = Infinity
    } = schema;

    // 必填检查
    if (required && (value === null || value === undefined || value === '')) {
      return {
        success: false,
        message: 'JSON字段不能为空'
      };
    }

    // 非必填且为空时通过验证
    if (!required && (value === null || value === undefined || value === '')) {
      return { success: true };
    }

    let parsedValue;
    try {
      parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      return {
        success: false,
        message: 'JSON格式不正确'
      };
    }

    // 类型检查
    const actualType = Array.isArray(parsedValue) ? 'array' : typeof parsedValue;
    if (type !== 'any' && actualType !== type) {
      return {
        success: false,
        message: `JSON字段类型错误，期望 ${type}，实际 ${actualType}`
      };
    }

    // 数组长度检查
    if (type === 'array') {
      if (parsedValue.length < minLength) {
        return {
          success: false,
          message: `数组长度不能少于 ${minLength}`
        };
      }
      if (parsedValue.length > maxLength) {
        return {
          success: false,
          message: `数组长度不能超过 ${maxLength}`
        };
      }
    }

    // 对象属性检查
    if (type === 'object' && Object.keys(properties).length > 0) {
      for (const [prop, propSchema] of Object.entries(properties)) {
        if (propSchema.required && !(prop in parsedValue)) {
          return {
            success: false,
            message: `缺少必需属性: ${prop}`
          };
        }
      }
    }

    return { success: true };
  }

  /**
   * 深度合并 JSON 对象
   * @param {Object} target 目标对象
   * @param {Object} source 源对象
   * @returns {Object} 合并后的对象
   */
  static deepMerge(target, source) {
    if (!target || typeof target !== 'object') target = {};
    if (!source || typeof source !== 'object') return target;

    const result = { ...target };

    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    });

    return result;
  }

  /**
   * 从 JSON 对象中提取指定路径的值
   * @param {Object} obj JSON 对象
   * @param {string} path 路径（如 'user.profile.name'）
   * @param {*} defaultValue 默认值
   * @returns {*} 提取的值
   */
  static getNestedValue(obj, path, defaultValue = null) {
    if (!obj || typeof obj !== 'object') return defaultValue;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * 设置 JSON 对象中指定路径的值
   * @param {Object} obj JSON 对象
   * @param {string} path 路径（如 'user.profile.name'）
   * @param {*} value 要设置的值
   * @returns {Object} 修改后的对象
   */
  static setNestedValue(obj, path, value) {
    if (!obj || typeof obj !== 'object') obj = {};

    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return obj;
  }

  /**
   * 清理 JSON 对象中的空值
   * @param {Object} obj JSON 对象
   * @param {boolean} removeEmptyStrings 是否移除空字符串
   * @param {boolean} removeEmptyArrays 是否移除空数组
   * @returns {Object} 清理后的对象
   */
  static cleanEmptyValues(obj, removeEmptyStrings = true, removeEmptyArrays = true) {
    if (!obj || typeof obj !== 'object') return obj;

    const cleaned = {};

    Object.keys(obj).forEach(key => {
      const value = obj[key];

      // 跳过 null 和 undefined
      if (value === null || value === undefined) return;

      // 跳过空字符串（如果配置了）
      if (removeEmptyStrings && value === '') return;

      // 跳过空数组（如果配置了）
      if (removeEmptyArrays && Array.isArray(value) && value.length === 0) return;

      // 递归清理对象
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedValue = this.cleanEmptyValues(value, removeEmptyStrings, removeEmptyArrays);
        if (Object.keys(cleanedValue).length > 0) {
          cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = value;
      }
    });

    return cleaned;
  }
}

module.exports = JsonFieldProcessor;
