/**
 * 对象操作工具类
 * 提供深拷贝、深度合并等通用功能
 * 
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-06-24
 */

class ObjectUtils {
  /**
   * 深拷贝对象
   * @param {*} obj 要拷贝的对象
   * @returns {*} 拷贝后的对象
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => ObjectUtils.deepClone(item));
    }

    if (typeof obj === 'function') {
      return obj; // 函数直接返回引用
    }

    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = ObjectUtils.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * 深度合并两个对象
   * @param {Object} target 目标对象（默认配置）
   * @param {Object} source 源对象（项目配置）
   * @returns {Object} 合并后的对象
   */
  static deepMerge(target, source) {
    // 创建目标对象的深拷贝
    const result = ObjectUtils.deepClone(target);
    
    if (!source || typeof source !== 'object') {
      return result;
    }

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (ObjectUtils.isObject(source[key]) && ObjectUtils.isObject(result[key])) {
          // 递归合并对象
          result[key] = ObjectUtils.deepMerge(result[key], source[key]);
        } else {
          // 直接覆盖（项目配置优先）
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 检查是否为对象
   * @param {*} item 要检查的项
   * @returns {boolean}
   */
  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 获取对象深层属性值
   * @param {Object} obj 源对象
   * @param {string} path 属性路径，如 'data.total'
   * @returns {any} 属性值
   */
  static getDeepProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 设置对象深层属性值
   * @param {Object} obj 目标对象
   * @param {string} path 属性路径，如 'data.records'
   * @param {any} value 要设置的值
   */
  static setDeepProperty(obj, path, value) {
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
  }

  /**
   * 检查对象是否为空
   * @param {Object} obj 要检查的对象
   * @returns {boolean}
   */
  static isEmpty(obj) {
    if (!obj || typeof obj !== 'object') {
      return true;
    }
    return Object.keys(obj).length === 0;
  }

  /**
   * 安全地获取对象属性，支持默认值
   * @param {Object} obj 源对象
   * @param {string} path 属性路径
   * @param {*} defaultValue 默认值
   * @returns {*} 属性值或默认值
   */
  static safeGet(obj, path, defaultValue = undefined) {
    const value = ObjectUtils.getDeepProperty(obj, path);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * 过滤对象属性
   * @param {Object} obj 源对象
   * @param {Array<string>} allowedKeys 允许的属性键数组
   * @returns {Object} 过滤后的对象
   */
  static pick(obj, allowedKeys) {
    const result = {};
    allowedKeys.forEach(key => {
      if (obj.hasOwnProperty(key)) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  /**
   * 排除对象属性
   * @param {Object} obj 源对象
   * @param {Array<string>} excludeKeys 要排除的属性键数组
   * @returns {Object} 排除后的对象
   */
  static omit(obj, excludeKeys) {
    const result = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && !excludeKeys.includes(key)) {
        result[key] = obj[key];
      }
    }
    return result;
  }
}

module.exports = ObjectUtils;
