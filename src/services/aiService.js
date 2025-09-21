/**
 * Knight AI Service
 * Artificial intelligence chat and response generation
 */

const Logger = require('../utils/logger');

class AIService {
  constructor() {
    this.conversations = new Map(); // Store conversation history
    this.maxHistory = 10; // Maximum messages to remember per conversation
  }

  // Simulate AI response (in real implementation, you'd connect to AI APIs)
  async generateResponse(prompt, userId, context = {}) {
    try {
      Logger.info(`Generating AI response for user: ${userId}`);
      
      // Get conversation history
      let history = this.getConversationHistory(userId);
      
      // Add current prompt to history
      history.push({ role: 'user', content: prompt, timestamp: Date.now() });
      
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate contextual response based on prompt and history
      let response = this.generateContextualResponse(prompt, history, context);
      
      // Add response to history
      history.push({ role: 'assistant', content: response, timestamp: Date.now() });
      
      // Update conversation history
      this.updateConversationHistory(userId, history);
      
      return response;
    } catch (error) {
      Logger.error(`AI response generation failed: ${error.message}`);
      return "I'm having trouble processing that right now. Please try again later.";
    }
  }

  generateContextualResponse(prompt, history, context) {
    // Simple rule-based responses (in real implementation, this would use AI models)
    const lowerPrompt = prompt.toLowerCase();
    
    // Greetings
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey')) {
      return "Hello there! I'm Knight, your helpful assistant. How can I help you today?";
    }
    
    // Help requests
    if (lowerPrompt.includes('help') || lowerPrompt.includes('what can you do')) {
      return `I'm Knight, your multi-functional WhatsApp bot! I can help you with:
      
🎵 Music: Search and download music
📺 YouTube: Download videos and audio
🌤️ Weather: Get weather information
🎨 Stickers: Create stickers from images
🛡️ Groups: Manage group settings
⏰ Schedule: Set reminders and announcements
🤖 AI Chat: Have intelligent conversations

Try commands like:
!music ohangla
!youtube <url> audio
!weather Nairobi
!help for more options`;
    }
    
    // Weather queries
    if (lowerPrompt.includes('weather') || lowerPrompt.includes('temperature')) {
      return "I can help you check the weather! Try using the !weather command followed by a location. For example: !weather Nairobi";
    }
    
    // Music queries
    if (lowerPrompt.includes('music') || lowerPrompt.includes('song')) {
      return "I can help you search for and download music! Try using the !music command followed by what you're looking for. For example: !music ohangla";
    }
    
    // YouTube queries
    if (lowerPrompt.includes('youtube') || lowerPrompt.includes('video')) {
      return "I can download YouTube videos and audio for you! Try using the !youtube command with a video URL. For example: !youtube <url> audio";
    }
    
    // Time queries
    if (lowerPrompt.includes('time') || lowerPrompt.includes('date')) {
      const now = new Date();
      return `The current time is ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}.`;
    }
    
    // Knight-specific queries
    if (lowerPrompt.includes('knight') || lowerPrompt.includes('who are you')) {
      return "I'm Knight! A powerful multi-platform WhatsApp bot created to help you with various tasks. I can download music and videos, check weather, create stickers, manage groups, and much more!";
    }
    
    // Math calculations
    if (this.isMathQuery(lowerPrompt)) {
      try {
        const result = this.calculateMath(lowerPrompt);
        return `The result is: ${result}`;
      } catch (error) {
        return "I couldn't calculate that. Please try a simpler math expression.";
      }
    }
    
    // Default intelligent response
    const responses = [
      "That's an interesting point! I'm here to help with any questions you might have.",
      "I understand what you're asking. How else can I assist you today?",
      "Thanks for sharing that with me. Is there something specific you'd like help with?",
      "I'm designed to be helpful! Let me know if there's anything I can do for you.",
      "I'm processing your request. What else would you like to know?",
      "I'm here 24/7 to help! Feel free to ask me anything.",
      "That's a great question. I'll do my best to help you with it."
    ];
    
    // Use conversation history to make responses more contextual
    if (history.length > 2) {
      const lastUserMessage = history[history.length - 2];
      if (lastUserMessage && lastUserMessage.content.toLowerCase().includes('music')) {
        return "Speaking of music, I can help you search for and download songs! Just use the !music command.";
      }
      if (lastUserMessage && lastUserMessage.content.toLowerCase().includes('weather')) {
        return "Weather information is just a command away! Try !weather <location> for current conditions.";
      }
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  isMathQuery(prompt) {
    // Simple check for basic math operations
    return /[\d\+\-\*\/\(\)\.\s]+/.test(prompt) && 
           /[+\-*/]/.test(prompt) && 
           !/[a-zA-Z]{3,}/.test(prompt); // Avoid matching words
  }

  calculateMath(expression) {
    // Remove spaces and evaluate simple math expressions
    const cleanExpr = expression.replace(/\s/g, '');
    // Safety check - only allow numbers and basic operators
    if (!/^[\d+\-*/().]+$/.test(cleanExpr)) {
      throw new Error('Invalid expression');
    }
    // Evaluate (in real implementation, use a safer math library)
    return eval(cleanExpr);
  }

  getConversationHistory(userId) {
    return this.conversations.get(userId) || [];
  }

  updateConversationHistory(userId, history) {
    // Keep only the last N messages
    if (history.length > this.maxHistory) {
      history = history.slice(-this.maxHistory);
    }
    this.conversations.set(userId, history);
  }

  clearConversationHistory(userId) {
    this.conversations.delete(userId);
  }

  // Get conversation summary
  getConversationSummary(userId) {
    const history = this.getConversationHistory(userId);
    return {
      messageCount: history.length,
      lastActive: history.length > 0 ? new Date(history[history.length - 1].timestamp) : null,
      topics: this.extractTopics(history)
    };
  }

  extractTopics(history) {
    // Simple topic extraction based on keywords
    const topics = new Set();
    const allText = history.map(msg => msg.content.toLowerCase()).join(' ');
    
    if (allText.includes('music') || allText.includes('song')) topics.add('Music');
    if (allText.includes('weather') || allText.includes('temperature')) topics.add('Weather');
    if (allText.includes('youtube') || allText.includes('video')) topics.add('Videos');
    if (allText.includes('help') || allText.includes('assist')) topics.add('Help');
    
    return Array.from(topics);
  }

  // Simulate connection to real AI providers (OpenAI, etc.)
  async connectToProvider(provider = 'openai') {
    Logger.info(`Connecting to AI provider: ${provider}`);
    
    // In real implementation, you would:
    // 1. Load API keys from config
    // 2. Initialize provider SDK
    // 3. Test connection
    // 4. Return provider instance
    
    return {
      name: provider,
      connected: true,
      model: 'gpt-3.5-turbo', // Default model
      status: 'ready'
    };
  }
}

module.exports = new AIService();