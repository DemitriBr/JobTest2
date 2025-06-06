// 8-Bit Celebration Effects System
// Handles celebratory animations and notifications for achievements, level ups, etc.

import { eventBus } from './eventBus.js';

class CelebrationSystem {
  constructor() {
    this.container = null;
    this.audioEnabled = true;
    this.activeEffects = [];
    this.initializeEventListeners();
  }

  initialize(containerId = 'celebration-container') {
    // Create celebration container if it doesn't exist
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'celebration-container';
      document.body.appendChild(this.container);
    }
  }

  initializeEventListeners() {
    // Listen for gamification events
    eventBus.on('gamification:xp_gained', (data) => {
      this.showXPGain(data.amount, data.action);
      
      if (data.leveledUp) {
        this.showLevelUp(data.newLevel, data.title);
      }
    });

    eventBus.on('gamification:achievements_unlocked', (data) => {
      data.achievements.forEach(achievement => {
        this.showAchievementUnlocked(achievement);
      });
    });

    eventBus.on('gamification:quests_completed', (data) => {
      data.quests.forEach(quest => {
        this.showQuestComplete(quest);
      });
    });
  }

  showXPGain(amount, action) {
    const xpElement = document.createElement('div');
    xpElement.className = 'xp-gain-popup';
    xpElement.innerHTML = `
      <span class="xp-amount">+${amount} XP</span>
      <span class="xp-action">${this.formatAction(action)}</span>
    `;

    // Position randomly along the top
    const randomX = Math.random() * 80 + 10; // 10% to 90%
    xpElement.style.left = `${randomX}%`;
    xpElement.style.top = '20%';

    this.container.appendChild(xpElement);

    // Play sound effect
    this.playSound('xp_gain');

    // Remove after animation
    setTimeout(() => {
      xpElement.remove();
    }, 3000);
  }

  showLevelUp(level, title) {
    // Create fullscreen overlay
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';

    // Create content
    const content = document.createElement('div');
    content.className = 'level-up-content';
    content.innerHTML = `
      <div class="level-up-animation">
        <div class="pixel-stars"></div>
        <div class="level-up-text">
          <h1 class="pixel-text-large">LEVEL UP!</h1>
          <div class="level-number">Level ${level}</div>
          <div class="level-title">${title}</div>
        </div>
        <div class="pixel-fireworks"></div>
      </div>
      <button class="pixel-btn primary continue-btn">Continue</button>
    `;

    overlay.appendChild(content);
    this.container.appendChild(overlay);

    // Create pixel stars
    this.createPixelStars(overlay.querySelector('.pixel-stars'));

    // Create fireworks
    this.createPixelFireworks(overlay.querySelector('.pixel-fireworks'));

    // Play level up sound
    this.playSound('level_up');

    // Handle continue button
    const continueBtn = content.querySelector('.continue-btn');
    continueBtn.addEventListener('click', () => {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 500);
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 500);
      }
    }, 5000);
  }

  showAchievementUnlocked(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification slide-in-right';
    notification.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-details">
        <div class="achievement-header">Achievement Unlocked!</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-description">${achievement.description}</div>
        <div class="achievement-reward">+${achievement.xpReward} XP</div>
      </div>
    `;

    this.container.appendChild(notification);

    // Play achievement sound
    this.playSound('achievement');

    // Add sparkle effect
    this.addSparkleEffect(notification);

    // Remove after animation
    setTimeout(() => {
      notification.classList.add('slide-out-right');
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  }

  showQuestComplete(quest) {
    const notification = document.createElement('div');
    notification.className = 'quest-complete-notification bounce-in';
    notification.innerHTML = `
      <div class="quest-complete-header">Quest Complete!</div>
      <div class="quest-name">${quest.name}</div>
      <div class="quest-reward">+${quest.xpReward} XP</div>
      <div class="pixel-check">✓</div>
    `;

    // Position in center-top
    notification.style.top = '10%';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';

    this.container.appendChild(notification);

    // Play quest complete sound
    this.playSound('quest_complete');

    // Remove after animation
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  createPixelStars(container) {
    for (let i = 0; i < 20; i++) {
      const star = document.createElement('div');
      star.className = 'pixel-star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 2}s`;
      star.style.animationDuration = `${2 + Math.random() * 2}s`;
      container.appendChild(star);
    }
  }

  createPixelFireworks(container) {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const firework = document.createElement('div');
        firework.className = 'pixel-firework';
        firework.style.left = `${20 + Math.random() * 60}%`;
        firework.style.bottom = '0';
        firework.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        container.appendChild(firework);
        
        // Create explosion
        setTimeout(() => {
          this.createFireworkExplosion(container, firework);
          firework.remove();
        }, 1000);
      }, i * 500);
    }
  }

  createFireworkExplosion(container, firework) {
    const rect = firework.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top + rect.height / 2;
    
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework-particle';
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.backgroundColor = firework.style.backgroundColor;
      
      const angle = (i * Math.PI * 2) / 8;
      const distance = 50 + Math.random() * 50;
      particle.style.setProperty('--end-x', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--end-y', `${Math.sin(angle) * distance}px`);
      
      container.appendChild(particle);
      
      setTimeout(() => particle.remove(), 1000);
    }
  }

  addSparkleEffect(element) {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        element.appendChild(sparkle);
        
        setTimeout(() => sparkle.remove(), 1000);
      }, i * 100);
    }
  }

  formatAction(action) {
    return action
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  playSound(soundType) {
    if (!this.audioEnabled) return;
    
    // Create 8-bit style sounds using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    switch (soundType) {
      case 'xp_gain':
        this.playXPSound(audioContext);
        break;
      case 'level_up':
        this.playLevelUpSound(audioContext);
        break;
      case 'achievement':
        this.playAchievementSound(audioContext);
        break;
      case 'quest_complete':
        this.playQuestCompleteSound(audioContext);
        break;
    }
  }

  playXPSound(context) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(1046.50, context.currentTime + 0.1); // C6
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
  }

  playLevelUpSound(context) {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, index) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(freq, context.currentTime + index * 0.1);
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime + index * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + index * 0.1 + 0.2);
      
      oscillator.start(context.currentTime + index * 0.1);
      oscillator.stop(context.currentTime + index * 0.1 + 0.2);
    });
  }

  playAchievementSound(context) {
    // Play a triumphant fanfare
    const notes = [
      { freq: 523.25, time: 0 },      // C5
      { freq: 523.25, time: 0.1 },    // C5
      { freq: 523.25, time: 0.2 },    // C5
      { freq: 659.25, time: 0.3 },    // E5
      { freq: 783.99, time: 0.5 },    // G5
    ];
    
    notes.forEach(({ freq, time }) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(freq, context.currentTime + time);
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime + time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + time + 0.2);
      
      oscillator.start(context.currentTime + time);
      oscillator.stop(context.currentTime + time + 0.2);
    });
  }

  playQuestCompleteSound(context) {
    // Play a quick success jingle
    const oscillator1 = context.createOscillator();
    const oscillator2 = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator1.type = 'square';
    oscillator2.type = 'square';
    
    // Two-note harmony
    oscillator1.frequency.setValueAtTime(659.25, context.currentTime); // E5
    oscillator2.frequency.setValueAtTime(830.61, context.currentTime); // G#5
    
    oscillator1.frequency.setValueAtTime(783.99, context.currentTime + 0.1); // G5
    oscillator2.frequency.setValueAtTime(987.77, context.currentTime + 0.1); // B5
    
    gainNode.gain.setValueAtTime(0.2, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
    
    oscillator1.start(context.currentTime);
    oscillator2.start(context.currentTime);
    oscillator1.stop(context.currentTime + 0.2);
    oscillator2.stop(context.currentTime + 0.2);
  }

  toggleSound(enabled) {
    this.audioEnabled = enabled;
  }
}

// Create singleton instance
export const celebrations = new CelebrationSystem();