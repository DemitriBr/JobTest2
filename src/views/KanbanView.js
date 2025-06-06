// Kanban Board View - Visual application status tracking
import { View } from '../services/router.js';
import db from '../services/database.js';
import { gamification } from '../services/gamification.js';
import { router } from '../services/router.js';
import { eventBus } from '../services/eventBus.js';

export class KanbanView extends View {
  async initialize() {
    this.applications = await db.getApplications();
    this.columns = [
      { id: 'applied', title: 'Applied', color: 'var(--color-info)' },
      { id: 'interview', title: 'Interview', color: 'var(--color-warning)' },
      { id: 'interviewed', title: 'Interviewed', color: 'var(--color-warning)' },
      { id: 'offer', title: 'Offer', color: 'var(--color-success)' },
      { id: 'rejected', title: 'Rejected', color: 'var(--color-danger)' },
      { id: 'withdrawn', title: 'Withdrawn', color: 'var(--color-text-muted)' }
    ];
  }

  async render() {
    return `
      <div class="kanban-view">
        <div class="kanban-header">
          <h1 class="page-title">Kanban Board</h1>
          <div class="kanban-actions">
            <button class="pixel-btn primary" data-route="/applications/new">
              + New Application
            </button>
            <button class="pixel-btn" data-route="/applications">
              List View
            </button>
          </div>
        </div>

        <div class="kanban-board" id="kanban-board">
          ${this.columns.map(column => this.renderColumn(column)).join('')}
        </div>
      </div>
    `;
  }

  renderColumn(column) {
    const applications = this.applications.filter(app => app.status === column.id);
    
    return `
      <div class="kanban-column" data-status="${column.id}">
        <div class="column-header" style="border-left: 4px solid ${column.color}">
          <h3 class="column-title">${column.title}</h3>
          <span class="column-count">${applications.length}</span>
        </div>
        
        <div class="column-content" data-status="${column.id}">
          ${applications.map(app => this.renderApplicationCard(app)).join('')}
          
          <div class="add-card-placeholder" data-status="${column.id}">
            <button class="add-card-btn" data-route="/applications/new">
              + Add Application
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderApplicationCard(app) {
    const dateApplied = this.formatDate(app.dateApplied);
    const hasNotes = app.notes && app.notes.length > 0;
    const daysSinceApplied = Math.floor((new Date() - new Date(app.dateApplied)) / (1000 * 60 * 60 * 24));
    
    return `
      <div class="kanban-card" 
           data-id="${app.id}" 
           data-status="${app.status}"
           draggable="true">
        <div class="card-header">
          <h4 class="card-company">${this.escapeHtml(app.company)}</h4>
          <div class="card-actions">
            <button class="card-action-btn edit-btn" data-id="${app.id}" title="Edit">
              ✏️
            </button>
          </div>
        </div>
        
        <div class="card-body">
          <p class="card-position">${this.escapeHtml(app.position)}</p>
          
          <div class="card-meta">
            <div class="card-date">Applied: ${dateApplied}</div>
            <div class="card-days ${daysSinceApplied > 30 ? 'old' : ''}">${daysSinceApplied} days ago</div>
          </div>

          ${app.salary ? `
            <div class="card-salary">💰 ${this.escapeHtml(app.salary)}</div>
          ` : ''}

          ${app.tags && app.tags.length > 0 ? `
            <div class="card-tags">
              ${app.tags.slice(0, 3).map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
              ${app.tags.length > 3 ? `<span class="tag-more">+${app.tags.length - 3}</span>` : ''}
            </div>
          ` : ''}

          ${hasNotes ? `
            <div class="card-notes">
              📝 ${this.escapeHtml(app.notes.substring(0, 50))}${app.notes.length > 50 ? '...' : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  async mounted() {
    let draggedCard = null;
    let draggedOverColumn = null;

    // Drag and drop functionality
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('kanban-card')) {
        draggedCard = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('kanban-card')) {
        e.target.classList.remove('dragging');
        draggedCard = null;
        draggedOverColumn = null;
        
        // Remove all drag-over classes
        document.querySelectorAll('.column-content').forEach(col => {
          col.classList.remove('drag-over');
        });
      }
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const columnContent = e.target.closest('.column-content');
      if (columnContent) {
        // Remove drag-over from all columns
        document.querySelectorAll('.column-content').forEach(col => {
          col.classList.remove('drag-over');
        });
        
        // Add to current column
        columnContent.classList.add('drag-over');
        draggedOverColumn = columnContent;
      }
    });

    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      
      if (!draggedCard || !draggedOverColumn) return;
      
      const newStatus = draggedOverColumn.dataset.status;
      const applicationId = draggedCard.dataset.id;
      const oldStatus = draggedCard.dataset.status;
      
      if (newStatus === oldStatus) return;
      
      try {
        // Update application status
        const application = this.applications.find(app => app.id === parseInt(applicationId));
        if (application) {
          await db.updateApplication(applicationId, { ...application, status: newStatus });
          
          // Award XP for status change
          await gamification.awardXP('APPLICATION_STATUS_CHANGED');
          await gamification.updateApplicationStats('status_changed');
          
          // Check for interview-related status changes
          if (newStatus === 'interview') {
            await gamification.awardXP('INTERVIEW_SCHEDULED');
            await gamification.updateApplicationStats('interview_scheduled');
          } else if (newStatus === 'interviewed') {
            await gamification.awardXP('INTERVIEW_COMPLETED');
            await gamification.updateApplicationStats('interview_completed');
          }
          
          // Refresh the board
          await this.refreshBoard();
        }
      } catch (error) {
        console.error('Error updating application status:', error);
        alert('Error updating application status. Please try again.');
      }
    });

    // Card click handlers
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-btn')) {
        e.stopPropagation();
        const id = e.target.dataset.id;
        router.navigate(`/applications/${id}/edit`);
      } else if (e.target.closest('.kanban-card') && !e.target.closest('.card-actions')) {
        const card = e.target.closest('.kanban-card');
        const id = card.dataset.id;
        router.navigate(`/applications/${id}`);
      }
    });

    // Listen for application changes
    this.refreshHandler = async () => {
      await this.refreshBoard();
    };

    eventBus.on('application:created', this.refreshHandler);
    eventBus.on('application:updated', this.refreshHandler);
    eventBus.on('application:deleted', this.refreshHandler);
  }

  async refreshBoard() {
    this.applications = await db.getApplications();
    const board = document.getElementById('kanban-board');
    if (board) {
      board.innerHTML = this.columns.map(column => this.renderColumn(column)).join('');
    }
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

// Add kanban-specific styles
const style = document.createElement('style');
style.textContent = `
  .kanban-view {
    padding: 0;
    height: 100%;
  }

  .kanban-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
  }

  .kanban-actions {
    display: flex;
    gap: var(--space-sm);
  }

  .kanban-board {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-md);
    height: calc(100vh - 200px);
    overflow-x: auto;
    padding-bottom: var(--space-md);
  }

  .kanban-column {
    background-color: var(--color-bg-light);
    border: 2px solid var(--color-pixel-border-light);
    display: flex;
    flex-direction: column;
    min-height: 500px;
  }

  .column-header {
    padding: var(--space-md);
    background-color: var(--color-bg-medium);
    border-bottom: 1px solid var(--color-pixel-border-dark);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .column-title {
    font-size: var(--font-size-md);
    color: var(--color-text-primary);
    margin: 0;
  }

  .column-count {
    background-color: var(--color-bg-dark);
    color: var(--color-text-secondary);
    padding: 2px 8px;
    border: 1px solid var(--color-pixel-border-dark);
    font-size: var(--font-size-xs);
    min-width: 24px;
    text-align: center;
  }

  .column-content {
    flex: 1;
    padding: var(--space-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    overflow-y: auto;
    transition: background-color 0.2s ease;
  }

  .column-content.drag-over {
    background-color: rgba(var(--color-primary-rgb), 0.1);
  }

  .kanban-card {
    background-color: var(--color-bg-medium);
    border: 2px solid var(--color-pixel-border-light);
    padding: var(--space-sm);
    cursor: grab;
    transition: all 0.2s ease;
    user-select: none;
  }

  .kanban-card:hover {
    transform: translateY(-2px);
    box-shadow: 2px 4px 8px rgba(0, 0, 0, 0.2);
  }

  .kanban-card.dragging {
    opacity: 0.5;
    transform: rotate(5deg);
    cursor: grabbing;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-xs);
  }

  .card-company {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    margin: 0;
    flex: 1;
  }

  .card-actions {
    display: flex;
    gap: var(--space-xs);
  }

  .card-action-btn {
    background: none;
    border: 1px solid var(--color-pixel-border-dark);
    color: var(--color-text-muted);
    padding: 2px 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .card-action-btn:hover {
    background-color: var(--color-bg-highlight);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .card-position {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 0;
    margin-bottom: var(--space-xs);
  }

  .card-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xs);
  }

  .card-date {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .card-days {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .card-days.old {
    color: var(--color-warning);
  }

  .card-salary {
    font-size: var(--font-size-xs);
    color: var(--color-success);
    margin-bottom: var(--space-xs);
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    margin-bottom: var(--space-xs);
  }

  .card-tags .tag {
    background-color: var(--color-bg-dark);
    color: var(--color-text-secondary);
    padding: 1px 4px;
    font-size: 10px;
    border: 1px solid var(--color-pixel-border-dark);
  }

  .tag-more {
    background-color: var(--color-bg-dark);
    color: var(--color-text-muted);
    padding: 1px 4px;
    font-size: 10px;
    border: 1px solid var(--color-pixel-border-dark);
  }

  .card-notes {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.3;
  }

  .add-card-placeholder {
    margin-top: auto;
    padding: var(--space-sm);
    border: 2px dashed var(--color-pixel-border-dark);
    text-align: center;
  }

  .add-card-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: var(--font-size-xs);
    padding: var(--space-sm);
    width: 100%;
    transition: color 0.2s ease;
  }

  .add-card-btn:hover {
    color: var(--color-primary);
  }

  @media (max-width: 768px) {
    .kanban-board {
      grid-template-columns: 1fr;
      height: auto;
      max-height: calc(100vh - 200px);
    }
    
    .kanban-column {
      min-height: 300px;
    }
    
    .kanban-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-sm);
    }
    
    .kanban-actions {
      width: 100%;
      justify-content: space-between;
    }
  }
`;
document.head.appendChild(style);