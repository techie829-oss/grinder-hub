import { state, toastEl } from './state.js';
import { closeModal } from './components/modals.js';

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
    toast('इंटरनेट नहीं चल रहा — फिर कोशिश करें');
    return null;
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
    toast('सत्र खत्म हो गया — फिर लॉगिन करें');
    return null;
  }
  if (!res.ok) {
    toast(data.error || 'कुछ गड़बड़ हुई');
    return null;
  }
  return data;
}

export function applyState(snapshot) {
  if (snapshot) {
    state.data = snapshot;
    window.__appRender?.();
  }
}

export async function loadState(range) {
  const data = await api('/api/state?range=' + encodeURIComponent(range || state.range));
  if (data && data.state) applyState(data.state);
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

