const i18n = require('../config/i18n');

class LanguageUtil {
  /**
   * 获取翻译文本
   * @param {string} key - 翻译键名
   * @param {Object} options - 替换选项
   * @returns {string} - 翻译后的文本
   */
  static translate(key, options = {}) {
    return i18n.__(key, options);
  }

  /**
   * 获取当前语言
   * @returns {string} - 当前语言代码
   */
  static getCurrentLocale() {
    return i18n.getLocale();
  }

  /**
   * 设置当前语言
   * @param {string} locale - 语言代码
   */
  static setLocale(locale) {
    i18n.setLocale(locale);
  }
}

module.exports = LanguageUtil;