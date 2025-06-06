// Application List View - View and manage all job applications
import { View } from '../services/router.js';
import db from '../services/database.js';
import { router } from '../services/router.js';
import { eventBus } from '../services/eventBus.js';

export class ApplicationListView extends View {
  async initialize() {
    this.applications = await db.getApplications();
    this.filteredApplications = [...this.applications];
    this.sortBy = 'dateApplied';
    this.sortOrder = 'desc';
    this.filterStatus = 'all';
    this.searchTerm = '';
  }

  async render() {
    this.applyFiltersAndSort();

    return `
      <div class="application-list-view">
        <div class="list-header">
          <h1 class="page-title">Job Applications</h1>
          <button class="pixel-btn primary" data-route="/applications/new">
            + New Application
          </button>
        </div>

        <div class="list-controls">
          <div class="search-box">
            <input 
              type="text" 
              id="search-input" 
              class="pixel-input" 
              placeholder="Search companies or positions..."
              value="${this.searchTerm}"
            />
          </div>

          <div class="filter-controls">
            <select id="status-filter" class="pixel-select">
              <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="applied" ${this.filterStatus === 'applied' ? 'selected' : ''}>Applied</option>
              <option value="interview" ${this.filterStatus === 'interview' ? 'selected' : ''}>Interview</option>
              <option value="interviewed" ${this.filterStatus === 'interviewed' ? 'selected' : ''}>Interviewed</option>
              <option value="offer" ${this.filterStatus === 'offer' ? 'selected' : ''}>Offer</option>
              <option value="rejected" ${this.filterStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
              <option value="withdrawn" ${this.filterStatus === 'withdrawn' ? 'selected' : ''}>Withdrawn</option>
            </select>

            <select id="sort-select" class="pixel-select">
              <option value="dateApplied-desc" ${this.getSortSelected('dateApplied', 'desc')}>
                Newest First
              </option>
              <option value="dateApplied-asc" ${this.getSortSelected('dateApplied', 'asc')}>
                Oldest First
              </option>
              <option value="company-asc" ${this.getSortSelected('company', 'asc')}>
                Company A-Z
              </option>
              <option value="company-desc" ${this.getSortSelected('company', 'desc')}>
                Company Z-A
              </option>
              <option value="status-asc" ${this.getSortSelected('status', 'asc')}>
                Status A-Z
              </option>
            </select>
          </div>
        </div>

        <div class="list-stats">
          <div class="stats-summary">
            Showing ${this.filteredApplications.length} of ${this.applications.length} applications
          </div>
          <div class="quick-filters">
            <button class="quick-filter-btn ${this.filterStatus === 'all' ? 'active' : ''}" 
                    data-status="all">
              All (${this.applications.length})
            </button>
            <button class="quick-filter-btn ${this.filterStatus === 'applied' ? 'active' : ''}" 
                    data-status="applied">
              Applied (${this.getStatusCount('applied')})
            </button>
            <button class="quick-filter-btn ${this.filterStatus === 'interview' ? 'active' : ''}" 
                    data-status="interview">
              Interview (${this.getStatusCount('interview')})
            </button>
            <button class="quick-filter-btn ${this.filterStatus === 'offer' ? 'active' : ''}" 
                    data-status="offer">
              Offers (${this.getStatusCount('offer')})
            </button>
          </div>
        </div>

        <div class="applications-container">
          ${this.renderApplicationsList()}
        </div>
      </div>
    `;
  }

  getSortSelected(field, order) {
    return this.sortBy === field && this.sortOrder === order ? 'selected' : '';
  }

  getStatusCount(status) {
    return this.applications.filter(app => app.status === status).length;
  }

  applyFiltersAndSort() {
    let filtered = [...this.applications];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(app => 
        app.company.toLowerCase().includes(term) ||
        app.position.toLowerCase().includes(term) ||
        (app.notes && app.notes.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(app => app.status === this.filterStatus);
    }

    // Apply sort
    filtered.sort((a, b) => {
      let aVal = a[this.sortBy];
      let bVal = b[this.sortBy];

      if (this.sortBy === 'dateApplied') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (this.sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    this.filteredApplications = filtered;
  }

  renderApplicationsList() {
    if (this.filteredApplications.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="applications-grid">
        ${this.filteredApplications.map(app => this.renderApplicationCard(app)).join('')}
      </div>
    `;
  }

  renderApplicationCard(app) {
    const statusClass = `status-${app.status}`;
    const dateApplied = this.formatDate(app.dateApplied);
    const hasNotes = app.notes && app.notes.length > 0;
    const hasSalary = app.salary && app.salary.length > 0;
    const hasUrl = app.jobUrl && app.jobUrl.length > 0;

    return `
      <div class="application-card pixel-card" data-id="${app.id}">
        <div class="card-header">
          <h3 class="company-name">${this.escapeHtml(app.company)}</h3>
          <span class="application-status ${statusClass}">${app.status}</span>
        </div>
        
        <div class="card-body">
          <h4 class="position-title">${this.escapeHtml(app.position)}</h4>
          
          <div class="application-meta">
            <div class="meta-item">
              <span class="meta-label">Applied:</span>
              <span class="meta-value">${dateApplied}</span>
            </div>
            
            ${app.contactEmail ? `
              <div class="meta-item">
                <span class="meta-label">Contact:</span>
                <span class="meta-value">${this.escapeHtml(app.contactEmail)}</span>
              </div>
            ` : ''}
            
            ${hasSalary ? `
              <div class="meta-item">
                <span class="meta-label">Salary:</span>
                <span class="meta-value">${this.escapeHtml(app.salary)}</span>
              </div>
            ` : ''}
          </div>

          ${app.tags && app.tags.length > 0 ? `
            <div class="application-tags">
              ${app.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}

          ${hasNotes ? `
            <div class="application-notes">
              <p>${this.escapeHtml(app.notes.substring(0, 100))}${app.notes.length > 100 ? '...' : ''}</p>
            </div>
          ` : ''}
        </div>

        <div class="card-actions">
          <button class="action-btn edit-btn" data-id="${app.id}" title="Edit Application">
            ✏️
          </button>
          
          ${hasUrl ? `
            <button class="action-btn url-btn" data-url="${this.escapeHtml(app.jobUrl)}" title="View Job Posting">
              🔗
            </button>
          ` : ''}
          
          <button class="action-btn delete-btn" data-id="${app.id}" title="Delete Application">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    if (this.applications.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No Applications Yet</h3>
          <p>Start tracking your job search by adding your first application.</p>
          <button class="pixel-btn primary" data-route="/applications/new">
            Add Your First Application
          </button>
        </div>
      `;
    } else {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No Applications Found</h3>
          <p>Try adjusting your search or filter criteria.</p>
          <button class="pixel-btn" id="clear-filters">
            Clear Filters
          </button>
        </div>
      `;
    }
  }

  async mounted() {
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const sortSelect = document.getElementById('sort-select');
    const clearFiltersBtn = document.getElementById('clear-filters');

    // Search functionality
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.updateList();
      });
    }

    // Status filter
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.updateList();
      });
    }

    // Sort functionality
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [field, order] = e.target.value.split('-');
        this.sortBy = field;
        this.sortOrder = order;
        this.updateList();
      });
    }

    // Quick filter buttons
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filterStatus = e.target.dataset.status;
        if (statusFilter) statusFilter.value = this.filterStatus;
        this.updateList();
      });
    });

    // Clear filters
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        this.searchTerm = '';
        this.filterStatus = 'all';
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';
        this.updateList();
      });
    }

    // Card actions
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-btn')) {
        const id = e.target.dataset.id;
        router.navigate(`/applications/${id}/edit`);
      } else if (e.target.classList.contains('url-btn')) {
        const url = e.target.dataset.url;
        window.open(url, '_blank');
      } else if (e.target.classList.contains('delete-btn')) {
        this.handleDelete(e.target.dataset.id);
      } else if (e.target.closest('.application-card') && !e.target.closest('.card-actions')) {
        const card = e.target.closest('.application-card');
        const id = card.dataset.id;
        router.navigate(`/applications/${id}`);
      }
    });

    // Listen for application changes
    this.refreshHandler = async () => {
      this.applications = await db.getApplications();
      this.updateList();
    };

    eventBus.on('application:created', this.refreshHandler);
    eventBus.on('application:updated', this.refreshHandler);
    eventBus.on('application:deleted', this.refreshHandler);
  }

  async handleDelete(id) {
    if (confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      try {
        await db.deleteApplication(id);
        // The event listener will handle the refresh
      } catch (error) {
        console.error('Error deleting application:', error);
        alert('Error deleting application. Please try again.');
      }
    }
  }

  updateList() {
    this.applyFiltersAndSort();
    
    // Update the applications container
    const container = document.querySelector('.applications-container');
    if (container) {
      container.innerHTML = this.renderApplicationsList();
    }

    // Update stats
    const statsElement = document.querySelector('.stats-summary');
    if (statsElement) {
      statsElement.textContent = `Showing ${this.filteredApplications.length} of ${this.applications.length} applications`;
    }

    // Update quick filter counts
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
      const status = btn.dataset.status;
      const count = status === 'all' ? this.applications.length : this.getStatusCount(status);
      btn.textContent = btn.textContent.replace(/\(\d+\)/, `(${count})`);
      
      // Update active state
      btn.classList.toggle('active', this.filterStatus === status);
    });
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

// Add list-specific styles
const style = document.createElement('style');
style.textContent = `
  .application-list-view {
    padding: 0;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
  }

  .list-controls {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    align-items: center;
  }

  .search-box {
    flex: 1;
  }

  .filter-controls {
    display: flex;
    gap: var(--space-sm);
  }

  .pixel-select {
    min-width: 120px;
  }

  .list-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--color-pixel-border-dark);
  }

  .stats-summary {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .quick-filters {
    display: flex;
    gap: var(--space-xs);
  }

  .quick-filter-btn {
    background: none;
    border: 1px solid var(--color-pixel-border-light);
    color: var(--color-text-secondary);
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .quick-filter-btn:hover,
  .quick-filter-btn.active {
    background-color: var(--color-primary);
    color: var(--color-text-primary);
    border-color: var(--color-primary);
  }

  .applications-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--space-md);
  }

  .application-card {
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
  }

  .application-card:hover {
    transform: translateY(-2px);
    box-shadow: 
      2px 2px 0 var(--color-pixel-border-dark),
      4px 6px 12px rgba(0, 0, 0, 0.3);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-sm);
  }

  .company-name {
    font-size: var(--font-size-md);
    color: var(--color-text-primary);
    margin: 0;
    flex: 1;
  }

  .application-status {
    font-size: var(--font-size-xs);
    padding: 2px 8px;
    border: 1px solid;
    text-transform: uppercase;
    white-space: nowrap;
    margin-left: var(--space-sm);
  }

  .status-applied { 
    color: var(--color-info); 
    border-color: var(--color-info);
  }
  
  .status-interview { 
    color: var(--color-warning); 
    border-color: var(--color-warning);
  }
  
  .status-interviewed { 
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
  
  .status-withdrawn { 
    color: var(--color-text-muted); 
    border-color: var(--color-text-muted);
  }

  .position-title {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-sm) 0;
  }

  .application-meta {
    display: grid;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
  }

  .meta-item {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-xs);
  }

  .meta-label {
    color: var(--color-text-muted);
  }

  .meta-value {
    color: var(--color-text-secondary);
  }

  .application-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
  }

  .tag {
    background-color: var(--color-bg-dark);
    color: var(--color-text-secondary);
    padding: 2px 6px;
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-pixel-border-dark);
  }

  .application-notes {
    margin-bottom: var(--space-sm);
  }

  .application-notes p {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.4;
  }

  .card-actions {
    display: flex;
    gap: var(--space-xs);
    justify-content: flex-end;
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-pixel-border-dark);
  }

  .action-btn {
    background: none;
    border: 1px solid var(--color-pixel-border-light);
    color: var(--color-text-secondary);
    padding: var(--space-xs);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-btn:hover {
    background-color: var(--color-bg-highlight);
    border-color: var(--color-primary);
  }

  .delete-btn:hover {
    background-color: var(--color-danger);
    border-color: var(--color-danger);
    color: white;
  }

  .empty-state {
    text-align: center;
    padding: var(--space-xl) * 2;
    color: var(--color-text-secondary);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: var(--space-md);
  }

  .empty-state h3 {
    color: var(--color-text-primary);
    margin-bottom: var(--space-sm);
  }

  .empty-state p {
    margin-bottom: var(--space-lg);
  }

  @media (max-width: 768px) {
    .list-controls {
      grid-template-columns: 1fr;
    }
    
    .filter-controls {
      flex-wrap: wrap;
    }
    
    .list-stats {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-sm);
    }
    
    .applications-grid {
      grid-template-columns: 1fr;
    }
  }
`;
document.head.appendChild(style);