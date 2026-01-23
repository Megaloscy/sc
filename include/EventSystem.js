// ========== EVENT SYSTEM ==========
class EventSystem {
  constructor() {
    this.listeners = new Map();
  }

  // Subscribe to an event
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
    return () => this.off(eventName, callback);
  }

  // Unsubscribe from an event
  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return;
    const callbacks = this.listeners.get(eventName);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  // Emit an event with data
  emit(eventName, data = {}) {
    if (!this.listeners.has(eventName)) return;
    const callbacks = this.listeners.get(eventName);
    
    [...callbacks].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for "${eventName}":`, error);
      }
    });
  }

  clear(eventName) {
    this.listeners.delete(eventName);
  }

  clearAll() {
    this.listeners.clear();
  }
}

export default EventSystem;