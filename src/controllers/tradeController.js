// Trade Controller: Product Sales & Raw Material Purchases
import { readJson, json, bad } from '../utils/response.js';
import { clean, normalizePhone, normName, normVillage, dayKey } from '../utils/helpers.js';
import { isPhoneticMatch } from '../utils/phonetic.js';
import { buildState } from '../services/stateService.js';

export async function createTrade(request, env, business, range) {
  const body = await readJson(request);
  const kind = (body.kind === 'purchase' || body.type === 'purchase') ? 'purchase' : 'sale';

  const itemName = clean(body.itemName || body.item, 60);
  if (!itemName) {
    return bad(kind === 'purchase' ? 'खरीदी जाने वाली फसल या माल का नाम लिखें' : 'बेचे जाने वाले सामान का नाम लिखें');
  }

  const unit = clean(body.unit || 'kg', 16);
  const qty = Number(body.qty != null ? body.qty : body.grossWeight);
  if (!Number.isFinite(qty) || qty <= 0) return bad('मात्रा या वजन भरें');
  if (qty > 1000000) return bad('मात्रा बहुत ज़्यादा है');

  let rate = Number(body.rate);
  let amountPaise = 0;
  if (body.amount != null && Number(body.amount) > 0) {
    amountPaise = Math.round(Number(body.amount) * 100);
    if (!Number.isFinite(rate) || rate <= 0) {
      rate = amountPaise / (qty * 100);
    }
  } else if (Number.isFinite(rate) && rate > 0) {
    amountPaise = Math.round(qty * rate * 100);
  } else {
    return bad('रेट या कुल रकम भरें');
  }
  if (!(amountPaise > 0)) return bad('रकम सही नहीं है');

  const paid = body.paid ? 1 : 0;
  const name = clean(body.name, 60);
  const village = clean(body.village, 60);
  const phone = normalizePhone(body.phone);
  const note = clean(body.note, 120);

  if (!paid && !name) {
    return bad(kind === 'purchase' ? 'बाकी/खाते में रखने के लिए किसान का नाम ज़रूरी है' : 'उधार के लिए ग्राहक का नाम ज़रूरी है');
  }

  let customerId = null;
  const photo = typeof body.photo === 'string' ? body.photo.slice(0, 200000) : '';

  if (name) {
    const key = normName(name);
    const vKey = normVillage(village);
    let found = await env.DB.prepare(
      'SELECT id, phone, village, photo, name FROM customers WHERE business_id = ? AND name_key = ? AND village_key = ?'
    )
      .bind(business.id, key, vKey)
      .first();

    // Bilingual phonetic match fallback
    if (!found) {
      const candidates = await env.DB.prepare('SELECT id, name, village, phone, photo FROM customers WHERE business_id = ?').bind(business.id).all();
      found = (candidates.results || []).find((c) => isPhoneticMatch(c.name, name) && (!village || isPhoneticMatch(c.village, village))) || null;
    }

    if (found) {
      customerId = found.id;
      if (!found.phone && phone) {
        await env.DB.prepare('UPDATE customers SET phone = ? WHERE id = ? AND business_id = ?')
          .bind(phone, found.id, business.id)
          .run();
      }
      if (photo && !found.photo) {
        await env.DB.prepare('UPDATE customers SET photo = ? WHERE id = ? AND business_id = ?')
          .bind(photo, found.id, business.id)
          .run();
      }
    } else {
      customerId = crypto.randomUUID();
      try {
        await env.DB.prepare(
          'INSERT INTO customers (id, business_id, name, name_key, village, village_key, phone, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(customerId, business.id, name, key, village, vKey, phone, photo, Date.now())
          .run();
      } catch (err) {
        const again = await env.DB.prepare(
          'SELECT id FROM customers WHERE business_id = ? AND name_key = ? AND village_key = ?'
        )
          .bind(business.id, key, vKey)
          .first();
        if (!again) throw err;
        customerId = again.id;
      }
    }
  }

  const entryId = crypto.randomUUID();
  const now = Date.now();
  const ratePaise = Math.round(rate * 100);

  await env.DB.prepare(
    `INSERT INTO entries (id, business_id, customer_id, kind, item_name, unit, name, village, gross_weight,
       loss_g, net_weight, rate_paise, amount_paise, paid, note, day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      entryId,
      business.id,
      customerId,
      kind,
      itemName,
      unit,
      name,
      village,
      qty,
      qty,
      ratePaise,
      amountPaise,
      paid,
      note,
      dayKey(now),
      now
    )
    .run();

  if (body.saveProduct) {
    try {
      const pExists = await env.DB.prepare(
        'SELECT id FROM products WHERE business_id = ? AND LOWER(name) = LOWER(?) AND active = 1'
      )
        .bind(business.id, itemName)
        .first();
      if (!pExists) {
        await env.DB.prepare(
          'INSERT INTO products (id, business_id, name, type, unit, default_rate_paise, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
        )
          .bind(crypto.randomUUID(), business.id, itemName, kind, unit, ratePaise, now)
          .run();
      }
    } catch (e) {}
  }

  const state = await buildState(env, business.id, range);
  return json({ ok: true, entryId, state });
}

