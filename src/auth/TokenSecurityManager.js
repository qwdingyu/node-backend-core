/**
 * Token安全管理器
 * 
 * 提供Token安全管理功能，支持：
 * - Token缓存优化
 * - Token黑名单管理
 * - 异常访问检测
 * - 频率限制
 * - 安全统计
 * 
 * @author Backend Core Lib Team
 * @version 1.0.0
 * @since 2024-07-16
 */

class TokenSecurityManager {
  constructor(options = {}) {
    // Token缓存
    this.tokenCache = new Map();
    this.userCache = new Map();
    this.tokenCacheTTL = options.tokenCacheTTL || 300000; // 5分钟
    this.userCacheTTL = options.userCacheTTL || 600000; // 10分钟
    
    // 安全管理
    this.blacklist = new Set();
    this.suspiciousTokens = new Map();
    this.rateLimiter = new Map();
    
    // 配置参数
    this.maxRequestsPerMinute = options.maxRequestsPerMinute || 100;
    this.suspiciousThreshold = options.suspiciousThreshold || 200;
    this.cleanupInterval = options.cleanupInterval || 300000; // 5分钟
    
    // 统计信息
    this.stats = {
      tokenCacheHits: 0,
      tokenCacheMisses: 0,
      userCacheHits: 0,
      userCacheMisses: 0,
      blacklistedTokens: 0,
      suspiciousActivities: 0,
      rateLimitViolations: 0
    };
    
    // 启动清理定时器
    this.setupCleanupTimer();
  }

  /**
   * 验证Token（带缓存优化）
   * @param {string} token JWT Token
   * @param {Function} jwtVerify JWT验证函数
   * @param {Function} userFinder 用户查找函数
   * @param {Object} request 请求对象
   * @returns {Object} 用户对象
   */
  async verifyTokenWithCache(token, jwtVerify, userFinder, request = {}) {
    // 检查黑名单
    if (this.isTokenBlacklisted(token)) {
      throw new Error("Token已被禁用");
    }

    // 检查异常活动
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userAgent = request.headers?.['user-agent'] || 'unknown';
    
    if (this.checkSuspiciousActivity(token, ip, userAgent)) {
      this.stats.suspiciousActivities++;
      console.warn(`Suspicious token activity detected: ${ip}`);
    }

    // 检查Token缓存
    const tokenCacheKey = this.getTokenCacheKey(token);
    const cachedToken = this.tokenCache.get(tokenCacheKey);
    
    if (cachedToken && Date.now() - cachedToken.timestamp < this.tokenCacheTTL) {
      this.stats.tokenCacheHits++;
      return await this.getUserFromCache(cachedToken.userId, userFinder);
    }
    
    this.stats.tokenCacheMisses++;

    // 验证JWT
    const decoded = jwtVerify(token);
    
    // 获取用户信息
    const user = await this.getUserFromCache(decoded.user_id, userFinder);
    
    // 缓存Token验证结果
    this.tokenCache.set(tokenCacheKey, {
      userId: decoded.user_id,
      timestamp: Date.now()
    });

    return user;
  }

  /**
   * 从缓存获取用户信息
   * @param {number} userId 用户ID
   * @param {Function} userFinder 用户查找函数
   * @returns {Object} 用户对象
   */
  async getUserFromCache(userId, userFinder) {
    const userCacheKey = `user_${userId}`;
    const cachedUser = this.userCache.get(userCacheKey);
    
    if (cachedUser && Date.now() - cachedUser.timestamp < this.userCacheTTL) {
      this.stats.userCacheHits++;
      return cachedUser.user;
    }
    
    this.stats.userCacheMisses++;

    // 从数据库获取用户
    const user = await userFinder(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    // 缓存用户信息
    this.userCache.set(userCacheKey, {
      user: user,
      timestamp: Date.now()
    });

    return user;
  }

  /**
   * 生成Token缓存键
   * @param {string} token JWT Token
   * @returns {string} 缓存键
   */
  getTokenCacheKey(token) {
    // 使用Token的前20个字符作为缓存键（避免存储完整Token）
    return `token_${token.substring(0, 20)}`;
  }

  /**
   * 检查Token是否在黑名单
   * @param {string} token JWT Token
   * @returns {boolean} 是否在黑名单
   */
  isTokenBlacklisted(token) {
    const tokenKey = this.getTokenCacheKey(token);
    return this.blacklist.has(tokenKey);
  }

  /**
   * 添加Token到黑名单
   * @param {string} token JWT Token
   * @param {string} reason 原因
   */
  blacklistToken(token, reason = 'manual') {
    const tokenKey = this.getTokenCacheKey(token);
    this.blacklist.add(tokenKey);
    this.stats.blacklistedTokens++;
    
    // 清除相关缓存
    this.tokenCache.delete(tokenKey);
    
    console.log(`Token blacklisted: ${reason}`);
  }

  /**
   * 检查异常使用模式
   * @param {string} token JWT Token
   * @param {string} ip IP地址
   * @param {string} userAgent 用户代理
   * @returns {boolean} 是否异常
   */
  checkSuspiciousActivity(token, ip, userAgent) {
    const key = `${this.getTokenCacheKey(token)}_${ip}`;
    const now = Date.now();
    
    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, { 
        count: 1, 
        firstSeen: now,
        userAgent 
      });
      return false;
    }

    const record = this.rateLimiter.get(key);
    record.count++;

    // 检查是否超过频率限制
    const timeWindow = 60000; // 1分钟
    if (record.count > this.maxRequestsPerMinute && now - record.firstSeen < timeWindow) {
      this.stats.rateLimitViolations++;
      
      // 标记为可疑Token
      const tokenKey = this.getTokenCacheKey(token);
      this.suspiciousTokens.set(tokenKey, { 
        ip, 
        userAgent, 
        reason: 'rate_limit',
        timestamp: now
      });
      
      return true;
    }

    // 检查User-Agent变化（可能的Token盗用）
    if (record.userAgent !== userAgent) {
      const tokenKey = this.getTokenCacheKey(token);
      this.suspiciousTokens.set(tokenKey, { 
        ip, 
        userAgent, 
        reason: 'user_agent_change',
        timestamp: now
      });
      
      return true;
    }

    return false;
  }

  /**
   * 清除用户相关缓存
   * @param {number} userId 用户ID
   */
  clearUserCache(userId) {
    const userCacheKey = `user_${userId}`;
    this.userCache.delete(userCacheKey);
    
    // 清除相关Token缓存
    for (const [key, value] of this.tokenCache) {
      if (value.userId === userId) {
        this.tokenCache.delete(key);
      }
    }
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    // 清理Token缓存
    for (const [key, value] of this.tokenCache) {
      if (now - value.timestamp > this.tokenCacheTTL) {
        this.tokenCache.delete(key);
        cleanedCount++;
      }
    }
    
    // 清理用户缓存
    for (const [key, value] of this.userCache) {
      if (now - value.timestamp > this.userCacheTTL) {
        this.userCache.delete(key);
        cleanedCount++;
      }
    }
    
    // 清理频率限制记录
    for (const [key, value] of this.rateLimiter) {
      if (now - value.firstSeen > 300000) { // 5分钟
        this.rateLimiter.delete(key);
        cleanedCount++;
      }
    }
    
    // 清理可疑Token记录
    for (const [key, value] of this.suspiciousTokens) {
      if (now - value.timestamp > 3600000) { // 1小时
        this.suspiciousTokens.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * 设置清理定时器
   */
  setupCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const tokenCacheTotal = this.stats.tokenCacheHits + this.stats.tokenCacheMisses;
    const userCacheTotal = this.stats.userCacheHits + this.stats.userCacheMisses;
    
    const tokenCacheHitRate = tokenCacheTotal > 0 
      ? (this.stats.tokenCacheHits / tokenCacheTotal * 100).toFixed(2) 
      : '0.00';
      
    const userCacheHitRate = userCacheTotal > 0 
      ? (this.stats.userCacheHits / userCacheTotal * 100).toFixed(2) 
      : '0.00';

    return {
      ...this.stats,
      tokenCacheHitRate: tokenCacheHitRate + '%',
      userCacheHitRate: userCacheHitRate + '%',
      tokenCacheSize: this.tokenCache.size,
      userCacheSize: this.userCache.size,
      blacklistSize: this.blacklist.size,
      suspiciousTokensCount: this.suspiciousTokens.size,
      rateLimiterSize: this.rateLimiter.size
    };
  }

  /**
   * 获取可疑活动报告
   * @returns {Array} 可疑活动列表
   */
  getSuspiciousActivities() {
    const activities = [];
    
    for (const [tokenKey, activity] of this.suspiciousTokens) {
      activities.push({
        tokenKey,
        ...activity,
        age: Date.now() - activity.timestamp
      });
    }
    
    return activities.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      tokenCacheHits: 0,
      tokenCacheMisses: 0,
      userCacheHits: 0,
      userCacheMisses: 0,
      blacklistedTokens: 0,
      suspiciousActivities: 0,
      rateLimitViolations: 0
    };
  }

  /**
   * 销毁管理器
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.tokenCache.clear();
    this.userCache.clear();
    this.blacklist.clear();
    this.suspiciousTokens.clear();
    this.rateLimiter.clear();
    this.resetStats();
  }
}

module.exports = TokenSecurityManager;
