/**
 * Ping Command
 * Tests bot responsiveness
 */

module.exports = {
  name: "ping",
  aliases: ["pong"],
  category: "general",
  description: "Check bot response time",
  usage: "!ping",

  async execute(client, message, args) {
    const startTime = Date.now();

    // Simulate some processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    const responseTime = Date.now() - startTime;

    return `⚔️ *Pong!*\n⏱️ Response time: ${responseTime}ms\n🛡️ Knight is ready for battle!`;
  },
};
