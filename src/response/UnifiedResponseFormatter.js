/**
 * 统一响应格式化器
 * 
 * 遵循"瑞士军刀"原则：小巧、实用、功能完整
 * 提供统一的API响应格式，支持多种客户端适配
 * 
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

class UnifiedResponseFormatter {
  /**
   * 成功响应
   * @param {*} data 响应数据
   * @param {string} message 响应消息
   * @param {Object} meta 元数据
   * @returns {Object} 格式化后的响应
   */
  static success(data = null, message = 'success', meta = {}) {
    return {
      success: true,
      code: 200,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * 错误响应
   * @param {string} message 错误消息
   * @param {number} code 错误代码
   * @param {*} data 错误数据
   * @param {Object} meta 元数据
   * @returns {Object} 格式化后的错误响应
   */
  static error(message = 'error', code = 500, data = null, meta = {}) {
    return {
      success: false,
      code,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * 分页响应
   * @param {Array} items 数据项
   * @param {Object} pagination 分页信息
   * @param {string} message 响应消息
   * @param {Object} meta 元数据
   * @returns {Object} 格式化后的分页响应
   */
  static paginated(items = [], pagination = {}, message = 'success', meta = {}) {
    const {
      total = 0,
      page = 1,
      limit = 20,
      pages = Math.ceil(total / limit)
    } = pagination;

    return this.success(
      {
        items,
        pagination: {
          total: parseInt(total),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: parseInt(pages),
          hasNext: page < pages,
          hasPrev: page > 1
        }
      },
      message,
      meta
    );
  }

  /**
   * 操作结果响应
   * @param {boolean} success 操作是否成功
   * @param {Object} result 操作结果
   * @param {string} message 响应消息
   * @param {Object} meta 元数据
   * @returns {Object} 格式化后的操作响应
   */
  static operation(success = true, result = {}, message = null, meta = {}) {
    const defaultMessage = success ? '操作成功' : '操作失败';
    const code = success ? 200 : 400;

    return {
      success,
      code,
      message: message || defaultMessage,
      data: {
        affected: result.affected || 0,
        id: result.id || null,
        ids: result.ids || null,
        ...result
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * 列表响应（不分页）
   * @param {Array} items 数据项
   * @param {number} total 总数
   * @param {string} message 响应消息
   * @param {Object} meta 元数据
   * @returns {Object} 格式化后的列表响应
   */
  static list(items = [], total = null, message = 'success', meta = {}) {
    return this.success(
      {
        items,
        total: total !== null ? parseInt(total) : items.length
      },
      message,
      meta
    );
  }

  /**
   * 统计数据响应
   * @param {Object} stats 统计数据
   * @param {string} message 响应消息
   * @param {Object} meta 元数据
   * @returns {Object} 格式化后的统计响应
   */
  static statistics(stats = {}, message = 'success', meta = {}) {
    return this.success(
      {
        summary: stats.summary || {},
        trends: stats.trends || [],
        charts: stats.charts || {},
        ...stats
      },
      message,
      {
        type: 'statistics',
        ...meta
      }
    );
  }

  /**
   * 文件上传响应
   * @param {Object} fileInfo 文件信息
   * @param {string} message 响应消息
   * @param {Object} meta 元数据
   * @returns {Object} 格式化后的文件响应
   */
  static file(fileInfo = {}, message = '文件上传成功', meta = {}) {
    return this.success(
      {
        filename: fileInfo.filename || '',
        originalname: fileInfo.originalname || '',
        size: fileInfo.size || 0,
        mimetype: fileInfo.mimetype || '',
        url: fileInfo.url || '',
        path: fileInfo.path || '',
        ...fileInfo
      },
      message,
      {
        type: 'file',
        ...meta
      }
    );
  }

  /**
   * 验证错误响应
   * @param {Object} errors 验证错误
   * @param {string} message 错误消息
   * @returns {Object} 格式化后的验证错误响应
   */
  static validationError(errors = {}, message = '数据验证失败') {
    return this.error(
      message,
      422,
      {
        errors,
        fields: Object.keys(errors)
      },
      {
        type: 'validation'
      }
    );
  }

  /**
   * 业务错误响应
   * @param {string} message 错误消息
   * @param {string} code 业务错误代码
   * @param {*} data 错误数据
   * @returns {Object} 格式化后的业务错误响应
   */
  static businessError(message = '业务处理失败', code = 'BUSINESS_ERROR', data = null) {
    return this.error(
      message,
      400,
      data,
      {
        type: 'business',
        businessCode: code
      }
    );
  }

  /**
   * 权限错误响应
   * @param {string} message 错误消息
   * @param {string} requiredPermission 所需权限
   * @returns {Object} 格式化后的权限错误响应
   */
  static permissionError(message = '权限不足', requiredPermission = null) {
    return this.error(
      message,
      403,
      {
        requiredPermission
      },
      {
        type: 'permission'
      }
    );
  }

  /**
   * 资源不存在错误响应
   * @param {string} message 错误消息
   * @param {string} resource 资源类型
   * @param {*} identifier 资源标识
   * @returns {Object} 格式化后的404错误响应
   */
  static notFoundError(message = '资源不存在', resource = null, identifier = null) {
    return this.error(
      message,
      404,
      {
        resource,
        identifier
      },
      {
        type: 'notfound'
      }
    );
  }

  /**
   * 根据客户端类型适配响应格式
   * @param {Object} response 标准响应对象
   * @param {string} clientType 客户端类型 (web_admin, mobile_app)
   * @param {Object} config 客户端配置
   * @returns {Object} 适配后的响应
   */
  static adaptForClient(response, clientType = 'web_admin', config = {}) {
    // 这里可以根据不同客户端需求进行格式转换
    switch (clientType) {
      case 'mobile_app':
        return this.adaptForMobileApp(response, config);
      case 'web_admin':
        return this.adaptForWebAdmin(response, config);
      default:
        return response;
    }
  }

  /**
   * 移动端格式适配
   * @param {Object} response 标准响应
   * @param {Object} config 配置
   * @returns {Object} 移动端格式响应
   */
  static adaptForMobileApp(response, config = {}) {
    return {
      code: response.success ? 200 : (response.code || 500),
      msg: response.message,
      result: response.data,
      timestamp: Date.now()
    };
  }

  /**
   * Web管理端格式适配
   * @param {Object} response 标准响应
   * @param {Object} config 配置
   * @returns {Object} Web管理端格式响应
   */
  static adaptForWebAdmin(response, config = {}) {
    // Web管理端通常使用标准格式，可以直接返回
    return response;
  }

  /**
   * 批量格式化数据项
   * @param {Array} items 数据项数组
   * @param {Function} formatter 格式化函数
   * @returns {Array} 格式化后的数据项
   */
  static formatItems(items = [], formatter = (item) => item) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map(item => {
      try {
        return formatter(item);
      } catch (error) {
        console.warn('数据项格式化失败:', error.message, item);
        return item;
      }
    });
  }

  /**
   * 安全的数据清理
   * @param {*} data 原始数据
   * @param {Array} excludeFields 要排除的字段
   * @returns {*} 清理后的数据
   */
  static sanitizeData(data, excludeFields = ['password', 'pwd', 'token', 'secret']) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, excludeFields));
    }

    const sanitized = {};
    Object.keys(data).forEach(key => {
      if (!excludeFields.includes(key)) {
        sanitized[key] = this.sanitizeData(data[key], excludeFields);
      }
    });

    return sanitized;
  }
}

module.exports = UnifiedResponseFormatter;
