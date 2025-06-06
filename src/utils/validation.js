// Input validation and sanitization utilities
export class ValidationUtils {
  
  // Sanitization methods
  static sanitizeText(input, options = {}) {
    if (typeof input !== 'string') {
      input = String(input);
    }

    let sanitized = input.trim();
    
    // Remove HTML tags if not allowed
    if (!options.allowHTML) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    // Remove script tags always
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Escape dangerous characters
    if (options.escapeHTML) {
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
    
    // Apply length limits
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    return sanitized;
  }

  static sanitizeEmail(email) {
    if (typeof email !== 'string') return '';
    
    return email
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, '')
      .substring(0, 254); // RFC 5321 limit
  }

  static sanitizeURL(url) {
    if (typeof url !== 'string') return '';
    
    let sanitized = url.trim();
    
    // Add protocol if missing
    if (sanitized && !sanitized.match(/^https?:\/\//i)) {
      sanitized = 'https://' + sanitized;
    }
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>"']/g, '');
    
    return sanitized;
  }

  static sanitizeNumeric(input, options = {}) {
    if (typeof input !== 'string') {
      input = String(input);
    }
    
    let sanitized = input.replace(/[^0-9.-]/g, '');
    
    // Handle decimal places
    if (options.decimals !== undefined) {
      const parts = sanitized.split('.');
      if (parts.length > 1) {
        sanitized = parts[0] + '.' + parts[1].substring(0, options.decimals);
      }
    }
    
    // Apply range limits
    const num = parseFloat(sanitized);
    if (!isNaN(num)) {
      if (options.min !== undefined && num < options.min) {
        sanitized = String(options.min);
      }
      if (options.max !== undefined && num > options.max) {
        sanitized = String(options.max);
      }
    }
    
    return sanitized;
  }

  static sanitizePIN(pin) {
    if (typeof pin !== 'string') {
      pin = String(pin);
    }
    
    return pin.replace(/[^0-9]/g, '').substring(0, 6);
  }

  // Validation methods
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors = [];
    
    if (!email || email.trim() === '') {
      errors.push('Email is required');
      return { isValid: false, errors };
    }
    
    const sanitized = this.sanitizeEmail(email);
    
    if (!emailRegex.test(sanitized)) {
      errors.push('Invalid email format');
    }
    
    if (sanitized.length > 254) {
      errors.push('Email is too long');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      value: sanitized
    };
  }

  static validateURL(url) {
    const errors = [];
    
    if (!url || url.trim() === '') {
      return { isValid: true, errors: [], value: '' }; // URL is optional
    }
    
    const sanitized = this.sanitizeURL(url);
    
    try {
      new URL(sanitized);
    } catch {
      errors.push('Invalid URL format');
    }
    
    // Check for dangerous protocols
    if (sanitized.match(/^(javascript:|data:|vbscript:)/i)) {
      errors.push('Unsafe URL protocol');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      value: sanitized
    };
  }

  static validateText(text, rules = {}) {
    const errors = [];
    const sanitized = this.sanitizeText(text, rules);
    
    if (rules.required && (!sanitized || sanitized.trim() === '')) {
      errors.push('This field is required');
      return { isValid: false, errors, value: sanitized };
    }
    
    if (rules.minLength && sanitized.length < rules.minLength) {
      errors.push(`Minimum length is ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && sanitized.length > rules.maxLength) {
      errors.push(`Maximum length is ${rules.maxLength} characters`);
    }
    
    if (rules.pattern && !rules.pattern.test(sanitized)) {
      errors.push(rules.patternMessage || 'Invalid format');
    }
    
    if (rules.forbiddenWords) {
      const lowerText = sanitized.toLowerCase();
      const foundWords = rules.forbiddenWords.filter(word => 
        lowerText.includes(word.toLowerCase())
      );
      if (foundWords.length > 0) {
        errors.push('Contains forbidden content');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      value: sanitized
    };
  }

  static validatePIN(pin) {
    const errors = [];
    const sanitized = this.sanitizePIN(pin);
    
    if (!sanitized || sanitized.length < 4) {
      errors.push('PIN must be at least 4 digits');
    }
    
    if (sanitized.length > 6) {
      errors.push('PIN must be no more than 6 digits');
    }
    
    if (sanitized && !/^\d+$/.test(sanitized)) {
      errors.push('PIN must contain only numbers');
    }
    
    // Check for weak PINs
    if (sanitized) {
      const weakPatterns = [
        /^(\d)\1+$/, // All same digits (1111, 2222, etc.)
        /^1234$|^4321$/, // Sequential
        /^0000$|^1111$|^2222$|^3333$|^4444$|^5555$|^6666$|^7777$|^8888$|^9999$/, // Common patterns
        /^0123$|^1230$|^2301$|^3012$/ // More sequential patterns
      ];
      
      if (weakPatterns.some(pattern => pattern.test(sanitized))) {
        errors.push('PIN is too weak. Please choose a less predictable combination');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      value: sanitized
    };
  }

  static validateNumeric(value, rules = {}) {
    const errors = [];
    const sanitized = this.sanitizeNumeric(value, rules);
    
    if (rules.required && (!sanitized || sanitized.trim() === '')) {
      errors.push('This field is required');
      return { isValid: false, errors, value: sanitized };
    }
    
    if (sanitized) {
      const num = parseFloat(sanitized);
      
      if (isNaN(num)) {
        errors.push('Must be a valid number');
      } else {
        if (rules.min !== undefined && num < rules.min) {
          errors.push(`Minimum value is ${rules.min}`);
        }
        
        if (rules.max !== undefined && num > rules.max) {
          errors.push(`Maximum value is ${rules.max}`);
        }
        
        if (rules.integer && !Number.isInteger(num)) {
          errors.push('Must be a whole number');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      value: sanitized
    };
  }

  // Application-specific validation
  static validateJobApplication(data) {
    const errors = {};
    const sanitized = {};
    
    // Company name validation
    const companyValidation = this.validateText(data.company, {
      required: true,
      minLength: 1,
      maxLength: 100,
      forbiddenWords: ['<script>', 'javascript:', 'onclick']
    });
    if (!companyValidation.isValid) {
      errors.company = companyValidation.errors;
    }
    sanitized.company = companyValidation.value;
    
    // Position validation
    const positionValidation = this.validateText(data.position, {
      required: true,
      minLength: 1,
      maxLength: 100
    });
    if (!positionValidation.isValid) {
      errors.position = positionValidation.errors;
    }
    sanitized.position = positionValidation.value;
    
    // Status validation
    const validStatuses = ['applied', 'interviewing', 'offered', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(data.status)) {
      errors.status = ['Invalid status'];
    }
    sanitized.status = validStatuses.includes(data.status) ? data.status : 'applied';
    
    // Email validation (optional)
    if (data.contactEmail) {
      const emailValidation = this.validateEmail(data.contactEmail);
      if (!emailValidation.isValid) {
        errors.contactEmail = emailValidation.errors;
      }
      sanitized.contactEmail = emailValidation.value;
    }
    
    // URL validation (optional)
    if (data.jobUrl) {
      const urlValidation = this.validateURL(data.jobUrl);
      if (!urlValidation.isValid) {
        errors.jobUrl = urlValidation.errors;
      }
      sanitized.jobUrl = urlValidation.value;
    }
    
    // Salary validation (optional)
    if (data.salary) {
      const salaryValidation = this.validateText(data.salary, {
        maxLength: 50
      });
      if (!salaryValidation.isValid) {
        errors.salary = salaryValidation.errors;
      }
      sanitized.salary = salaryValidation.value;
    }
    
    // Notes validation (optional)
    if (data.notes) {
      const notesValidation = this.validateText(data.notes, {
        maxLength: 2000
      });
      if (!notesValidation.isValid) {
        errors.notes = notesValidation.errors;
      }
      sanitized.notes = notesValidation.value;
    }
    
    // Tags validation (optional)
    if (data.tags && Array.isArray(data.tags)) {
      const validTags = [];
      const tagErrors = [];
      
      data.tags.forEach((tag, index) => {
        const tagValidation = this.validateText(tag, {
          maxLength: 30
        });
        if (tagValidation.isValid && tagValidation.value.trim()) {
          validTags.push(tagValidation.value);
        } else if (!tagValidation.isValid) {
          tagErrors.push(`Tag ${index + 1}: ${tagValidation.errors.join(', ')}`);
        }
      });
      
      if (tagErrors.length > 0) {
        errors.tags = tagErrors;
      }
      sanitized.tags = validTags;
    } else {
      sanitized.tags = [];
    }
    
    // Date validation
    const dateApplied = data.dateApplied ? new Date(data.dateApplied) : new Date();
    if (isNaN(dateApplied.getTime())) {
      errors.dateApplied = ['Invalid date'];
      sanitized.dateApplied = new Date();
    } else {
      // Check if date is not in the future
      if (dateApplied > new Date()) {
        errors.dateApplied = ['Date cannot be in the future'];
        sanitized.dateApplied = new Date();
      } else {
        sanitized.dateApplied = dateApplied;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      data: sanitized
    };
  }

  // Security validation
  static validatePasswordStrength(password) {
    const errors = [];
    const score = { value: 0, max: 5 };
    
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else {
      score.value++;
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score.value++;
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score.value++;
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score.value++;
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score.value++;
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'letmein',
      'welcome', 'monkey', '1234567890', 'qwerty', 'abc123'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
      score.value = Math.max(0, score.value - 2);
    }
    
    const strength = score.value <= 2 ? 'weak' : score.value <= 3 ? 'medium' : 'strong';
    
    return {
      isValid: errors.length === 0,
      errors,
      score,
      strength
    };
  }

  // File validation
  static validateFile(file, rules = {}) {
    const errors = [];
    
    if (!file) {
      if (rules.required) {
        errors.push('File is required');
      }
      return { isValid: !rules.required, errors };
    }
    
    // Check file size
    if (rules.maxSize && file.size > rules.maxSize) {
      errors.push(`File size must be less than ${this.formatFileSize(rules.maxSize)}`);
    }
    
    // Check file type
    if (rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${rules.allowedTypes.join(', ')}`);
    }
    
    // Check file extension
    if (rules.allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!rules.allowedExtensions.includes(extension)) {
        errors.push(`File extension must be one of: ${rules.allowedExtensions.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Utility methods
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  // Real-time validation helper
  static createValidator(element, validationFn, options = {}) {
    const errorContainer = options.errorContainer || element.parentNode.querySelector('.error-message');
    const debounceMs = options.debounce || 300;
    
    const validate = this.debounce(() => {
      const result = validationFn(element.value);
      
      if (result.isValid) {
        element.classList.remove('error');
        element.classList.add('valid');
        if (errorContainer) {
          errorContainer.textContent = '';
          errorContainer.style.display = 'none';
        }
      } else {
        element.classList.remove('valid');
        element.classList.add('error');
        if (errorContainer) {
          errorContainer.textContent = result.errors[0];
          errorContainer.style.display = 'block';
        }
      }
      
      if (options.onChange) {
        options.onChange(result);
      }
    }, debounceMs);
    
    element.addEventListener('input', validate);
    element.addEventListener('blur', validate);
    
    return () => {
      element.removeEventListener('input', validate);
      element.removeEventListener('blur', validate);
    };
  }
}

export default ValidationUtils;