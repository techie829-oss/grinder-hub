// Client-Side Offline Storage & Network Synchronization Engine
import { state } from './state.js';
import { applyState, toast, getApiUrl, getAuthHeaders } from './api.js';

const SNAPSHOT_KEY = 'cb_offline_snapshot';
const QUEUE_KEY = 'cb_offline_sync_queue';

let isSyncing = false;

export function isOnline() {
  return navigator.onLine !== false;
}

function createSlimSnapshot(snapshot, maxEntries = 40, includePhotos = false) {
  if (!snapshot) return null;
  const slim = { ...snapshot };
  if (Array.isArray(snapshot.customers)) {
    slim.customers = snapshot.customers.map((c) => ({
      id: c.id,
      name: c.name,
      village: c.village || '',
      phone: c.phone || '',
      balancePaise: c.balancePaise || 0,
      lastAt: c.lastAt || null,
      photo: includePhotos && c.photo && c.photo.length < 3500 ? c.photo : '',
    }));
  }
  if (Array.isArray(snapshot.entries)) {
    slim.entries = snapshot.entries.slice(0, maxEntries);
  }
  return slim;
}

export function saveOfflineSnapshot(snapshot) {
  if (!snapshot) return;
  try {
    // 1. Try saving optimized snapshot (lightweight photos, top entries)
    const slim = createSlimSnapshot(snapshot, 60, true);
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(slim));
  } catch (err1) {
    try {
      // 2. Fallback on quota exceed: strip all photos & keep top 25 entries
      console.warn('Storage quota warning, saving ultra-slim snapshot', err1);
      const ultraSlim = createSlimSnapshot(snapshot, 25, false);
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(ultraSlim));
    } catch (err2) {
      console.warn('Failed to save offline snapshot to localStorage', err2);
    }
  }
}

export function loadOfflineSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function getSyncQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function enqueueOfflineAction(type, data) {
  const queue = getSyncQueue();
  const action = {
    id: crypto.randomUUID(),
    type,
    data: {
      ...data,
      offlineId: data.offlineId || crypto.randomUUID(),
      at: data.at || Date.now(),
    },
    queuedAt: Date.now(),
  };
  queue.push(action);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Failed to save sync queue item', err);
  }
  updateSyncIndicator();
  return action;
}

export function clearSyncQueue() {
  localStorage.removeItem(QUEUE_KEY);
  updateSyncIndicator();
}

export async function syncOfflineQueue() {
  if (isSyncing || !isOnline()) return false;
  const queue = getSyncQueue();
  if (!queue.length) return false;

  isSyncing = true;
  updateSyncIndicator(true);

  try {
    const res = await fetch(getApiUrl('/api/sync'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ actions: queue }),
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      clearSyncQueue();
      if (data.state) {
        saveOfflineSnapshot(data.state);
        applyState(data.state);
      }
      toast(`Offline data synced (${queue.length}) ✓`);
      return true;
    }
  } catch (err) {
    console.warn('Sync failed, will retry when network restores', err);
  } finally {
    isSyncing = false;
    updateSyncIndicator(false);
  }
  return false;
}

export function updateSyncIndicator(syncing) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;

  const count = getSyncQueue().length;
  const online = isOnline();

  if (syncing) {
    el.innerHTML = '<span class="sync-dot pulsing"></span> Syncing…';
    el.className = 'sync-badge syncing';
    el.hidden = false;
  } else if (!online) {
    el.innerHTML = `<span class="sync-dot offline"></span> Offline ${count ? `(${count})` : ''}`;
    el.className = 'sync-badge offline';
    el.hidden = false;
  } else if (count > 0) {
    el.innerHTML = `<span class="sync-dot pending"></span> Pending (${count})`;
    el.className = 'sync-badge pending';
    el.hidden = false;
  } else {
    el.innerHTML = '<span class="sync-dot online"></span> Online';
    el.className = 'sync-badge online';
    el.hidden = false;
  }
}

// Auto-trigger sync when network status changes
export function initSyncEngine() {
  window.addEventListener('online', () => {
    updateSyncIndicator();
    syncOfflineQueue();
  });

  window.addEventListener('offline', () => {
    updateSyncIndicator();
    toast('Working Offline — Changes saved locally');
  });

  // Periodic background sync attempt when online
  setInterval(() => {
    if (isOnline() && getSyncQueue().length > 0) {
      syncOfflineQueue();
    }
  }, 20000);
}

