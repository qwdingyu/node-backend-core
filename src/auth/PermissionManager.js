/**
 * 权限管理器
 * 
 * 提供细粒度权限控制功能，支持：
 * - 资源级权限控制
 * - 角色权限映射
 * - 动态权限检查
 * - 权限缓存优化
 * - 向后兼容性
 * 
 * @author Backend Core Lib Team
 * @version 1.0.0
 * @since 2024-07-16
 */

class PermissionManager {
  constructor(options = {}) {
    // 权限定义存储
    this.permissions = new Map();
    this.roles = new Map();
    this.userPermissions = new Map();
    
    // 权限缓存
    this.permissionCache = new Map();
    this.cacheTTL = options.cacheTTL || 300000; // 5分钟
    
    // 统计信息
    this.stats = {
      checks: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // 初始化默认权限
    this.initializeDefaultPermissions();
  }

  /**
   * 初始化默认权限配置
   */
  initializeDefaultPermissions() {
    // 定义基础资源
    this.defineResource('user', ['create', 'read', 'update', 'delete', 'list']);
    this.defineResource('order', ['create', 'read', 'update', 'delete', 'list', 'audit']);
    this.defineResource('finance', ['read', 'audit', 'export', 'approve']);
    this.defineResource('config', ['read', 'update']);
    this.defineResource('report', ['read', 'export']);
    
    // 定义基础角色
    this.defineRole('admin', {
      user: ['create', 'read', 'update', 'delete', 'list'],
      order: ['create', 'read', 'update', 'delete', 'list', 'audit'],
      finance: ['read', 'audit', 'export', 'approve'],
      config: ['read', 'update'],
      report: ['read', 'export']
    });
    
    this.defineRole('user', {
      user: ['read', 'update'], // 只能读取和更新自己的信息
      order: ['create', 'read'], // 只能创建和查看自己的订单
      finance: ['read'], // 只能查看自己的财务信息
      report: ['read'] // 只能查看自己的报表
    });
  }

  /**
   * 定义资源及其可用操作
   * @param {string} resource 资源名称
   * @param {string[]} actions 可用操作列表
   */
  defineResource(resource, actions) {
    this.permissions.set(resource, new Set(actions));
  }

  /**
   * 定义角色及其权限
   * @param {string} role 角色名称
   * @param {Object} permissions 权限映射 {resource: [actions]}
   */
  defineRole(role, permissions) {
    const rolePermissions = new Map();
    
    for (const [resource, actions] of Object.entries(permissions)) {
      rolePermissions.set(resource, new Set(actions));
    }
    
    this.roles.set(role, rolePermissions);
  }

  /**
   * 兼容现有权限检查
   * @param {Object} user 用户对象
   * @param {string} requiredRole 所需角色
   * @returns {boolean} 是否有权限
   */
  checkLegacyPermission(user, requiredRole) {
    if (!user) return false;
    
    switch (requiredRole) {
      case 'admin':
        return user.is_admin === 1;
      case 'user':
        return user.status === 1;
      case 'auth':
        return user.is_auth === 1;
      case 'director':
        return user.user_type === 2;
      default:
        return false;
    }
  }

  /**
   * 新的细粒度权限检查
   * @param {Object} user 用户对象
   * @param {string} resource 资源名称
   * @param {string} action 操作名称
   * @param {Object} context 上下文信息
   * @returns {boolean} 是否有权限
   */
  checkNewPermission(user, resource, action, context = {}) {
    if (!user) return false;
    
    // 检查缓存
    const cacheKey = `${user.id}_${resource}_${action}`;
    const cached = this.permissionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      this.stats.cacheHits++;
      return cached.result;
    }
    
    this.stats.cacheMisses++;
    
    // 执行权限检查
    let hasPermission = false;
    
    // 1. 检查管理员权限（管理员拥有所有权限）
    if (user.is_admin === 1) {
      hasPermission = true;
    } else {
      // 2. 检查角色权限
      const userRole = this.getUserRole(user);
      const rolePermissions = this.roles.get(userRole);
      
      if (rolePermissions && rolePermissions.has(resource)) {
        const resourceActions = rolePermissions.get(resource);
        hasPermission = resourceActions.has(action);
      }
      
      // 3. 检查资源所有权（用户只能操作自己的资源）
      if (!hasPermission && context.resourceUserId) {
        hasPermission = this.checkResourceOwnership(user, context.resourceUserId, resource, action);
      }
    }
    
    // 缓存结果
    this.permissionCache.set(cacheKey, {
      result: hasPermission,
      timestamp: Date.now()
    });
    
    return hasPermission;
  }

  /**
   * 统一权限检查入口
   * @param {Object} user 用户对象
   * @param {string} resource 资源名称
   * @param {string} action 操作名称
   * @param {Object} context 上下文信息
   * @returns {boolean} 是否有权限
   */
  checkPermission(user, resource, action, context = {}) {
    this.stats.checks++;
    
    // 优先检查新权限系统
    if (this.permissions.has(resource)) {
      return this.checkNewPermission(user, resource, action, context);
    }
    
    // 降级到旧权限系统
    return this.checkLegacyPermission(user, resource);
  }

  /**
   * 批量权限检查
   * @param {Object} user 用户对象
   * @param {Array} permissions 权限列表 [{resource, action, context?}]
   * @returns {Array} 检查结果
   */
  checkMultiplePermissions(user, permissions) {
    return permissions.map(({ resource, action, context = {} }) => ({
      resource,
      action,
      allowed: this.checkPermission(user, resource, action, context),
      context
    }));
  }

  /**
   * 获取用户角色
   * @param {Object} user 用户对象
   * @returns {string} 用户角色
   */
  getUserRole(user) {
    if (user.is_admin === 1) return 'admin';
    return 'user';
  }

  /**
   * 检查资源所有权
   * @param {Object} user 用户对象
   * @param {number} resourceUserId 资源所有者ID
   * @param {string} resource 资源名称
   * @param {string} action 操作名称
   * @returns {boolean} 是否有权限
   */
  checkResourceOwnership(user, resourceUserId, resource, action) {
    // 用户只能对自己的资源执行特定操作
    const allowedSelfActions = ['read', 'update'];
    
    return parseInt(user.id) === parseInt(resourceUserId) && 
           allowedSelfActions.includes(action);
  }

  /**
   * 获取用户所有权限
   * @param {Object} user 用户对象
   * @returns {Object} 用户权限映射
   */
  getUserPermissions(user) {
    if (!user) return {};
    
    const userRole = this.getUserRole(user);
    const rolePermissions = this.roles.get(userRole);
    
    if (!rolePermissions) return {};
    
    const permissions = {};
    for (const [resource, actions] of rolePermissions) {
      permissions[resource] = Array.from(actions);
    }
    
    return permissions;
  }

  /**
   * 清除权限缓存
   * @param {number} userId 用户ID（可选）
   */
  clearCache(userId = null) {
    if (userId) {
      // 清除特定用户的缓存
      for (const key of this.permissionCache.keys()) {
        if (key.startsWith(`${userId}_`)) {
          this.permissionCache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.permissionCache.clear();
    }
  }

  /**
   * 获取权限统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    const hitRate = total > 0 ? (this.stats.cacheHits / total * 100).toFixed(2) : '0.00';
    
    return {
      ...this.stats,
      cacheHitRate: hitRate + '%',
      cacheSize: this.permissionCache.size,
      definedResources: this.permissions.size,
      definedRoles: this.roles.size
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      checks: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * 销毁权限管理器
   */
  destroy() {
    this.permissions.clear();
    this.roles.clear();
    this.userPermissions.clear();
    this.permissionCache.clear();
    this.resetStats();
  }
}

module.exports = PermissionManager;
