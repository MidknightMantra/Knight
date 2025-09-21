/**
 * Advanced Group Management Command
 * Comprehensive group administration and management
 */

const groupService = require('../services/groupService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'group',
  aliases: ['grup', 'g'],
  category: 'admin',
  description: 'Advanced group management and administration',
  usage: '!group <subcommand> [options]',
  
  async execute(client, message, args) {
    // Check if message is from a group
    if (!message.key.remoteJid.includes('@g.us')) {
      return '❌ This command can only be used in groups!';
    }
    
    const subcommand = args[0]?.toLowerCase() || 'help';
    const groupId = message.key.remoteJid;
    const userJid = message.key.participant || message.key.remoteJid;
    
    // Create group record if it doesn't exist
    await groupService.createGroup(groupId, 'Unknown Group');
    
    switch (subcommand) {
      case 'help':
        return `🛡️ *Knight Group Management*
        
Available subcommands:
▫️ help - Show this help
▫️ info - Show group information
▫️ stats - Show group statistics
▫️ members - List group members
▫️ welcome <message> - Set welcome message
▫️ leave <message> - Set leave message
▫️ adminonly [on/off] - Toggle admin-only mode
▫️ automod add <type> <pattern> [reason] - Add moderation rule
▫️ automod remove <index> - Remove moderation rule
▫️ automod list - List all moderation rules
▫️ settings - Show current group settings

Examples:
!group welcome Welcome to our group, @user!
!group adminonly on
!group automod add keyword spam "No spam allowed"
!group stats`;

      case 'info':
        try {
          const groupMetadata = await client.groupMetadata(groupId);
          const groupSettings = await groupService.getGroupInfo(groupId);
          
          return `🛡️ *Group Information*
          
📝 Name: ${groupMetadata.subject}
👥 Members: ${groupMetadata.participants.length}
🆔 ID: ${groupMetadata.id}
📅 Created: ${new Date(groupMetadata.creation * 1000).toLocaleString()}
👑 Owner: ${groupMetadata.owner || 'Unknown'}
📊 Commands Used: ${groupSettings?.commands_used || 0}`;
        } catch (error) {
          return '❌ Failed to get group information.';
        }

      case 'stats':
        try {
          const stats = await groupService.getGroupStats(groupId);
          if (!stats) {
            return '❌ Failed to get group statistics.';
          }
          
          return `📊 *Group Statistics*
          
📝 Name: ${stats.name}
👥 Members: ${stats.memberCount}
📈 Commands Used: ${stats.commands_used}
⚡ Recent Activity (24h): ${stats.recentActivity}
📅 Created: ${new Date(stats.created_at).toLocaleDateString()}`;
        } catch (error) {
          return '❌ Failed to get group statistics.';
        }

      case 'members':
        try {
          const members = await groupService.getGroupMembers(groupId);
          let response = `👥 *Group Members* (${members.length})\n\n`;
          
          members.forEach((member, index) => {
            const adminMark = member.isAdmin ? ' 👑' : '';
            response += `${index + 1}. ${member.name || member.jid}${adminMark}\n`;
          });
          
          return response;
        } catch (error) {
          return '❌ Failed to get group members.';
        }

      case 'welcome':
        if (args.length < 2) {
          const currentMessage = await groupService.getWelcomeMessage(groupId);
          return `👋 *Welcome Message*
          
Current: ${currentMessage || 'Not set'}

Usage: !group welcome <message>
Variables: @user (user name), @group (group name)

Example: !group welcome Welcome to @group, @user!`;
        }
        
        const welcomeMessage = args.slice(1).join(' ');
        await groupService.setWelcomeMessage(groupId, welcomeMessage);
        return `✅ Welcome message set to: ${welcomeMessage}`;

      case 'leave':
        if (args.length < 2) {
          const currentMessage = await groupService.getLeaveMessage(groupId);
          return `👋 *Leave Message*
          
Current: ${currentMessage || 'Not set'}

Usage: !group leave <message>
Variables: @user (user name), @group (group name)

Example: !group leave Goodbye @user!`;
        }
        
        const leaveMessage = args.slice(1).join(' ');
        await groupService.setLeaveMessage(groupId, leaveMessage);
        return `✅ Leave message set to: ${leaveMessage}`;

      case 'adminonly':
        const toggle = args[1]?.toLowerCase();
        if (!toggle) {
          const isAdminOnly = await groupService.isAdminOnly(groupId);
          return `🛡️ *Admin-Only Mode*
          
Status: ${isAdminOnly ? 'ON' : 'OFF'}

Usage: !group adminonly [on/off]

When ON, only admins can use bot commands.`;
        }
        
        if (toggle === 'on' || toggle === 'off') {
          await groupService.setAdminOnly(groupId, toggle === 'on');
          return `✅ Admin-only mode turned ${toggle.toUpperCase()}`;
        } else {
          return '❌ Invalid option. Use "on" or "off"';
        }

      case 'automod':
        if (args.length < 2) {
          return `🤖 *Auto Moderation*
          
Subcommands:
▫️ add <type> <pattern> [reason] - Add rule
▫️ remove <index> - Remove rule
▫️ list - List all rules

Types: keyword, regex

Examples:
!group automod add keyword spam "No spamming"
!group automod add regex \\b(fuck|shit)\\b "Inappropriate language"`;
        }
        
        const modSubcommand = args[1].toLowerCase();
        
        switch (modSubcommand) {
          case 'add':
            if (args.length < 4) {
              return '❌ Usage: !group automod add <type> <pattern> [reason]';
            }
            
            const ruleType = args[2].toLowerCase();
            const pattern = args[3];
            const reason = args.slice(4).join(' ') || 'Violation';
            
            if (!['keyword', 'regex'].includes(ruleType)) {
              return '❌ Invalid rule type. Use "keyword" or "regex"';
            }
            
            const rule = { type: ruleType, pattern, reason };
            await groupService.addModerationRule(groupId, rule);
            return `✅ Moderation rule added: ${ruleType} "${pattern}" - ${reason}`;
            
          case 'remove':
            if (args.length < 3) {
              return '❌ Usage: !group automod remove <index>';
            }
            
            const index = parseInt(args[2]);
            if (isNaN(index)) {
              return '❌ Please provide a valid rule number';
            }
            
            const removed = await groupService.removeModerationRule(groupId, index);
            return removed ? 
              `✅ Rule #${index} removed` : 
              `❌ Failed to remove rule #${index}`;
            
          case 'list':
            const rules = await groupService.listModerationRules(groupId);
            if (rules.length === 0) {
              return '🤖 No moderation rules set.';
            }
            
            let ruleList = '🤖 *Moderation Rules*\n\n';
            rules.forEach((rule, index) => {
              ruleList += `${index}. ${rule.type}: "${rule.pattern}" - ${rule.reason}\n`;
            });
            
            return ruleList;
            
          default:
            return '❌ Invalid automod subcommand.';
        }

      case 'settings':
        try {
          const isAdminOnly = await groupService.isAdminOnly(groupId);
          const welcomeMsg = await groupService.getWelcomeMessage(groupId);
          const leaveMsg = await groupService.getLeaveMessage(groupId);
          const rules = await groupService.listModerationRules(groupId);
          
          return `⚙️ *Group Settings*
          
🛡️ Admin-Only Mode: ${isAdminOnly ? 'ON' : 'OFF'}
👋 Welcome Message: ${welcomeMsg || 'Not set'}
👋 Leave Message: ${leaveMsg || 'Not set'}
🤖 Auto-Moderation Rules: ${rules.length}`;
        } catch (error) {
          return '❌ Failed to get group settings.';
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !group help for available commands`;
    }
  }
};