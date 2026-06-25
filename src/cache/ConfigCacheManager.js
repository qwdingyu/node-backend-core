/**
 * 配置缓存管理器
 * 
 * 提供统一的配置缓存管理功能，支持：
 * - LRU缓存策略
 * - TTL过期机制
 * - 热点数据处理
 * - 防穿透机制
 * - 性能监控
 * 
 * @author Backend Core Lib Team
 * @version 1.0.0
 * @since 2024-07-16
 */

class ConfigCacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5分钟
    this.cache = new Map();
    this.accessTimes = new Map();
    this.accessCounts = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      errors: 0
    };
    
    // 清理定时器
    this.cleanupInterval = options.cleanupInterval || 60000; // 1分钟
    this.setupCleanupTimer();
    
    // 热点数据配置
    this.hotDataThreshold = options.hotDataThreshold || 10;
    this.hotDataTTLMultiplier = options.hotDataTTLMultiplier || 2;
    
    // 防穿透配置
    this.nullCacheTTL = options.nullCacheTTL || 60000; // 1分钟
  }

  /**
   * 获取缓存数据
   * @param {string} key 缓存键
   * @returns {*} 缓存值，不存在或过期返回null
   */
  get(key) {
    try {
      const item = this.cache.get(key);
      if (!item) {
        this.stats.misses++;
        return null;
      }
      
      // 检查是否过期
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }
      
      // 更新访问时间和次数
      this.accessTimes.set(key, Date.now());
      this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);
      
      this.stats.hits++;
      return item.data;
    } catch (error) {
      this.stats.errors++;
      console.error('ConfigCacheManager.get error:', error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   * @param {string} key 缓存键
   * @param {*} data 缓存值
   * @param {number} ttl 过期时间（毫秒）
   */
  set(key, data, ttl = this.defaultTTL) {
    try {
      // LRU清理
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      
      // 检查是否为热点数据
      const accessCount = this.accessCounts.get(key) || 0;
      if (accessCount >= this.hotDataThreshold) {
        ttl = ttl * this.hotDataTTLMultiplier;
      }
      
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
      
      this.accessTimes.set(key, Date.now());
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error('ConfigCacheManager.set error:', error);
    }
  }

  /**
   * 删除缓存数据
   * @param {string} key 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    this.accessTimes.delete(key);
    this.accessCounts.delete(key);
  }

  /**
   * 检查缓存是否存在且未过期
   * @param {string} key 缓存键
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 批量获取
   * @param {string[]} keys 缓存键数组
   * @returns {Array} 结果数组
   */
  mget(keys) {
    return keys.map(key => ({
      key,
      value: this.get(key),
      hit: this.has(key)
    }));
  }

  /**
   * 批量设置
   * @param {Array} items 设置项数组 [{key, value, ttl?}]
   */
  mset(items) {
    items.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * 设置热点数据
   * @param {string} key 缓存键
   * @param {*} data 缓存值
   * @param {number} ttl 基础TTL
   */
  setHot(key, data, ttl = this.defaultTTL) {
    this.set(key, data, ttl * this.hotDataTTLMultiplier);
  }

  /**
   * 缓存空值（防穿透）
   * @param {string} key 缓存键
   * @param {number} ttl 过期时间
   */
  setNull(key, ttl = this.nullCacheTTL) {
    this.set(key, null, ttl);
  }

  /**
   * LRU清理
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
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
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.accessCounts.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      errors: 0
    };
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';
    
    return {
      ...this.stats,
      hitRate: hitRate + '%',
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * 获取内存使用估算
   * @returns {Object} 内存使用信息
   */
  getMemoryUsage() {
    const cacheSize = this.cache.size;
    const accessTimesSize = this.accessTimes.size;
    const accessCountsSize = this.accessCounts.size;
    
    // 粗略估算内存使用
    const estimatedBytes = (cacheSize + accessTimesSize + accessCountsSize) * 100;
    
    return {
      estimatedBytes,
      estimatedKB: (estimatedBytes / 1024).toFixed(2),
      cacheEntries: cacheSize
    };
  }

  /**
   * 获取热点数据信息
   * @returns {Array} 热点数据列表
   */
  getHotData() {
    const hotData = [];
    
    for (const [key, count] of this.accessCounts) {
      if (count >= this.hotDataThreshold) {
        hotData.push({
          key,
          accessCount: count,
          lastAccess: this.accessTimes.get(key)
        });
      }
    }
    
    return hotData.sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * 销毁缓存管理器
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

module.exports = ConfigCacheManager;
