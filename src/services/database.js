import Dexie from 'dexie';
import SecurityService from './security.js';

class DatabaseService extends Dexie {
  constructor() {
    super('RetroJobTrackerDB');
    
    // Define schemas
    this.version(1).stores({
      applications: '++id, company, position, status, dateApplied, dateModified, tags, encrypted',
      gameData: '++id, playerLevel, currentXP, maxXP, totalXP, dateModified',
      achievements: '++id, achievementId, dateUnlocked, category, encrypted',
      quests: '++id, questId, status, progress, dateAssigned, dateCompleted',
      settings: '++id, key, value, encrypted',
      auditLogs: '++id, timestamp, event, details, level'
    });

    this.isInitialized = false;
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    
    this.init();
  }

  async init() {
    try {
      await this.open();
      this.isInitialized = true;
      await this.setupInitialData();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async setupInitialData() {
    // Initialize game data if it doesn't exist
    const gameData = await this.gameData.toArray();
    if (gameData.length === 0) {
      await this.gameData.add({
        playerLevel: 1,
        currentXP: 0,
        maxXP: 100,
        totalXP: 0,
        dateModified: new Date()
      });
    }

    // Initialize default settings
    const settings = await this.settings.toArray();
    if (settings.length === 0) {
      const defaultSettings = [
        { key: 'theme', value: 'dark', encrypted: false },
        { key: 'notifications', value: true, encrypted: false },
        { key: 'autoSave', value: true, encrypted: false },
        { key: 'xpNotifications', value: true, encrypted: false }
      ];

      for (const setting of defaultSettings) {
        await this.settings.add({
          ...setting,
          dateModified: new Date()
        });
      }
    }
  }

  // Application Management
  async addApplication(applicationData) {
    try {
      const sanitizedData = this.sanitizeApplicationData(applicationData);
      const encryptedData = await this.encryptSensitiveData(sanitizedData);
      
      const application = {
        ...encryptedData,
        dateApplied: new Date(sanitizedData.dateApplied || Date.now()),
        dateModified: new Date(),
        encrypted: true
      };

      const id = await this.applications.add(application);
      this.invalidateCache('applications');
      
      // Award XP for adding application
      await this.awardXP(25, 'Added job application');
      
      await this.logActivity('APPLICATION_ADDED', { applicationId: id, company: sanitizedData.company });
      
      return { id, ...application };
    } catch (error) {
      console.error('Failed to add application:', error);
      throw error;
    }
  }

  async updateApplication(id, updateData) {
    try {
      const existing = await this.applications.get(id);
      if (!existing) {
        throw new Error('Application not found');
      }

      const sanitizedData = this.sanitizeApplicationData(updateData);
      const encryptedData = await this.encryptSensitiveData(sanitizedData);
      
      const updatedApplication = {
        ...existing,
        ...encryptedData,
        dateModified: new Date()
      };

      await this.applications.update(id, updatedApplication);
      this.invalidateCache('applications');
      
      // Award XP for updating application
      await this.awardXP(10, 'Updated job application');
      
      await this.logActivity('APPLICATION_UPDATED', { applicationId: id });
      
      return updatedApplication;
    } catch (error) {
      console.error('Failed to update application:', error);
      throw error;
    }
  }

  async deleteApplication(id) {
    try {
      const application = await this.applications.get(id);
      if (!application) {
        throw new Error('Application not found');
      }

      await this.applications.delete(id);
      this.invalidateCache('applications');
      
      await this.logActivity('APPLICATION_DELETED', { applicationId: id });
      
      return true;
    } catch (error) {
      console.error('Failed to delete application:', error);
      throw error;
    }
  }

  async getApplications(filters = {}) {
    try {
      const cacheKey = `applications_${JSON.stringify(filters)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      let query = this.applications.orderBy('dateModified').reverse();

      // Apply filters
      if (filters.status) {
        query = query.filter(app => app.status === filters.status);
      }
      
      if (filters.company) {
        query = query.filter(app => 
          app.company && app.company.toLowerCase().includes(filters.company.toLowerCase())
        );
      }

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        query = query.filter(app => 
          app.dateApplied >= start && app.dateApplied <= end
        );
      }

      const applications = await query.toArray();
      const decryptedApplications = await Promise.all(
        applications.map(app => this.decryptSensitiveData(app))
      );

      this.setCache(cacheKey, decryptedApplications);
      return decryptedApplications;
    } catch (error) {
      console.error('Failed to get applications:', error);
      throw error;
    }
  }

  async getApplication(id) {
    try {
      const application = await this.applications.get(id);
      if (!application) return null;
      
      return await this.decryptSensitiveData(application);
    } catch (error) {
      console.error('Failed to get application:', error);
      throw error;
    }
  }

  // Game Data Management
  async getGameData() {
    try {
      const cached = this.getFromCache('gameData');
      if (cached) return cached;

      const gameData = await this.gameData.orderBy('id').last();
      if (!gameData) {
        throw new Error('Game data not found');
      }

      this.setCache('gameData', gameData);
      return gameData;
    } catch (error) {
      console.error('Failed to get game data:', error);
      throw error;
    }
  }

  async updateGameData(updates) {
    try {
      const current = await this.getGameData();
      const updated = {
        ...current,
        ...updates,
        dateModified: new Date()
      };

      await this.gameData.update(current.id, updated);
      this.invalidateCache('gameData');
      
      return updated;
    } catch (error) {
      console.error('Failed to update game data:', error);
      throw error;
    }
  }

  async awardXP(amount, reason = '') {
    try {
      const gameData = await this.getGameData();
      let { playerLevel, currentXP, maxXP, totalXP } = gameData;
      
      currentXP += amount;
      totalXP += amount;
      
      // Check for level up
      let leveledUp = false;
      while (currentXP >= maxXP) {
        playerLevel++;
        currentXP -= maxXP;
        maxXP = Math.floor(maxXP * 1.2);
        leveledUp = true;
      }

      const updatedGameData = await this.updateGameData({
        playerLevel,
        currentXP,
        maxXP,
        totalXP
      });

      await this.logActivity('XP_AWARDED', { 
        amount, 
        reason, 
        newTotal: totalXP,
        leveledUp,
        newLevel: playerLevel
      });

      // Dispatch XP event
      window.dispatchEvent(new CustomEvent('game:xpAwarded', {
        detail: { 
          amount, 
          reason, 
          gameData: updatedGameData, 
          leveledUp 
        }
      }));

      return { gameData: updatedGameData, leveledUp };
    } catch (error) {
      console.error('Failed to award XP:', error);
      throw error;
    }
  }

  // Achievement System
  async unlockAchievement(achievementId, category = 'general') {
    try {
      // Check if already unlocked
      const existing = await this.achievements
        .where('achievementId')
        .equals(achievementId)
        .first();
      
      if (existing) {
        return existing;
      }

      const achievement = {
        achievementId,
        category,
        dateUnlocked: new Date(),
        encrypted: false
      };

      const id = await this.achievements.add(achievement);
      
      // Award XP for achievement
      await this.awardXP(50, `Unlocked achievement: ${achievementId}`);
      
      await this.logActivity('ACHIEVEMENT_UNLOCKED', { achievementId, category });
      
      // Dispatch achievement event
      window.dispatchEvent(new CustomEvent('game:achievementUnlocked', {
        detail: { achievementId, category }
      }));

      return { id, ...achievement };
    } catch (error) {
      console.error('Failed to unlock achievement:', error);
      throw error;
    }
  }

  async getAchievements() {
    try {
      const cached = this.getFromCache('achievements');
      if (cached) return cached;

      const achievements = await this.achievements.orderBy('dateUnlocked').reverse().toArray();
      this.setCache('achievements', achievements);
      
      return achievements;
    } catch (error) {
      console.error('Failed to get achievements:', error);
      throw error;
    }
  }

  // Settings Management
  async getSetting(key) {
    try {
      const setting = await this.settings.where('key').equals(key).first();
      if (!setting) return null;
      
      if (setting.encrypted) {
        return await this.decryptSensitiveData(setting);
      }
      
      return setting.value;
    } catch (error) {
      console.error('Failed to get setting:', error);
      throw error;
    }
  }

  async setSetting(key, value, encrypted = false) {
    try {
      const existing = await this.settings.where('key').equals(key).first();
      
      const settingData = { key, value, encrypted, dateModified: new Date() };
      
      if (encrypted) {
        settingData.value = await this.encryptSensitiveData({ value }).value;
      }

      if (existing) {
        await this.settings.update(existing.id, settingData);
      } else {
        await this.settings.add(settingData);
      }

      this.invalidateCache('settings');
      return value;
    } catch (error) {
      console.error('Failed to set setting:', error);
      throw error;
    }
  }

  // Data Encryption/Decryption
  async encryptSensitiveData(data) {
    try {
      const encrypted = { ...data };
      const sensitiveFields = ['company', 'position', 'contactEmail', 'notes', 'salary'];
      
      for (const field of sensitiveFields) {
        if (data[field]) {
          encrypted[field] = SecurityService.encryptData(data[field]);
        }
      }
      
      return encrypted;
    } catch (error) {
      console.error('Failed to encrypt data:', error);
      // Return original data if encryption fails
      return data;
    }
  }

  async decryptSensitiveData(data) {
    try {
      if (!data.encrypted) return data;
      
      const decrypted = { ...data };
      const sensitiveFields = ['company', 'position', 'contactEmail', 'notes', 'salary'];
      
      for (const field of sensitiveFields) {
        if (data[field] && typeof data[field] === 'string') {
          try {
            decrypted[field] = SecurityService.decryptData(data[field]);
          } catch (error) {
            console.warn(`Failed to decrypt field ${field}:`, error);
            decrypted[field] = '[Encrypted Data]';
          }
        }
      }
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return data;
    }
  }

  // Data Sanitization
  sanitizeApplicationData(data) {
    return {
      company: SecurityService.sanitizeInput(data.company || '', 'text'),
      position: SecurityService.sanitizeInput(data.position || '', 'text'),
      status: SecurityService.sanitizeInput(data.status || 'applied', 'text'),
      contactEmail: SecurityService.sanitizeInput(data.contactEmail || '', 'email'),
      jobUrl: SecurityService.sanitizeInput(data.jobUrl || '', 'url'),
      salary: SecurityService.sanitizeInput(data.salary || '', 'text'),
      notes: SecurityService.sanitizeInput(data.notes || '', 'text'),
      tags: Array.isArray(data.tags) ? data.tags.map(tag => SecurityService.sanitizeInput(tag, 'text')) : [],
      dateApplied: data.dateApplied || new Date()
    };
  }

  // Activity Logging
  async logActivity(event, details = {}) {
    try {
      await this.auditLogs.add({
        timestamp: new Date(),
        event,
        details: JSON.stringify(details),
        level: 'info'
      });

      // Keep only last 1000 logs
      const logCount = await this.auditLogs.count();
      if (logCount > 1000) {
        const oldestLogs = await this.auditLogs.orderBy('timestamp').limit(logCount - 1000).toArray();
        const idsToDelete = oldestLogs.map(log => log.id);
        await this.auditLogs.bulkDelete(idsToDelete);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async getActivityLogs(limit = 100) {
    try {
      return await this.auditLogs
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Failed to get activity logs:', error);
      return [];
    }
  }

  // Cache Management
  getFromCache(key) {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  setCache(key, data) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.cacheDuration);
  }

  invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Data Export/Import
  async exportData() {
    try {
      const [applications, gameData, achievements, settings] = await Promise.all([
        this.getApplications(),
        this.getGameData(),
        this.getAchievements(),
        this.settings.toArray()
      ]);

      const exportData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
          applications,
          gameData,
          achievements,
          settings: settings.filter(s => !s.encrypted) // Don't export encrypted settings
        }
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.version || !data.data) {
        throw new Error('Invalid data format');
      }

      // Clear existing data
      await this.transaction('rw', this.applications, this.achievements, () => {
        this.applications.clear();
        this.achievements.clear();
      });

      // Import applications
      if (data.data.applications) {
        for (const app of data.data.applications) {
          await this.addApplication(app);
        }
      }

      // Import achievements
      if (data.data.achievements) {
        for (const achievement of data.data.achievements) {
          await this.achievements.add(achievement);
        }
      }

      // Import game data
      if (data.data.gameData) {
        await this.updateGameData(data.data.gameData);
      }

      this.clearCache();
      await this.logActivity('DATA_IMPORTED', { recordCount: data.data.applications?.length || 0 });
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  // Database Statistics
  async getStatistics() {
    try {
      const [appCount, totalXP, achievementCount] = await Promise.all([
        this.applications.count(),
        this.getGameData().then(data => data.totalXP),
        this.achievements.count()
      ]);

      const statusCounts = await this.applications.toArray().then(apps => {
        const counts = {};
        apps.forEach(app => {
          counts[app.status] = (counts[app.status] || 0) + 1;
        });
        return counts;
      });

      return {
        totalApplications: appCount,
        totalXP,
        totalAchievements: achievementCount,
        statusBreakdown: statusCounts,
        cacheSize: this.cache.size
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {};
    }
  }

  // Gamification methods for new system
  async getUserStats(userId) {
    try {
      const stats = await this.settings.where('key').equals(`gamification_stats_${userId}`).first();
      return stats ? stats.value : null;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  async saveUserStats(stats) {
    try {
      const key = `gamification_stats_${stats.userId}`;
      await this.setSetting(key, stats, false);
      return stats;
    } catch (error) {
      console.error('Error saving user stats:', error);
      throw error;
    }
  }

  async getUserAchievements(userId) {
    try {
      const achievements = await this.settings.where('key').equals(`gamification_achievements_${userId}`).first();
      return achievements ? achievements.value : [];
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw error;
    }
  }

  async saveUserAchievements(userId, achievements) {
    try {
      const key = `gamification_achievements_${userId}`;
      await this.setSetting(key, achievements, false);
      return achievements;
    } catch (error) {
      console.error('Error saving user achievements:', error);
      throw error;
    }
  }

  async getUserQuests(userId) {
    try {
      const quests = await this.settings.where('key').equals(`gamification_quests_${userId}`).first();
      return quests ? quests.value : null;
    } catch (error) {
      console.error('Error getting user quests:', error);
      throw error;
    }
  }

  async saveUserQuests(userId, quests) {
    try {
      const key = `gamification_quests_${userId}`;
      await this.setSetting(key, quests, false);
      return quests;
    } catch (error) {
      console.error('Error saving user quests:', error);
      throw error;
    }
  }
}

// Export singleton instance
const db = new DatabaseService();
export default db;
export { db };