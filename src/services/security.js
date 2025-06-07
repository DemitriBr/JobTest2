import CryptoJS from 'crypto-js';

class SecurityService {
  constructor() {
    this.isAuthenticated = false;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.sessionTimer = null;
    this.init();
  }

  init() {
    this.loadAuthState();
    this.setupSessionTimeout();
  }

  // PIN Authentication
  async authenticateWithPIN(pin) {
    try {
      // Check if account is locked
      if (this.isAccountLocked()) {
        throw new Error('Account is temporarily locked. Please try again later.');
      }

      // Validate PIN format
      if (!this.validatePINFormat(pin)) {
        throw new Error('Invalid PIN format. PIN must be 4-6 digits.');
      }

      const hashedPIN = this.hashPIN(pin);
      const storedPIN = this.getStoredPIN();

      if (!storedPIN) {
        // First time setup
        await this.setupPIN(pin);
        this.setEncryptionKey(pin);
        this.isAuthenticated = true;
        this.resetLoginAttempts();
        this.logSecurityEvent('PIN_SETUP', 'success');
        return { success: true, message: 'PIN setup successful' };
      }

      if (hashedPIN === storedPIN) {
        this.setEncryptionKey(pin);
        this.isAuthenticated = true;
        this.resetLoginAttempts();
        this.resetSessionTimeout();
        this.logSecurityEvent('PIN_AUTH', 'success');
        return { success: true, message: 'Authentication successful' };
      } else {
        this.incrementFailedAttempts();
        this.logSecurityEvent('PIN_AUTH', 'failure');
        const remainingAttempts = this.getRemainingAttempts();
        
        if (remainingAttempts <= 0) {
          this.lockAccount();
          throw new Error('Too many failed attempts. Account locked for 15 minutes.');
        }
        
        throw new Error(`Incorrect PIN. ${remainingAttempts} attempts remaining.`);
      }
    } catch (error) {
      this.logSecurityEvent('PIN_AUTH', 'error', error.message);
      throw error;
    }
  }

  async setupPIN(pin) {
    if (!this.validatePINFormat(pin)) {
      throw new Error('PIN must be 4-6 digits');
    }

    const hashedPIN = this.hashPIN(pin);
    localStorage.setItem('rjt_pin_hash', hashedPIN);
    localStorage.setItem('rjt_pin_setup_date', Date.now().toString());
    
    // Generate encryption key from PIN
    const encryptionKey = this.deriveEncryptionKey(pin);
    localStorage.setItem('rjt_enc_key_check', this.encryptData('validation', encryptionKey));
  }

  hashPIN(pin) {
    // Use PBKDF2 for secure PIN hashing
    const salt = 'retro_job_tracker_salt_2024';
    return CryptoJS.PBKDF2(pin, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }

  deriveEncryptionKey(pin) {
    const salt = 'retro_job_tracker_enc_salt_2024';
    return CryptoJS.PBKDF2(pin, salt, {
      keySize: 256/32,
      iterations: 5000
    }).toString();
  }

  validatePINFormat(pin) {
    return /^\d{4,6}$/.test(pin);
  }

  getStoredPIN() {
    return localStorage.getItem('rjt_pin_hash');
  }

  // Session Management
  setupSessionTimeout() {
    this.resetSessionTimeout();
  }

  resetSessionTimeout() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    if (this.isAuthenticated) {
      this.sessionTimer = setTimeout(() => {
        this.logout('session_timeout');
      }, this.sessionTimeout);
    }
  }

  extendSession() {
    if (this.isAuthenticated) {
      this.resetSessionTimeout();
    }
  }

  logout(reason = 'manual') {
    this.isAuthenticated = false;
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    this.logSecurityEvent('LOGOUT', 'info', `Reason: ${reason}`);
    
    // Clear sensitive data from memory
    this.clearSensitiveData();
    
    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('security:logout', { detail: { reason } }));
  }

  // Account Lockout
  isAccountLocked() {
    const lockTime = localStorage.getItem('rjt_account_lock_time');
    if (!lockTime) return false;
    
    const lockDuration = Date.now() - parseInt(lockTime);
    if (lockDuration > this.lockoutDuration) {
      this.unlockAccount();
      return false;
    }
    
    return true;
  }

  lockAccount() {
    localStorage.setItem('rjt_account_lock_time', Date.now().toString());
    localStorage.setItem('rjt_failed_attempts', '0');
    this.logSecurityEvent('ACCOUNT_LOCK', 'warning');
  }

  unlockAccount() {
    localStorage.removeItem('rjt_account_lock_time');
    localStorage.removeItem('rjt_failed_attempts');
    this.logSecurityEvent('ACCOUNT_UNLOCK', 'info');
  }

  incrementFailedAttempts() {
    const current = parseInt(localStorage.getItem('rjt_failed_attempts') || '0');
    localStorage.setItem('rjt_failed_attempts', (current + 1).toString());
  }

  resetLoginAttempts() {
    localStorage.removeItem('rjt_failed_attempts');
  }

  getRemainingAttempts() {
    const failed = parseInt(localStorage.getItem('rjt_failed_attempts') || '0');
    return Math.max(0, this.maxLoginAttempts - failed);
  }

  // Encryption/Decryption
  encryptData(data, customKey = null) {
    try {
      const key = customKey || this.getCurrentEncryptionKey();
      if (!key) throw new Error('No encryption key available');
      
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
      return encrypted;
    } catch (error) {
      this.logSecurityEvent('ENCRYPTION', 'error', error.message);
      throw new Error('Encryption failed');
    }
  }

  decryptData(encryptedData, customKey = null) {
    try {
      const key = customKey || this.getCurrentEncryptionKey();
      if (!key) throw new Error('No encryption key available');
      
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!plaintext) throw new Error('Decryption failed - invalid key or data');
      
      return JSON.parse(plaintext);
    } catch (error) {
      this.logSecurityEvent('DECRYPTION', 'error', error.message);
      throw new Error('Decryption failed');
    }
  }

  getCurrentEncryptionKey() {
    // In a real app, this would be derived from the user's PIN during auth
    // For now, we'll store a derived key check to validate
    const keyCheck = localStorage.getItem('rjt_enc_key_check');
    if (!keyCheck) return null;
    
    // This is a simplified approach - in production, the key would be in memory only
    return localStorage.getItem('rjt_temp_enc_key');
  }

  setEncryptionKey(pin) {
    const key = this.deriveEncryptionKey(pin);
    localStorage.setItem('rjt_temp_enc_key', key);
  }

  // Input Sanitization
  sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') {
      input = String(input);
    }

    switch (type) {
      case 'text':
        return input.trim().replace(/[<>'"&]/g, '');
      case 'email':
        return input.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '');
      case 'url':
        return input.trim().replace(/[<>'"]/g, '');
      case 'number':
        return input.replace(/[^0-9.-]/g, '');
      case 'pin':
        return input.replace(/[^0-9]/g, '').slice(0, 6);
      default:
        return input.trim();
    }
  }

  validateInput(input, rules) {
    const errors = [];
    
    if (rules.required && (!input || input.trim() === '')) {
      errors.push('This field is required');
    }
    
    if (rules.minLength && input.length < rules.minLength) {
      errors.push(`Minimum length is ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && input.length > rules.maxLength) {
      errors.push(`Maximum length is ${rules.maxLength} characters`);
    }
    
    if (rules.pattern && !rules.pattern.test(input)) {
      errors.push(rules.patternMessage || 'Invalid format');
    }
    
    return errors;
  }

  // Security Event Logging
  logSecurityEvent(event, level = 'info', details = '') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Store in session storage (cleared on browser close)
    const logs = JSON.parse(sessionStorage.getItem('rjt_security_logs') || '[]');
    logs.push(logEntry);
    
    // Keep only last 100 entries
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    sessionStorage.setItem('rjt_security_logs', JSON.stringify(logs));
    
    // Console log for development
    console.log(`[SECURITY] ${level.toUpperCase()}: ${event}`, details);
  }

  getSecurityLogs() {
    return JSON.parse(sessionStorage.getItem('rjt_security_logs') || '[]');
  }

  clearSecurityLogs() {
    sessionStorage.removeItem('rjt_security_logs');
  }

  // Utility Methods
  loadAuthState() {
    // Check if user was previously authenticated and session is still valid
    const lastActivity = localStorage.getItem('rjt_last_activity');
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      if (timeSinceActivity < this.sessionTimeout) {
        // Session might still be valid, but require re-authentication
        this.logSecurityEvent('SESSION_CHECK', 'info', 'Previous session found');
      }
    }
  }

  clearSensitiveData() {
    // Clear encryption key from memory
    localStorage.removeItem('rjt_temp_enc_key');
    
    // Update last activity
    localStorage.setItem('rjt_last_activity', Date.now().toString());
  }

  // Security Status
  getSecurityStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      isAccountLocked: this.isAccountLocked(),
      remainingAttempts: this.getRemainingAttempts(),
      hasStoredPIN: !!this.getStoredPIN(),
      sessionTimeRemaining: this.sessionTimer ? this.sessionTimeout : 0
    };
  }

  // PIN Management
  async changePIN(currentPIN, newPIN) {
    try {
      // Verify current PIN
      const result = await this.authenticateWithPIN(currentPIN);
      if (!result.success) {
        throw new Error('Current PIN is incorrect');
      }

      // Validate new PIN
      if (!this.validatePINFormat(newPIN)) {
        throw new Error('New PIN must be 4-6 digits');
      }

      if (currentPIN === newPIN) {
        throw new Error('New PIN must be different from current PIN');
      }

      // Update PIN
      await this.setupPIN(newPIN);
      this.logSecurityEvent('PIN_CHANGE', 'success');
      
      return { success: true, message: 'PIN changed successfully' };
    } catch (error) {
      this.logSecurityEvent('PIN_CHANGE', 'error', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export default new SecurityService();