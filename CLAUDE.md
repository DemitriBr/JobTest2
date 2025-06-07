# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Job Application Tracker PWA with an 8-bit retro theme, gamification elements, and security features. The application is designed to help users track job applications with XP rewards, achievements, streaks, and quests.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Styling**: SCSS with 8-bit design system
- **Storage**: IndexedDB with client-side encryption
- **Build Tool**: Vite with performance optimizations
- **Security**: Client-side encryption (CryptoJS), PIN authentication
- **PWA**: Service Worker, Web App Manifest
- **Deployment**: Netlify with security headers

## Architecture

### Security-First Design
- All sensitive data must be encrypted client-side before storage
- PIN authentication system with lockout protection
- Input sanitization required for all user inputs
- Content Security Policy implementation
- Audit logging for security events

### Gamification System
- XP reward structure for all user actions
- Achievement system with categories and conditions
- Quest system (daily/weekly challenges)
- Progression mechanics (levels, titles)
- Celebration systems with 8-bit styling

### Data Layer
- IndexedDB as primary storage with encryption layer
- Caching system for frequently accessed data
- Pagination and virtual scrolling for performance
- Offline capability with sync when online

### UI/UX Guidelines
- Authentic 8-bit retro aesthetic (NES/SNES era)
- Pixel-perfect spacing grid (4px base)
- Monospace fonts for retro typography
- Pixel border effects and CRT scanline styling
- Dark/light mode switching with accessibility support

## Development Phases

The project follows a structured 8-day development approach:
1. Foundation Setup (project structure, security planning)
2. Core Systems (security, database, event system)
3. 8-Bit Design System (colors, components, themes)
4. Gamification Engine (XP, achievements, quests)
5. Application Views (forms, lists, dashboard, kanban)
6. Enhanced Features (import/export, search, offline)
7. PWA Implementation (service worker, manifest, performance)
8. Testing, Polish & Deployment

### Important: Testing Between Phases
Before proceeding to the next phase, thoroughly test all functionality implemented in the current phase:
- Create test files to verify core functionality
- Test user interactions and edge cases
- Ensure all systems integrate properly
- Verify performance meets requirements
- Check accessibility features
- Validate security measures

## Performance Requirements

- Load time < 3 seconds
- Interaction time < 100ms
- Virtual scrolling for large datasets
- Lazy loading for views and components
- Code splitting for optimal loading

## Security Requirements

- Never store unencrypted sensitive data
- Validate inputs at multiple layers
- Implement proper session management
- Regular security audits and updates
- Privacy-focused analytics only

## Accessibility

- ARIA labels throughout the application
- Skip navigation links
- High contrast mode support
- Keyboard navigation support
- Screen reader compatibility

## Version Management & Cache Busting

### Important: Update Version for Every Change
Before pushing any changes to production, the version number in index.html MUST be updated to ensure browsers load the latest files.

### Version Format
- **MAJOR.MINOR.PATCH** (e.g., 1.5.0)
  - MAJOR: Breaking changes or major feature releases
  - MINOR: New features or significant improvements
  - PATCH: Bug fixes and minor improvements

### How to Update Version

#### Option 1: Automatic (Recommended)
```bash
# Auto-increment patch version
node update-version.js

# Specify version and description
node update-version.js 1.5.1 "Fixed modal display issue"

# Using npm script
npm run version:update 1.5.1 "Fixed modal display issue"
```

#### Option 2: Manual
1. Edit `index.html`
2. Update version comment: `<!-- Version: X.X.X - Description -->`
3. Update script query param: `src="/src/main.js?v=X.X.X"`

### Files to Track
- `index.html` - Contains version in comment and script tags
- `VERSION.md` - Detailed changelog of all versions
- `update-version.js` - Script to automate version updates

### Deployment Checklist
1. Complete feature/fix implementation
2. Test functionality thoroughly
3. Update version number using script or manually
4. Commit with descriptive message
5. Push to repository
6. Verify deployment on Netlify

This ensures users always receive the latest JavaScript and CSS files without cache issues.