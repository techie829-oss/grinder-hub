import { readJson, json, bad } from '../utils/response.js';
import { clean, dayKey } from '../utils/helpers.js';
import { buildState } from '../services/stateService.js';

export async function saveSettings(request, env, business, range) {
  const body = await readJson(request);
  const name = clean(body.name, 60);
  if (name.length < 2) return bad('दुकान का नाम लिखें');
  const address = clean(body.address, 160);
  const upi = clean(body.upi, 60);
  const note = clean(body.note, 120);
  const tokenMode = body.tokenMode === 'loop100' ? 'loop100' : 'daily';
  const hideLossOnSlip = body.hideLossOnSlip === false || body.hideLossOnSlip === '0' || body.hideLossOnSlip === 0 ? 0 : 1;
  const chargeBasis = body.chargeBasis === 'gross' ? 'gross' : 'output';

  await env.DB.prepare('UPDATE businesses SET name = ?, address = ?, upi = ?, note = ?, token_mode = ?, hide_loss_on_slip = ?, charge_basis = ? WHERE id = ?')
    .bind(name, address, upi, note, tokenMode, hideLossOnSlip, chargeBasis, business.id)
    .run();
  return json({ ok: true, state: await buildState(env, business.id, range) });
}

export async function resetTokenCounter(request, env, business, range) {
  const day = dayKey();
  await env.DB.prepare(
    `INSERT INTO day_counters (business_id, day, last_no) VALUES (?, ?, 0)
     ON CONFLICT(business_id, day) DO UPDATE SET last_no = 0`
  ).bind(business.id, day).run();
  return json({ ok: true, state: await buildState(env, business.id, range) });
}

export async function exportData(env, business) {
  const [biz, services, customers, entries, tokens] = await env.DB.batch([
    env.DB.prepare('SELECT id, name, phone, address, upi, note, created_at FROM businesses WHERE id = ?').bind(business.id),
    env.DB.prepare('SELECT id, name, unit, rate_paise, active FROM services WHERE business_id = ?').bind(business.id),
    env.DB.prepare('SELECT id, name, village, phone, created_at FROM customers WHERE business_id = ?').bind(business.id),
    env.DB.prepare('SELECT * FROM entries WHERE business_id = ? ORDER BY created_at').bind(business.id),
    env.DB.prepare('SELECT * FROM tokens WHERE business_id = ? ORDER BY day DESC, no').bind(business.id),
  ]);

  const payload = {
    app: 'chakki-book',
    version: '2.1.0',
    exportedAt: new Date().toISOString(),
    business: biz.results[0] || null,
    services: services.results,
    customers: customers.results,
    entries: entries.results,
    tokens: tokens.results,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="chakki-book-${dayKey()}.json"`,
      'cache-control': 'no-store',
    },
  });
}

