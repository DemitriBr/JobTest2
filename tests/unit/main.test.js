import { describe, it, expect, beforeEach, vi } from 'vitest';
import RetroJobTracker from '../../src/main.js';

describe('RetroJobTracker', () => {
  let app;
  
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="app">
        <div id="loading-screen" class="loading-screen"></div>
        <div id="main-app" class="main-app hidden">
          <header class="app-header">
            <div class="player-stats">
              <div class="level-info">
                <span class="level-text">LV.<span id="player-level">1</span></span>
                <div class="xp-bar">
                  <div class="xp-fill" id="xp-fill"></div>
                </div>
                <span id="current-xp">0</span>/<span id="max-xp">100</span>
              </div>
            </div>
          </header>
          <nav class="main-nav">
            <button class="nav-btn active" data-view="dashboard">DASHBOARD</button>
            <button class="nav-btn" data-view="applications">APPLICATIONS</button>
          </nav>
          <main class="main-content">
            <div id="view-container" class="view-container"></div>
          </main>
        </div>
        <div id="xp-modal" class="modal hidden">
          <div class="modal-content">
            <h2 id="modal-title">LEVEL UP!</h2>
            <p id="modal-message"></p>
            <span id="xp-gain-text"></span>
            <button id="modal-close">CONTINUE</button>
          </div>
        </div>
      </div>
    `;
    
    // Mock document.readyState
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true
    });
    
    app = new RetroJobTracker();
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(app.currentView).toBe('dashboard');
      expect(app.playerLevel).toBe(1);
      expect(app.currentXP).toBe(0);
      expect(app.maxXP).toBe(100);
    });

    it('should update player stats on initialization', () => {
      const levelEl = document.getElementById('player-level');
      const currentXPEl = document.getElementById('current-xp');
      const maxXPEl = document.getElementById('max-xp');
      
      expect(levelEl.textContent).toBe('1');
      expect(currentXPEl.textContent).toBe('0');
      expect(maxXPEl.textContent).toBe('100');
    });
  });

  describe('XP System', () => {
    it('should award XP correctly', () => {
      const initialXP = app.currentXP;
      app.awardXP(50, 'Test action');
      
      expect(app.currentXP).toBe(initialXP + 50);
    });

    it('should level up when XP threshold is reached', () => {
      const initialLevel = app.playerLevel;
      app.awardXP(100, 'Level up test');
      
      expect(app.playerLevel).toBe(initialLevel + 1);
      expect(app.currentXP).toBe(0);
      expect(app.maxXP).toBe(120); // 100 * 1.2
    });

    it('should update XP bar width correctly', () => {
      app.awardXP(50);
      const xpFill = document.getElementById('xp-fill');
      
      expect(xpFill.style.width).toBe('50%');
    });
  });

  describe('Navigation', () => {
    it('should switch views correctly', () => {
      app.switchView('applications');
      
      expect(app.currentView).toBe('applications');
      
      const activeBtn = document.querySelector('.nav-btn.active');
      expect(activeBtn.dataset.view).toBe('applications');
    });

    it('should load view content', () => {
      app.loadView('dashboard');
      const container = document.getElementById('view-container');
      
      expect(container.innerHTML).toContain('Dashboard View');
    });

    it('should award XP for navigation', () => {
      const initialXP = app.currentXP;
      app.switchView('applications');
      
      expect(app.currentXP).toBe(initialXP + 5);
    });
  });

  describe('Modal System', () => {
    it('should show level up modal', () => {
      app.showLevelUpModal();
      const modal = document.getElementById('xp-modal');
      
      expect(modal.classList.contains('hidden')).toBe(false);
    });

    it('should hide XP modal', () => {
      app.showLevelUpModal();
      app.hideXPModal();
      const modal = document.getElementById('xp-modal');
      
      expect(modal.classList.contains('hidden')).toBe(true);
    });
  });
});