// Village / Location Management Controller (Per-business configurable fast village registry)
import { readJson, json, bad } from '../utils/response.js';
import { clean, SEEDED_VILLAGES } from '../utils/helpers.js';
import { buildState } from '../services/stateService.js';

export async function saveVillage(request, env, business, range) {
  const body = await readJson(request);
  const name = clean(body.name, 80);
  if (!name || name.length < 2) return bad('गाँव का नाम लिखें (कम से कम 2 अक्षर)');

  const displayOrder = Math.max(0, parseInt(body.displayOrder || body.display_order || 0, 10));
  const id = clean(body.id, 40);

  if (id) {
    const existing = await env.DB.prepare('SELECT id FROM villages WHERE id = ? AND business_id = ?')
      .bind(id, business.id)
      .first();
    if (!existing) return bad('गाँव नहीं मिला', 404);

    await env.DB.prepare(
      'UPDATE villages SET name = ?, display_order = ? WHERE id = ? AND business_id = ?'
    )
      .bind(name, displayOrder, id, business.id)
      .run();
  } else {
    // Check if village with same name already exists for this business
    const existing = await env.DB.prepare(
      'SELECT id FROM villages WHERE business_id = ? AND LOWER(name) = LOWER(?)'
    )
      .bind(business.id, name)
      .first();

    if (existing) {
      await env.DB.prepare(
        'UPDATE villages SET display_order = ? WHERE id = ? AND business_id = ?'
      )
        .bind(displayOrder, existing.id, business.id)
        .run();
    } else {
      await env.DB.prepare(
        'INSERT INTO villages (id, business_id, name, display_order, created_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), business.id, name, displayOrder, Date.now())
        .run();
    }
  }

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

export async function deleteVillage(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  const name = clean(body.name, 80);
  if (!id && !name) return bad('गाँव आईडी ज़रूरी है');

  await env.DB.prepare('DELETE FROM villages WHERE business_id = ? AND (id = ? OR name = ?)')
    .bind(business.id, id || '', name || '')
    .run();

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

export async function seedDefaultVillages(request, env, business, range) {
  for (let i = 0; i < SEEDED_VILLAGES.length; i++) {
    const vName = SEEDED_VILLAGES[i];
    const existing = await env.DB.prepare(
      'SELECT id FROM villages WHERE business_id = ? AND LOWER(name) = LOWER(?)'
    )
      .bind(business.id, vName)
      .first();

    if (!existing) {
      await env.DB.prepare(
        'INSERT INTO villages (id, business_id, name, display_order, created_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), business.id, vName, i + 1, Date.now())
        .run();
    }
  }

  return json({ ok: true, state: await buildState(env, business.id, range) });
}
