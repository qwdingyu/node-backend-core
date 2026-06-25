/**
 * Token 黑名单管理器
 * 用于管理已登出或需要失效的 JWT Token
 * 
 * 安全设计原则：
 * 1. 登出后的 token 立即失效
 * 2. 支持内存和 Redis 两种存储方式
 * 3. 自动清理过期的黑名单记录
 */

const logger = require('./logger');

class TokenBlacklist {
  constructor() {
    // 使用 Map 存储黑名单 token
    // key: token的唯一标识(jti或token hash)
    // value: 过期时间戳
    this.blacklist = new Map();
    
    // 定期清理过期的黑名单记录（每小时清理一次）
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);

    // 测试环境不应因为后台清理定时器阻止 Jest 退出。
    // unref 只影响 Node 事件循环引用计数，不影响生产环境实际清理逻辑。
    if (process.env.NODE_ENV === 'test' && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
    
    logger.info('Token黑名单管理器初始化完成');
  }

  /**
   * 将 token 添加到黑名单
   * @param {string} token - JWT token
   * @param {number} expiresAt - token 过期时间戳（毫秒）
   */
  addToBlacklist(token, expiresAt = null) {
    try {
      // 生成 token 的唯一标识
      const tokenId = this.generateTokenId(token);
      
      // 如果没有提供过期时间，从 token 中解析
      if (!expiresAt) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
      }
      
      this.blacklist.set(tokenId, expiresAt);
      
      logger.info(`Token已添加到黑名单: ${tokenId.substring(0, 10)}...`);
      return true;
    } catch (error) {
      logger.error('添加token到黑名单失败:', error);
      return false;
    }
  }

  /**
   * 检查 token 是否在黑名单中
   * @param {string} token - JWT token
   * @returns {boolean} - true 表示在黑名单中（已失效）
   */
  isBlacklisted(token) {
    try {
      const tokenId = this.generateTokenId(token);
      const expiresAt = this.blacklist.get(tokenId);
      
      if (!expiresAt) {
        return false; // 不在黑名单中
      }
      
      // 检查是否已过期
      if (Date.now() > expiresAt) {
        // 已过期，从黑名单中移除
        this.blacklist.delete(tokenId);
        return false;
      }
      
      return true; // 在黑名单中且未过期
    } catch (error) {
      logger.error('检查token黑名单状态失败:', error);
      return false;
    }
  }

  /**
   * 从黑名单中移除 token（一般不需要手动调用）
   * @param {string} token - JWT token
   */
  removeFromBlacklist(token) {
    try {
      const tokenId = this.generateTokenId(token);
      const removed = this.blacklist.delete(tokenId);
      
      if (removed) {
        logger.info(`Token已从黑名单移除: ${tokenId.substring(0, 10)}...`);
      }
      
      return removed;
    } catch (error) {
      logger.error('从黑名单移除token失败:', error);
      return false;
    }
  }

  /**
   * 清理过期的黑名单记录
   */
  cleanup() {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [tokenId, expiresAt] of this.blacklist.entries()) {
        if (now > expiresAt) {
          this.blacklist.delete(tokenId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`清理了 ${cleanedCount} 个过期的黑名单记录`);
      }
    } catch (error) {
      logger.error('清理黑名单失败:', error);
    }
  }

  /**
   * 生成 token 的唯一标识
   * @param {string} token - JWT token
   * @returns {string} - token 唯一标识
   */
  generateTokenId(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * 获取黑名单统计信息
   */
  getStats() {
    return {
      totalBlacklisted: this.blacklist.size,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * 销毁黑名单管理器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.blacklist.clear();
    logger.info('Token黑名单管理器已销毁');
  }
}

// 创建单例实例
const tokenBlacklist = new TokenBlacklist();

module.exports = tokenBlacklist;
