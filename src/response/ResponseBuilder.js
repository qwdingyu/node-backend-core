/**
 * 响应构建器 - 专门负责构建不同类型的响应
 * 从 ResponseFormatter 中提取出来，职责单一
 */

class ResponseBuilder {
  /**
   * 构建简化响应
   * @param {Object} internalResponse 内部响应对象
   * @param {string} responseType 响应类型
   * @returns {Object} 格式化的响应
   */
  static buildSimpleResponse(internalResponse, responseType = "entity") {
    // 优化：预先计算常用值
    const isSuccess = internalResponse.success;
    const defaultCode = isSuccess ? "SUCCESS" : "ERROR";

    // 简化模式：固定的返回格式，只按响应类型区分
    const baseResponse = {
      success: isSuccess,
      code: internalResponse.code || defaultCode,
      message: internalResponse.message,
      data: ResponseBuilder.processDataByType(internalResponse.data, responseType),
      timestamp: new Date().toISOString(),
    };

    // 特殊处理：错误响应确保 success 为 false
    if (responseType === "error") {
      baseResponse.success = false;
      baseResponse.code = internalResponse.code || "ERROR";
    }

    return baseResponse;
  }

  /**
   * 根据响应类型处理数据
   * @param {*} data 原始数据
   * @param {string} responseType 响应类型
   * @returns {*} 处理后的数据
   */
  static processDataByType(data, responseType) {
    switch (responseType) {
      case "pagination":
        // 分页响应：确保 data 包含分页信息
        if (data && typeof data === "object" && !Array.isArray(data)) {
          return {
            list: data.list || data.data || [],
            total: data.total || 0,
            page: data.page || 1,
            pageSize: data.pageSize || 10,
            ...data,
          };
        }
        return data;

      case "list":
        // 列表响应：确保 data 是数组
        return Array.isArray(data) ? data : data ? [data] : [];

      case "operation":
        // 操作响应：通常只需要成功状态和消息
        return data || null;

      case "entityOperation":
        // 实体操作响应：确保包含 entity 和 operation 字段
        if (data && typeof data === "object" && !Array.isArray(data)) {
          return {
            entity: data.entity || null,
            operation: data.operation || { affected: 0, id: null, ids: null },
            ...data,
          };
        }
        return data;

      case "error":
        // 错误响应：通常不返回数据
        return data || null;

      case "entity":
      default:
        // 实体响应：保持原样
        return data;
    }
  }

  /**
   * 构建完整响应
   * @param {Object} formatConfig 响应格式配置
   * @param {Object} internalResponse 内部响应对象
   * @param {Function} cloneTemplate 模板克隆函数
   * @param {Object} finalConfig 最终配置对象
   * @returns {Object} 格式化的响应
   */
  static buildFullResponse(formatConfig, internalResponse, cloneTemplate, finalConfig) {
    const { template, mapping = {}, computed = {} } = formatConfig;
    // 使用传入的克隆函数
    const response = cloneTemplate(template);

    // 1. 处理字段映射
    Object.entries(mapping).forEach(([targetPath, sourcePath]) => {
      let value;
      if (sourcePath === "") {
        // 空字符串表示直接使用整个数据
        value = internalResponse.data;
      } else {
        value = finalConfig.getDeepProperty(internalResponse, sourcePath);
      }
      if (value !== undefined) {
        finalConfig.setDeepProperty(response, targetPath, value);
      }
    });

    // 2. 处理计算字段
    Object.entries(computed).forEach(([targetPath, computeFunction]) => {
      if (typeof computeFunction === "function") {
        try {
          const computedValue = computeFunction(internalResponse.data || {});
          if (computedValue !== undefined) {
            finalConfig.setDeepProperty(response, targetPath, computedValue);
          }
        } catch (error) {
          console.warn(`计算字段 ${targetPath} 处理失败:`, error.message);
        }
      }
    });

    // 3. 设置消息字段
    if (response.message !== undefined) response.message = internalResponse.message;
    if (response.msg !== undefined) response.msg = internalResponse.message;
    if (response.errmsg !== undefined) response.errmsg = internalResponse.message;

    // 4. 统一处理时间戳
    ResponseBuilder.processTimestamp(response);

    // 5. 处理状态码映射
    ResponseBuilder.processStatusCode(response, internalResponse);

    return response;
  }

  /**
   * 构建默认响应格式（兜底方案）
   * @param {Object} internalResponse 内部响应对象
   * @param {string} clientFormatterType 客户端类型
   * @param {boolean} useSimpleMode 是否使用简化模式
   * @param {Object} CLIENT_FORMATTERS 客户端格式化器常量
   * @returns {Object} 默认响应格式
   */
  static buildDefaultResponse(internalResponse, clientFormatterType, useSimpleMode, CLIENT_FORMATTERS) {
    // 简化模式：直接使用简化响应
    if (useSimpleMode) {
      return ResponseBuilder.buildSimpleResponse(internalResponse, internalResponse.type || "entity");
    }

    // 完整模式：根据客户端类型返回不同格式
    const isSuccess = internalResponse.success;
    const timestamp = new Date().toISOString();

    // 优化：提取公共的基础响应
    const baseData = {
      message: internalResponse.message,
      data: internalResponse.data,
    };

    switch (clientFormatterType) {
      case CLIENT_FORMATTERS?.MOBILE || "mobile":
        return {
          code: isSuccess ? 200 : 500,
          msg: baseData.message,
          data: baseData.data,
        };

      case CLIENT_FORMATTERS?.MINIAPP || "miniapp":
        return {
          errcode: isSuccess ? 0 : -1,
          errmsg: baseData.message,
          data: baseData.data,
        };

      case CLIENT_FORMATTERS?.WEB_ADMIN || "web_admin":
      case CLIENT_FORMATTERS?.DEFAULT || "default":
      default:
        return {
          success: isSuccess,
          code: internalResponse.code || (isSuccess ? "SUCCESS" : "ERROR"),
          message: baseData.message,
          data: baseData.data,
          timestamp,
        };
    }
  }

  /**
   * 统一处理时间戳
   * @param {Object} response 响应对象
   */
  static processTimestamp(response) {
    if ("timestamp" in response) {
      if (typeof response.timestamp === "function") {
        response.timestamp = response.timestamp();
      } else if (response.timestamp === undefined || response.timestamp === null) {
        response.timestamp = Date.now();
      }
    } else {
      // 如果响应对象中没有timestamp字段，添加一个
      response.timestamp = Date.now();
    }
  }

  /**
   * 处理状态码映射
   * @param {Object} response 响应对象
   * @param {Object} internalResponse 内部响应对象
   */
  static processStatusCode(response, internalResponse) {
    // 只在没有自定义code时才设置默认值
    if (
      response.code !== undefined &&
      typeof response.code === "string" &&
      response.code === "" && // 只有当code为空字符串时才设置默认值
      internalResponse.success !== undefined
    ) {
      response.code = internalResponse.success ? "SUCCESS" : "ERROR";
    }

    // 处理小程序的errcode
    if (response.errcode !== undefined && internalResponse.success !== undefined) {
      response.errcode = internalResponse.success ? 0 : -1;
    }
  }
}

module.exports = ResponseBuilder;
