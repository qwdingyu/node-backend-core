/**
 * 响应便捷方法 - 提供常用的响应快捷方式
 * 从 ResponseFormatter 中提取出来，减少主类的复杂度
 */

class ResponseHelpers {
  constructor(formatter) {
    this.formatter = formatter;
  }

  /**
   * 成功响应
   * @param {Object} res Express响应对象
   * @param {*} data 响应数据
   * @param {string} message 响应消息
   */
  success(res, data = null, message = "操作成功") {
    const internalResponse = this.formatter._buildInternalResponse(
      { success: true, data, message, code: "SUCCESS" },
      this.formatter.RESPONSE_TYPES?.ENTITY || "entity"
    );

    return this.formatter.formatResponse(res, internalResponse);
  }

  /**
   * 错误响应
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   * @param {string} code 错误代码
   * @param {number} statusCode HTTP状态码
   */
  error(res, message = "操作失败", code = "ERROR", statusCode = 500) {
    const internalResponse = this.formatter._buildInternalResponse(
      { success: false, data: null, message, code },
      this.formatter.RESPONSE_TYPES?.ERROR || "error",
      {
        statusCode, // 添加statusCode字段用于mobile映射
        errorCode: -1, // 添加errorCode字段用于miniapp映射
        debug: null, // 添加debug字段用于兼容性
      }
    );

    res.status(statusCode);
    return this.formatter.formatResponse(res, internalResponse);
  }

  /**
   * 未授权响应 (401)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  unauthorized(res, message = "未授权访问") {
    return this.error(res, message, "UNAUTHORIZED", 401);
  }

  /**
   * 禁止访问响应 (403)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  forbidden(res, message = "禁止访问") {
    return this.error(res, message, "FORBIDDEN", 403);
  }

  /**
   * 资源不存在响应 (404)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  notFound(res, message = "资源不存在") {
    return this.error(res, message, "NOT_FOUND", 404);
  }

  /**
   * 参数错误响应 (400)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  badRequest(res, message = "请求参数错误") {
    return this.error(res, message, "BAD_REQUEST", 400);
  }

  /**
   * 验证错误响应 (400)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  validationError(res, message = "数据验证失败") {
    return this.error(res, message, "VALIDATION_ERROR", 400);
  }

  /**
   * 冲突响应 (409)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  conflict(res, message = "资源冲突") {
    return this.error(res, message, "CONFLICT", 409);
  }

  /**
   * 服务器内部错误响应 (500)
   * @param {Object} res Express响应对象
   * @param {string} message 错误消息
   */
  internalError(res, message = "服务器内部错误") {
    return this.error(res, message, "INTERNAL_ERROR", 500);
  }

  /**
   * 分页响应
   * @param {Object} res Express响应对象
   * @param {Array} list 数据列表
   * @param {number} total 总数
   * @param {number} page 当前页
   * @param {number} pageSize 页大小
   * @param {string} message 响应消息
   */
  pagination(res, list = [], total = 0, page = 1, pageSize = 10, message = "获取分页数据成功") {
    const internalResponse = this.formatter._buildInternalResponse(
      {
        success: true,
        data: { list, total, page, pageSize },
        message,
        code: "SUCCESS",
      },
      "pagination"
    );

    return this.formatter.formatResponse(res, internalResponse);
  }

  /**
   * 列表响应
   * @param {Object} res Express响应对象
   * @param {Array} list 数据列表
   * @param {string} message 响应消息
   */
  list(res, list = [], message = "获取列表成功") {
    const internalResponse = this.formatter._buildInternalResponse(
      {
        success: true,
        data: list,
        message,
        code: "SUCCESS",
      },
      "list"
    );

    return this.formatter.formatResponse(res, internalResponse);
  }

  /**
   * 操作响应
   * @param {Object} res Express响应对象
   * @param {*} data 操作结果数据
   * @param {string} message 响应消息
   */
  operation(res, data = null, message = "操作成功") {
    const internalResponse = this.formatter._buildInternalResponse(
      {
        success: true,
        data,
        message,
        code: "SUCCESS",
      },
      "operation"
    );

    return this.formatter.formatResponse(res, internalResponse);
  }

  /**
   * 创建响应
   * @param {Object} res Express响应对象
   * @param {*} data 创建的数据
   * @param {string} message 响应消息
   */
  created(res, data = null, message = "创建成功") {
    res.status(201);
    return this.success(res, data, message);
  }

  /**
   * 更新响应
   * @param {Object} res Express响应对象
   * @param {*} data 更新的数据
   * @param {string} message 响应消息
   */
  updated(res, data = null, message = "更新成功") {
    return this.success(res, data, message);
  }

  /**
   * 删除响应
   * @param {Object} res Express响应对象
   * @param {string} message 响应消息
   */
  deleted(res, message = "删除成功") {
    return this.operation(res, null, message);
  }
}

module.exports = ResponseHelpers;
