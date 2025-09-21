/**
 * Knight Security Service
 * Advanced security features and access control
 */

const Logger = require('../utils/logger');
const database = require('../database');
const crypto = require('crypto');

class SecurityService {
  constructor() {
    this.rateLimits = new Map(); // Store rate limiting data
    this.securityLogs = []; // Store recent security events
    this.maxAttempts = 5; // Max failed attempts before lockout
    this.lockoutTime = 15 * 60 * 1000; // 15 minutes lockout
    this.rateLimitWindow = 60 * 1000; // 1 minute window
    this.maxRequestsPerWindow = 30; // Max 30 requests per minute
  }

  async getUserPermissions(userId) {
    try {
      // Get user permissions from database
      let permissions = await database.getSetting(`user_${userId}_permissions`);
      
      if (!permissions) {
        // Default permissions for regular users
        permissions = {
          role: 'user',
          commands: ['help', 'ping', 'music', 'youtube', 'weather', 'sticker', 'status'],
          canDownload: true,
          canSchedule: false,
          isAdmin: false
        };
      } else {
        permissions = JSON.parse(permissions);
      }
      
      return permissions;
    } catch (error) {
      // Return default user permissions on error
      return {
        role: 'user',
        commands: ['help', 'ping', 'music', 'youtube', 'weather', 'sticker', 'status'],
        canDownload: true,
        canSchedule: false,
        isAdmin: false
      };
    }
  }

  async setUserPermissions(userId, permissions) {
    try {
      await database.setSetting(`user_${userId}_permissions`, JSON.stringify(permissions));
      return true;
    } catch (error) {
      Logger.error(`Failed to set user permissions: ${error.message}`);
      return false;
    }
  }

  async checkPermission(userId, commandName) {
    try {
      const permissions = await this.getUserPermissions(userId);
      
      // Admins can do everything
      if (permissions.isAdmin) {
        return { allowed: true, reason: 'admin' };
      }
      
      // Check if command is in allowed list
      if (permissions.commands.includes(commandName)) {
        return { allowed: true, reason: 'authorized' };
      }
      
      return { allowed: false, reason: 'unauthorized_command' };
    } catch (error) {
      Logger.error(`Permission check failed: ${error.message}`);
      // Fail safe - deny access on error
      return { allowed: false, reason: 'error' };
    }
  }

  async checkRateLimit(userId) {
    try {
      const now = Date.now();
      const userLimits = this.rateLimits.get(userId) || {
        requests: [],
        failedAttempts: 0,
        lockedUntil: null
      };
      
      // Check if user is locked out
      if (userLimits.lockedUntil && now < userLimits.lockedUntil) {
        return {
          allowed: false,
          reason: 'locked_out',
          timeRemaining: userLimits.lockedUntil - now
        };
      }
      
      // Remove old requests outside the window
      userLimits.requests = userLimits.requests.filter(
        timestamp => now - timestamp < this.rateLimitWindow
      );
      
      // Check rate limit
      if (userLimits.requests.length >= this.maxRequestsPerWindow) {
        return {
          allowed: false,
          reason: 'rate_limit_exceeded',
          requestsInWindow: userLimits.requests.length
        };
      }
      
      // Add current request
      userLimits.requests.push(now);
      this.rateLimits.set(userId, userLimits);
      
      return { allowed: true, requestsRemaining: this.maxRequestsPerWindow - userLimits.requests.length };
    } catch (error) {
      Logger.error(`Rate limit check failed: ${error.message}`);
      // Fail safe - allow access on error
      return { allowed: true };
    }
  }

  async recordFailedAttempt(userId) {
    try {
      const userLimits = this.rateLimits.get(userId) || {
        requests: [],
        failedAttempts: 0,
        lockedUntil: null
      };
      
      userLimits.failedAttempts += 1;
      
      // Lock user if too many failed attempts
      if (userLimits.failedAttempts >= this.maxAttempts) {
        userLimits.lockedUntil = Date.now() + this.lockoutTime;
        Logger.warn(`User ${userId} locked out due to failed attempts`);
      }
      
      this.rateLimits.set(userId, userLimits);
      
      // Log security event
      this.logSecurityEvent('failed_attempt', userId, {
        attempts: userLimits.failedAttempts,
        locked: !!userLimits.lockedUntil
      });
      
      return userLimits.failedAttempts;
    } catch (error) {
      Logger.error(`Failed to record failed attempt: ${error.message}`);
      return 0;
    }
  }

  async resetFailedAttempts(userId) {
    try {
      const userLimits = this.rateLimits.get(userId);
      if (userLimits) {
        userLimits.failedAttempts = 0;
        userLimits.lockedUntil = null;
        this.rateLimits.set(userId, userLimits);
      }
    } catch (error) {
      Logger.error(`Failed to reset failed attempts: ${error.message}`);
    }
  }

  logSecurityEvent(eventType, userId, details = {}) {
    try {
      const event = {
        timestamp: new Date().toISOString(),
        eventType,
        userId,
        details
      };
      
      this.securityLogs.push(event);
      
      // Keep only recent logs (last 100)
      if (this.securityLogs.length > 100) {
        this.securityLogs = this.securityLogs.slice(-100);
      }
      
      // Log to file or database for persistence
      Logger.info(`SECURITY: ${eventType} for user ${userId}`, details);
    } catch (error) {
      Logger.error(`Failed to log security event: ${error.message}`);
    }
  }

  async getSecurityLogs(limit = 20) {
    try {
      // Return recent security logs
      return this.securityLogs.slice(-limit).reverse();
    } catch (error) {
      Logger.error(`Failed to get security logs: ${error.message}`);
      return [];
    }
  }

  async getUserSecurityStatus(userId) {
    try {
      const userLimits = this.rateLimits.get(userId) || {
        requests: [],
        failedAttempts: 0,
        lockedUntil: null
      };
      
      const now = Date.now();
      const activeRequests = userLimits.requests.filter(
        timestamp => now - timestamp < this.rateLimitWindow
      );
      
      return {
        userId,
        requestsInWindow: activeRequests.length,
        maxRequestsPerWindow: this.maxRequestsPerWindow,
        failedAttempts: userLimits.failedAttempts,
        maxAttempts: this.maxAttempts,
        isLocked: userLimits.lockedUntil && now < userLimits.lockedUntil,
        lockoutTimeRemaining: userLimits.lockedUntil ? userLimits.lockedUntil - now : 0,
        rateLimitReset: this.rateLimitWindow - (now - (activeRequests[0] || now))
      };
    } catch (error) {
      Logger.error(`Failed to get user security status: ${error.message}`);
      return null;
    }
  }

  async promoteUser(userId, newRole = 'admin') {
    try {
      const currentPermissions = await this.getUserPermissions(userId);
      
      // Promote user
      const newPermissions = {
        ...currentPermissions,
        role: newRole,
        isAdmin: newRole === 'admin',
        commands: [...new Set([...currentPermissions.commands, 'group', 'schedule', 'backup', 'security'])]
      };
      
      const success = await this.setUserPermissions(userId, newPermissions);
      
      if (success) {
        this.logSecurityEvent('user_promoted', userId, {
          fromRole: currentPermissions.role,
          toRole: newRole
        });
        Logger.info(`User ${userId} promoted to ${newRole}`);
      }
      
      return success;
    } catch (error) {
      Logger.error(`Failed to promote user: ${error.message}`);
      return false;
    }
  }

  async demoteUser(userId, newRole = 'user') {
    try {
      const currentPermissions = await this.getUserPermissions(userId);
      
      // Demote user
      const newPermissions = {
        ...currentPermissions,
        role: newRole,
        isAdmin: false,
        commands: currentPermissions.commands.filter(cmd => 
          !['group', 'schedule', 'backup', 'security'].includes(cmd)
        )
      };
      
      const success = await this.setUserPermissions(userId, newPermissions);
      
      if (success) {
        this.logSecurityEvent('user_demoted', userId, {
          fromRole: currentPermissions.role,
          toRole: newRole
        });
        Logger.info(`User ${userId} demoted to ${newRole}`);
      }
      
      return success;
    } catch (error) {
      Logger.error(`Failed to demote user: ${error.message}`);
      return false;
    }
  }

  async getAdminUsers() {
    try {
      // This would query the database for admin users
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      Logger.error(`Failed to get admin users: ${error.message}`);
      return [];
    }
  }

  cleanupOldRateLimits(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const now = Date.now();
      for (const [userId, limits] of this.rateLimits.entries()) {
        // Remove rate limits for users not active in 24 hours
        const lastActivity = Math.max(
          ...limits.requests,
          limits.lockedUntil || 0
        );
        
        if (now - lastActivity > maxAge) {
          this.rateLimits.delete(userId);
          Logger.info(`Cleaned up rate limits for inactive user: ${userId}`);
        }
      }
    } catch (error) {
      Logger.error(`Failed to cleanup rate limits: ${error.message}`);
    }
  }

  generateSecureToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      Logger.error(`Failed to generate secure token: ${error.message}`);
      // Fallback to less secure method
      return Math.random().toString(36).substring(2, length + 2);
    }
  }
}

module.exports = new SecurityService();