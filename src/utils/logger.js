/**
 * Knight Logger Utility
 * Standardized logging across all platforms
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  },
};

class Logger {
  static log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;

    switch (type) {
      case "success":
        console.log(`${colors.fg.green}${prefix} ✅ ${message}${colors.reset}`);
        break;
      case "error":
        console.error(`${colors.fg.red}${prefix} ❌ ${message}${colors.reset}`);
        break;
      case "warn":
        console.warn(
          `${colors.fg.yellow}${prefix} ⚠️  ${message}${colors.reset}`
        );
        break;
      case "info":
      default:
        console.log(`${colors.fg.blue}${prefix} ℹ️  ${message}${colors.reset}`);
    }
  }

  static info(message) {
    this.log(message, "info");
  }

  static success(message) {
    this.log(message, "success");
  }

  static error(message) {
    this.log(message, "error");
  }

  static warn(message) {
    this.log(message, "warn");
  }
}

module.exports = Logger;
