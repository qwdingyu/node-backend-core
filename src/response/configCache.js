/**
 * 响应配置缓存管理器
 * 使用模块级缓存避免重复加载配置，简单高效
 *
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-06-24
 */

const ObjectUtils = require("../utils/ObjectUtils");
const path = require("path");
const fs = require("fs");

// 模块级缓存
const configCache = new Map();
const loadingPromises = new Map(); // 防止并发加载
let defaultConfig = null;

/**
 * 配置缓存管理器
 */
const ConfigCache = {
  /**
   * 获取配置（带缓存和并发保护）
   * @param {string|null} projectConfigPath 项目配置路径
   * @param {Object} options 选项
   * @returns {Object} 合并后的配置
   */
  async getConfig(projectConfigPath = null, options = {}) {
    const { reload = false } = options;
    const cacheKey = this._getCacheKey(projectConfigPath);

    // 检查缓存
    if (!reload && configCache.has(cacheKey)) {
      console.log(`📦 使用缓存配置: ${cacheKey}`);
      return configCache.get(cacheKey);
    }

    // 防止并发加载同一配置
    if (loadingPromises.has(cacheKey)) {
      console.log(`⏳ 等待配置加载完成: ${cacheKey}`);
      return await loadingPromises.get(cacheKey);
    }

    // 创建加载 Promise
    const loadPromise = this._loadConfigAsync(projectConfigPath, cacheKey);
    loadingPromises.set(cacheKey, loadPromise);

    try {
      const config = await loadPromise;
      configCache.set(cacheKey, config);
      console.log(`✅ 配置加载并缓存完成: ${cacheKey}`);
      return config;
    } finally {
      loadingPromises.delete(cacheKey);
    }
  },

  /**
   * 同步获取配置（保持向后兼容）
   * @param {string|null} projectConfigPath 项目配置路径
   * @returns {Object} 合并后的配置
   */
  getConfigSync(projectConfigPath = null) {
    const cacheKey = this._getCacheKey(projectConfigPath);

    // 检查缓存
    if (configCache.has(cacheKey)) {
      return configCache.get(cacheKey);
    }

    // 同步加载并缓存配置
    console.log(`🔧 同步加载新配置: ${cacheKey}`);
    const config = this._loadAndMergeConfig(projectConfigPath);
    configCache.set(cacheKey, config);

    console.log(`✅ 配置已缓存: ${cacheKey}`);
    return config;
  },

  /**
   * 异步加载配置
   * @param {string|null} projectConfigPath 项目配置路径
   * @param {string} cacheKey 缓存键
   * @returns {Promise<Object>} 配置对象
   * @private
   */
  async _loadConfigAsync(projectConfigPath, cacheKey) {
    return new Promise((resolve) => {
      try {
        console.log(`🔧 异步加载配置: ${cacheKey}`);
        const config = this._loadAndMergeConfig(projectConfigPath);
        resolve(config);
      } catch (error) {
        console.error(`❌ 异步配置加载失败: ${cacheKey}`, error.message);
        resolve(this._getDefaultConfig());
      }
    });
  },

  /**
   * 生成缓存键
   * @param {string|null} projectConfigPath 项目配置路径
   * @returns {string} 缓存键
   * @private
   */
  _getCacheKey(projectConfigPath) {
    if (!projectConfigPath) {
      return "default";
    }
    return path.resolve(projectConfigPath);
  },

  /**
   * 加载并合并配置
   * @param {string|null} projectConfigPath 项目配置路径
   * @returns {Object} 合并后的配置
   * @private
   */
  _loadAndMergeConfig(projectConfigPath) {
    try {
      // 1. 加载默认配置
      const defaultConf = this._getDefaultConfig();

      // 2. 如果没有项目配置路径，直接返回默认配置
      if (!projectConfigPath) {
        return defaultConf;
      }

      // 3. 加载项目配置
      const projectConfig = this._loadProjectConfig(projectConfigPath);

      // 4. 如果项目配置为空，返回默认配置
      if (!projectConfig || Object.keys(projectConfig).length === 0) {
        return defaultConf;
      }

      // 5. 合并配置
      const mergedConfig = this._mergeConfigs(defaultConf, projectConfig);

      // 6. 确保必需方法存在
      this._ensureRequiredMethods(mergedConfig, defaultConf);

      return mergedConfig;
    } catch (error) {
      console.error("❌ 配置加载失败:", error.message);
      console.log("📋 降级使用默认配置");
      // 直接返回默认配置，不使用简化的降级配置
      return this._getDefaultConfig();
    }
  },

  /**
   * 获取默认配置
   * @returns {Object} 默认配置
   * @private
   */
  _getDefaultConfig() {
    if (!defaultConfig) {
      try {
        const configPath = path.join(__dirname, "./response.config.js");
        // 清除缓存确保获取最新配置
        delete require.cache[require.resolve(configPath)];
        defaultConfig = require(configPath);
        console.log("📦 默认配置加载成功");
      } catch (error) {
        console.error("❌ 默认配置加载失败:", error.message);
        throw new Error(`无法加载默认配置文件: ${error.message}`);
      }
    }
    return defaultConfig;
  },

  /**
   * 加载项目配置
   * @param {string} projectConfigPath 项目配置路径
   * @returns {Object} 项目配置
   * @private
   */
  _loadProjectConfig(projectConfigPath) {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(projectConfigPath)) {
        console.warn(`⚠️ 项目配置文件不存在: ${projectConfigPath}`);
        return {};
      }

      // 清除缓存确保获取最新配置
      delete require.cache[require.resolve(projectConfigPath)];

      const projectConfig = require(projectConfigPath);
      console.log(`🎯 项目配置加载成功: ${projectConfigPath}`);

      return projectConfig || {};
    } catch (error) {
      console.warn(`⚠️ 项目配置加载失败: ${error.message}`);
      return {};
    }
  },

  /**
   * 合并配置
   * @param {Object} defaultConf 默认配置
   * @param {Object} projectConfig 项目配置
   * @returns {Object} 合并后的配置
   * @private
   */
  _mergeConfigs(defaultConf, projectConfig) {
    return ObjectUtils.deepMerge(defaultConf, projectConfig);
  },

  /**
   * 确保必需方法存在
   * @param {Object} mergedConfig 合并后的配置
   * @param {Object} defaultConf 默认配置
   * @private
   */
  _ensureRequiredMethods(mergedConfig, defaultConf) {
    const requiredMethods = ["getResponseFormat", "setDeepProperty", "getDeepProperty"];

    requiredMethods.forEach((methodName) => {
      if (typeof mergedConfig[methodName] !== "function" && typeof defaultConf[methodName] === "function") {
        mergedConfig[methodName] = defaultConf[methodName];
      }
    });

    // 确保常量存在
    if (!mergedConfig.CLIENT_FORMATTERS && defaultConf.CLIENT_FORMATTERS) {
      mergedConfig.CLIENT_FORMATTERS = defaultConf.CLIENT_FORMATTERS;
    }

    if (!mergedConfig.RESPONSE_TYPES && defaultConf.RESPONSE_TYPES) {
      mergedConfig.RESPONSE_TYPES = defaultConf.RESPONSE_TYPES;
    }
  },

  /**
   * 清除缓存
   * @param {string|null} cacheKey 要清除的缓存键，null 表示清除所有
   */
  clearCache(cacheKey = null) {
    if (cacheKey) {
      configCache.delete(cacheKey);
      console.log(`🧹 已清除缓存: ${cacheKey}`);
    } else {
      configCache.clear();
      defaultConfig = null;
      console.log("🧹 已清除所有配置缓存");
    }
  },

  /**
   * 获取缓存信息
   * @returns {Object} 缓存状态
   */
  getCacheInfo() {
    return {
      cacheSize: configCache.size,
      cacheKeys: Array.from(configCache.keys()),
      hasDefaultConfig: !!defaultConfig,
    };
  },

  /**
   * 预热配置（可选）
   * @param {string|null} projectConfigPath 项目配置路径
   */
  warmup(projectConfigPath = null) {
    console.log("🔥 预热配置缓存...");
    this.getConfig(projectConfigPath);
    console.log("✅ 配置缓存预热完成");
  },
};

module.exports = ConfigCache;
