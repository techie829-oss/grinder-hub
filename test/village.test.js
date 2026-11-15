import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveVillage, deleteVillage, seedDefaultVillages } from '../src/controllers/villageController.js';

function createMockEnv() {
  const store = [];
  return {
    DB: {
      prepare(query) {
        return {
          bind(...args) {
            return {
              async first() {
                if (query.includes('SELECT id FROM villages WHERE id = ?')) {
                  const [id, bizId] = args;
                  return store.find((v) => v.id === id && v.business_id === bizId) || null;
                }
                if (query.includes('SELECT id FROM villages WHERE business_id = ? AND LOWER(name) = LOWER(?)')) {
                  const [bizId, name] = args;
                  return store.find((v) => v.business_id === bizId && v.name.toLowerCase() === name.toLowerCase()) || null;
                }
                if (query.includes('SELECT id, name, display_order FROM villages')) {
                  return store[0] || null;
                }
                return null;
              },
              async run() {
                if (query.includes('INSERT INTO villages')) {
                  const [id, bizId, name, order, createdAt] = args;
                  store.push({ id, business_id: bizId, name, display_order: order, created_at: createdAt });
                  return { success: true };
                }
                if (query.includes('UPDATE villages SET name = ?, display_order = ?')) {
                  const [name, order, id, bizId] = args;
                  const item = store.find((v) => v.id === id && v.business_id === bizId);
                  if (item) {
                    item.name = name;
                    item.display_order = order;
                  }
                  return { success: true };
                }
                if (query.includes('DELETE FROM villages')) {
                  const [bizId, id, name] = args;
                  const idx = store.findIndex((v) => v.business_id === bizId && (v.id === id || v.name === name));
                  if (idx !== -1) store.splice(idx, 1);
                  return { success: true };
                }
                return { success: true };
              },
            };
          },
        };
      },
      async batch() {
        return [
          { results: [] }, // services
          { results: [] }, // customers
          { results: [] }, // entries
          { results: [] }, // tokens
          { results: [{}] }, // stats
          { results: [] }, // breakdown
          { results: [] }, // counter
          { results: [{ id: 'biz-test', name: 'Test Mill' }] }, // biz
          { results: [] }, // products
          { results: store.map((s) => ({ id: s.id, name: s.name, display_order: s.display_order })) }, // villages
        ];
      },
    },
    store,
  };
}

test('Village Controller Suite: CRUD & Seeding', async () => {
  const env = createMockEnv();
  const biz = { id: 'biz-test', name: 'Test Mill' };

  // 1. Add village
  const req1 = new Request('http://localhost/api/villages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'केवलपुरवा (Kewalpurwa)', displayOrder: 1 }),
  });
  const res1 = await saveVillage(req1, env, biz, 'today');
  const data1 = await res1.json();
  assert.equal(data1.ok, true);
  assert.equal(env.store.length, 1);
  assert.equal(env.store[0].name, 'केवलपुरवा (Kewalpurwa)');
  assert.equal(env.store[0].display_order, 1);

  // 2. Edit village
  const villageId = env.store[0].id;
  const req2 = new Request('http://localhost/api/villages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: villageId, name: 'केवलपुरवा (Kewalpurwa Village)', displayOrder: 5 }),
  });
  const res2 = await saveVillage(req2, env, biz, 'today');
  const data2 = await res2.json();
  assert.equal(data2.ok, true);
  assert.equal(env.store[0].name, 'केवलपुरवा (Kewalpurwa Village)');
  assert.equal(env.store[0].display_order, 5);

  // 3. Delete village
  const req3 = new Request('http://localhost/api/villages/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: villageId }),
  });
  const res3 = await deleteVillage(req3, env, biz, 'today');
  const data3 = await res3.json();
  assert.equal(data3.ok, true);
  assert.equal(env.store.length, 0);

  // 4. Seed default villages
  const req4 = new Request('http://localhost/api/villages/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const res4 = await seedDefaultVillages(req4, env, biz, 'today');
  const data4 = await res4.json();
  assert.equal(data4.ok, true);
  assert.equal(env.store.length, 12);
  assert.equal(env.store[0].name, 'केवलपुरवा (Kewalpurwa)');
});
