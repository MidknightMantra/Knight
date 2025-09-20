#!/usr/bin/env node

/**
 * Knight CLI Interface
 * Terminal-based access to Knight Bot
 */

const readline = require("readline");
const { stdin: input, stdout: output } = require("process");

console.log("⚔️ Knight Bot CLI Interface");
console.log('Type "help" for available commands or "exit" to quit\n');

const rl = readline.createInterface({ input, output });

rl.setPrompt("knight> ");
rl.prompt();

rl.on("line", (input) => {
  const command = input.trim().toLowerCase();

  switch (command) {
    case "help":
      console.log("Available commands:");
      console.log("  help    - Show this help");
      console.log("  status  - Show bot status");
      console.log("  exit    - Exit CLI");
      break;
    case "status":
      console.log("Knight Bot Status: Offline (Not connected to WhatsApp yet)");
      break;
    case "exit":
      console.log("Goodbye! ⚔️");
      rl.close();
      return;
    case "":
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Type "help" for available commands');
  }

  rl.prompt();
}).on("close", () => {
  process.exit(0);
});
