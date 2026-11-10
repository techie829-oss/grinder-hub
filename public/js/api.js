// Network API Client with Offline-First State Synchronization
import { state, toastEl } from './state.js';
import { closeModal } from './components/modals.js';
import { saveOfflineSnapshot, loadOfflineSnapshot, syncOfflineQueue, isOnline } from './sync.js';

export const LIVE_SERVER_URL = 'https://tolmaal.solidrix.com';

export function getApiUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (typeof window !== 'undefined') {
    // If running on tolmaal domain, use relative path directly
    if (window.location.hostname === 'tolmaal.solidrix.com' || window.location.hostname === 'tolmaal.rohitkmarch96.workers.dev') {
      return path;
    }
    const isCapacitor = (
      window.Capacitor !== undefined ||
      window.location.protocol === 'capacitor:' ||
      window.location.hostname === 'localhost' ||
      window.location.origin === 'https://localhost' ||
      window.location.origin === 'capacitor://localhost'
    );
    if (isCapacitor) {
      return `${LIVE_SERVER_URL}${path}`;
    }
  }
  return path;
}

export function getAuthHeaders() {
  const headers = {};
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('cb_token');
    if (token) headers['authorization'] = `Bearer ${token}`;
    const adm = localStorage.getItem('cb_adm_token');
    if (adm) headers['x-admin-key'] = adm;
  }
  return headers;
}

let toastTimer = null;
export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

export async function api(path, body) {
  let res;
  const targetUrl = getApiUrl(path);
  try {
    res = await fetch(targetUrl, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...getAuthHeaders(),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });
  } catch (err) {
    // Network unreachable
    return { ok: false, offline: true, error: 'Network offline' };
  }

  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    data = {};
  }

  if (res.status === 401) {
    if (path.startsWith('/api/admin/')) {
      return { ok: false, error: data.error || 'Unauthorized' };
    }
    const hadToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('cb_token');
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('cb_token');
    }
    state.data = null;
    closeModal();
    window.__appRender?.();
    if (hadToken) {
      toast('सत्र समाप्त हो गया है। कृपया दोबारा लॉगिन करें।');
    }
    return null;
  }
  if (!res.ok) {
    toast(data.error || 'Request failed');
    return null;
  }
  return data;
}

export function applyState(snapshot) {
  if (snapshot) {
    state.data = snapshot;
    saveOfflineSnapshot(snapshot);
    window.__appRender?.();
  }
}

export async function loadAdminData() {
  state.admin.loading = true;
  window.__appRender?.();
  const res = await api('/api/admin/tenants');
  state.admin.loading = false;
  if (res && res.ok) {
    state.admin.authenticated = true;
    state.admin.metrics = res.metrics;
    state.admin.tenants = res.tenants || [];
    state.admin.error = '';
  } else {
    state.admin.authenticated = false;
    if (res && res.error) state.admin.error = res.error;
  }
  window.__appRender?.();
}

export async function loadState(range) {
  // 1. Instant hydration: if state.data is missing, load cached snapshot immediately
  if (!state.data) {
    const cached = loadOfflineSnapshot();
    if (cached && cached.business) {
      state.data = cached;
      window.__appRender?.();
    }
  }

  // 2. If completely offline, we're done
  if (!isOnline() && state.data) {
    toast('Working Offline — Cached records loaded');
    return { ok: true, state: state.data };
  }

  // 3. Fetch latest state from server and apply smoothly without full page refresh
  const data = await api('/api/state?range=' + encodeURIComponent(range || state.range));
  if (data && data.state) {
    applyState(data.state);
    // Background sync check
    syncOfflineQueue();
    return data;
  }

  // Fallback if network failed
  const cached = loadOfflineSnapshot();
  if (cached) {
    state.data = cached;
    window.__appRender?.();
    return { ok: true, state: cached };
  }

  return data;
}

export async function withBusy(el, fn) {
  if (state.busy) return null;
  state.busy = true;
  if (el) el.disabled = true;
  try {
    return await fn();
  } finally {
    state.busy = false;
    if (el && el.isConnected) el.disabled = false;
  }
}
