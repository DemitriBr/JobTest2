// Gamification Engine
// Manages XP, levels, achievements, and quests

import { db } from './database.js';
import { eventBus } from './eventBus.js';

// XP Configuration
const XP_ACTIONS = {
  // Application Actions
  APPLICATION_CREATED: 50,
  APPLICATION_UPDATED: 10,
  APPLICATION_DELETED: 5,
  APPLICATION_STATUS_CHANGED: 15,
  
  // Interview Actions
  INTERVIEW_SCHEDULED: 75,
  INTERVIEW_COMPLETED: 100,
  INTERVIEW_NOTES_ADDED: 20,
  
  // Daily Actions
  DAILY_LOGIN: 25,
  STREAK_MAINTAINED: 50,
  PROFILE_UPDATED: 30,
  
  // Quest Completions
  QUEST_DAILY_COMPLETED: 100,
  QUEST_WEEKLY_COMPLETED: 500,
  
  // Milestone Actions
  FIRST_APPLICATION: 100,
  TENTH_APPLICATION: 250,
  FIFTY_APPLICATIONS: 1000,
  HUNDRED_APPLICATIONS: 2500,
  
  // Special Actions
  EXPORT_DATA: 15,
  IMPORT_DATA: 20,
  ACHIEVEMENT_UNLOCKED: 50
};

// Level Configuration
const LEVEL_CONFIG = {
  baseXP: 100,
  multiplier: 1.5,
  maxLevel: 100
};

// Level Titles
const LEVEL_TITLES = [
  { level: 1, title: 'Job Seeker Novice' },
  { level: 5, title: 'Application Apprentice' },
  { level: 10, title: 'Resume Warrior' },
  { level: 15, title: 'Interview Knight' },
  { level: 20, title: 'Career Crusader' },
  { level: 30, title: 'Opportunity Hunter' },
  { level: 40, title: 'Professional Pioneer' },
  { level: 50, title: 'Employment Elite' },
  { level: 60, title: 'Career Champion' },
  { level: 70, title: 'Job Master' },
  { level: 80, title: 'Legendary Applicant' },
  { level: 90, title: 'Career Conqueror' },
  { level: 100, title: 'Ultimate Job Tracker' }
];

// Achievement Categories
const ACHIEVEMENT_CATEGORIES = {
  APPLICATIONS: 'Applications',
  INTERVIEWS: 'Interviews',
  STREAKS: 'Streaks',
  MILESTONES: 'Milestones',
  EXPLORATION: 'Exploration',
  SOCIAL: 'Social'
};

// Achievement Definitions
const ACHIEVEMENTS = [
  // Application Achievements
  {
    id: 'first_application',
    name: 'First Steps',
    description: 'Submit your first job application',
    category: ACHIEVEMENT_CATEGORIES.APPLICATIONS,
    xpReward: 100,
    icon: '🎯',
    condition: (stats) => stats.totalApplications >= 1
  },
  {
    id: 'ten_applications',
    name: 'Getting Serious',
    description: 'Submit 10 job applications',
    category: ACHIEVEMENT_CATEGORIES.APPLICATIONS,
    xpReward: 250,
    icon: '📋',
    condition: (stats) => stats.totalApplications >= 10
  },
  {
    id: 'fifty_applications',
    name: 'Application Machine',
    description: 'Submit 50 job applications',
    category: ACHIEVEMENT_CATEGORIES.APPLICATIONS,
    xpReward: 1000,
    icon: '🚀',
    condition: (stats) => stats.totalApplications >= 50
  },
  {
    id: 'hundred_applications',
    name: 'Century Club',
    description: 'Submit 100 job applications',
    category: ACHIEVEMENT_CATEGORIES.APPLICATIONS,
    xpReward: 2500,
    icon: '💯',
    condition: (stats) => stats.totalApplications >= 100
  },
  
  // Interview Achievements
  {
    id: 'first_interview',
    name: 'Interview Ready',
    description: 'Schedule your first interview',
    category: ACHIEVEMENT_CATEGORIES.INTERVIEWS,
    xpReward: 150,
    icon: '🎤',
    condition: (stats) => stats.totalInterviews >= 1
  },
  {
    id: 'five_interviews',
    name: 'Interview Pro',
    description: 'Complete 5 interviews',
    category: ACHIEVEMENT_CATEGORIES.INTERVIEWS,
    xpReward: 500,
    icon: '💼',
    condition: (stats) => stats.completedInterviews >= 5
  },
  
  // Streak Achievements
  {
    id: 'week_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day login streak',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    xpReward: 300,
    icon: '🔥',
    condition: (stats) => stats.currentStreak >= 7
  },
  {
    id: 'month_streak',
    name: 'Monthly Master',
    description: 'Maintain a 30-day login streak',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    xpReward: 1500,
    icon: '⚡',
    condition: (stats) => stats.currentStreak >= 30
  },
  
  // Milestone Achievements
  {
    id: 'level_10',
    name: 'Double Digits',
    description: 'Reach level 10',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    xpReward: 200,
    icon: '🎖️',
    condition: (stats) => stats.level >= 10
  },
  {
    id: 'level_25',
    name: 'Quarter Century',
    description: 'Reach level 25',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    xpReward: 750,
    icon: '🏆',
    condition: (stats) => stats.level >= 25
  },
  {
    id: 'level_50',
    name: 'Halfway Hero',
    description: 'Reach level 50',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    xpReward: 2000,
    icon: '👑',
    condition: (stats) => stats.level >= 50
  }
];

// Quest Types
const QUEST_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly'
};

// Quest Templates
const QUEST_TEMPLATES = {
  daily: [
    {
      id: 'daily_application',
      name: 'Daily Application',
      description: 'Submit at least 1 job application today',
      xpReward: 100,
      type: QUEST_TYPES.DAILY,
      target: 1,
      progress: 0,
      condition: 'applications_today'
    },
    {
      id: 'daily_update',
      name: 'Status Update',
      description: 'Update the status of 3 applications',
      xpReward: 75,
      type: QUEST_TYPES.DAILY,
      target: 3,
      progress: 0,
      condition: 'status_updates_today'
    },
    {
      id: 'daily_notes',
      name: 'Take Notes',
      description: 'Add notes to 2 applications',
      xpReward: 50,
      type: QUEST_TYPES.DAILY,
      target: 2,
      progress: 0,
      condition: 'notes_added_today'
    }
  ],
  weekly: [
    {
      id: 'weekly_applications',
      name: 'Weekly Goal',
      description: 'Submit 10 job applications this week',
      xpReward: 500,
      type: QUEST_TYPES.WEEKLY,
      target: 10,
      progress: 0,
      condition: 'applications_this_week'
    },
    {
      id: 'weekly_interviews',
      name: 'Interview Week',
      description: 'Schedule 3 interviews this week',
      xpReward: 750,
      type: QUEST_TYPES.WEEKLY,
      target: 3,
      progress: 0,
      condition: 'interviews_scheduled_this_week'
    },
    {
      id: 'weekly_streak',
      name: 'Consistent Tracker',
      description: 'Log in every day this week',
      xpReward: 400,
      type: QUEST_TYPES.WEEKLY,
      target: 7,
      progress: 0,
      condition: 'logins_this_week'
    }
  ]
};

class GamificationEngine {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
    this.stats = null;
    this.achievements = null;
    this.quests = null;
  }

  async initialize(userId) {
    try {
      this.currentUser = userId;
      
      // Load or create user stats
      this.stats = await this.loadUserStats(userId);
      
      // Load achievements
      this.achievements = await this.loadAchievements(userId);
      
      // Load or generate quests
      this.quests = await this.loadQuests(userId);
      
      // Check for daily login
      await this.checkDailyLogin();
      
      this.initialized = true;
      
      // Emit initialization event
      eventBus.emit('gamification:initialized', {
        stats: this.stats,
        achievements: this.achievements,
        quests: this.quests
      });
      
    } catch (error) {
      console.error('Failed to initialize gamification:', error);
      throw error;
    }
  }

  async loadUserStats(userId) {
    const stats = await db.getUserStats(userId);
    
    if (!stats) {
      // Create initial stats
      const initialStats = {
        userId,
        level: 1,
        currentXP: 0,
        totalXP: 0,
        nextLevelXP: this.calculateXPForLevel(2),
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: new Date().toISOString().split('T')[0],
        totalApplications: 0,
        totalInterviews: 0,
        completedInterviews: 0,
        achievementsUnlocked: 0,
        questsCompleted: 0,
        title: LEVEL_TITLES[0].title
      };
      
      await db.saveUserStats(initialStats);
      return initialStats;
    }
    
    return stats;
  }

  async loadAchievements(userId) {
    const achievements = await db.getUserAchievements(userId);
    
    if (!achievements || achievements.length === 0) {
      // Initialize achievements
      const initialAchievements = ACHIEVEMENTS.map(achievement => ({
        ...achievement,
        userId,
        unlocked: false,
        unlockedAt: null,
        progress: 0
      }));
      
      await db.saveUserAchievements(userId, initialAchievements);
      return initialAchievements;
    }
    
    return achievements;
  }

  async loadQuests(userId) {
    const quests = await db.getUserQuests(userId);
    const today = new Date().toISOString().split('T')[0];
    
    // Check if quests need to be refreshed
    if (!quests || this.shouldRefreshQuests(quests, today)) {
      return await this.generateNewQuests(userId);
    }
    
    return quests;
  }

  shouldRefreshQuests(quests, today) {
    if (!quests.daily || !quests.weekly) return true;
    
    // Check if daily quests are from today
    const dailyDate = quests.daily[0]?.generatedDate;
    if (dailyDate !== today) return true;
    
    // Check if weekly quests are from this week
    const weeklyDate = new Date(quests.weekly[0]?.generatedDate);
    const currentWeek = this.getWeekNumber(new Date());
    const questWeek = this.getWeekNumber(weeklyDate);
    
    return currentWeek !== questWeek;
  }

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const daysPassed = (date - firstDayOfYear) / (24 * 60 * 60 * 1000);
    return Math.ceil((daysPassed + firstDayOfYear.getDay() + 1) / 7);
  }

  async generateNewQuests(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    // Generate daily quests (pick 3 random)
    const dailyQuests = this.selectRandomQuests(QUEST_TEMPLATES.daily, 3)
      .map(quest => ({
        ...quest,
        userId,
        generatedDate: today,
        completed: false,
        claimedReward: false
      }));
    
    // Generate weekly quests (pick 3 random)
    const weeklyQuests = this.selectRandomQuests(QUEST_TEMPLATES.weekly, 3)
      .map(quest => ({
        ...quest,
        userId,
        generatedDate: today,
        completed: false,
        claimedReward: false
      }));
    
    const quests = {
      daily: dailyQuests,
      weekly: weeklyQuests
    };
    
    await db.saveUserQuests(userId, quests);
    return quests;
  }

  selectRandomQuests(questPool, count) {
    const shuffled = [...questPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  calculateXPForLevel(level) {
    return Math.floor(LEVEL_CONFIG.baseXP * Math.pow(LEVEL_CONFIG.multiplier, level - 1));
  }

  calculateLevelFromXP(totalXP) {
    let level = 1;
    let xpRequired = 0;
    
    while (level <= LEVEL_CONFIG.maxLevel) {
      xpRequired += this.calculateXPForLevel(level);
      if (totalXP < xpRequired) break;
      level++;
    }
    
    return level;
  }

  getCurrentTitle(level) {
    const title = LEVEL_TITLES
      .filter(t => t.level <= level)
      .sort((a, b) => b.level - a.level)[0];
    
    return title ? title.title : LEVEL_TITLES[0].title;
  }

  async awardXP(action, amount = null) {
    if (!this.initialized) throw new Error('Gamification not initialized');
    
    const xpAmount = amount || XP_ACTIONS[action] || 0;
    if (xpAmount === 0) return;
    
    const previousLevel = this.stats.level;
    this.stats.currentXP += xpAmount;
    this.stats.totalXP += xpAmount;
    
    // Check for level up
    const newLevel = this.calculateLevelFromXP(this.stats.totalXP);
    const leveledUp = newLevel > previousLevel;
    
    if (leveledUp) {
      this.stats.level = newLevel;
      this.stats.title = this.getCurrentTitle(newLevel);
      
      // Calculate XP for next level
      let xpForCurrentLevel = 0;
      for (let i = 1; i < newLevel; i++) {
        xpForCurrentLevel += this.calculateXPForLevel(i);
      }
      
      this.stats.currentXP = this.stats.totalXP - xpForCurrentLevel;
      this.stats.nextLevelXP = this.calculateXPForLevel(newLevel + 1);
    }
    
    // Save updated stats
    await db.saveUserStats(this.stats);
    
    // Emit XP gained event
    eventBus.emit('gamification:xp_gained', {
      amount: xpAmount,
      action,
      totalXP: this.stats.totalXP,
      currentXP: this.stats.currentXP,
      level: this.stats.level,
      leveledUp,
      previousLevel,
      title: this.stats.title
    });
    
    // Check achievements
    await this.checkAchievements();
    
    return {
      xpGained: xpAmount,
      leveledUp,
      newLevel: this.stats.level,
      title: this.stats.title
    };
  }

  async checkAchievements() {
    const unlockedAchievements = [];
    
    for (const achievement of this.achievements) {
      if (!achievement.unlocked && achievement.condition(this.stats)) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        unlockedAchievements.push(achievement);
        
        // Award XP for achievement
        await this.awardXP('ACHIEVEMENT_UNLOCKED', achievement.xpReward);
        
        // Update achievement count
        this.stats.achievementsUnlocked++;
      }
    }
    
    if (unlockedAchievements.length > 0) {
      await db.saveUserAchievements(this.currentUser, this.achievements);
      
      // Emit achievement unlocked event
      eventBus.emit('gamification:achievements_unlocked', {
        achievements: unlockedAchievements
      });
    }
    
    return unlockedAchievements;
  }

  async updateQuestProgress(questCondition, increment = 1) {
    if (!this.initialized) return;
    
    const completedQuests = [];
    
    // Update daily quests
    for (const quest of this.quests.daily) {
      if (!quest.completed && quest.condition === questCondition) {
        quest.progress = Math.min(quest.progress + increment, quest.target);
        
        if (quest.progress >= quest.target) {
          quest.completed = true;
          completedQuests.push(quest);
        }
      }
    }
    
    // Update weekly quests
    for (const quest of this.quests.weekly) {
      if (!quest.completed && quest.condition === questCondition) {
        quest.progress = Math.min(quest.progress + increment, quest.target);
        
        if (quest.progress >= quest.target) {
          quest.completed = true;
          completedQuests.push(quest);
        }
      }
    }
    
    // Save updated quests
    await db.saveUserQuests(this.currentUser, this.quests);
    
    // Emit quest progress event
    if (completedQuests.length > 0) {
      eventBus.emit('gamification:quests_completed', {
        quests: completedQuests
      });
    }
    
    return completedQuests;
  }

  async claimQuestReward(questId) {
    if (!this.initialized) return;
    
    let quest = null;
    
    // Find quest in daily or weekly
    quest = this.quests.daily.find(q => q.id === questId) ||
            this.quests.weekly.find(q => q.id === questId);
    
    if (!quest || !quest.completed || quest.claimedReward) {
      throw new Error('Quest cannot be claimed');
    }
    
    quest.claimedReward = true;
    
    // Award XP
    const xpAction = quest.type === QUEST_TYPES.DAILY ? 
      'QUEST_DAILY_COMPLETED' : 'QUEST_WEEKLY_COMPLETED';
    
    await this.awardXP(xpAction, quest.xpReward);
    
    // Update quest count
    this.stats.questsCompleted++;
    await db.saveUserStats(this.stats);
    
    // Save quest state
    await db.saveUserQuests(this.currentUser, this.quests);
    
    return {
      questId,
      xpRewarded: quest.xpReward
    };
  }

  async checkDailyLogin() {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = this.stats.lastLoginDate;
    
    if (lastLogin !== today) {
      // Check if streak continues
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastLogin === yesterdayStr) {
        // Streak continues
        this.stats.currentStreak++;
        this.stats.longestStreak = Math.max(
          this.stats.currentStreak,
          this.stats.longestStreak
        );
        
        // Award streak XP
        await this.awardXP('STREAK_MAINTAINED');
      } else {
        // Streak broken
        this.stats.currentStreak = 1;
      }
      
      // Award daily login XP
      await this.awardXP('DAILY_LOGIN');
      
      // Update last login
      this.stats.lastLoginDate = today;
      await db.saveUserStats(this.stats);
      
      // Update quest progress
      await this.updateQuestProgress('logins_this_week');
    }
  }

  async updateApplicationStats(action) {
    if (!this.initialized) return;
    
    switch (action) {
      case 'created':
        this.stats.totalApplications++;
        await this.updateQuestProgress('applications_today');
        await this.updateQuestProgress('applications_this_week');
        break;
        
      case 'status_changed':
        await this.updateQuestProgress('status_updates_today');
        break;
        
      case 'notes_added':
        await this.updateQuestProgress('notes_added_today');
        break;
        
      case 'interview_scheduled':
        this.stats.totalInterviews++;
        await this.updateQuestProgress('interviews_scheduled_this_week');
        break;
        
      case 'interview_completed':
        this.stats.completedInterviews++;
        break;
    }
    
    await db.saveUserStats(this.stats);
    await this.checkAchievements();
  }

  getProgress() {
    if (!this.initialized) return null;
    
    return {
      stats: this.stats,
      achievements: {
        total: this.achievements.length,
        unlocked: this.achievements.filter(a => a.unlocked).length,
        list: this.achievements
      },
      quests: {
        daily: this.quests.daily,
        weekly: this.quests.weekly
      },
      levelProgress: {
        current: this.stats.currentXP,
        required: this.stats.nextLevelXP,
        percentage: (this.stats.currentXP / this.stats.nextLevelXP) * 100
      }
    };
  }
}

// Create singleton instance
export const gamification = new GamificationEngine();

// Export constants for external use
export {
  XP_ACTIONS,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENTS,
  QUEST_TYPES,
  LEVEL_TITLES
};