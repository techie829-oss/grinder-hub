// Customer Directory & Ledger Detail Controller
import { readJson, json, bad } from '../utils/response.js';
import { clean, normalizePhone, normName, normVillage } from '../utils/helpers.js';
import { buildState } from '../services/stateService.js';

export async function customerDetail(request, env, business, url) {
  const id = clean(url.searchParams.get('id'), 40);
  const customer = await env.DB.prepare('SELECT id, name, village, phone, COALESCE(photo, "") AS photo FROM customers WHERE id = ? AND business_id = ?')
    .bind(id, business.id)
    .first();
  if (!customer) return bad('ग्राहक नहीं मिला', 404);

  const rows = await env.DB.prepare(
    `SELECT e.id, e.kind, COALESCE(e.item_name, '') AS item_name,
            COALESCE(e.gross_weight, 0) AS gross_weight, COALESCE(e.loss_g, 0) AS loss_g,
            e.net_weight, e.rate_paise, e.amount_paise, e.paid, e.note, e.token_no,
            e.created_at, COALESCE(s.name, e.item_name, '') AS service_name,
            COALESCE(e.unit, s.unit, 'kg') AS unit
       FROM entries e LEFT JOIN services s ON s.id = e.service_id AND s.business_id = e.business_id
      WHERE e.business_id = ? AND e.customer_id = ?
      ORDER BY e.created_at DESC LIMIT 200`
  )
    .bind(business.id, id)
    .all();

  return json({
    ok: true,
    customer: { id: customer.id, name: customer.name, village: customer.village || '', phone: customer.phone || '', photo: customer.photo || '' },
    entries: rows.results.map((e) => ({
      id: e.id,
      kind: e.kind,
      itemName: e.item_name || '',
      grossWeight: e.gross_weight,
      lossG: Number(e.loss_g) || 0,
      netWeight: e.net_weight != null ? Number(e.net_weight) : (e.gross_weight ? Math.max(0, e.gross_weight - ((Number(e.loss_g) || 0) / 1000)) : null),
      ratePaise: e.rate_paise,
      amountPaise: e.amount_paise,
      paid: !!e.paid,
      note: e.note || '',
      tokenNo: e.token_no,
      serviceName: e.service_name || e.item_name || '',
      unit: e.unit || 'kg',
      at: e.created_at,
    })),
  });
}

export async function saveCustomer(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  const name = clean(body.name, 60);
  const village = clean(body.village, 60);
  const phone = normalizePhone(body.phone);
  const photo = typeof body.photo === 'string' ? body.photo.slice(0, 200000) : '';
  if (name.length < 2) return bad('ग्राहक का नाम लिखें');

  const key = normName(name);
  const vKey = normVillage(village);

  if (id) {
    const existing = await env.DB.prepare('SELECT id, photo FROM customers WHERE id = ? AND business_id = ?')
      .bind(id, business.id)
      .first();
    if (!existing) return bad('ग्राहक नहीं मिला', 404);

    const conflict = await env.DB.prepare(
      'SELECT id FROM customers WHERE business_id = ? AND name_key = ? AND village_key = ? AND id <> ?'
    )
      .bind(business.id, key, vKey, id)
      .first();
    if (conflict) return bad(`इस गाँव में '${name}' नाम के ग्राहक पहले से मौजूद हैं। अलग खाता रखने के लिए नाम में पिता का नाम या उपनाम जोड़ें (उदा. ${name} (मास्टर जी))`);

    const finalPhoto = photo || (existing.photo || '');
    await env.DB.prepare(
      'UPDATE customers SET name = ?, name_key = ?, village = ?, village_key = ?, phone = ?, photo = ? WHERE id = ? AND business_id = ?'
    )
      .bind(name, key, village, vKey, phone, finalPhoto, id, business.id)
      .run();
  } else {
    const exists = await env.DB.prepare(
      'SELECT id FROM customers WHERE business_id = ? AND name_key = ? AND village_key = ?'
    )
      .bind(business.id, key, vKey)
      .first();
    if (exists) return bad(`इस गाँव में '${name}' नाम के ग्राहक पहले से मौजूद हैं। अलग खाता रखने के लिए नाम में पिता का नाम या उपनाम जोड़ें (उदा. ${name} (मास्टर जी) या ${name} (रामबली))`);

    await env.DB.prepare(
      'INSERT INTO customers (id, business_id, name, name_key, village, village_key, phone, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), business.id, name, key, village, vKey, phone, photo, Date.now())
      .run();
  }

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

export async function deleteCustomer(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);

  const balanceRow = await env.DB.prepare(
    `SELECT COALESCE(SUM(CASE WHEN kind IN ('job', 'sale') AND paid = 0 THEN amount_paise
                             WHEN kind = 'purchase' AND paid = 0 THEN -amount_paise
                             WHEN kind = 'payment' THEN -amount_paise ELSE 0 END), 0) AS balance_paise
       FROM entries WHERE business_id = ? AND customer_id = ?`
  ).bind(business.id, id).first();

  if (balanceRow && balanceRow.balance_paise !== 0) {
    return bad('इस ग्राहक का हिसाब बाकी है, पहले हिसाब चुकता करें');
  }

  await env.DB.batch([
    env.DB.prepare('UPDATE entries SET customer_id = NULL WHERE business_id = ? AND customer_id = ?').bind(business.id, id),
    env.DB.prepare('DELETE FROM customers WHERE id = ? AND business_id = ?').bind(id, business.id),
  ]);

  return json({ ok: true, state: await buildState(env, business.id, range) });
}
