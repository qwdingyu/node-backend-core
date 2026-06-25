/**
 * 通用数据验证引擎
 *
 * 遵循"瑞士军刀"原则：小巧、实用、功能完整
 * 提供常用的数据验证方法，支持多项目复用
 *
 * @author Investment Platform Team
 * @version 2.0.0
 * @since 2024-12-21
 * @updated 2024-07-16 - 重构为通用验证引擎
 */

// 通用验证正则表达式
const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MOBILE: /^1[3-9]\d{9}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD: /^.{6,20}$/,
  BANK_CARD: /^\d{16,19}$/,
  ID_CARD: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
  CHINESE_NAME: /^[\u4e00-\u9fa5]{2,10}$/,
  PHONE: /^(\d{3,4}-?)?\d{7,8}$/,
  URL: /^https?:\/\/.+/,
  IP: /^(\d{1,3}\.){3}\d{1,3}$/,
};

class ValidationEngine {
  /**
   * 验证必填字段
   * @param {Object} data 数据对象
   * @param {Array} requiredFields 必填字段数组
   * @param {Object} fieldNames 字段显示名称映射
   * @returns {Object} 验证结果
   */
  static validateRequired(data, requiredFields, fieldNames = {}) {
    for (const field of requiredFields) {
      if (!data[field] || data[field] === "") {
        const displayName = fieldNames[field] || field;
        return {
          success: false,
          message: `${displayName}不能为空`,
          field: field,
        };
      }
    }
    return { success: true };
  }

  /**
   * 验证数值
   * @param {*} value 数值
   * @param {Object} options 验证选项
   * @returns {Object} 验证结果
   */
  static validateNumber(value, options = {}) {
    const { min = -Infinity, max = Infinity, fieldName = "数值", required = true, integer = false, positive = false } = options;

    // 必填检查
    if (required && (value === undefined || value === null || value === "")) {
      return {
        success: false,
        message: `${fieldName}不能为空`,
      };
    }

    // 非必填且为空时通过验证
    if (!required && (value === undefined || value === null || value === "")) {
      return { success: true };
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return {
        success: false,
        message: `${fieldName}必须是有效数字`,
      };
    }

    // 整数检查
    if (integer && !Number.isInteger(numValue)) {
      return {
        success: false,
        message: `${fieldName}必须是整数`,
      };
    }

    // 正数检查
    if (positive && numValue <= 0) {
      return {
        success: false,
        message: `${fieldName}必须是正数`,
      };
    }

    // 范围检查
    if (numValue < min) {
      return {
        success: false,
        message: `${fieldName}不能小于${min}`,
      };
    }

    if (numValue > max) {
      return {
        success: false,
        message: `${fieldName}不能大于${max}`,
      };
    }

    return { success: true };
  }

  /**
   * 验证金额
   * @param {*} amount 金额
   * @param {Object} options 验证选项
   * @returns {Object} 验证结果
   */
  static validateAmount(amount, options = {}) {
    return this.validateNumber(amount, {
      min: 0,
      fieldName: "金额",
      positive: true,
      ...options,
    });
  }

  /**
   * 验证字符串长度
   * @param {string} value 字符串值
   * @param {Object} options 验证选项
   * @returns {Object} 验证结果
   */
  static validateLength(value, options = {}) {
    const { min = 0, max = Infinity, fieldName = "字段", required = true } = options;

    // 必填检查
    if (required && (!value || value === "")) {
      return {
        success: false,
        message: `${fieldName}不能为空`,
      };
    }

    // 非必填且为空时通过验证
    if (!required && (!value || value === "")) {
      return { success: true };
    }

    const length = String(value).length;

    if (length < min) {
      return {
        success: false,
        message: `${fieldName}长度不能少于${min}个字符`,
      };
    }

    if (length > max) {
      return {
        success: false,
        message: `${fieldName}长度不能超过${max}个字符`,
      };
    }

    return { success: true };
  }

  /**
   * 验证正则表达式
   * @param {string} value 待验证值
   * @param {RegExp|string} pattern 正则表达式或预定义模式名
   * @param {string} fieldName 字段名称
   * @param {boolean} required 是否必填
   * @returns {Object} 验证结果
   */
  static validatePattern(value, pattern, fieldName = "字段", required = true) {
    // 必填检查
    if (required && (!value || value === "")) {
      return {
        success: false,
        message: `${fieldName}不能为空`,
      };
    }

    // 非必填且为空时通过验证
    if (!required && (!value || value === "")) {
      return { success: true };
    }

    // 获取正则表达式
    let regex;
    if (typeof pattern === "string") {
      regex = VALIDATION_PATTERNS[pattern.toUpperCase()];
      if (!regex) {
        throw new Error(`未知的验证模式: ${pattern}`);
      }
    } else {
      regex = pattern;
    }

    if (!regex.test(value)) {
      return {
        success: false,
        message: `${fieldName}格式不正确`,
      };
    }

    return { success: true };
  }

  /**
   * 验证邮箱
   * @param {string} email 邮箱地址
   * @param {boolean} required 是否必填
   * @returns {Object} 验证结果
   */
  static validateEmail(email, required = true) {
    return this.validatePattern(email, "EMAIL", "邮箱", required);
  }

  /**
   * 验证手机号
   * @param {string} mobile 手机号
   * @param {boolean} required 是否必填
   * @returns {Object} 验证结果
   */
  static validateMobile(mobile, required = true) {
    return this.validatePattern(mobile, "MOBILE", "手机号", required);
  }

  /**
   * 验证用户名
   * @param {string} username 用户名
   * @param {boolean} required 是否必填
   * @returns {Object} 验证结果
   */
  static validateUsername(username, required = true) {
    return this.validatePattern(username, "USERNAME", "用户名", required);
  }

  /**
   * 验证密码
   * @param {string} password 密码
   * @param {Object} options 验证选项
   * @returns {Object} 验证结果
   */
  static validatePassword(password, options = {}) {
    const { min = 6, max = 20, requireSpecial = false, requireNumber = false, requireUpper = false } = options;

    // 长度验证
    const lengthResult = this.validateLength(password, {
      min,
      max,
      fieldName: "密码",
    });

    if (!lengthResult.success) {
      return lengthResult;
    }

    // 特殊字符验证
    if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return {
        success: false,
        message: "密码必须包含特殊字符",
      };
    }

    // 数字验证
    if (requireNumber && !/\d/.test(password)) {
      return {
        success: false,
        message: "密码必须包含数字",
      };
    }

    // 大写字母验证
    if (requireUpper && !/[A-Z]/.test(password)) {
      return {
        success: false,
        message: "密码必须包含大写字母",
      };
    }

    return { success: true };
  }

  /**
   * 验证分页参数
   * @param {Object} params 分页参数
   * @returns {Object} 验证结果
   */
  static validatePagination(params = {}) {
    const { page = 1, limit = 20 } = params;

    const pageResult = this.validateNumber(page, {
      min: 1,
      integer: true,
      fieldName: "页码",
      required: false,
    });

    if (!pageResult.success) {
      return pageResult;
    }

    const limitResult = this.validateNumber(limit, {
      min: 1,
      max: 100,
      integer: true,
      fieldName: "每页数量",
      required: false,
    });

    if (!limitResult.success) {
      return limitResult;
    }

    return {
      success: true,
      data: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    };
  }

  /**
   * 批量验证
   * @param {Object} data 数据对象
   * @param {Object} rules 验证规则
   * @returns {Object} 验证结果
   */
  static batchValidate(data, rules) {
    const errors = {};
    let hasError = false;

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      let result;

      if (typeof rule === "function") {
        result = rule(value);
      } else if (typeof rule === "object") {
        const { type, ...options } = rule;
        switch (type) {
          case "required":
            result = this.validateRequired(data, [field], { [field]: options.fieldName || field });
            break;
          case "number":
            result = this.validateNumber(value, options);
            break;
          case "length":
            result = this.validateLength(value, options);
            break;
          case "pattern":
            result = this.validatePattern(value, options.pattern, options.fieldName || field, options.required);
            break;
          case "email":
            result = this.validateEmail(value, options.required);
            break;
          case "mobile":
            result = this.validateMobile(value, options.required);
            break;
          case "password":
            result = this.validatePassword(value, options);
            break;
          default:
            throw new Error(`未知的验证类型: ${type}`);
        }
      }

      if (!result.success) {
        errors[field] = result.message;
        hasError = true;
      }
    }

    return {
      success: !hasError,
      errors: hasError ? errors : null,
    };
  }
}

module.exports = ValidationEngine;
