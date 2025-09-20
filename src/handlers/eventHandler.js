/**
 * Knight Event Handler
 * Manages bot lifecycle events
 */

const Logger = require("../utils/logger");

class EventHandler {
  constructor() {
    this.events = new Map();
  }

  // Register event listener
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  // Emit event
  async emit(event, ...args) {
    if (this.events.has(event)) {
      for (const callback of this.events.get(event)) {
        try {
          await callback(...args);
        } catch (error) {
          Logger.error(`Error in ${event} event handler: ${error.message}`);
        }
      }
    }
  }

  // Remove event listener
  off(event, callback) {
    if (this.events.has(event)) {
      const listeners = this.events.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

module.exports = new EventHandler();
