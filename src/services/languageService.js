/**
 * Knight Language Service
 * Multi-language support and translation system
 */

const Logger = require('../utils/logger');
const database = require('../database');

class LanguageService {
  constructor() {
    this.defaultLanguage = 'en';
    this.supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'sw'];
    this.translations = this.loadTranslations();
  }

  loadTranslations() {
    return {
      // English (default)
      en: {
        greeting: "Hello! I'm Knight, your WhatsApp assistant.",
        help: "Here's what I can help you with:",
        music_help: "🎵 Music: Search and download music",
        youtube_help: "📺 YouTube: Download videos and audio",
        weather_help: "🌤️ Weather: Get weather information",
        sticker_help: "🎨 Stickers: Create stickers from images",
        group_help: "🛡️ Groups: Manage group settings",
        schedule_help: "⏰ Schedule: Set reminders and announcements",
        ai_help: "🤖 AI Chat: Have intelligent conversations",
        language_help: "🌐 Language: Change my language",
        set_language: "Language set to English",
        language_not_supported: "Sorry, that language is not supported yet.",
        available_languages: "Available languages:",
        current_language: "Current language:",
        help_command: "help",
        music_command: "music",
        youtube_command: "youtube",
        weather_command: "weather",
        sticker_command: "sticker",
        group_command: "group",
        schedule_command: "schedule",
        ai_command: "ai",
        language_command: "language"
      },
      
      // Spanish
      es: {
        greeting: "¡Hola! Soy Knight, tu asistente de WhatsApp.",
        help: "Aquí está lo que puedo ayudarte:",
        music_help: "🎵 Música: Buscar y descargar música",
        youtube_help: "📺 YouTube: Descargar videos y audio",
        weather_help: "🌤️ Clima: Obtener información del clima",
        sticker_help: "🎨 Pegatinas: Crear pegatinas de imágenes",
        group_help: "🛡️ Grupos: Administrar configuraciones de grupo",
        schedule_help: "⏰ Programar: Establecer recordatorios y anuncios",
        ai_help: "🤖 Chat AI: Tener conversaciones inteligentes",
        language_help: "🌐 Idioma: Cambiar mi idioma",
        set_language: "Idioma establecido a Español",
        language_not_supported: "Lo siento, ese idioma aún no es compatible.",
        available_languages: "Idiomas disponibles:",
        current_language: "Idioma actual:",
        help_command: "ayuda",
        music_command: "musica",
        youtube_command: "youtube",
        weather_command: "clima",
        sticker_command: "pegatina",
        group_command: "grupo",
        schedule_command: "programar",
        ai_command: "ia",
        language_command: "idioma"
      },
      
      // French
      fr: {
        greeting: "Bonjour ! Je suis Knight, votre assistant WhatsApp.",
        help: "Voici ce que je peux vous aider à faire :",
        music_help: "🎵 Musique : Rechercher et télécharger de la musique",
        youtube_help: "📺 YouTube : Télécharger des vidéos et de l'audio",
        weather_help: "🌤️ Météo : Obtenir les informations météorologiques",
        sticker_help: "🎨 Autocollants : Créer des autocollants à partir d'images",
        group_help: "🛡️ Groupes : Gérer les paramètres de groupe",
        schedule_help: "⏰ Planifier : Définir des rappels et des annonces",
        ai_help: "🤖 Chat IA : Avoir des conversations intelligentes",
        language_help: "🌐 Langue : Changer ma langue",
        set_language: "Langue définie sur Français",
        language_not_supported: "Désolé, cette langue n'est pas encore prise en charge.",
        available_languages: "Langues disponibles :",
        current_language: "Langue actuelle :",
        help_command: "aide",
        music_command: "musique",
        youtube_command: "youtube",
        weather_command: "meteo",
        sticker_command: "autocollant",
        group_command: "groupe",
        schedule_command: "planifier",
        ai_command: "ia",
        language_command: "langue"
      },
      
      // Swahili
      sw: {
        greeting: "Habari! Mimi ni Knight, msaidizi wako wa WhatsApp.",
        help: "Hapa ndio ninachoweza kukusaidia:",
        music_help: "🎵 Muziki: Tafuta na upakue muziki",
        youtube_help: "📺 YouTube: Pakua video na sauti",
        weather_help: "🌤️ Hewa: Pata taarifa za hali ya hewa",
        sticker_help: "🎨 Vibandiko: Tengeneza vibandiko kutoka kwa picha",
        group_help: "🛡️ Vikundi: Simamia mipangilio ya kikundi",
        schedule_help: "⏰ Ratiba: Weka vikumbusho na matangazo",
        ai_help: "🤖 Gumzo la AI: Fanya mazungumzo ya akili",
        language_help: "🌐 Lugha: Badilisha lugha yangu",
        set_language: "Lugha imewekwa kwa Kiswahili",
        language_not_supported: "Samahani, lugha hiyo bado haiungwa mkono.",
        available_languages: "Lugha zinazopatikana:",
        current_language: "Lugha ya sasa:",
        help_command: "msaada",
        music_command: "muziki",
        youtube_command: "youtube",
        weather_command: "hali",
        sticker_command: "vibandiko",
        group_command: "kikundi",
        schedule_command: "ratiba",
        ai_command: "ai",
        language_command: "lugha"
      }
    };
  }

  async getUserLanguage(userId) {
    try {
      const setting = await database.getSetting(`user_${userId}_language`);
      return setting || this.defaultLanguage;
    } catch (error) {
      return this.defaultLanguage;
    }
  }

  async setUserLanguage(userId, language) {
    try {
      if (this.supportedLanguages.includes(language)) {
        await database.setSetting(`user_${userId}_language`, language);
        return true;
      }
      return false;
    } catch (error) {
      Logger.error(`Failed to set user language: ${error.message}`);
      return false;
    }
  }

  translate(key, language = this.defaultLanguage) {
    try {
      // Try to get translation for requested language
      if (this.translations[language] && this.translations[language][key]) {
        return this.translations[language][key];
      }
      
      // Fall back to English
      if (this.translations[this.defaultLanguage] && this.translations[this.defaultLanguage][key]) {
        return this.translations[this.defaultLanguage][key];
      }
      
      // If key not found, return key itself
      return key;
    } catch (error) {
      Logger.error(`Translation error for key ${key}: ${error.message}`);
      return key;
    }
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  getLanguageName(code) {
    const names = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'sw': 'Kiswahili'
    };
    return names[code] || code;
  }

  // Auto-detect language based on user input (simplified)
  detectLanguage(text) {
    const commonWords = {
      'en': ['the', 'and', 'for', 'you', 'with', 'can', 'help'],
      'es': ['el', 'la', 'y', 'para', 'con', 'puede', 'ayuda'],
      'fr': ['le', 'la', 'et', 'pour', 'avec', 'peut', 'aide'],
      'sw': ['na', 'kwa', 'ya', 'na', 'na', 'inaweza', 'msaada']
    };
    
    const words = text.toLowerCase().split(/\s+/);
    const scores = {};
    
    Object.keys(commonWords).forEach(lang => {
      scores[lang] = words.filter(word => commonWords[lang].includes(word)).length;
    });
    
    let detectedLang = this.defaultLanguage;
    let maxScore = 0;
    
    Object.keys(scores).forEach(lang => {
      if (scores[lang] > maxScore) {
        maxScore = scores[lang];
        detectedLang = lang;
      }
    });
    
    return detectedLang;
  }

  // Generate help message in user's language
  async generateHelpMessage(userId) {
    const userLang = await this.getUserLanguage(userId);
    
    return `${this.translate('greeting', userLang)}

${this.translate('help', userLang)}
      
${this.translate('music_help', userLang)}
${this.translate('youtube_help', userLang)}
${this.translate('weather_help', userLang)}
${this.translate('sticker_help', userLang)}
${this.translate('group_help', userLang)}
${this.translate('schedule_help', userLang)}
${this.translate('ai_help', userLang)}
${this.translate('language_help', userLang)}

${this.translate('current_language', userLang)} ${this.getLanguageName(userLang)}`;
  }
}

module.exports = new LanguageService();