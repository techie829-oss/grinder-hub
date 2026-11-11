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
    const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined;
    res = await fetch(targetUrl, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...getAuthHeaders(),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      signal,
    });
  } catch (err) {
    // Network unreachable or timeout
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
      localStorage.removeItem('cb_offline_snapshot');
      localStorage.removeItem('cb_offline_sync_queue');
    }
    state.data = null;
    state.auth.mode = 'login';
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
  // If merchant is not logged in, DO NOT hydrate snapshot or request /api/state
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cb_token') : null;
  if (!token) {
    state.data = null;
    window.__appRender?.();
    return null;
  }

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
  if (cached && token) {
    state.data = cached;
    window.__appRender?.();
    return { ok: true, state: cached };
  }

  return data;
}

export async function performLogout() {
  const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('cb_token') || '') : '';
  try {
    await fetch(getApiUrl('/api/logout'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ token }),
      credentials: 'include',
    }).catch(() => {});
  } catch (_) {}

  // 1. Purge all localStorage auth & snapshot items
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('cb_token');
    localStorage.removeItem('cb_offline_snapshot');
    localStorage.removeItem('cb_offline_sync_queue');
  }

  // 2. Clear sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }

  // 3. Clear non-HttpOnly fallback cookies
  try {
    document.cookie = 'cb_sid=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch (_) {}

  // 4. Reset in-memory state completely
  state.data = null;
  state.customer = null;
  state.job = { name: '', village: '', phone: '', serviceId: null, qty: '', rate: '', lossRateG: '', totalLossG: 0, netWeight: 0, amount: '', note: '', paid: true, withToken: false };
  state.trade = { item: '', unit: 'kg', qty: '', rate: '', amount: '', paid: true, name: '', village: '', phone: '', photo: '', note: '' };
  state.tokenForm = { name: '', village: '', phone: '', serviceId: null, qty: '', lossRateG: '', note: '' };
  state.view = 'dashboard';
  state.auth.mode = 'login';
  state.auth.error = '';

  // 5. Clean URL query / hash without page reload
  try {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  } catch (_) {}

  closeModal();
  window.__appRender?.();
  toast('लॉगआउट सफल हुआ');
}

export async function performAdminLogout() {
  try {
    await fetch(getApiUrl('/api/admin/logout'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...getAuthHeaders(),
      },
      credentials: 'include',
    }).catch(() => {});
  } catch (_) {}

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('cb_adm_token');
  }

  state.admin.authenticated = false;
  state.admin.metrics = null;
  state.admin.tenants = [];
  state.admin.error = '';

  try {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  } catch (_) {}

  closeModal();
  window.__appRender?.();
  toast('एडमिन लॉगआउट सफल हुआ');
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
