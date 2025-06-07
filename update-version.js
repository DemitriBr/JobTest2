#!/usr/bin/env node

// Simple script to update version numbers in index.html for cache busting
// Usage: node update-version.js [version] [description]
// Example: node update-version.js 1.5.1 "Fixed loading screen issue"

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const version = args[0] || incrementVersion();
const description = args[1] || 'Update';

const indexPath = path.join(__dirname, 'index.html');

function incrementVersion() {
  // Read current version from index.html
  const content = fs.readFileSync(indexPath, 'utf8');
  const versionMatch = content.match(/Version: ([\d.]+)/);
  
  if (versionMatch) {
    const currentVersion = versionMatch[1];
    const parts = currentVersion.split('.');
    parts[2] = (parseInt(parts[2]) + 1).toString();
    return parts.join('.');
  }
  
  return '1.0.0';
}

function updateIndexHtml() {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Update version comment
  content = content.replace(
    /<!-- Version: [\d.]+ - .* -->/,
    `<!-- Version: ${version} - ${description} -->`
  );
  
  // Update script tag
  content = content.replace(
    /src="\/src\/main\.js\?v=[\d.]+"/,
    `src="/src/main.js?v=${version}"`
  );
  
  // Update any CSS imports if they exist
  content = content.replace(
    /href="\/src\/styles\/main\.css\?v=[\d.]+"/g,
    `href="/src/styles/main.css?v=${version}"`
  );
  
  fs.writeFileSync(indexPath, content);
  
  console.log(`✅ Updated to version ${version}`);
  console.log(`📝 Description: ${description}`);
}

try {
  updateIndexHtml();
} catch (error) {
  console.error('❌ Error updating version:', error.message);
  process.exit(1);
}