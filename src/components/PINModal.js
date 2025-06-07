// PIN Authentication Modal Component
import SecurityService from '../services/security.js';
import { eventBus } from '../services/eventBus.js';
import { gamification } from '../services/gamification.js';

export class PINModal {
  constructor() {
    this.isSetupMode = false;
    this.modal = null;
    this.pinInput = null;
    this.confirmInput = null;
    this.submitBtn = null;
    this.errorEl = null;
  }

  async show() {
    console.log('PINModal.show() called');
    
    // Check if PIN is already setup
    this.isSetupMode = !SecurityService.getStoredPIN();
    console.log('PIN setup mode:', this.isSetupMode);
    
    // Create modal HTML
    this.createModal();
    
    // Add event listeners
    this.attachEventListeners();
    
    // Focus on input
    setTimeout(() => {
      if (this.pinInput) {
        this.pinInput.focus();
      }
    }, 100);
  }

  createModal() {
    // Remove existing modal if any
    const existing = document.getElementById('pin-auth-modal');
    if (existing) existing.remove();

    const modalHTML = `
      <div id="pin-auth-modal" class="modal pin-modal">
        <div class="modal-content pixel-card">
          <div class="modal-header">
            <h2>${this.isSetupMode ? 'Create Security PIN' : 'Enter PIN'}</h2>
          </div>
          <div class="modal-body">
            <div class="pin-form">
              ${this.isSetupMode ? `
                <p class="pin-instructions">
                  Create a 4-6 digit PIN to secure your data.
                  You'll need this PIN to access your applications.
                </p>
              ` : `
                <p class="pin-instructions">
                  Enter your PIN to continue
                </p>
              `}
              
              <div class="pin-input-group">
                <label for="pin-input">PIN</label>
                <input 
                  type="password" 
                  id="pin-input" 
                  class="pin-input pixel-input" 
                  maxlength="6" 
                  pattern="[0-9]*"
                  inputmode="numeric"
                  placeholder="••••••"
                  autocomplete="off"
                />
                <div class="pin-dots">
                  <span class="pin-dot"></span>
                  <span class="pin-dot"></span>
                  <span class="pin-dot"></span>
                  <span class="pin-dot"></span>
                  <span class="pin-dot"></span>
                  <span class="pin-dot"></span>
                </div>
              </div>

              ${this.isSetupMode ? `
                <div class="pin-input-group">
                  <label for="pin-confirm">Confirm PIN</label>
                  <input 
                    type="password" 
                    id="pin-confirm" 
                    class="pin-input pixel-input" 
                    maxlength="6" 
                    pattern="[0-9]*"
                    inputmode="numeric"
                    placeholder="••••••"
                    autocomplete="off"
                  />
                </div>
              ` : ''}

              <div class="pin-error hidden" id="pin-error"></div>

              ${!this.isSetupMode && SecurityService.isAccountLocked() ? `
                <div class="pin-locked-message">
                  Account is locked. Please try again later.
                </div>
              ` : ''}
            </div>
          </div>
          <div class="modal-footer">
            <button class="pixel-btn primary" id="pin-submit" ${SecurityService.isAccountLocked() ? 'disabled' : ''}>
              ${this.isSetupMode ? 'Create PIN' : 'Unlock'}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Get references
    this.modal = document.getElementById('pin-auth-modal');
    this.pinInput = document.getElementById('pin-input');
    this.confirmInput = document.getElementById('pin-confirm');
    this.submitBtn = document.getElementById('pin-submit');
    this.errorEl = document.getElementById('pin-error');
  }

  attachEventListeners() {
    // Submit button click
    this.submitBtn.addEventListener('click', () => this.handleSubmit());

    // Enter key on inputs
    this.pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (this.isSetupMode && this.confirmInput) {
          this.confirmInput.focus();
        } else {
          this.handleSubmit();
        }
      }
    });

    if (this.confirmInput) {
      this.confirmInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSubmit();
        }
      });
    }

    // Update PIN dots visual
    this.pinInput.addEventListener('input', (e) => {
      this.updatePinDots(e.target.value.length);
    });

    // Only allow digits
    this.pinInput.addEventListener('beforeinput', (e) => {
      if (e.data && !/^\d$/.test(e.data)) {
        e.preventDefault();
      }
    });

    if (this.confirmInput) {
      this.confirmInput.addEventListener('beforeinput', (e) => {
        if (e.data && !/^\d$/.test(e.data)) {
          e.preventDefault();
        }
      });
    }
  }

  updatePinDots(length) {
    const dots = this.modal.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('filled', index < length);
    });
  }

  async handleSubmit() {
    const pin = this.pinInput.value;
    
    // Clear previous error
    this.showError('');

    try {
      if (this.isSetupMode) {
        // Setup mode
        const confirmPin = this.confirmInput.value;

        // Validation
        if (pin.length < 4 || pin.length > 6) {
          throw new Error('PIN must be 4-6 digits');
        }

        if (pin !== confirmPin) {
          throw new Error('PINs do not match');
        }

        // Setup PIN
        await SecurityService.setupPIN(pin);
        
        // Award XP for security setup
        await gamification.awardXP('PROFILE_UPDATED');
        
        // Emit success event
        eventBus.emit('security:pin_setup', { success: true });
        
        // Close modal
        this.close();
        
        // Show success message
        this.showSuccessNotification('PIN created successfully!');
        
      } else {
        // Authentication mode
        if (SecurityService.isAccountLocked()) {
          throw new Error('Account is locked. Please try again later.');
        }

        // Verify PIN
        await SecurityService.authenticateWithPIN(pin);
        
        // Award XP for successful login
        await gamification.awardXP('DAILY_LOGIN');
        
        // Emit success event
        eventBus.emit('security:authenticated', { success: true });
        
        // Close modal
        this.close();
        
        // Show success message
        this.showSuccessNotification('Welcome back!');
      }
    } catch (error) {
      this.showError(error.message);
      
      // Clear inputs on error
      this.pinInput.value = '';
      if (this.confirmInput) {
        this.confirmInput.value = '';
      }
      this.updatePinDots(0);
      this.pinInput.focus();
      
      // Shake animation
      this.modal.querySelector('.modal-content').classList.add('shake');
      setTimeout(() => {
        this.modal.querySelector('.modal-content').classList.remove('shake');
      }, 500);
    }
  }

  showError(message) {
    if (message) {
      this.errorEl.textContent = message;
      this.errorEl.classList.remove('hidden');
    } else {
      this.errorEl.classList.add('hidden');
    }
  }

  showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 2000);
  }

  close() {
    if (this.modal) {
      this.modal.classList.add('fade-out');
      setTimeout(() => {
        this.modal.remove();
      }, 300);
    }
  }
}

// Add PIN modal specific styles
const style = document.createElement('style');
style.textContent = `
  .pin-modal .modal-content {
    max-width: 400px;
  }

  .pin-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .pin-instructions {
    text-align: center;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-md);
  }

  .pin-input-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .pin-input-group label {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    text-transform: uppercase;
  }

  .pin-input {
    text-align: center;
    letter-spacing: 8px;
    font-size: var(--font-size-lg);
  }

  .pin-dots {
    display: flex;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }

  .pin-dot {
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-pixel-border-light);
    background-color: var(--color-bg-dark);
    transition: background-color 0.2s ease;
  }

  .pin-dot.filled {
    background-color: var(--color-primary);
  }

  .pin-error {
    color: var(--color-danger);
    font-size: var(--font-size-sm);
    text-align: center;
  }

  .pin-locked-message {
    background-color: var(--color-danger);
    color: white;
    padding: var(--space-sm);
    text-align: center;
    font-size: var(--font-size-sm);
  }

  .success-notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--color-success);
    color: white;
    padding: var(--space-sm) var(--space-md);
    border: 2px solid var(--color-pixel-border-dark);
    font-size: var(--font-size-sm);
    z-index: 10000;
    animation: slideInDown 0.3s ease-out;
  }

  .success-notification.fade-out {
    animation: fadeOut 0.5s ease-out forwards;
  }

  @keyframes slideInDown {
    from {
      transform: translateX(-50%) translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }

  .modal-content.shake {
    animation: shake 0.5s ease-in-out;
  }
`;
document.head.appendChild(style);