/**
 * API测试基类
 * 专门用于测试API接口，包含HTTP请求、认证、响应验证等功能
 */

const BaseTest = require('./BaseTest');
const axios = require('axios');

class APITest extends BaseTest {
  constructor(testName = "API测试", options = {}) {
    super(testName, options);
    
    // API配置
    this.baseURL = this.config.api?.baseURL || 'http://localhost:3000';
    this.timeout = this.config.api?.timeout || 30000;
    
    // 认证信息
    this.adminToken = null;
    this.userToken = null;
    
    // HTTP客户端
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 管理员登录获取token
   */
  async loginAsAdmin() {
    try {
      const credentials = this.config.api?.auth?.adminCredentials || {
        username: 'admin',
        password: 'admin123'
      };
      
      const loginEndpoint = this.config.api?.auth?.loginEndpoint || '/api/auth/login';
      
      const response = await this.httpClient.post(loginEndpoint, credentials);
      
      if (response.data.success && response.data.data.token) {
        this.adminToken = response.data.data.token;
        console.log('✅ 管理员登录成功');
        return true;
      } else {
        throw new Error('管理员登录失败: ' + (response.data.message || '未知错误'));
      }
    } catch (error) {
      console.log('❌ 管理员登录失败:', error.message);
      return false;
    }
  }

  /**
   * 普通用户登录获取token
   */
  async loginAsUser() {
    try {
      const credentials = this.config.api?.auth?.userCredentials || {
        username: 'testuser',
        password: 'test123'
      };
      
      const loginEndpoint = this.config.api?.auth?.loginEndpoint || '/api/auth/login';
      
      const response = await this.httpClient.post(loginEndpoint, credentials);
      
      if (response.data.success && response.data.data.token) {
        this.userToken = response.data.data.token;
        console.log('✅ 用户登录成功');
        return true;
      } else {
        throw new Error('用户登录失败: ' + (response.data.message || '未知错误'));
      }
    } catch (error) {
      console.log('❌ 用户登录失败:', error.message);
      return false;
    }
  }

  /**
   * 发送HTTP请求
   */
  async sendRequest(method, url, data = null, options = {}) {
    try {
      const config = {
        method: method.toLowerCase(),
        url,
        ...options
      };

      // 添加认证头
      if (options.useAdminAuth && this.adminToken) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${this.adminToken}`
        };
      } else if (options.useUserAuth && this.userToken) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${this.userToken}`
        };
      }

      // 添加请求数据
      if (data) {
        if (method.toLowerCase() === 'get') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await this.httpClient(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        // 服务器响应了错误状态码
        throw new Error(`HTTP ${error.response.status}: ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        // 请求发送了但没有收到响应
        throw new Error('网络错误: 无法连接到服务器');
      } else {
        // 其他错误
        throw new Error('请求错误: ' + error.message);
      }
    }
  }

  /**
   * 测试API接口
   */
  async testAPI(testName, method, url, data = null, options = {}) {
    console.log(`🔍 测试 ${testName}...`);
    
    try {
      const response = await this.sendRequest(method, url, data, options);
      
      // 基本响应验证
      this.assertNotNull(response, '响应不应该为空');
      
      // 如果有自定义验证函数
      if (options.validator) {
        options.validator(response);
      }
      
      console.log(`✅ ${testName} - 成功`);
      return response;
    } catch (error) {
      console.log(`❌ ${testName} - 错误: ${error.message}`);
      
      // 如果允许失败，不抛出异常
      if (options.allowFailure) {
        return null;
      }
      
      throw error;
    }
  }

  /**
   * 验证响应格式
   */
  validateResponse(response, expectedFields = []) {
    this.assertNotNull(response, '响应不应该为空');
    
    // 验证必需字段
    expectedFields.forEach(field => {
      this.assertTrue(
        response.hasOwnProperty(field),
        `响应应该包含字段: ${field}`
      );
    });
    
    return true;
  }

  /**
   * 验证成功响应
   */
  validateSuccessResponse(response, message = null) {
    this.validateResponse(response, ['success', 'data']);
    this.assertTrue(response.success, '响应应该表示成功');
    
    if (message) {
      this.assertEqual(response.message, message, `响应消息应该是: ${message}`);
    }
    
    return response.data;
  }

  /**
   * 验证错误响应
   */
  validateErrorResponse(response, expectedMessage = null) {
    this.validateResponse(response, ['success', 'message']);
    this.assertFalse(response.success, '响应应该表示失败');
    
    if (expectedMessage) {
      this.assertEqual(response.message, expectedMessage, `错误消息应该是: ${expectedMessage}`);
    }
    
    return response.message;
  }

  /**
   * 设置测试环境
   */
  async setUp() {
    await super.setUp();
    
    console.log('🚀 初始化API测试环境...');
    
    // 尝试登录获取认证token
    await this.loginAsAdmin();
    await this.loginAsUser();
    
    console.log('✅ API测试环境初始化完成');
  }

  /**
   * 批量测试API端点
   */
  async testEndpoints(endpoints) {
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.testAPI(
          endpoint.name,
          endpoint.method,
          endpoint.url,
          endpoint.data,
          endpoint.options
        );
        
        results.push({
          name: endpoint.name,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          name: endpoint.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = APITest;
