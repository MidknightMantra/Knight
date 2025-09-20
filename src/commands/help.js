/**
 * Help Command
 * Displays available commands and usage information
 */

const { registry } = require("./index");

module.exports = {
  name: "help",
  aliases: ["h", "commands"],
  category: "general",
  description: "Display available commands",
  usage: "!help [command]",

  async execute(client, message, args) {
    const prefix = "!"; // This will come from config later

    if (args[0]) {
      // Show specific command help
      const command = registry.get(args[0]);
      if (command) {
        return `
⚔️ *${command.name.toUpperCase()} Command*

📝 *Description:* ${command.description}
📌 *Usage:* ${prefix}${command.usage}
📋 *Category:* ${command.category}
${
  command.aliases && command.aliases.length > 0
    ? `🔄 *Aliases:* ${command.aliases.map((a) => prefix + a).join(", ")}`
    : ""
}
        `.trim();
      } else {
        return `❌ Command "${args[0]}" not found.`;
      }
    } else {
      // Show all commands
      const categories = registry.getCategories();
      let helpText = `⚔️ *Knight Bot Commands*\n\n`;

      categories.forEach((category) => {
        const commands = registry.getByCategory(category);
        if (commands.length > 0) {
          helpText += `*${category.toUpperCase()}*\n`;
          commands.forEach((cmd) => {
            helpText += `▫️ ${prefix}${cmd.name} - ${cmd.description}\n`;
          });
          helpText += `\n`;
        }
      });

      helpText += `📝 *Tip:* Use ${prefix}help <command> for detailed info`;

      return helpText;
    }
  },
};
