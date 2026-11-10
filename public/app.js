// Main Application Entrypoint
import { state, root } from './js/state.js';
import { viewAuth } from './js/views/authView.js';
import { viewDashboard } from './js/views/dashboardView.js';
import { viewJob } from './js/views/jobView.js';
import { viewTokens } from './js/views/tokenView.js';
import { viewCustomers } from './js/views/customerView.js';
import { viewReports } from './js/views/reportView.js';
import { viewSettings } from './js/views/settingsView.js';
import { viewAdmin } from './js/views/adminView.js';
import { viewShell } from './js/components/shell.js';
import { setupEventListeners } from './js/events.js';
import { loadState } from './js/api.js';
import { initSyncEngine, updateSyncIndicator } from './js/sync.js';

export function render() {
  window.__appBooted = true;

  if (state.view === 'admin') {
    root.innerHTML = state.data ? viewShell(viewAdmin()) : viewAdmin();
    return;
  }

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

function handleHash() {
  const hash = window.location.hash;
  if (hash === '#admin') {
    state.view = 'admin';
    window.__appRender?.();
  } else if (hash === '#login') {
    state.auth.mode = 'login';
    window.__appRender?.();
  } else if (hash === '#signup') {
    state.auth.mode = 'signup';
    window.__appRender?.();
  } else if (hash === '#status' || !hash) {
    state.auth.mode = 'status';
    window.__appRender?.();
  }
}
window.addEventListener('hashchange', handleHash);
handleHash();

// Boot application
initSyncEngine();
setupEventListeners();
render();
loadState();
