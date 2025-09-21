/**
 * AI Chat Command
 * Intelligent conversation with artificial intelligence
 */

const aiService = require('../services/aiService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'ai',
  aliases: ['chat', 'ask', 'bot'],
  category: 'utility',
  description: 'Have an intelligent conversation with AI',
  usage: '!ai <your_message> or !ai --clear to reset conversation',
  
  async execute(client, message, args) {
    if (args.length === 0) {
      return `🤖 *Knight AI Chat*
      
Usage: !ai <your_message>

Examples:
!ai Hello, how are you?
!ai What can you help me with?
!ai Tell me a joke
!ai What's the weather like?
!ai --clear (to reset conversation)

Features:
▫️ Natural language conversations
▫️ Context-aware responses
▫️ Remembers conversation history
▫️ Helpful assistance with Knight features

I'm here to help! What would you like to chat about?`;
    }
    
    // Check for special commands
    if (args[0] === '--clear' || args[0] === 'clear') {
      const userId = message.key.remoteJid;
      aiService.clearConversationHistory(userId);
      return "✅ Conversation history cleared. Starting fresh!";
    }
    
    if (args[0] === '--status' || args[0] === 'status') {
      const userId = message.key.remoteJid;
      const summary = aiService.getConversationSummary(userId);
      return `🤖 *AI Chat Status*
      
Messages: ${summary.messageCount}
Last Active: ${summary.lastActive ? summary.lastActive.toLocaleString() : 'Never'}
Topics: ${summary.topics.join(', ') || 'None'}`;
    }
    
    try {
      const prompt = args.join(' ');
      const userId = message.key.remoteJid;
      
      // Get context information
      const context = {
        userName: message.pushName || 'User',
        time: new Date().toLocaleString(),
        group: message.key.remoteJid.includes('@g.us') ? 'group' : 'private'
      };
      
      await client.sendMessage(message.key.remoteJid, { 
        text: '🤖 Thinking...' 
      });
      
      const response = await aiService.generateResponse(prompt, userId, context);
      
      return `🤖 *AI Response*
      
${response}`;
      
    } catch (error) {
      Logger.error(`AI command error: ${error.message}`);
      return `❌ Sorry, I'm having trouble thinking right now. Please try again later.`;
    }
  }
};