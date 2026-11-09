// Network API Client with Offline-First State Synchronization
import { state, toastEl } from './state.js';
import { closeModal } from './components/modals.js';
import { saveOfflineSnapshot, loadOfflineSnapshot, syncOfflineQueue, isOnline } from './sync.js';

let toastTimer = null;
export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

export async function api(path, body) {
  let res;
  try {
    res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
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
    state.data = null;
    closeModal();
    window.__appRender?.();
    toast('Session expired. Please sign in again.');
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

export async function loadState(range) {
  // If offline, boot instantly from cached local snapshot
  if (!isOnline()) {
    const cached = loadOfflineSnapshot();
    if (cached) {
      state.data = cached;
      window.__appRender?.();
      toast('Working Offline — Cached records loaded');
      return { ok: true, state: cached };
    }
  }

  const data = await api('/api/state?range=' + encodeURIComponent(range || state.range));
  if (data && data.state) {
    applyState(data.state);
    // Background sync check
    syncOfflineQueue();
    return data;
  }

  // Network failed or offline fallback
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
