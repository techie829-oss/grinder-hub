// Main Application Entrypoint
import { state, root } from './js/state.js';
import { viewAuth } from './js/views/authView.js';
import { viewDashboard } from './js/views/dashboardView.js';
import { viewJob } from './js/views/jobView.js';
import { viewTokens } from './js/views/tokenView.js';
import { viewCustomers } from './js/views/customerView.js';
import { viewReports } from './js/views/reportView.js';
import { viewSettings } from './js/views/settingsView.js';
import { viewShell } from './js/components/shell.js';
import { setupEventListeners } from './js/events.js';
import { loadState } from './js/api.js';
import { initSyncEngine, updateSyncIndicator } from './js/sync.js';

export function render() {
  if (!state.data) {
    root.innerHTML = viewAuth();
    return;
  }

  let content = '';
  switch (state.view) {
    case 'token':
      content = viewTokens();
      break;
    case 'job':
      content = viewJob();
      break;
    case 'customers':
      content = viewCustomers();
      break;
    case 'reports':
      content = viewReports();
      break;
    case 'settings':
      content = viewSettings();
      break;
    case 'dashboard':
    default:
      content = viewDashboard();
      break;
  }

  root.innerHTML = viewShell(content);
  updateSyncIndicator();
}

// Expose render function for reactive state updates
window.__appRender = render;

// Boot application
initSyncEngine();
setupEventListeners();
render();
loadState();
