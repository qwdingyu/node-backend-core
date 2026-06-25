/**
 * Mixins 模块导出
 * 
 * 统一导出所有 Mixin 类
 * 
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

module.exports = {
  // 状态管理Mixin
  StatusMixin: require('./StatusMixin'),

  // 财务字段Mixin
  FinancialMixin: require('./FinancialMixin'),
};
