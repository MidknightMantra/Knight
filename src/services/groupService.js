/**
 * Knight Group Management Service
 * Advanced group administration and management features
 */

const Logger = require('../utils/logger');
const database = require('../database');

class GroupService {
  constructor() {
    this.moderationRules = new Map();
  }

  async getGroupInfo(groupId) {
    try {
      // Get group info from database
      const group = await database.db.get('SELECT * FROM groups WHERE jid = ?', [groupId]);
      return group;
    } catch (error) {
      Logger.error(`Failed to get group info: ${error.message}`);
      return null;
    }
  }

  async createGroup(groupId, groupName) {
    try {
      await database.db.run(`
        INSERT OR IGNORE INTO groups (jid, name, created_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [groupId, groupName]);
      
      return await this.getGroupInfo(groupId);
    } catch (error) {
      Logger.error(`Failed to create group: ${error.message}`);
      return null;
    }
  }

  async updateGroupStats(groupId, commandsUsed = 0) {
    try {
      await database.db.run(`
        UPDATE groups 
        SET commands_used = commands_used + ? 
        WHERE jid = ?
      `, [commandsUsed, groupId]);
    } catch (error) {
      Logger.error(`Failed to update group stats: ${error.message}`);
    }
  }

  async setGroupSetting(groupId, setting, value) {
    try {
      const settingKey = `group_${groupId}_${setting}`;
      await database.setSetting(settingKey, value);
      return true;
    } catch (error) {
      Logger.error(`Failed to set group setting: ${error.message}`);
      return false;
    }
  }

  async getGroupSetting(groupId, setting) {
    try {
      const settingKey = `group_${groupId}_${setting}`;
      return await database.getSetting(settingKey);
    } catch (error) {
      Logger.error(`Failed to get group setting: ${error.message}`);
      return null;
    }
  }

  async setWelcomeMessage(groupId, message) {
    return await this.setGroupSetting(groupId, 'welcome_message', message);
  }

  async getWelcomeMessage(groupId) {
    return await this.getGroupSetting(groupId, 'welcome_message');
  }

  async setLeaveMessage(groupId, message) {
    return await this.setGroupSetting(groupId, 'leave_message', message);
  }

  async getLeaveMessage(groupId) {
    return await this.getGroupSetting(groupId, 'leave_message');
  }

  async setAutoModRules(groupId, rules) {
    return await this.setGroupSetting(groupId, 'automod_rules', JSON.stringify(rules));
  }

  async getAutoModRules(groupId) {
    try {
      const rules = await this.getGroupSetting(groupId, 'automod_rules');
      return rules ? JSON.parse(rules) : [];
    } catch (error) {
      return [];
    }
  }

  async setAdminOnly(groupId, adminOnly) {
    return await this.setGroupSetting(groupId, 'admin_only', adminOnly ? 'true' : 'false');
  }

  async isAdminOnly(groupId) {
    const setting = await this.getGroupSetting(groupId, 'admin_only');
    return setting === 'true';
  }

  async isUserAdmin(groupId, userJid) {
    try {
      // This would check actual group admin status
      // For now, we'll simulate with database
      const user = await database.getUser(userJid);
      // In real implementation, you'd check WhatsApp group admin status
      return user && user.jid.includes('admin'); // Placeholder logic
    } catch (error) {
      return false;
    }
  }

  async getGroupMembers(groupId) {
    try {
      // This would fetch actual group members
      // For now, return placeholder data
      return [
        { jid: 'member1@s.whatsapp.net', name: 'Member 1', isAdmin: false },
        { jid: 'member2@s.whatsapp.net', name: 'Member 2', isAdmin: true },
        { jid: 'member3@s.whatsapp.net', name: 'Member 3', isAdmin: false }
      ];
    } catch (error) {
      return [];
    }
  }

  async getGroupStats(groupId) {
    try {
      const group = await this.getGroupInfo(groupId);
      if (!group) return null;
      
      const memberCount = (await this.getGroupMembers(groupId)).length;
      const recentActivity = await database.db.get(`
        SELECT COUNT(*) as count 
        FROM command_stats 
        WHERE user_jid LIKE ? 
        AND executed_at > datetime('now', '-24 hours')
      `, [`${groupId}%`]);
      
      return {
        ...group,
        memberCount,
        recentActivity: recentActivity ? recentActivity.count : 0
      };
    } catch (error) {
      Logger.error(`Failed to get group stats: ${error.message}`);
      return null;
    }
  }

  async addModerationRule(groupId, rule) {
    try {
      const rules = await this.getAutoModRules(groupId);
      rules.push(rule);
      await this.setAutoModRules(groupId, rules);
      return true;
    } catch (error) {
      return false;
    }
  }

  async removeModerationRule(groupId, ruleIndex) {
    try {
      const rules = await this.getAutoModRules(groupId);
      if (ruleIndex >= 0 && ruleIndex < rules.length) {
        rules.splice(ruleIndex, 1);
        await this.setAutoModRules(groupId, rules);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async listModerationRules(groupId) {
    return await this.getAutoModRules(groupId);
  }

  async shouldModerateMessage(groupId, message, userJid) {
    try {
      const rules = await this.getAutoModRules(groupId);
      const isAdmin = await this.isUserAdmin(groupId, userJid);
      
      if (isAdmin) return false; // Admins are exempt from moderation
      
      for (const rule of rules) {
        if (rule.type === 'keyword' && message.toLowerCase().includes(rule.pattern.toLowerCase())) {
          return { shouldBlock: true, reason: rule.reason || 'Keyword violation' };
        }
        if (rule.type === 'regex' && new RegExp(rule.pattern, 'i').test(message)) {
          return { shouldBlock: true, reason: rule.reason || 'Pattern violation' };
        }
      }
      
      return { shouldBlock: false };
    } catch (error) {
      Logger.error(`Moderation check failed: ${error.message}`);
      return { shouldBlock: false };
    }
  }
}

module.exports = new GroupService();