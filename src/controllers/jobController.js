// Job & Billing Controller
import { readJson, json, bad } from '../utils/response.js';
import { clean, normalizePhone, normName, normVillage, dayKey } from '../utils/helpers.js';
import { issueToken } from '../services/tokenService.js';
import { buildState } from '../services/stateService.js';

export async function createJob(request, env, business, range) {
  const body = await readJson(request);
  const serviceId = clean(body.serviceId, 40);
  const svc = await env.DB.prepare(
    'SELECT id, name, unit, rate_paise, COALESCE(loss_rate_g, 0) AS loss_rate_g FROM services WHERE id = ? AND business_id = ? AND active = 1'
  )
    .bind(serviceId, business.id)
    .first();
  if (!svc) return bad('सेवा या अनाज चुनें');

  const grossWeight = Number(body.grossWeight != null ? body.grossWeight : body.qty);
  if (!Number.isFinite(grossWeight) || grossWeight <= 0) return bad('वज़न या मात्रा भरें');
  if (grossWeight > 100000) return bad('मात्रा बहुत ज़्यादा है');

  let ratePaise = Math.round(Number(body.rate) * 100);
  if (!Number.isFinite(ratePaise) || ratePaise < 0) ratePaise = svc.rate_paise;
  let amountPaise = 0;
  if (body.amount != null && Number(body.amount) > 0) {
    amountPaise = Math.round(Number(body.amount) * 100);
  } else if (body.amountPaise != null && Number(body.amountPaise) > 0) {
    amountPaise = Math.round(Number(body.amountPaise));
  } else {
    amountPaise = Math.round(grossWeight * ratePaise);
  }
  if (!(amountPaise > 0)) return bad('रकम सही नहीं है');

  // Loss / wastage deduction calculation
  const lossRateG = body.lossRateG !== undefined ? Number(body.lossRateG) : Number(svc.loss_rate_g || 0);
  const totalLossG = body.totalLossG !== undefined
    ? Number(body.totalLossG)
    : (svc.unit === 'kg' ? Math.round(grossWeight * lossRateG) : 0);
  const netWeight = body.netWeight !== undefined
    ? Number(body.netWeight)
    : (svc.unit === 'kg' ? Math.max(0, grossWeight - (totalLossG / 1000)) : grossWeight);

  const paid = body.paid ? 1 : 0;
  const name = clean(body.name, 60);
  const village = clean(body.village, 60);
  const phone = normalizePhone(body.phone);
  const note = clean(body.note, 120);
  if (!paid && !name) return bad('उधार के लिए ग्राहक का नाम ज़रूरी है');

  let customerId = null;
  const photo = typeof body.photo === 'string' ? body.photo.slice(0, 200000) : '';

  if (name) {
    const key = normName(name);
    const vKey = normVillage(village);
    const found = await env.DB.prepare(
      'SELECT id, phone, village, photo FROM customers WHERE business_id = ? AND name_key = ? AND village_key = ?'
    )
      .bind(business.id, key, vKey)
      .first();
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

  let token = null;
  let tokenNo = body.tokenNo ? Number(body.tokenNo) : null;
  if (body.tokenId) {
    await env.DB.prepare(
      "UPDATE tokens SET status = 'done', gross_weight = ?, loss_g = ?, net_weight = ? WHERE id = ? AND business_id = ?"
    )
      .bind(grossWeight, totalLossG, netWeight, clean(body.tokenId, 40), business.id)
      .run();
  }
  if (body.withToken) {
    token = await issueToken(env, business.id, name || 'ग्राहक', village || '', svc.id, grossWeight, totalLossG, netWeight, phone || '');
    tokenNo = token.no;
  }

  const entryId = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO entries (id, business_id, customer_id, kind, service_id, name, village, gross_weight, loss_g, net_weight,
       rate_paise, amount_paise, paid, note, token_no, day, created_at)
     VALUES (?, ?, ?, 'job', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      entryId,
      business.id,
      customerId,
      svc.id,
      name,
      village,
      grossWeight,
      totalLossG,
      netWeight,
      ratePaise,
      amountPaise,
      paid,
      note,
      tokenNo,
      dayKey(now),
      now
    )
    .run();

  const state = await buildState(env, business.id, range);
  return json({ ok: true, entryId, token, state });
}

export async function createPayment(request, env, business, range) {
  const body = await readJson(request);
  const customerId = clean(body.customerId, 40);
  const customer = await env.DB.prepare('SELECT id, name, village FROM customers WHERE id = ? AND business_id = ?')
    .bind(customerId, business.id)
    .first();
  if (!customer) return bad('ग्राहक नहीं मिला', 404);

  const amountPaise = Math.round(Number(body.amount) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return bad('सही रकम भरें');
  if (amountPaise > 100000000) return bad('रकम बहुत ज़्यादा है');

  const now = Date.now();
  const entryId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO entries (id, business_id, customer_id, kind, name, village, amount_paise, paid, note, day, created_at)
     VALUES (?, ?, ?, 'payment', ?, ?, ?, 1, ?, ?, ?)`
  )
    .bind(entryId, business.id, customer.id, customer.name, customer.village || '', amountPaise, clean(body.note, 120), dayKey(now), now)
    .run();

  return json({ ok: true, entryId, state: await buildState(env, business.id, range) });
}

export async function deleteEntry(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  await env.DB.prepare('DELETE FROM entries WHERE id = ? AND business_id = ?').bind(id, business.id).run();
  return json({ ok: true, state: await buildState(env, business.id, range) });
}
