// Dashboard View - Main overview with stats and recent activity
import { View } from '../services/router.js';
import db from '../services/database.js';
import { gamification } from '../services/gamification.js';
import { eventBus } from '../services/eventBus.js';

export class DashboardView extends View {
  async initialize() {
    this.stats = await this.loadStats();
    this.recentApplications = await this.loadRecentApplications();
    this.gamificationProgress = gamification.getProgress();
  }

  async loadStats() {
    const applications = await db.getApplications();
    const stats = {
      total: applications.length,
      byStatus: {},
      thisWeek: 0,
      thisMonth: 0,
      interviews: 0
    };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    applications.forEach(app => {
      // Count by status
      stats.byStatus[app.status] = (stats.byStatus[app.status] || 0) + 1;

      // Count recent applications
      const appDate = new Date(app.dateApplied);
      if (appDate >= weekAgo) stats.thisWeek++;
      if (appDate >= monthAgo) stats.thisMonth++;

      // Count interviews
      if (app.status === 'interview' || app.status === 'interviewed') {
        stats.interviews++;
      }
    });

    return stats;
  }

  async loadRecentApplications() {
    const applications = await db.getApplications();
    return applications
      .sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied))
      .slice(0, 5);
  }

  async render() {
    const playerStats = this.gamificationProgress?.stats || {};
    const levelProgress = this.gamificationProgress?.levelProgress || { percentage: 0 };
    const achievements = this.gamificationProgress?.achievements || { unlocked: 0, total: 0 };
    const dailyQuests = this.gamificationProgress?.quests?.daily || [];
    const activeQuests = dailyQuests.filter(q => !q.completed).length;

    return `
      <div class="dashboard-view">
        <div class="dashboard-header">
          <h1 class="page-title">Dashboard</h1>
          <div class="quick-actions">
            <button class="pixel-btn primary" data-route="/applications/new">
              + New Application
            </button>
          </div>
        </div>

        <!-- Player Stats Card -->
        <div class="dashboard-section player-stats-section">
          <div class="pixel-card">
            <h2 class="section-title">Player Progress</h2>
            <div class="player-stats-grid">
              <div class="stat-item">
                <div class="stat-label">Level</div>
                <div class="stat-value large">${playerStats.level || 1}</div>
                <div class="stat-subtitle">${playerStats.title || 'Job Seeker Novice'}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Total XP</div>
                <div class="stat-value">${playerStats.totalXP || 0}</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${levelProgress.percentage}%"></div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Current Streak</div>
                <div class="stat-value">${playerStats.currentStreak || 0} days</div>
                <div class="stat-icon">🔥</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Achievements</div>
                <div class="stat-value">${achievements.unlocked}/${achievements.total}</div>
                <div class="stat-icon">🏆</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Active Quests</div>
                <div class="stat-value">${activeQuests}</div>
                <div class="stat-icon">📋</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Application Stats -->
        <div class="dashboard-section stats-section">
          <h2 class="section-title">Application Statistics</h2>
          <div class="stats-grid">
            <div class="stat-card pixel-card">
              <div class="stat-icon-large">📊</div>
              <div class="stat-number">${this.stats.total}</div>
              <div class="stat-label">Total Applications</div>
            </div>
            <div class="stat-card pixel-card">
              <div class="stat-icon-large">📅</div>
              <div class="stat-number">${this.stats.thisWeek}</div>
              <div class="stat-label">This Week</div>
            </div>
            <div class="stat-card pixel-card">
              <div class="stat-icon-large">📈</div>
              <div class="stat-number">${this.stats.thisMonth}</div>
              <div class="stat-label">This Month</div>
            </div>
            <div class="stat-card pixel-card">
              <div class="stat-icon-large">🎤</div>
              <div class="stat-number">${this.stats.interviews}</div>
              <div class="stat-label">Interviews</div>
            </div>
          </div>
        </div>

        <!-- Status Breakdown -->
        <div class="dashboard-section">
          <h2 class="section-title">Status Overview</h2>
          <div class="pixel-card">
            <div class="status-chart">
              ${this.renderStatusChart()}
            </div>
          </div>
        </div>

        <!-- Recent Applications -->
        <div class="dashboard-section">
          <h2 class="section-title">Recent Applications</h2>
          <div class="pixel-card">
            ${this.renderRecentApplications()}
          </div>
        </div>

        <!-- Daily Quests Preview -->
        <div class="dashboard-section">
          <h2 class="section-title">Today's Quests</h2>
          <div class="quest-preview">
            ${this.renderQuestPreview()}
          </div>
        </div>
      </div>
    `;
  }

  renderStatusChart() {
    const statuses = [
      { key: 'applied', label: 'Applied', color: 'var(--color-info)' },
      { key: 'interview', label: 'Interview', color: 'var(--color-warning)' },
      { key: 'offer', label: 'Offer', color: 'var(--color-success)' },
      { key: 'rejected', label: 'Rejected', color: 'var(--color-danger)' },
      { key: 'withdrawn', label: 'Withdrawn', color: 'var(--color-text-muted)' }
    ];

    const total = this.stats.total || 1; // Avoid division by zero

    return `
      <div class="status-bars">
        ${statuses.map(status => {
          const count = this.stats.byStatus[status.key] || 0;
          const percentage = Math.round((count / total) * 100);
          return `
            <div class="status-bar-item">
              <div class="status-bar-header">
                <span class="status-label">${status.label}</span>
                <span class="status-count">${count}</span>
              </div>
              <div class="status-bar">
                <div class="status-bar-fill" 
                     style="width: ${percentage}%; background-color: ${status.color}">
                </div>
              </div>
              <div class="status-percentage">${percentage}%</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderRecentApplications() {
    if (this.recentApplications.length === 0) {
      return `
        <div class="empty-state">
          <p>No applications yet. Start tracking your job search!</p>
          <button class="pixel-btn primary" data-route="/applications/new">
            Add Your First Application
          </button>
        </div>
      `;
    }

    return `
      <div class="recent-applications-list">
        ${this.recentApplications.map(app => `
          <div class="recent-app-item" data-route="/applications/${app.id}">
            <div class="app-info">
              <h4 class="app-company">${this.escapeHtml(app.company)}</h4>
              <p class="app-position">${this.escapeHtml(app.position)}</p>
            </div>
            <div class="app-meta">
              <span class="app-date">${this.formatDate(app.dateApplied)}</span>
              <span class="app-status status-${app.status}">${app.status}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="view-all">
        <a href="#" data-route="/applications" class="pixel-link">
          View All Applications →
        </a>
      </div>
    `;
  }

  renderQuestPreview() {
    const dailyQuests = this.gamificationProgress?.quests?.daily || [];
    
    if (dailyQuests.length === 0) {
      return '<p class="text-muted">No active quests</p>';
    }

    return `
      <div class="quest-list-preview">
        ${dailyQuests.slice(0, 3).map(quest => `
          <div class="quest-item-preview ${quest.completed ? 'completed' : ''}">
            <div class="quest-info">
              <h4 class="quest-name">${quest.name}</h4>
              <p class="quest-progress">${quest.progress}/${quest.target} completed</p>
            </div>
            <div class="quest-reward">+${quest.xpReward} XP</div>
          </div>
        `).join('')}
      </div>
      <div class="view-all">
        <a href="#" data-route="/quests" class="pixel-link">
          View All Quests →
        </a>
      </div>
    `;
  }

  async mounted() {
    // Add click handlers for recent applications
    document.querySelectorAll('.recent-app-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('a')) {
          const route = item.getAttribute('data-route');
          if (route) {
            router.navigate(route);
          }
        }
      });
    });

    // Refresh on application changes
    this.refreshHandler = async () => {
      this.stats = await this.loadStats();
      this.recentApplications = await this.loadRecentApplications();
      // Re-render would go here
    };

    eventBus.on('application:created', this.refreshHandler);
    eventBus.on('application:updated', this.refreshHandler);
    eventBus.on('application:deleted', this.refreshHandler);
  }

  destroy() {
    // Clean up event listeners
    if (this.refreshHandler) {
      eventBus.off('application:created', this.refreshHandler);
      eventBus.off('application:updated', this.refreshHandler);
      eventBus.off('application:deleted', this.refreshHandler);
    }
  }
}

// Add dashboard-specific styles
const style = document.createElement('style');
style.textContent = `
  .dashboard-view {
    padding: 0;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
  }

  .page-title {
    font-size: var(--font-size-xl);
    color: var(--color-primary);
    margin: 0;
  }

  .dashboard-section {
    margin-bottom: var(--space-xl);
  }

  .section-title {
    font-size: var(--font-size-lg);
    color: var(--color-text-primary);
    margin-bottom: var(--space-md);
  }

  /* Player Stats */
  .player-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-md);
  }

  .stat-item {
    text-align: center;
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    margin-bottom: var(--space-xs);
  }

  .stat-value {
    font-size: var(--font-size-lg);
    color: var(--color-text-primary);
    font-weight: bold;
  }

  .stat-value.large {
    font-size: var(--font-size-xl);
    color: var(--color-primary);
  }

  .stat-subtitle {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
  }

  .stat-icon {
    font-size: var(--font-size-lg);
    margin-top: var(--space-xs);
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background-color: var(--color-bg-dark);
    border: 1px solid var(--color-pixel-border-light);
    margin-top: var(--space-xs);
  }

  .progress-fill {
    height: 100%;
    background-color: var(--color-xp-bar);
    transition: width 0.3s ease;
  }

  /* Application Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-md);
  }

  .stat-card {
    text-align: center;
    padding: var(--space-lg);
  }

  .stat-icon-large {
    font-size: 32px;
    margin-bottom: var(--space-sm);
  }

  .stat-number {
    font-size: var(--font-size-xl);
    color: var(--color-primary);
    font-weight: bold;
    margin-bottom: var(--space-xs);
  }

  /* Status Chart */
  .status-bars {
    display: grid;
    gap: var(--space-md);
  }

  .status-bar-item {
    display: grid;
    gap: var(--space-xs);
  }

  .status-bar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .status-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }

  .status-count {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .status-bar {
    width: 100%;
    height: 16px;
    background-color: var(--color-bg-dark);
    border: 1px solid var(--color-pixel-border-light);
  }

  .status-bar-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .status-percentage {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-align: right;
  }

  /* Recent Applications */
  .recent-applications-list {
    display: grid;
    gap: var(--space-sm);
  }

  .recent-app-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm);
    background-color: var(--color-bg-dark);
    border: 1px solid var(--color-pixel-border-dark);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .recent-app-item:hover {
    background-color: var(--color-bg-highlight);
    transform: translateX(4px);
  }

  .app-company {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-xs) 0;
  }

  .app-position {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .app-meta {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
  }

  .app-date {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .app-status {
    font-size: var(--font-size-xs);
    padding: 2px 8px;
    border: 1px solid;
    text-transform: uppercase;
  }

  .status-applied { 
    color: var(--color-info); 
    border-color: var(--color-info);
  }
  
  .status-interview { 
    color: var(--color-warning); 
    border-color: var(--color-warning);
  }
  
  .status-offer { 
    color: var(--color-success); 
    border-color: var(--color-success);
  }
  
  .status-rejected { 
    color: var(--color-danger); 
    border-color: var(--color-danger);
  }

  /* Quest Preview */
  .quest-list-preview {
    display: grid;
    gap: var(--space-sm);
  }

  .quest-item-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm);
    background-color: var(--color-bg-medium);
    border: 1px solid var(--color-pixel-border-light);
  }

  .quest-item-preview.completed {
    opacity: 0.6;
  }

  .quest-name {
    font-size: var(--font-size-sm);
    margin: 0 0 var(--space-xs) 0;
  }

  .quest-progress {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .quest-reward {
    font-size: var(--font-size-sm);
    color: var(--color-xp-bar);
  }

  /* Utilities */
  .view-all {
    text-align: center;
    margin-top: var(--space-md);
  }

  .pixel-link {
    color: var(--color-primary);
    text-decoration: none;
    font-size: var(--font-size-sm);
    transition: color 0.2s ease;
  }

  .pixel-link:hover {
    color: var(--color-primary-dark);
    text-decoration: underline;
  }

  .empty-state {
    text-align: center;
    padding: var(--space-xl);
    color: var(--color-text-secondary);
  }

  .text-muted {
    color: var(--color-text-muted);
    text-align: center;
    padding: var(--space-md);
  }
`;
document.head.appendChild(style);