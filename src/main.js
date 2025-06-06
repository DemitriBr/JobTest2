import './styles/main.scss';

// Simple app initialization for testing
class RetroJobTracker {
  constructor() {
    this.currentView = 'dashboard';
    this.playerLevel = 1;
    this.currentXP = 0;
    this.maxXP = 100;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeApp());
    } else {
      this.initializeApp();
    }
  }

  initializeApp() {
    this.hideLoadingScreen();
    this.setupEventListeners();
    this.updatePlayerStats();
    this.loadInitialView();
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen && mainApp) {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
      }, 1500);
    }
  }

  setupEventListeners() {
    // Navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });

    // XP Modal close
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', () => {
        this.hideXPModal();
      });
    }

    // PIN authentication (placeholder)
    const pinSubmit = document.getElementById('pin-submit');
    if (pinSubmit) {
      pinSubmit.addEventListener('click', () => {
        this.handlePINSubmit();
      });
    }
  }

  switchView(viewName) {
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    this.currentView = viewName;
    this.loadView(viewName);
    
    // Award XP for navigation
    this.awardXP(5, `Navigated to ${viewName}`);
  }

  loadView(viewName) {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Simple placeholder content for testing
    const viewContent = {
      dashboard: '<h2>Dashboard View</h2><p>Welcome to your retro job tracker!</p>',
      applications: '<h2>Applications View</h2><p>Manage your job applications here.</p>',
      kanban: '<h2>Kanban View</h2><p>Track application progress visually.</p>',
      achievements: '<h2>Achievements View</h2><p>View your unlocked achievements!</p>'
    };

    container.innerHTML = viewContent[viewName] || '<h2>View Not Found</h2>';
  }

  loadInitialView() {
    this.loadView('dashboard');
  }

  updatePlayerStats() {
    const levelEl = document.getElementById('player-level');
    const currentXPEl = document.getElementById('current-xp');
    const maxXPEl = document.getElementById('max-xp');
    const xpFill = document.getElementById('xp-fill');

    if (levelEl) levelEl.textContent = this.playerLevel;
    if (currentXPEl) currentXPEl.textContent = this.currentXP;
    if (maxXPEl) maxXPEl.textContent = this.maxXP;
    
    if (xpFill) {
      const percentage = (this.currentXP / this.maxXP) * 100;
      xpFill.style.width = `${percentage}%`;
    }
  }

  awardXP(amount, reason = '') {
    this.currentXP += amount;
    
    // Check for level up
    if (this.currentXP >= this.maxXP) {
      this.levelUp();
    } else {
      this.showXPGain(amount, reason);
    }
    
    this.updatePlayerStats();
  }

  levelUp() {
    this.playerLevel++;
    this.currentXP = this.currentXP - this.maxXP;
    this.maxXP = Math.floor(this.maxXP * 1.2); // Increase XP requirement
    
    this.showLevelUpModal();
    this.updatePlayerStats();
  }

  showXPGain(amount, reason) {
    // Simple XP notification (could be expanded)
    console.log(`+${amount} XP: ${reason}`);
  }

  showLevelUpModal() {
    const modal = document.getElementById('xp-modal');
    const title = document.getElementById('modal-title');
    const message = document.getElementById('modal-message');
    const xpGain = document.getElementById('xp-gain-text');

    if (modal && title && message && xpGain) {
      title.textContent = 'LEVEL UP!';
      message.textContent = `Congratulations! You reached level ${this.playerLevel}!`;
      xpGain.textContent = `LEVEL ${this.playerLevel}`;
      modal.classList.remove('hidden');
    }
  }

  hideXPModal() {
    const modal = document.getElementById('xp-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  handlePINSubmit() {
    // Placeholder PIN handling
    const pinInput = document.getElementById('pin-input');
    const pinModal = document.getElementById('pin-modal');
    
    if (pinInput && pinModal) {
      // For testing, accept any 6-digit PIN
      if (pinInput.value.length === 6) {
        pinModal.classList.add('hidden');
        this.awardXP(25, 'Successful authentication');
      } else {
        this.showPINError();
      }
    }
  }

  showPINError() {
    const errorEl = document.getElementById('pin-error');
    if (errorEl) {
      errorEl.classList.remove('hidden');
      setTimeout(() => {
        errorEl.classList.add('hidden');
      }, 3000);
    }
  }
}

// Initialize the app
const app = new RetroJobTracker();

// Export for testing
export default RetroJobTracker;