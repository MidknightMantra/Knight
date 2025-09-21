/**
 * Security Command
 * Advanced security features and access control
 */

const securityService = require('../services/securityService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'security',
  aliases: ['sec', 'protect'],
  category: 'admin',
  description: 'Advanced security features and access control',
  usage: '!security <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'status';
    const userId = message.key.remoteJid;
    
    // Check if user has security command permissions
    const permissionCheck = await securityService.checkPermission(userId, 'security');
    if (!permissionCheck.allowed && !(await securityService.getUserPermissions(userId)).isAdmin) {
      return '❌ Access denied. You do not have permission to use security commands.';
    }
    
    switch (subcommand) {
      case 'help':
        return `🛡️ *Knight Security System*
        
Available subcommands:
▫️ help - Show this help
▫️ status - Show your security status
▫️ logs - Show recent security logs
▫️ promote <user> [role] - Promote user to admin/moderator
▫️ demote <user> [role] - Demote user from admin/moderator
▫️ permissions <user> - Show user permissions
▫️ rate-limit - Show rate limiting status
▫️ reset <user> - Reset user security status

Examples:
!security status
!security logs
!security promote @user admin
!security demote @user
!security permissions @user`;

      case 'status':
        try {
          const status = await securityService.getUserSecurityStatus(userId);
          if (!status) {
            return '❌ Failed to get security status.';
          }
          
          return `🛡️ *Your Security Status*
          
📊 Requests this minute: ${status.requestsInWindow}/${status.maxRequestsPerWindow}
🔐 Failed attempts: ${status.failedAttempts}/${status.maxAttempts}
🔒 Account locked: ${status.isLocked ? 'Yes' : 'No'}
${status.isLocked ? `⏰ Lockout ends in: ${Math.ceil(status.lockoutTimeRemaining / 1000)} seconds` : ''}
⏱️ Rate limit reset: ${Math.ceil(status.rateLimitReset / 1000)} seconds`;
        } catch (error) {
          Logger.error(`Security status error: ${error.message}`);
          return `❌ Failed to get security status: ${error.message}`;
        }

      case 'logs':
        try {
          const logs = await securityService.getSecurityLogs(10);
          
          if (logs.length === 0) {
            return '🛡️ No recent security events.';
          }
          
          let response = `🛡️ *Recent Security Events* (${logs.length})\n\n`;
          
          logs.forEach((log, index) => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            response += `${index + 1}. [${time}] ${log.eventType}
👤 ${log.userId.substring(0, 15)}...
📝 ${JSON.stringify(log.details).substring(0, 50)}${JSON.stringify(log.details).length > 50 ? '...' : ''}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Security logs error: ${error.message}`);
          return `❌ Failed to get security logs: ${error.message}`;
        }

      case 'promote':
        if (args.length < 2) {
          return '❌ Usage: !security promote <user_jid> [role]';
        }
        
        try {
          const targetUser = args[1];
          const role = args[2] || 'admin';
          
          // Validate JID format (basic validation)
          if (!targetUser.includes('@')) {
            return '❌ Invalid user JID format.';
          }
          
          const success = await securityService.promoteUser(targetUser, role);
          
          return success ? 
            `✅ User ${targetUser} promoted to ${role}` : 
            `❌ Failed to promote user ${targetUser}`;
        } catch (error) {
          Logger.error(`Security promote error: ${error.message}`);
          return `❌ Failed to promote user: ${error.message}`;
        }

      case 'demote':
        if (args.length < 2) {
          return '❌ Usage: !security demote <user_jid> [role]';
        }
        
        try {
          const targetUser = args[1];
          const role = args[2] || 'user';
          
          // Validate JID format (basic validation)
          if (!targetUser.includes('@')) {
            return '❌ Invalid user JID format.';
          }
          
          const success = await securityService.demoteUser(targetUser, role);
          
          return success ? 
            `✅ User ${targetUser} demoted to ${role}` : 
            `❌ Failed to demote user ${targetUser}`;
        } catch (error) {
          Logger.error(`Security demote error: ${error.message}`);
          return `❌ Failed to demote user: ${error.message}`;
        }

      case 'permissions':
        if (args.length < 2) {
          // Show own permissions
          const permissions = await securityService.getUserPermissions(userId);
          return `🛡️ *Your Permissions*
          
Role: ${permissions.role}
Admin: ${permissions.isAdmin ? 'Yes' : 'No'}
Commands: ${permissions.commands.join(', ')}
Can Download: ${permissions.canDownload ? 'Yes' : 'No'}
Can Schedule: ${permissions.canSchedule ? 'Yes' : 'No'}`;
        } else {
          // Show other user's permissions (admin only)
          const targetUser = args[1];
          
          // Validate JID format
          if (!targetUser.includes('@')) {
            return '❌ Invalid user JID format.';
          }
          
          const permissions = await securityService.getUserPermissions(targetUser);
          return `🛡️ *Permissions for ${targetUser.substring(0, 20)}...*
          
Role: ${permissions.role}
Admin: ${permissions.isAdmin ? 'Yes' : 'No'}
Commands: ${permissions.commands.join(', ')}
Can Download: ${permissions.canDownload ? 'Yes' : 'No'}
Can Schedule: ${permissions.canSchedule ? 'Yes' : 'No'}`;
        }

      case 'rate-limit':
        try {
          const rateLimitStatus = await securityService.checkRateLimit(userId);
          return `🛡️ *Rate Limit Status*
          
Allowed: ${rateLimitStatus.allowed ? 'Yes' : 'No'}
${rateLimitStatus.reason ? `Reason: ${rateLimitStatus.reason}` : ''}
${rateLimitStatus.requestsRemaining !== undefined ? `Requests remaining: ${rateLimitStatus.requestsRemaining}` : ''}
${rateLimitStatus.timeRemaining ? `Lockout ends in: ${Math.ceil(rateLimitStatus.timeRemaining / 1000)} seconds` : ''}`;
        } catch (error) {
          Logger.error(`Security rate-limit error: ${error.message}`);
          return `❌ Failed to check rate limit: ${error.message}`;
        }

      case 'reset':
        if (args.length < 2) {
          // Reset own security status
          await securityService.resetFailedAttempts(userId);
          return '✅ Your security status has been reset.';
        } else {
          // Reset other user's security status (admin only)
          const targetUser = args[1];
          
          // Validate JID format
          if (!targetUser.includes('@')) {
            return '❌ Invalid user JID format.';
          }
          
          await securityService.resetFailedAttempts(targetUser);
          return `✅ Security status for ${targetUser} has been reset.`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !security help for available commands`;
    }
  }
};