// Application Form View - Create and edit job applications
import { View } from '../services/router.js';
import db from '../services/database.js';
import { gamification, XP_ACTIONS } from '../services/gamification.js';
import { eventBus } from '../services/eventBus.js';
import { router } from '../services/router.js';

export class ApplicationFormView extends View {
  async initialize(data = {}) {
    this.editMode = !!data.id;
    this.applicationId = data.id || null;
    this.application = null;

    if (this.editMode && this.applicationId) {
      this.application = await db.getApplication(this.applicationId);
      if (!this.application) {
        // Application not found
        router.navigate('/applications');
        return;
      }
    }
  }

  async render() {
    const title = this.editMode ? 'Edit Application' : 'New Application';
    const submitText = this.editMode ? 'Update Application' : 'Create Application';

    return `
      <div class="application-form-view">
        <div class="form-header">
          <h1 class="page-title">${title}</h1>
          <button class="pixel-btn" data-route="/applications">
            ← Back to List
          </button>
        </div>

        <form id="application-form" class="pixel-form">
          <div class="form-section">
            <h2 class="section-title">Company Information</h2>
            
            <div class="form-group">
              <label for="company" class="form-label required">Company Name</label>
              <input 
                type="text" 
                id="company" 
                name="company" 
                class="pixel-input" 
                required
                maxlength="100"
                value="${this.application ? this.escapeHtml(this.application.company) : ''}"
                placeholder="Enter company name"
              />
              <div class="form-error" data-error="company"></div>
            </div>

            <div class="form-group">
              <label for="position" class="form-label required">Position Title</label>
              <input 
                type="text" 
                id="position" 
                name="position" 
                class="pixel-input" 
                required
                maxlength="100"
                value="${this.application ? this.escapeHtml(this.application.position) : ''}"
                placeholder="Enter position title"
              />
              <div class="form-error" data-error="position"></div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="contactEmail" class="form-label">Contact Email</label>
                <input 
                  type="email" 
                  id="contactEmail" 
                  name="contactEmail" 
                  class="pixel-input"
                  maxlength="100"
                  value="${this.application ? this.escapeHtml(this.application.contactEmail || '') : ''}"
                  placeholder="recruiter@company.com"
                />
                <div class="form-error" data-error="contactEmail"></div>
              </div>

              <div class="form-group">
                <label for="jobUrl" class="form-label">Job Posting URL</label>
                <input 
                  type="url" 
                  id="jobUrl" 
                  name="jobUrl" 
                  class="pixel-input"
                  maxlength="500"
                  value="${this.application ? this.escapeHtml(this.application.jobUrl || '') : ''}"
                  placeholder="https://..."
                />
                <div class="form-error" data-error="jobUrl"></div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2 class="section-title">Application Details</h2>

            <div class="form-row">
              <div class="form-group">
                <label for="dateApplied" class="form-label required">Date Applied</label>
                <input 
                  type="date" 
                  id="dateApplied" 
                  name="dateApplied" 
                  class="pixel-input" 
                  required
                  value="${this.application ? this.application.dateApplied.split('T')[0] : new Date().toISOString().split('T')[0]}"
                />
                <div class="form-error" data-error="dateApplied"></div>
              </div>

              <div class="form-group">
                <label for="status" class="form-label">Application Status</label>
                <select id="status" name="status" class="pixel-select">
                  <option value="applied" ${this.isSelected('applied', this.application?.status)}>Applied</option>
                  <option value="interview" ${this.isSelected('interview', this.application?.status)}>Interview Scheduled</option>
                  <option value="interviewed" ${this.isSelected('interviewed', this.application?.status)}>Interview Completed</option>
                  <option value="offer" ${this.isSelected('offer', this.application?.status)}>Offer Received</option>
                  <option value="rejected" ${this.isSelected('rejected', this.application?.status)}>Rejected</option>
                  <option value="withdrawn" ${this.isSelected('withdrawn', this.application?.status)}>Withdrawn</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="salary" class="form-label">Salary Range</label>
              <input 
                type="text" 
                id="salary" 
                name="salary" 
                class="pixel-input"
                maxlength="50"
                value="${this.application ? this.escapeHtml(this.application.salary || '') : ''}"
                placeholder="e.g., $80,000 - $100,000"
              />
              <div class="form-hint">This information is encrypted and stored securely</div>
            </div>

            <div class="form-group">
              <label for="tags" class="form-label">Tags</label>
              <input 
                type="text" 
                id="tags" 
                name="tags" 
                class="pixel-input"
                value="${this.application && this.application.tags ? this.application.tags.join(', ') : ''}"
                placeholder="remote, frontend, react (comma separated)"
              />
              <div class="form-hint">Add tags to organize your applications</div>
            </div>
          </div>

          <div class="form-section">
            <h2 class="section-title">Notes</h2>
            
            <div class="form-group">
              <label for="notes" class="form-label">Additional Notes</label>
              <textarea 
                id="notes" 
                name="notes" 
                class="pixel-textarea" 
                rows="5"
                maxlength="1000"
                placeholder="Add any notes about the application, interview prep, or follow-up actions..."
              >${this.application ? this.escapeHtml(this.application.notes || '') : ''}</textarea>
              <div class="form-hint">
                <span id="notes-count">0</span>/1000 characters
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="pixel-btn primary" id="submit-btn">
              ${submitText}
            </button>
            <button type="button" class="pixel-btn" data-route="/applications">
              Cancel
            </button>
            ${this.editMode ? `
              <button type="button" class="pixel-btn danger" id="delete-btn">
                Delete Application
              </button>
            ` : ''}
          </div>
        </form>
      </div>
    `;
  }

  isSelected(value, currentValue) {
    return value === (currentValue || 'applied') ? 'selected' : '';
  }

  async mounted() {
    const form = document.getElementById('application-form');
    const notesTextarea = document.getElementById('notes');
    const notesCount = document.getElementById('notes-count');
    const submitBtn = document.getElementById('submit-btn');
    const deleteBtn = document.getElementById('delete-btn');

    // Update character count
    const updateNotesCount = () => {
      notesCount.textContent = notesTextarea.value.length;
    };
    
    if (notesTextarea) {
      updateNotesCount();
      notesTextarea.addEventListener('input', updateNotesCount);
    }

    // Form validation
    const validateForm = () => {
      let isValid = true;
      const errors = {};

      // Company validation
      const company = form.company.value.trim();
      if (!company) {
        errors.company = 'Company name is required';
        isValid = false;
      } else if (company.length > 100) {
        errors.company = 'Company name is too long';
        isValid = false;
      }

      // Position validation
      const position = form.position.value.trim();
      if (!position) {
        errors.position = 'Position title is required';
        isValid = false;
      } else if (position.length > 100) {
        errors.position = 'Position title is too long';
        isValid = false;
      }

      // Email validation
      const email = form.contactEmail.value.trim();
      if (email && !this.isValidEmail(email)) {
        errors.contactEmail = 'Please enter a valid email address';
        isValid = false;
      }

      // URL validation
      const url = form.jobUrl.value.trim();
      if (url && !this.isValidUrl(url)) {
        errors.jobUrl = 'Please enter a valid URL';
        isValid = false;
      }

      // Date validation
      const dateApplied = form.dateApplied.value;
      if (!dateApplied) {
        errors.dateApplied = 'Application date is required';
        isValid = false;
      }

      // Display errors
      document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
        el.classList.remove('active');
      });

      Object.entries(errors).forEach(([field, message]) => {
        const errorEl = document.querySelector(`[data-error="${field}"]`);
        if (errorEl) {
          errorEl.textContent = message;
          errorEl.classList.add('active');
        }
      });

      return isValid;
    };

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = this.editMode ? 'Updating...' : 'Creating...';

      try {
        const formData = new FormData(form);
        const applicationData = {
          company: formData.get('company').trim(),
          position: formData.get('position').trim(),
          status: formData.get('status'),
          contactEmail: formData.get('contactEmail').trim(),
          jobUrl: formData.get('jobUrl').trim(),
          salary: formData.get('salary').trim(),
          notes: formData.get('notes').trim(),
          dateApplied: new Date(formData.get('dateApplied')),
          tags: formData.get('tags')
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
        };

        let result;
        if (this.editMode) {
          result = await db.updateApplication(this.applicationId, applicationData);
          
          // Award XP for update
          await gamification.awardXP('APPLICATION_UPDATED');
          
          // Check if status changed
          if (this.application.status !== applicationData.status) {
            await gamification.awardXP('APPLICATION_STATUS_CHANGED');
            await gamification.updateApplicationStats('status_changed');
          }
          
          // Check if notes were added
          if (!this.application.notes && applicationData.notes) {
            await gamification.awardXP('INTERVIEW_NOTES_ADDED');
            await gamification.updateApplicationStats('notes_added');
          }
        } else {
          result = await db.addApplication(applicationData);
          
          // Award XP and update stats
          await gamification.awardXP('APPLICATION_CREATED');
          await gamification.updateApplicationStats('created');
          
          // Check for interview status
          if (applicationData.status === 'interview') {
            await gamification.awardXP('INTERVIEW_SCHEDULED');
            await gamification.updateApplicationStats('interview_scheduled');
          }
        }

        // Navigate to application list
        router.navigate('/applications');
        
      } catch (error) {
        console.error('Error saving application:', error);
        alert('Error saving application. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = this.editMode ? 'Update Application' : 'Create Application';
      }
    });

    // Delete button
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
          try {
            await db.deleteApplication(this.applicationId);
            
            // Award small XP for deletion (data management)
            await gamification.awardXP('APPLICATION_DELETED');
            
            router.navigate('/applications');
          } catch (error) {
            console.error('Error deleting application:', error);
            alert('Error deleting application. Please try again.');
          }
        }
      });
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Add form-specific styles
const style = document.createElement('style');
style.textContent = `
  .application-form-view {
    max-width: 800px;
    margin: 0 auto;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xl);
  }

  .pixel-form {
    display: grid;
    gap: var(--space-xl);
  }

  .form-section {
    background-color: var(--color-bg-medium);
    border: 2px solid var(--color-pixel-border-light);
    padding: var(--space-lg);
  }

  .form-group {
    margin-bottom: var(--space-md);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  .form-label {
    display: block;
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    margin-bottom: var(--space-xs);
    text-transform: uppercase;
  }

  .form-label.required::after {
    content: ' *';
    color: var(--color-danger);
  }

  .pixel-input,
  .pixel-select,
  .pixel-textarea {
    width: 100%;
    padding: var(--space-sm);
    background-color: var(--color-bg-dark);
    border: 2px solid var(--color-pixel-border-light);
    color: var(--color-text-primary);
    font-family: var(--font-family-primary);
    font-size: var(--font-size-sm);
    transition: all 0.2s ease;
  }

  .pixel-input:focus,
  .pixel-select:focus,
  .pixel-textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.3);
  }

  .pixel-textarea {
    resize: vertical;
    min-height: 100px;
  }

  .form-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
  }

  .form-error {
    font-size: var(--font-size-xs);
    color: var(--color-danger);
    margin-top: var(--space-xs);
    display: none;
  }

  .form-error.active {
    display: block;
  }

  .form-actions {
    display: flex;
    gap: var(--space-md);
    justify-content: flex-start;
  }

  .pixel-btn.danger {
    background-color: var(--color-danger);
    border-color: var(--color-danger);
    margin-left: auto;
  }

  .pixel-btn.danger:hover {
    filter: brightness(1.1);
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .form-actions {
      flex-wrap: wrap;
    }
    
    .pixel-btn.danger {
      margin-left: 0;
      width: 100%;
    }
  }
`;
document.head.appendChild(style);