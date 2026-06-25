/**
 * 创建测试套件的便捷方法
 */

const ServiceTest = require('../core/ServiceTest');
const APITest = require('../core/APITest');
const BusinessTest = require('../core/BusinessTest');

/**
 * 创建测试套件
 */
function createTestSuite(type, testName, options = {}) {
  switch (type.toLowerCase()) {
    case 'service':
    case 'services':
      return new ServiceTest(testName, options);
      
    case 'api':
      return new APITest(testName, options);
      
    case 'business':
    case 'integration':
      return new BusinessTest(testName, options);
      
    default:
      throw new Error(`不支持的测试类型: ${type}。支持的类型: service, api, business`);
  }
}

module.exports = createTestSuite;
