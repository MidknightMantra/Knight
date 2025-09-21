/**
 * Help Command
 * Display available commands in user's language
 */

const { registry } = require('./index');
const languageService = require('../services/languageService');

module.exports = {
  name: 'help',
  aliases: ['h', 'commands', 'msaada', 'ayuda'],
  category: 'general',
  description: 'Display available commands',
  usage: '!help [command]',
  
  async execute(client, message, args) {
    const userId = message.key.remoteJid;
    const userLang = await languageService.getUserLanguage(userId);
    const prefix = '!'; // This will come from config later
    
    if (args[0]) {
      // Show specific command help
      const command = registry.get(args[0]);
      if (command) {
        return `
⚔️ *${command.name.toUpperCase()} ${languageService.translate('help_command', userLang)}*

📝 *${languageService.translate('description', userLang)}:* ${command.description}
📌 *${languageService.translate('usage', userLang)}:* ${prefix}${command.usage}
📋 *${languageService.translate('category', userLang)}:* ${command.category}
${command.aliases && command.aliases.length > 0 ? 
  `🔄 *${languageService.translate('aliases', userLang)}:* ${command.aliases.map(a => prefix + a).join(', ')}` : ''}
        `.trim();
      } else {
        return `❌ ${languageService.translate('command_not_found', userLang)}.`;
      }
    } else {
      // Show all commands
      const categories = registry.getCategories();
      let helpText = `⚔️ *Knight ${languageService.translate('help_command', userLang)}*\n\n`;
      
      categories.forEach(category => {
        const commands = registry.getByCategory(category);
        if (commands.length > 0) {
          helpText += `*${category.toUpperCase()}*\n`;
          commands.forEach(cmd => {
            helpText += `▫️ ${prefix}${cmd.name} - ${cmd.description}\n`;
          });
          helpText += `\n`;
        }
      });
      
      helpText += `${languageService.translate('tip', userLang)}: ${prefix}${languageService.translate('help_command', userLang)} <${languageService.translate('command', userLang)}> ${languageService.translate('for_detailed_info', userLang)}`;
      
      return helpText;
    }
  }
};