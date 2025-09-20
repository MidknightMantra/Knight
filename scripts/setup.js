#!/usr/bin/env node

/**
 * Knight Setup Wizard
 * Interactive setup for first-time users
 */

const readline = require("readline");
const fs = require("fs");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("⚔️ Knight Bot Setup Wizard");
console.log("========================\n");

// Check if .env exists
const envPath = path.join(__dirname, "..", ".env");
const envExamplePath = path.join(__dirname, "..", ".env.example");

async function setup() {
  if (fs.existsSync(envPath)) {
    rl.question(
      "⚠️  .env file already exists. Overwrite? (y/N): ",
      async (answer) => {
        if (answer.toLowerCase() === "y") {
          await createEnvFile();
        } else {
          console.log("✅ Setup skipped. Using existing configuration.");
          rl.close();
        }
      }
    );
  } else {
    await createEnvFile();
  }
}

async function createEnvFile() {
  console.log("\n📝 Let's configure your Knight Bot:\n");

  const config = {};

  // Bot Configuration
  config.BOT_NAME =
    (await askQuestion("Bot Name (default: Knight): ")) || "Knight";
  config.BOT_PREFIX =
    (await askQuestion("Command Prefix (default: !): ")) || "!";
  config.OWNER_NUMBER = await askQuestion(
    "Owner WhatsApp Number (with country code, e.g., 1234567890): "
  );
  config.OWNER_NAME = (await askQuestion("Owner Name: ")) || "Knight Owner";

  // Platform Selection
  console.log("\n🖥️  Deployment Platform:");
  console.log("1. Local Development");
  console.log("2. Heroku");
  console.log("3. Railway");
  console.log("4. Render");
  console.log("5. Replit");
  console.log("6. VPS/Panel");

  const platform =
    (await askQuestion("Select platform (1-6, default: 1): ")) || "1";

  let platformType = "local";
  switch (platform) {
    case "2":
      platformType = "heroku";
      break;
    case "3":
      platformType = "railway";
      break;
    case "4":
      platformType = "render";
      break;
    case "5":
      platformType = "replit";
      break;
    case "6":
      platformType = "panel";
      break;
    default:
      platformType = "local";
  }

  config.PLATFORM = platformType;

  // Generate .env file
  let envContent = fs.readFileSync(envExamplePath, "utf8");

  // Replace placeholders
  Object.keys(config).forEach((key) => {
    const regex = new RegExp(`${key}=.*`, "g");
    envContent = envContent.replace(regex, `${key}=${config[key]}`);
  });

  fs.writeFileSync(envPath, envContent);
  console.log("\n✅ Configuration saved to .env file!");
  console.log("📝 Next steps:");
  console.log("1. Run: npm install");
  console.log("2. Run: npm start");
  console.log("3. Scan the QR code with WhatsApp");

  rl.close();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

setup().catch(console.error);
