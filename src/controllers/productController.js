// Dynamic Products / Commodities Controller (Grain, Oils, Feeds, General Trading)
import { readJson, json, bad } from '../utils/response.js';
import { clean } from '../utils/helpers.js';
import { buildState } from '../services/stateService.js';

export async function saveProduct(request, env, business, range) {
  const body = await readJson(request);
  const name = clean(body.name, 60);
  if (!name || name.length < 2) return bad('सामान या उत्पाद का नाम लिखें (कम से कम 2 अक्षर)');

  const type = ['sale', 'purchase', 'both'].includes(body.type) ? body.type : 'both';
  const unit = clean(body.unit || 'kg', 16);
  const defaultRatePaise = Math.max(0, Math.round(Number(body.rate || body.defaultRate || 0) * 100));

  const id = clean(body.id, 40);
  if (id) {
    const existing = await env.DB.prepare('SELECT id FROM products WHERE id = ? AND business_id = ?')
      .bind(id, business.id)
      .first();
    if (!existing) return bad('सामान नहीं मिला', 404);

    await env.DB.prepare(
      'UPDATE products SET name = ?, type = ?, unit = ?, default_rate_paise = ?, active = ? WHERE id = ? AND business_id = ?'
    )
      .bind(name, type, unit, defaultRatePaise, body.active === false ? 0 : 1, id, business.id)
      .run();
  } else {
    // Check if item with same name exists
    const existing = await env.DB.prepare(
      'SELECT id FROM products WHERE business_id = ? AND LOWER(name) = LOWER(?) AND active = 1'
    )
      .bind(business.id, name)
      .first();

    if (existing) {
      // Update rate/unit/type if already exists
      await env.DB.prepare(
        'UPDATE products SET type = ?, unit = ?, default_rate_paise = ? WHERE id = ? AND business_id = ?'
      )
        .bind(type, unit, defaultRatePaise, existing.id, business.id)
        .run();
    } else {
      await env.DB.prepare(
        'INSERT INTO products (id, business_id, name, type, unit, default_rate_paise, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
      )
        .bind(crypto.randomUUID(), business.id, name, type, unit, defaultRatePaise, Date.now())
        .run();
    }
  }

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

export async function deleteProduct(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  if (!id) return bad('सामान आईडी ज़रूरी है');

  await env.DB.prepare('UPDATE products SET active = 0 WHERE id = ? AND business_id = ?')
    .bind(id, business.id)
    .run();

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

