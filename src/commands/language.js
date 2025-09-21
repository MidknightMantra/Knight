/**
 * Language Command
 * Change Knight's response language
 */

const languageService = require('../services/languageService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'language',
  aliases: ['lang', 'lugha'],
  category: 'utility',
  description: 'Change Knight\'s language',
  usage: '!language <language_code> or !language --list',
  
  async execute(client, message, args) {
    const userId = message.key.remoteJid;
    
    if (args.length === 0) {
      const currentLang = await languageService.getUserLanguage(userId);
      return `🌐 *${languageService.translate('current_language', currentLang)}* ${languageService.getLanguageName(currentLang)}
      
${languageService.translate('available_languages', currentLang)}
${languageService.getSupportedLanguages().map(code => 
  `${code} - ${languageService.getLanguageName(code)}`
).join('\n')}

${languageService.translate('help_command', currentLang)}: !language es (${languageService.getLanguageName('es')})
${languageService.translate('help_command', currentLang)}: !language sw (${languageService.getLanguageName('sw')})`;
    }
    
    // Check for list command
    if (args[0] === '--list' || args[0] === 'list') {
      const currentLang = await languageService.getUserLanguage(userId);
      let response = `🌐 *${languageService.translate('available_languages', currentLang)}*\n\n`;
      
      languageService.getSupportedLanguages().forEach(code => {
        const isSelected = code === currentLang ? ' ✅' : '';
        response += `${code} - ${languageService.getLanguageName(code)}${isSelected}\n`;
      });
      
      return response;
    }
    
    // Set language
    const languageCode = args[0].toLowerCase();
    
    if (languageService.getSupportedLanguages().includes(languageCode)) {
      const success = await languageService.setUserLanguage(userId, languageCode);
      
      if (success) {
        return `✅ ${languageService.translate('set_language', languageCode)}`;
      } else {
        const currentLang = await languageService.getUserLanguage(userId);
        return `❌ ${languageService.translate('language_not_supported', currentLang)}`;
      }
    } else {
      const currentLang = await languageService.getUserLanguage(userId);
      return `❌ ${languageService.translate('language_not_supported', currentLang)}

${languageService.translate('available_languages', currentLang)}:
${languageService.getSupportedLanguages().map(code => 
  `${code} - ${languageService.getLanguageName(code)}`
).join(', ')}`;
    }
  }
};