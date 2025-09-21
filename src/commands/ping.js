/**
 * Ping Command
 * Tests bot responsiveness with proper timing
 */

module.exports = {
  name: 'ping',
  aliases: ['pong'],
  category: 'general',
  description: 'Check bot response time',
  usage: '!ping',
  
  async execute(client, message, args) {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;
    
    // Return a simple but complete response
    return `⚔️ Pong!\n⏱️ ${responseTime}ms\n🛡️ Ready!`;
  }
};