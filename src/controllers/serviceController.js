// Service and Product Management Controller
import { readJson, json, bad } from '../utils/response.js';
import { clean, UNITS } from '../utils/helpers.js';
import { buildState } from '../services/stateService.js';

export async function saveService(request, env, business, range) {
  const body = await readJson(request);
  const name = clean(body.name, 40);
  const unit = UNITS[body.unit] ? body.unit : 'kg';
  const ratePaise = Math.round(Number(body.rate) * 100);
  const lossRateG = Math.max(0, Number(body.lossRateG) || 0);

  if (name.length < 2) return bad('सामग्री या सेवा का नाम लिखें');
  if (!Number.isFinite(ratePaise) || ratePaise < 0) return bad('दर सही भरें');

  const id = clean(body.id, 40);
  if (id) {
    const existing = await env.DB.prepare('SELECT id FROM services WHERE id = ? AND business_id = ?')
      .bind(id, business.id)
      .first();
    if (!existing) return bad('सेवा नहीं मिली', 404);
    await env.DB.prepare(
      'UPDATE services SET name = ?, unit = ?, rate_paise = ?, loss_rate_g = ?, active = ? WHERE id = ? AND business_id = ?'
    )
      .bind(name, unit, ratePaise, lossRateG, body.active === false ? 0 : 1, id, business.id)
      .run();
  } else {
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM services WHERE business_id = ? AND active = 1')
      .bind(business.id)
      .first();
    await env.DB.prepare(
      'INSERT INTO services (id, business_id, name, unit, rate_paise, loss_rate_g, active, sort) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
    )
      .bind(crypto.randomUUID(), business.id, name, unit, ratePaise, lossRateG, count ? count.n : 0)
      .run();
  }

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

export async function deleteService(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  const active = await env.DB.prepare('SELECT COUNT(*) AS n FROM services WHERE business_id = ? AND active = 1')
    .bind(business.id)
    .first();
  if (active && active.n <= 1) return bad('कम से कम एक सेवा चालू रखें');
  await env.DB.prepare('UPDATE services SET active = 0 WHERE id = ? AND business_id = ?').bind(id, business.id).run();
  return json({ ok: true, state: await buildState(env, business.id, range) });
}
