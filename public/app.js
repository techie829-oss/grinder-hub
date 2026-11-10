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
import { initSyncEngine, updateSyncIndicator, loadOfflineSnapshot } from './js/sync.js';

window.__appBooted = true;

// Instant 0ms Boot: If business is logged in, hydrate from local snapshot immediately
const hasAuthToken = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('cb_token'));
if (hasAuthToken) {
  const cached = loadOfflineSnapshot();
  if (cached && cached.business) {
    state.data = cached;
  }
}

export function render() {
  window.__appBooted = true;

  if (state.view === 'admin') {
    root.innerHTML = state.data ? viewShell(viewAdmin()) : viewAdmin();
    return;
  }

  if (!state.data) {
    // If merchant is logged in but data is fetching, keep clean branded boot loader (do not flash customer status page)
    if (hasAuthToken || (typeof localStorage !== 'undefined' && localStorage.getItem('cb_token'))) {
      root.innerHTML = `
        <div class="boot" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:70vh;text-align:center;">
          <img src="/icon.svg" width="68" height="68" class="boot-mark" alt="तौल-माल लोगो" style="border:none;box-shadow:0 8px 24px rgba(245,158,11,0.35);border-radius:18px;">
          <p style="font-weight:750;margin-top:14px;color:#0f172a;font-size:15px;">तौल-माल हिसाब लोड हो रहा है…</p>
        </div>
      `;
      return;
    }
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
  } else if (hash === '#status') {
    state.auth.mode = 'status';
    window.__appRender?.();
  } else if (!hash) {
    // If merchant has active session, keep them directly on dashboard
    const isLogged = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('cb_token'));
    if (!isLogged && !state.data) {
      state.auth.mode = 'status';
      window.__appRender?.();
    }
  }
}
window.addEventListener('hashchange', handleHash);
handleHash();

// Boot application
initSyncEngine();
setupEventListeners();
render();
loadState();
