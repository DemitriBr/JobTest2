// Simple client-side router for view management
import { eventBus } from './eventBus.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.viewContainer = null;
    this.initialized = false;
  }

  initialize(containerId = 'view-container') {
    this.viewContainer = document.getElementById(containerId);
    if (!this.viewContainer) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    // Listen for navigation events
    window.addEventListener('popstate', () => this.handlePopState());
    
    // Intercept navigation clicks
    document.addEventListener('click', (e) => this.handleLinkClick(e));

    this.initialized = true;
  }

  register(path, viewComponent) {
    this.routes.set(path, viewComponent);
  }

  async navigate(path, data = {}) {
    if (!this.initialized) {
      throw new Error('Router not initialized');
    }

    // Get route handler
    const viewComponent = this.routes.get(path);
    if (!viewComponent) {
      console.error(`Route not found: ${path}`);
      this.navigate('/'); // Redirect to home
      return;
    }

    // Update URL without page reload
    if (window.location.pathname !== path) {
      window.history.pushState({ path, data }, '', path);
    }

    // Emit navigation event
    eventBus.emit('router:navigating', { from: this.currentRoute, to: path });

    // Clear current view
    this.viewContainer.innerHTML = '';
    this.viewContainer.className = 'view-container loading';

    try {
      // Create and mount new view
      const view = new viewComponent();
      
      // Initialize view if it has an init method
      if (typeof view.initialize === 'function') {
        await view.initialize(data);
      }

      // Render view
      const content = await view.render();
      this.viewContainer.innerHTML = content;
      this.viewContainer.className = 'view-container';

      // Call mounted lifecycle hook if available
      if (typeof view.mounted === 'function') {
        await view.mounted();
      }

      // Update current route
      this.currentRoute = path;

      // Update active nav
      this.updateActiveNavigation(path);

      // Emit navigation complete event
      eventBus.emit('router:navigated', { route: path });

    } catch (error) {
      console.error('Error loading view:', error);
      this.viewContainer.innerHTML = `
        <div class="error-container">
          <h2>Error Loading View</h2>
          <p>Sorry, there was an error loading this page.</p>
          <button class="pixel-btn primary" onclick="router.navigate('/')">Go Home</button>
        </div>
      `;
      this.viewContainer.className = 'view-container error';
    }
  }

  handlePopState() {
    const path = window.location.pathname;
    this.navigate(path);
  }

  handleLinkClick(e) {
    // Check if it's a navigation link
    const link = e.target.closest('a[data-route]');
    if (!link) return;

    e.preventDefault();
    const route = link.getAttribute('data-route');
    const data = link.dataset;
    this.navigate(route, data);
  }

  updateActiveNavigation(path) {
    // Remove all active classes
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to current route
    const activeBtn = document.querySelector(`[data-route="${path}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  reload() {
    if (this.currentRoute) {
      this.navigate(this.currentRoute);
    }
  }
}

// Base View Class
export class View {
  constructor() {
    this.data = {};
  }

  async initialize(data = {}) {
    this.data = data;
  }

  async render() {
    return '<div>Base View</div>';
  }

  async mounted() {
    // Override in subclasses
  }

  // Helper method to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Helper method to format dates
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Helper method to format currency
  formatCurrency(amount) {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}

// Create and export singleton instance
export const router = new Router();