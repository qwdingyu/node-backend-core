/**
 * @usethink/node-backend-core Testing Framework
 * 
 * 通用测试框架，提供标准化的测试基类和工具
 * 支持服务层测试、API测试、业务集成测试
 * 
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-12-21
 */

// 核心测试基类
const BaseTest = require('./core/BaseTest');
const ServiceTest = require('./core/ServiceTest');
const APITest = require('./core/APITest');
const BusinessTest = require('./core/BusinessTest');

// 测试工具
const TestRunner = require('./utils/TestRunner');
const DataGenerator = require('./utils/DataGenerator');
const ReportGenerator = require('./utils/ReportGenerator');
const ConfigManager = require('./utils/ConfigManager');

// 便捷方法
const createTestSuite = require('./utils/createTestSuite');
const runTests = require('./utils/runTests');

module.exports = {
  // 核心测试类
  BaseTest,
  ServiceTest,
  APITest,
  BusinessTest,
  
  // 工具类
  TestRunner,
  DataGenerator,
  ReportGenerator,
  ConfigManager,
  
  // 便捷方法
  createTestSuite,
  runTests,
  
  // 向后兼容的别名
  BaseServiceTest: ServiceTest,
  BaseAPITest: APITest,
  BaseBusinessTest: BusinessTest
};
