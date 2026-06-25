const Joi = require("joi");

/**
 * 验证工具类
 */
class ValidationUtil {
  /**
   * 用户注册验证规则
   */
  static userRegister = Joi.object({
    username: Joi.string().alphanum().min(3).max(20).required().messages({
      "string.alphanum": "用户名只能包含字母和数字",
      "string.min": "用户名长度不能少于3位",
      "string.max": "用户名长度不能超过20位",
      "any.required": "用户名不能为空",
    }),
    password: Joi.string().min(6).max(88).required().messages({
      "string.min": "密码长度不能少于6位",
      "string.max": "密码长度不能超过88位",
      "any.required": "密码不能为空",
    }),
    truename: Joi.string().max(50).optional().allow(null, "").messages({
      "string.max": "真实姓名不能超过50个字符",
    }),
    invitation_code: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .optional()
      .allow(null, "")
      .messages({
        "string.length": "邀请码必须是6位数字",
        "string.pattern.base": "邀请码只能包含数字",
      }),
  });

  /**
   * 用户登录验证规则
   */
  static userLogin = Joi.object({
    username: Joi.string().required().messages({
      "any.required": "用户名不能为空",
    }),
    password: Joi.string().required().messages({
      "any.required": "密码不能为空",
    }),
  });

  /**
   * 项目创建验证规则
   */
  static projectCreate = Joi.object({
    title: Joi.string().max(255).required().messages({
      "string.max": "项目标题不能超过255个字符",
      "any.required": "项目标题不能为空",
    }),
    price: Joi.number().positive().required().messages({
      "number.positive": "项目价格必须大于0",
      "any.required": "项目价格不能为空",
    }),
    day_income: Joi.number().min(0).optional().messages({
      "number.min": "日收益不能小于0",
    }),
    recommend_day_income: Joi.number().min(0).optional().messages({
      "number.min": "推荐日收益不能小于0",
    }),
    cate_id: Joi.number().integer().min(1).required().messages({
      "number.integer": "分类ID必须是整数",
      "number.min": "分类ID必须大于0",
      "any.required": "分类ID不能为空",
    }),
    desc_1: Joi.string().optional(),
    desc_2: Joi.string().optional(),
    desc_3: Joi.string().optional(),
    desc_4: Joi.string().optional(),
    desc_5: Joi.string().optional(),
  });

  /**
   * 分页参数验证规则
   */
  static pagination = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      "number.integer": "页码必须是整数",
      "number.min": "页码必须大于0",
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      "number.integer": "每页数量必须是整数",
      "number.min": "每页数量必须大于0",
      "number.max": "每页数量不能超过100",
    }),
  });

  /**
   * 投资验证规则
   */
  static investment = Joi.object({
    item_id: Joi.number().integer().min(1).required().messages({
      "number.integer": "项目ID必须是整数",
      "number.min": "项目ID必须大于0",
      "any.required": "项目ID不能为空",
    }),
    amount: Joi.number().positive().required().messages({
      "number.positive": "投资金额必须大于0",
      "any.required": "投资金额不能为空",
    }),
  });

  /**
   * 充值验证规则
   */
  static recharge = Joi.object({
    amount: Joi.number().positive().required().messages({
      "number.positive": "充值金额必须大于0",
      "any.required": "充值金额不能为空",
    }),
    pay_type: Joi.string().required().messages({
      "any.required": "支付方式不能为空",
    }),
  });

  /**
   * 验证数据
   */
  static validate(schema, data) {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));
      throw new ValidationError("参数验证失败", errors);
    }

    return value;
  }

  /**
   * 中间件形式的验证器
   */
  static middleware(schema) {
    return (req, res, next) => {
      try {
        const validated = this.validate(schema, req.body);
        req.body = validated;
        next();
      } catch (error) {
        const ResponseUtil = require("./response");
        return ResponseUtil.badRequest(res, error.message, error.errors);
      }
    };
  }

  /**
   * 查询参数验证中间件
   */
  static queryMiddleware(schema) {
    return (req, res, next) => {
      try {
        const validated = this.validate(schema, req.query);
        req.query = validated;
        next();
      } catch (error) {
        const ResponseUtil = require("./response");
        return ResponseUtil.badRequest(res, error.message, error.errors);
      }
    };
  }

  /**
   * 验证邮箱格式
   */
  static isEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式（中国）
   */
  static isMobilePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证身份证号格式
   */
  static isIdCard(idCard) {
    const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    return idCardRegex.test(idCard);
  }

  /**
   * 验证金额格式（最多两位小数）
   */
  static isValidAmount(amount) {
    const amountRegex = /^\d+(\.\d{1,2})?$/;
    return amountRegex.test(amount.toString()) && parseFloat(amount) > 0;
  }
}

/**
 * 验证错误类
 */
class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

module.exports = { ValidationUtil, ValidationError };
