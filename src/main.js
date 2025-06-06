// Main application entry point
import './styles/main.scss';
import './views/MainApp.js';

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});