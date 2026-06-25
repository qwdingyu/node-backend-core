/**
 * 金融计算工具库
 *
 * 基于 decimal.js 提供精确的金融数值运算
 * 处理 Sequelize DECIMAL 类型字段的字符串转数值问题
 *
 * @author Investment Platform Team
 * @version 2.0.0
 * @since 2024-12-21
 * @updated 2024-07-17 - 使用 decimal.js 替代自定义实现
 */

const Decimal = require('decimal.js');

// 配置 decimal.js 用于货币计算
Decimal.set({
  precision: 20,                    // 20位精度，足够处理大部分货币计算
  rounding: Decimal.ROUND_HALF_UP,  // 四舍五入
  toExpNeg: -7,                     // 小数点后7位开始使用科学计数法
  toExpPos: 21,                     // 整数部分21位开始使用科学计数法
  maxE: 9e15,                       // 最大指数
  minE: -9e15,                      // 最小指数
  modulo: Decimal.ROUND_DOWN,       // 取模运算向下舍入
  crypto: false                     // 不使用加密安全的随机数（性能更好）
});

/**
 * 将 DECIMAL 字符串转换为数值
 * @param {string|number} value - 要转换的值
 * @param {number} defaultValue - 默认值
 * @returns {number} 转换后的数值
 */
function toNumber(value, defaultValue = 0.0) {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  if (typeof value === "number") {
    return isFinite(value) ? value : defaultValue;
  }

  if (typeof value === "string") {
    try {
      const decimal = new Decimal(value);
      return decimal.toNumber();
    } catch (error) {
      return defaultValue;
    }
  }

  return defaultValue;
}

/**
 * 将数值转换为 DECIMAL 字符串（用于数据库存储）
 * @param {number|string} value - 要转换的值
 * @param {number} precision - 小数位数，默认2位
 * @returns {string} 格式化后的字符串
 */
function toDecimalString(value, precision = 2) {
  try {
    const decimal = new Decimal(value);
    return decimal.toDecimalPlaces(precision).toString();
  } catch (error) {
    return new Decimal(0).toDecimalPlaces(precision).toString();
  }
}

/**
 * 安全的数值运算（使用 decimal.js 确保精度）
 * @param {number|string} a - 第一个数
 * @param {number|string} b - 第二个数
 * @param {string} operation - 运算类型: 'add', 'subtract', 'multiply', 'divide'
 * @param {number} precision - 小数位精度，默认2位
 * @returns {number} 运算结果
 */
function safeCalculate(a, b, operation, precision = 2) {
  try {
    const decimalA = new Decimal(a);
    const decimalB = new Decimal(b);

    let result;
    switch (operation) {
      case "add":
        result = decimalA.plus(decimalB);
        break;
      case "subtract":
        result = decimalA.minus(decimalB);
        break;
      case "multiply":
        result = decimalA.times(decimalB);
        break;
      case "divide":
        if (decimalB.isZero()) {
          throw new Error("除数不能为零");
        }
        result = decimalA.dividedBy(decimalB);
        break;
      default:
        throw new Error(`不支持的运算类型: ${operation}`);
    }

    return result.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    throw new Error(`计算错误: ${error.message}`);
  }
}

/**
 * 四舍五入到指定小数位数
 * @param {number|string} value - 要四舍五入的值
 * @param {number} decimals - 小数位数，默认2位
 * @returns {number} 四舍五入后的数值
 */
function round(value, decimals = 2) {
  try {
    const decimal = new Decimal(value);
    return decimal.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    return 0;
  }
}

/**
 * 格式化金额显示
 * @param {number|string} amount - 金额
 * @param {string} currency - 货币符号，默认为空
 * @param {number} precision - 小数位数，默认2位
 * @returns {string} 格式化后的金额字符串
 */
function formatAmount(amount, currency = "", precision = 2) {
  const num = toNumber(amount);
  const formatted = num.toLocaleString("zh-CN", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  return currency ? `${currency}${formatted}` : formatted;
}

/**
 * 比较两个金额是否相等（考虑浮点数精度）
 * @param {number|string} a - 第一个金额
 * @param {number|string} b - 第二个金额
 * @param {number} tolerance - 容差，默认0.01
 * @returns {boolean} 是否相等
 */
function isEqual(a, b, tolerance = 0.01) {
  const numA = toNumber(a);
  const numB = toNumber(b);
  return Math.abs(numA - numB) < tolerance;
}

/**
 * 检查金额是否有效
 * @param {number|string} amount - 要检查的金额
 * @param {number} min - 最小值，默认0
 * @param {number} max - 最大值，默认无限大
 * @returns {boolean} 是否有效
 */
function isValidAmount(amount, min = 0, max = Infinity) {
  const num = toNumber(amount);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * 为 Sequelize 模型字段创建 getter
 * @param {string} fieldName - 字段名
 * @returns {Function} getter 函数
 */
function createDecimalGetter(fieldName) {
  return function () {
    const value = this.getDataValue(fieldName);
    return toNumber(value);
  };
}

/**
 * 为 Sequelize 模型字段创建 setter
 * @param {string} fieldName - 字段名
 * @returns {Function} setter 函数
 */
function createDecimalSetter(fieldName) {
  return function (value) {
    const numValue = toNumber(value);
    this.setDataValue(fieldName, numValue);
  };
}

module.exports = {
  // 核心工具函数
  toNumber,
  toDecimalString,
  safeCalculate,
  formatAmount,
  isEqual,
  isValidAmount,
  createDecimalGetter,
  createDecimalSetter,
  round,

  // 便捷的运算方法（直接使用 decimal.js）
  add: (a, b, precision = 2) => {
    try {
      return new Decimal(a).plus(new Decimal(b)).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
    } catch (error) {
      throw new Error(`加法运算失败: ${a} + ${b} (${error.message})`);
    }
  },

  subtract: (a, b, precision = 2) => {
    try {
      return new Decimal(a).minus(new Decimal(b)).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
    } catch (error) {
      throw new Error(`减法运算失败: ${a} - ${b} (${error.message})`);
    }
  },

  multiply: (a, b, precision = 2) => {
    try {
      return new Decimal(a).times(new Decimal(b)).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
    } catch (error) {
      throw new Error(`乘法运算失败: ${a} * ${b} (${error.message})`);
    }
  },

  divide: (a, b, precision = 2) => {
    try {
      const divisor = new Decimal(b);
      if (divisor.isZero()) {
        throw new Error('除数不能为零');
      }
      return new Decimal(a).dividedBy(divisor).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
    } catch (error) {
      throw new Error(`除法运算失败: ${a} / ${b} (${error.message})`);
    }
  },

  // 直接导出 Decimal 类供高级用户使用
  Decimal,

  // 常用的 decimal.js 方法别名
  isZero: (value) => {
    try {
      return new Decimal(value).isZero();
    } catch (error) {
      return false;
    }
  },

  isPositive: (value) => {
    try {
      return new Decimal(value).isPositive();
    } catch (error) {
      return false;
    }
  },

  isNegative: (value) => {
    try {
      return new Decimal(value).isNegative();
    } catch (error) {
      return false;
    }
  },

  equals: (a, b, precision = 2) => {
    try {
      const decimalA = new Decimal(a).toDecimalPlaces(precision);
      const decimalB = new Decimal(b).toDecimalPlaces(precision);
      return decimalA.equals(decimalB);
    } catch (error) {
      return false;
    }
  }
};
