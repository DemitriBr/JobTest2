// Main Application Controller
import { router } from '../services/router.js';
import { gamification } from '../services/gamification.js';
import { celebrations } from '../services/celebrations.js';
import db from '../services/database.js';
import { eventBus } from '../services/eventBus.js';
import SecurityService from '../services/security.js';
import { PINModal } from '../components/PINModal.js';

// Import views
import { DashboardView } from './DashboardView.js';
import { ApplicationListView } from './ApplicationListView.js';
import { ApplicationFormView } from './ApplicationFormView.js';
import { KanbanView } from './KanbanView.js';

class MainApp {
  constructor() {
    this.initialized = false;
    this.currentUser = 'default-user'; // For now, single user
    this.pinModal = new PINModal();
  }

  async initialize() {
    try {
      // Initialize celebrations first
      celebrations.initialize();
      
      // Initialize security service
      SecurityService.initialize();
      
      // Hide loading screen immediately to show the app
      this.hideLoadingScreen();
      
      // Check if user needs to authenticate BEFORE initializing router
      const needsAuth = await this.checkAuthentication();
      if (needsAuth) {
        // Show a temporary loading message in main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.innerHTML = `
            <div class="view-container">
              <div class="auth-loading">
                <div class="pixel-loader">
                  <div class="pixel-block"></div>
                  <div class="pixel-block"></div>
                  <div class="pixel-block"></div>
                </div>
                <p>Initializing security...</p>
              </div>
            </div>
          `;
        }
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          // Show PIN modal and wait for authentication
          this.showPINModal().then(() => {
            // After authentication, continue with initialization
            this.continueInitialization();
          });
        }, 100);
        
        return; // Exit early, will continue after authentication
      }
      
      // If no auth needed, continue normally
      await this.continueInitialization();
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Failed to initialize application. Please refresh the page.');
    }
  }

  async continueInitialization() {
    try {
      // Initialize router
      router.initialize('main-content');
      
      // Register routes
      this.registerRoutes();
      
      // Set up navigation if not already done
      if (!this.navigationSetup) {
        this.setupNavigation();
        this.navigationSetup = true;
      }
      
      // Initialize database
      await db.initialize();
      
      // Initialize gamification
      await gamification.initialize(this.currentUser);
      
      // Navigate to initial route
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/index.html') {
        router.navigate('/dashboard');
      } else {
        router.navigate(currentPath);
      }
      
      this.initialized = true;
      
      // Emit app ready event
      eventBus.emit('app:ready');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Failed to initialize application. Please refresh the page.');
    }
  }

  async checkAuthentication() {
    // Check if PIN is setup
    const pinExists = SecurityService.getStoredPIN();
    console.log('PIN exists:', !!pinExists);
    console.log('Is authenticated:', SecurityService.isAuthenticated);
    
    // If no PIN exists, user needs to set one up
    if (!pinExists) {
      console.log('No PIN found, need setup');
      return true;
    }
    
    // If PIN exists but user is not authenticated, they need to login
    if (!SecurityService.isAuthenticated) {
      console.log('PIN exists but not authenticated, need login');
      return true;
    }
    
    return false;
  }

  async showPINModal() {
    return new Promise((resolve) => {
      // Listen for successful authentication
      const authHandler = () => {
        eventBus.off('security:authenticated', authHandler);
        eventBus.off('security:pin_setup', authHandler);
        resolve();
      };
      
      eventBus.on('security:authenticated', authHandler);
      eventBus.on('security:pin_setup', authHandler);
      
      // Show the modal
      this.pinModal.show();
    });
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen && mainApp) {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
      }, 500);
    }
  }

  registerRoutes() {
    router.register('/', DashboardView);
    router.register('/dashboard', DashboardView);
    router.register('/applications', ApplicationListView);
    router.register('/applications/new', ApplicationFormView);
    router.register('/applications/:id/edit', ApplicationFormView);
    router.register('/kanban', KanbanView);
  }

  setupNavigation() {
    // Update navigation based on current route
    eventBus.on('router:navigated', (data) => {
      this.updateActiveNavigation(data.route);
    });

    // Set up navigation click handlers
    document.querySelectorAll('[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        router.navigate(route);
      });
    });

    // Listen for security events
    window.addEventListener('security:logout', async (e) => {
      console.log('Logout event received:', e.detail.reason);
      // Show PIN modal again
      await this.showPINModal();
    });

    // Reset session timeout on user activity
    document.addEventListener('click', () => {
      SecurityService.extendSession();
    });
    
    document.addEventListener('keypress', () => {
      SecurityService.extendSession();
    });
  }

  updateActiveNavigation(route) {
    // Remove all active classes
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to current route
    let activeSelector = null;
    
    if (route === '/dashboard' || route === '/') {
      activeSelector = '[data-route="/dashboard"]';
    } else if (route.startsWith('/applications')) {
      activeSelector = '[data-route="/applications"]';
    } else if (route === '/kanban') {
      activeSelector = '[data-route="/kanban"]';
    }

    if (activeSelector) {
      const activeBtn = document.querySelector(activeSelector);
      if (activeBtn) {
        activeBtn.classList.add('active');
      }
    }
  }

  showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="error-message pixel-card">
          <h3>Error</h3>
          <p>${message}</p>
          <button class="pixel-btn primary" onclick="location.reload()">
            Reload Page
          </button>
        </div>
      `;
      errorContainer.style.display = 'block';
    }
  }

  async showStatsUpdate() {
    if (!gamification.initialized) return;
    
    const progress = gamification.getProgress();
    if (!progress) return;

    // Update header stats
    const levelEl = document.getElementById('player-level');
    const xpBarEl = document.getElementById('xp-fill');
    const xpTextEl = document.getElementById('xp-text');

    if (levelEl) {
      levelEl.textContent = `Lv.${progress.stats.level}`;
    }

    if (xpBarEl) {
      xpBarEl.style.width = `${progress.levelProgress.percentage}%`;
    }

    if (xpTextEl) {
      xpTextEl.textContent = `${progress.stats.currentXP} / ${progress.stats.nextLevelXP}`;
    }
  }

  // Expose methods globally for testing
  getRouter() {
    return router;
  }

  getGamification() {
    return gamification;
  }

  getDatabase() {
    return db;
  }
}

// Create and initialize app
const app = new MainApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
  app.initialize();
}

// Listen for gamification events to update UI
eventBus.on('gamification:xp_gained', () => app.showStatsUpdate());
eventBus.on('gamification:initialized', () => app.showStatsUpdate());

// Expose app globally for debugging
window.app = app;

export default app;