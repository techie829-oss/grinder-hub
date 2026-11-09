import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node test runner
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });
} catch (e) {
  // Already defined
}
globalThis.document = {
  getElementById: () => null,
};
globalThis.window = {
  addEventListener: () => {},
};

import {
  saveOfflineSnapshot,
  loadOfflineSnapshot,
  getSyncQueue,
  enqueueOfflineAction,
  clearSyncQueue,
  isOnline
} from '../public/js/sync.js';

describe('Offline Storage & Sync Engine Suite', () => {

  beforeEach(() => {
    storage.clear();
  });

  describe('Offline Snapshot Persistence', () => {
    it('should save and retrieve full state snapshot', () => {
      const mockState = {
        business: { id: 'b1', name: 'चक्की 1' },
        tokens: { waiting: [{ id: 't1', no: 1 }] },
        services: [{ id: 's1', name: 'गेहूँ', rate: 3 }]
      };

      saveOfflineSnapshot(mockState);
      const loaded = loadOfflineSnapshot();

      assert.deepEqual(loaded, mockState);
    });

    it('should return null when no snapshot is stored', () => {
      const loaded = loadOfflineSnapshot();
      assert.equal(loaded, null);
    });
  });

  describe('Offline Sync Action Queue', () => {
    it('should enqueue action with UUID, timestamp, and offlineId', () => {
      const action = enqueueOfflineAction('create_token', {
        serviceId: 's1',
        name: 'रामेश्वर',
        village: 'रामपुर',
        qty: 30
      });

      assert.ok(action.id);
      assert.ok(action.queuedAt);
      assert.equal(action.type, 'create_token');
      assert.equal(action.data.name, 'रामेश्वर');
      assert.equal(action.data.qty, 30);
      assert.ok(action.data.offlineId);

      const queue = getSyncQueue();
      assert.equal(queue.length, 1);
      assert.equal(queue[0].id, action.id);
    });

    it('should accumulate multiple actions in FIFO order', () => {
      enqueueOfflineAction('create_token', { tokenNo: 1 });
      enqueueOfflineAction('create_job', { amount: 90 });
      enqueueOfflineAction('record_payment', { amount: 50 });

      const queue = getSyncQueue();
      assert.equal(queue.length, 3);
      assert.equal(queue[0].type, 'create_token');
      assert.equal(queue[1].type, 'create_job');
      assert.equal(queue[2].type, 'record_payment');
    });

    it('should clear queue completely when synced', () => {
      enqueueOfflineAction('create_token', { tokenNo: 1 });
      assert.equal(getSyncQueue().length, 1);

      clearSyncQueue();
      assert.equal(getSyncQueue().length, 0);
    });
  });

  describe('Online/Offline Status Detection', () => {
    it('should report online when navigator.onLine is true', () => {
      globalThis.navigator.onLine = true;
      assert.equal(isOnline(), true);
    });

    it('should report offline when navigator.onLine is false', () => {
      globalThis.navigator.onLine = false;
      assert.equal(isOnline(), false);
      globalThis.navigator.onLine = true; // reset
    });
  });

});
