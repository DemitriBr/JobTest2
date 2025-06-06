class EventBus {
  constructor() {
    this.events = new Map();
    this.middleware = [];
    this.debugMode = false;
    this.eventHistory = [];
    this.maxHistorySize = 100;
    
    this.init();
  }

  init() {
    // Enable debug mode in development
    this.debugMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (this.debugMode) {
      console.log('[EventBus] Initialized in debug mode');
    }
  }

  // Core event methods
  on(eventName, callback, options = {}) {
    try {
      if (typeof eventName !== 'string' || typeof callback !== 'function') {
        throw new Error('Invalid parameters: eventName must be string, callback must be function');
      }

      if (!this.events.has(eventName)) {
        this.events.set(eventName, []);
      }

      const listener = {
        callback,
        once: options.once || false,
        priority: options.priority || 0,
        id: this.generateListenerId(),
        context: options.context || null
      };

      const listeners = this.events.get(eventName);
      listeners.push(listener);
      
      // Sort by priority (higher priority first)
      listeners.sort((a, b) => b.priority - a.priority);

      if (this.debugMode) {
        console.log(`[EventBus] Registered listener for '${eventName}' (ID: ${listener.id})`);
      }

      return listener.id;
    } catch (error) {
      console.error('[EventBus] Failed to register listener:', error);
      return null;
    }
  }

  once(eventName, callback, options = {}) {
    return this.on(eventName, callback, { ...options, once: true });
  }

  off(eventName, callbackOrId) {
    try {
      if (!this.events.has(eventName)) {
        return false;
      }

      const listeners = this.events.get(eventName);
      let removed = false;

      if (typeof callbackOrId === 'string') {
        // Remove by ID
        const index = listeners.findIndex(listener => listener.id === callbackOrId);
        if (index !== -1) {
          listeners.splice(index, 1);
          removed = true;
        }
      } else if (typeof callbackOrId === 'function') {
        // Remove by callback reference
        const index = listeners.findIndex(listener => listener.callback === callbackOrId);
        if (index !== -1) {
          listeners.splice(index, 1);
          removed = true;
        }
      } else {
        // Remove all listeners for this event
        this.events.delete(eventName);
        removed = true;
      }

      if (removed && this.debugMode) {
        console.log(`[EventBus] Removed listener(s) for '${eventName}'`);
      }

      return removed;
    } catch (error) {
      console.error('[EventBus] Failed to remove listener:', error);
      return false;
    }
  }

  emit(eventName, data = null, options = {}) {
    try {
      const eventData = {
        name: eventName,
        data,
        timestamp: Date.now(),
        async: options.async || false,
        bubbles: options.bubbles !== false,
        cancelable: options.cancelable !== false,
        defaultPrevented: false,
        propagationStopped: false
      };

      // Add to history
      this.addToHistory(eventData);

      // Apply middleware
      for (const middleware of this.middleware) {
        try {
          const result = middleware(eventData);
          if (result === false) {
            if (this.debugMode) {
              console.log(`[EventBus] Event '${eventName}' blocked by middleware`);
            }
            return false;
          }
        } catch (error) {
          console.error('[EventBus] Middleware error:', error);
        }
      }

      if (!this.events.has(eventName)) {
        if (this.debugMode) {
          console.log(`[EventBus] No listeners for '${eventName}'`);
        }
        return true;
      }

      const listeners = this.events.get(eventName).slice(); // Create copy to avoid mutation issues

      if (eventData.async) {
        // Async emission
        setTimeout(() => this.executeListeners(eventName, listeners, eventData), 0);
        return true;
      } else {
        // Sync emission
        return this.executeListeners(eventName, listeners, eventData);
      }
    } catch (error) {
      console.error('[EventBus] Failed to emit event:', error);
      return false;
    }
  }

  executeListeners(eventName, listeners, eventData) {
    let success = true;

    for (let i = 0; i < listeners.length; i++) {
      if (eventData.propagationStopped) {
        break;
      }

      const listener = listeners[i];
      
      try {
        // Create event object for listener
        const event = {
          ...eventData,
          preventDefault: () => { eventData.defaultPrevented = true; },
          stopPropagation: () => { eventData.propagationStopped = true; },
          target: this,
          currentTarget: this
        };

        // Call listener with proper context
        if (listener.context) {
          listener.callback.call(listener.context, event);
        } else {
          listener.callback(event);
        }

        // Remove once listeners
        if (listener.once) {
          const index = this.events.get(eventName).indexOf(listener);
          if (index !== -1) {
            this.events.get(eventName).splice(index, 1);
          }
        }

        if (this.debugMode) {
          console.log(`[EventBus] Executed listener for '${eventName}' (ID: ${listener.id})`);
        }
      } catch (error) {
        console.error(`[EventBus] Listener error for '${eventName}':`, error);
        success = false;
      }
    }

    return success && !eventData.defaultPrevented;
  }

  // Middleware system
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    
    this.middleware.push(middleware);
    
    if (this.debugMode) {
      console.log('[EventBus] Added middleware');
    }
  }

  removeMiddleware(middleware) {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  // Namespace support
  namespace(name) {
    return {
      on: (eventName, callback, options) => this.on(`${name}:${eventName}`, callback, options),
      once: (eventName, callback, options) => this.once(`${name}:${eventName}`, callback, options),
      off: (eventName, callbackOrId) => this.off(`${name}:${eventName}`, callbackOrId),
      emit: (eventName, data, options) => this.emit(`${name}:${eventName}`, data, options)
    };
  }

  // Promise-based events
  emitAsync(eventName, data = null) {
    return new Promise((resolve, reject) => {
      try {
        const result = this.emit(eventName, data, { async: true });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  waitFor(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off(eventName, listenerId);
        reject(new Error(`Timeout waiting for event '${eventName}'`));
      }, timeout);

      const listenerId = this.once(eventName, (event) => {
        clearTimeout(timeoutId);
        resolve(event);
      });
    });
  }

  // Event chaining
  chain(events) {
    return new Promise((resolve, reject) => {
      let currentIndex = 0;
      const results = [];

      const executeNext = () => {
        if (currentIndex >= events.length) {
          resolve(results);
          return;
        }

        const { event, data, timeout = 5000 } = events[currentIndex];
        
        this.waitFor(event, timeout)
          .then(result => {
            results.push(result);
            currentIndex++;
            executeNext();
          })
          .catch(reject);

        // Emit the event if data is provided
        if (data !== undefined) {
          this.emit(event, data);
        }
      };

      executeNext();
    });
  }

  // Event patterns
  pattern(pattern, callback, options = {}) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    return this.use((eventData) => {
      if (regex.test(eventData.name)) {
        try {
          callback(eventData);
        } catch (error) {
          console.error('[EventBus] Pattern callback error:', error);
        }
      }
      return true; // Don't block the event
    });
  }

  // Utility methods
  generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addToHistory(eventData) {
    this.eventHistory.push({
      ...eventData,
      id: this.generateListenerId()
    });

    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  getEventHistory(eventName = null) {
    if (eventName) {
      return this.eventHistory.filter(event => event.name === eventName);
    }
    return [...this.eventHistory];
  }

  clearHistory() {
    this.eventHistory = [];
  }

  // Debug methods
  getListeners(eventName = null) {
    if (eventName) {
      return this.events.get(eventName) || [];
    }
    
    const allListeners = {};
    for (const [name, listeners] of this.events) {
      allListeners[name] = listeners.length;
    }
    return allListeners;
  }

  getEventNames() {
    return Array.from(this.events.keys());
  }

  getStats() {
    return {
      totalEvents: this.events.size,
      totalListeners: Array.from(this.events.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      middleware: this.middleware.length,
      historySize: this.eventHistory.length,
      debugMode: this.debugMode
    };
  }

  // Cleanup
  removeAllListeners(eventName = null) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
    
    if (this.debugMode) {
      console.log(`[EventBus] Removed all listeners${eventName ? ` for '${eventName}'` : ''}`);
    }
  }

  destroy() {
    this.removeAllListeners();
    this.middleware = [];
    this.clearHistory();
    
    if (this.debugMode) {
      console.log('[EventBus] Destroyed');
    }
  }
}

// Predefined event types for better organization
export const EventTypes = {
  // Security events
  SECURITY: {
    LOGIN: 'security:login',
    LOGOUT: 'security:logout',
    PIN_SETUP: 'security:pinSetup',
    PIN_CHANGE: 'security:pinChange',
    SESSION_TIMEOUT: 'security:sessionTimeout',
    ACCOUNT_LOCKED: 'security:accountLocked'
  },
  
  // Game events
  GAME: {
    XP_AWARDED: 'game:xpAwarded',
    LEVEL_UP: 'game:levelUp',
    ACHIEVEMENT_UNLOCKED: 'game:achievementUnlocked',
    QUEST_COMPLETED: 'game:questCompleted',
    STREAK_UPDATED: 'game:streakUpdated'
  },
  
  // Application events
  APP: {
    ADDED: 'app:applicationAdded',
    UPDATED: 'app:applicationUpdated',
    DELETED: 'app:applicationDeleted',
    STATUS_CHANGED: 'app:statusChanged'
  },
  
  // UI events
  UI: {
    VIEW_CHANGED: 'ui:viewChanged',
    MODAL_OPENED: 'ui:modalOpened',
    MODAL_CLOSED: 'ui:modalClosed',
    NOTIFICATION_SHOWN: 'ui:notificationShown',
    THEME_CHANGED: 'ui:themeChanged'
  },
  
  // System events
  SYSTEM: {
    READY: 'system:ready',
    ERROR: 'system:error',
    OFFLINE: 'system:offline',
    ONLINE: 'system:online',
    DATA_SYNC: 'system:dataSync'
  }
};

// Export singleton instance
export default new EventBus();