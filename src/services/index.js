/**
 * 服务层导出
 *
 * 统一导出所有通用服务类
 *
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

module.exports = {
  // 查询条件构建器
  QueryBuilder: require("./QueryBuilder"),

  // 通用数据统计服务
  StatisticsService: require("./StatisticsService"),
};
