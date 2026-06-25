/**
 * 客户端检测服务
 * 
 * 专门负责客户端类型的检测和识别
 * 基于配置驱动，支持多种检测策略
 * 
 * @author Investment Platform Team
 * @version 3.0.0 (重构版)
 * @since 2025-07-06
 */

const {
  CLIENT_TYPES,
  CLIENT_DETECTION_CONFIG,
  CLIENT_FORMATTER_MAPPING,
  DETECTION_STRATEGIES,
  DEFAULTS,
  getDefaultClientType,
  isValidClientType,
} = require('../config/clientConfig');

/**
 * 客户端检测服务类
 */
class ClientDetector {
  /**
   * 检测客户端类型（主入口方法）
   * @param {Object} req Express请求对象
   * @param {Object} options 检测选项
   * @param {Array<string>} options.strategies 检测策略数组
   * @param {string} options.defaultType 默认客户端类型
   * @returns {string} 客户端类型ID
   */
  static detect(req, options = {}) {
    // 空值检查
    if (!req) {
      return options.defaultType || getDefaultClientType();
    }

    const strategies = options.strategies || DEFAULTS.DETECTION_STRATEGY;
    const defaultType = options.defaultType || getDefaultClientType();

    // 缓存原始路径
    req.originalPath = req.originalPath || req.path || req.url;

    // 按策略顺序依次尝试检测
    for (const strategy of strategies) {
      const result = this._detectByStrategy(req, strategy);
      if (result && isValidClientType(result)) {
        return result;
      }
    }

    return defaultType;
  }

  /**
   * 按策略检测客户端类型
   * @param {Object} req Express请求对象
   * @param {string} strategy 检测策略
   * @returns {string|null} 检测结果
   * @private
   */
  static _detectByStrategy(req, strategy) {
    switch (strategy) {
      case 'path':
        return this.detectByPath(req);
      case 'header':
        return this.detectByHeader(req);
      case 'userAgent':
        return this.detectByUserAgent(req);
      case 'default':
        return getDefaultClientType();
      default:
        return null;
    }
  }

  /**
   * 通过URL路径检测客户端类型
   * @param {Object} req Express请求对象
   * @returns {string|null} 客户端类型
   */
  static detectByPath(req) {
    const path = req.originalPath || req.path || req.url;
    
    if (!path || typeof path !== 'string') {
      return null;
    }

    // 解析路径：/api/{client}/...
    const pathSegments = path.split('/').filter(segment => segment);
    
    if (pathSegments.length >= 2 && pathSegments[0] === 'api') {
      const clientSegment = pathSegments[1];
      
      // 根据配置查找匹配的客户端类型
      for (const [clientType, config] of Object.entries(CLIENT_DETECTION_CONFIG)) {
        if (config.pathSegments.includes(clientSegment)) {
          return clientType;
        }
      }
    }

    return null;
  }

  /**
   * 通过HTTP头检测客户端类型
   * @param {Object} req Express请求对象
   * @returns {string|null} 客户端类型
   */
  static detectByHeader(req) {
    // 检查多个可能的头字段
    for (const field of DEFAULTS.HEADER_FIELDS) {
      const headerValue = req.get(field);
      if (headerValue) {
        // 根据配置查找匹配的客户端类型
        for (const [clientType, config] of Object.entries(CLIENT_DETECTION_CONFIG)) {
          if (config.headerValues.includes(headerValue)) {
            return clientType;
          }
        }
      }
    }

    return null;
  }

  /**
   * 通过User-Agent检测客户端类型
   * @param {Object} req Express请求对象
   * @returns {string|null} 客户端类型
   */
  static detectByUserAgent(req) {
    const userAgent = req.get('user-agent');
    if (!userAgent) return null;
    
    // 按优先级排序查找
    const sortedConfigs = Object.entries(CLIENT_DETECTION_CONFIG)
      .filter(([, config]) => config.userAgentKeywords.length > 0)
      .sort(([, a], [, b]) => a.priority - b.priority);
    
    for (const [clientType, config] of sortedConfigs) {
      if (config.userAgentKeywords.some(keyword => userAgent.includes(keyword))) {
        return clientType;
      }
    }
    
    return null;
  }

  /**
   * 获取客户端格式化类型
   * @param {string} clientType 客户端类型
   * @returns {string} 格式化类型
   */
  static getFormatterType(clientType) {
    return CLIENT_FORMATTER_MAPPING[clientType] || DEFAULTS.FORMATTER_TYPE;
  }

  /**
   * 获取检测详情（用于调试）
   * @param {Object} req Express请求对象
   * @returns {Object} 检测详情
   */
  static getDetectionDetails(req) {
    const pathResult = this.detectByPath(req);
    const headerResult = this.detectByHeader(req);
    const userAgentResult = this.detectByUserAgent(req);
    const finalResult = this.detect(req);

    return {
      detection: {
        path: pathResult,
        header: headerResult,
        userAgent: userAgentResult,
        final: finalResult,
      },
      formatterType: this.getFormatterType(finalResult),
      request: {
        url: req.originalPath || req.path || req.url,
        method: req.method,
        headers: this._extractRelevantHeaders(req),
      },
      config: CLIENT_DETECTION_CONFIG[finalResult] || null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 提取相关的请求头信息
   * @param {Object} req Express请求对象
   * @returns {Object} 相关头信息
   * @private
   */
  static _extractRelevantHeaders(req) {
    const headers = {};
    
    // 提取客户端相关的头信息
    for (const field of DEFAULTS.HEADER_FIELDS) {
      const value = req.get(field);
      if (value) {
        headers[field] = value;
      }
    }
    
    // 添加User-Agent
    const userAgent = req.get('user-agent');
    if (userAgent) {
      headers['user-agent'] = userAgent;
    }
    
    return headers;
  }

  /**
   * 验证检测结果
   * @param {Object} req Express请求对象
   * @param {string} expectedType 期望的客户端类型
   * @returns {Object} 验证结果
   */
  static validate(req, expectedType) {
    const detected = this.detect(req);
    const details = this.getDetectionDetails(req);
    
    return {
      success: detected === expectedType,
      detected: detected,
      expected: expectedType,
      details: details,
      message: detected === expectedType 
        ? '检测结果正确' 
        : `检测结果不匹配：期望 ${expectedType}，实际 ${detected}`,
    };
  }

  /**
   * 获取所有支持的客户端类型信息
   * @returns {Array<Object>} 客户端类型列表
   */
  static getSupportedTypes() {
    return Object.entries(CLIENT_DETECTION_CONFIG).map(([clientType, detectionConfig]) => ({
      type: clientType,
      name: CLIENT_TYPES[clientType.toUpperCase()] || clientType,
      formatterType: this.getFormatterType(clientType),
      detection: {
        pathSegments: detectionConfig.pathSegments,
        headerValues: detectionConfig.headerValues,
        userAgentKeywords: detectionConfig.userAgentKeywords,
        priority: detectionConfig.priority,
      },
    }));
  }

  /**
   * 获取检测统计信息
   * @param {Array<Object>} requests 请求数组
   * @returns {Object} 统计信息
   */
  static getStats(requests) {
    const stats = {
      total: requests.length,
      byType: {},
      byStrategy: {
        path: 0,
        header: 0,
        userAgent: 0,
        default: 0,
      },
      byFormatter: {},
    };

    requests.forEach(req => {
      const details = this.getDetectionDetails(req);
      
      // 统计客户端类型
      const finalType = details.detection.final;
      stats.byType[finalType] = (stats.byType[finalType] || 0) + 1;
      
      // 统计格式化类型
      const formatterType = details.formatterType;
      stats.byFormatter[formatterType] = (stats.byFormatter[formatterType] || 0) + 1;
      
      // 统计策略使用情况
      if (details.detection.path) stats.byStrategy.path++;
      else if (details.detection.header) stats.byStrategy.header++;
      else if (details.detection.userAgent) stats.byStrategy.userAgent++;
      else stats.byStrategy.default++;
    });

    return stats;
  }

  /**
   * 创建自定义检测器实例
   * @param {Object} options 配置选项
   * @returns {Object} 检测器实例
   */
  static createDetector(options = {}) {
    const strategies = options.strategies || DEFAULTS.DETECTION_STRATEGY;
    const defaultType = options.defaultType || getDefaultClientType();
    
    return {
      detect: (req) => this.detect(req, { strategies, defaultType }),
      getDetails: (req) => this.getDetectionDetails(req),
      validate: (req, expectedType) => this.validate(req, expectedType),
    };
  }
}

module.exports = ClientDetector;
