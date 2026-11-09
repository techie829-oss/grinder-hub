// Offline-First Batch Synchronization Controller
import { readJson, json, bad } from '../utils/response.js';
import { clean, normalizePhone, normName, normVillage, dayKey } from '../utils/helpers.js';
import { issueToken } from '../services/tokenService.js';
import { buildState } from '../services/stateService.js';

export async function syncBatch(request, env, business, range) {
  const body = await readJson(request);
  const actions = Array.isArray(body.actions) ? body.actions : [];

  for (const action of actions) {
    const { type, data } = action;
    if (!type || !data) continue;

    try {
      if (type === 'job') {
        await processJob(env, business, data);
      } else if (type === 'payment') {
        await processPayment(env, business, data);
      } else if (type === 'token') {
        await processToken(env, business, data);
      } else if (type === 'tokenStatus') {
        await processTokenStatus(env, business, data);
      } else if (type === 'customer') {
        await processCustomer(env, business, data);
      }
    } catch (err) {
      console.error('sync_action_error', type, err);
    }
  }

  const state = await buildState(env, business.id, range);
  return json({ ok: true, synced: actions.length, state });
}

async function processJob(env, business, data) {
  const serviceId = clean(data.serviceId, 40);
  const svc = await env.DB.prepare(
    'SELECT id, name, unit, rate_paise, COALESCE(loss_rate_g, 0) AS loss_rate_g FROM services WHERE id = ? AND business_id = ? AND active = 1'
  )
    .bind(serviceId, business.id)
    .first();
  if (!svc) return;

  const grossWeight = Number(data.grossWeight != null ? data.grossWeight : data.qty) || 0;
  if (grossWeight <= 0) return;

  let ratePaise = Math.round(Number(data.rate) * 100);
  if (!Number.isFinite(ratePaise) || ratePaise < 0) ratePaise = svc.rate_paise;
  const amountPaise = Math.round(grossWeight * ratePaise);

  const lossRateG = data.lossRateG !== undefined ? Number(data.lossRateG) : Number(svc.loss_rate_g || 0);
  const totalLossG = data.totalLossG !== undefined
    ? Number(data.totalLossG)
    : (svc.unit === 'kg' ? Math.round(grossWeight * lossRateG) : 0);
  const netWeight = data.netWeight !== undefined
    ? Number(data.netWeight)
    : (svc.unit === 'kg' ? Math.max(0, grossWeight - (totalLossG / 1000)) : grossWeight);

  const paid = data.paid ? 1 : 0;
  const name = clean(data.name, 60);
  const village = clean(data.village, 60);
  const phone = normalizePhone(data.phone);
  const note = clean(data.note, 120);

  let customerId = null;
  if (name) {
    const key = normName(name);
    const vKey = normVillage(village);
    const found = await env.DB.prepare(
      'SELECT id, phone FROM customers WHERE business_id = ? AND name_key = ? AND village_key = ?'
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
    } else {
      customerId = crypto.randomUUID();
      try {
        await env.DB.prepare(
          'INSERT INTO customers (id, business_id, name, name_key, village, village_key, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(customerId, business.id, name, key, village, vKey, phone, Date.now())
          .run();
      } catch (e) {
        const existing = await env.DB.prepare(
          'SELECT id FROM customers WHERE business_id = ? AND name_key = ? AND village_key = ?'
        )
          .bind(business.id, key, vKey)
          .first();
        if (existing) customerId = existing.id;
      }
    }
  }

  let tokenNo = data.tokenNo ? Number(data.tokenNo) : null;
  if (data.tokenId) {
    await env.DB.prepare(
      "UPDATE tokens SET status = 'done', gross_weight = ?, loss_g = ?, net_weight = ? WHERE id = ? AND business_id = ?"
    )
      .bind(grossWeight, totalLossG, netWeight, clean(data.tokenId, 40), business.id)
      .run();
  }
  if (data.withToken && !tokenNo) {
    const token = await issueToken(env, business.id, name || 'ग्राहक', village || '', svc.id, grossWeight, totalLossG, netWeight);
    tokenNo = token.no;
  }

  const entryId = data.offlineId || crypto.randomUUID();
  const at = Number(data.at) || Date.now();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO entries (id, business_id, customer_id, kind, service_id, name, village, gross_weight, loss_g, net_weight,
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
      dayKey(at),
      at
    )
    .run();
}

async function processPayment(env, business, data) {
  const customerId = clean(data.customerId, 40);
  const customer = await env.DB.prepare('SELECT id, name, village FROM customers WHERE id = ? AND business_id = ?')
    .bind(customerId, business.id)
    .first();
  if (!customer) return;

  const amountPaise = Math.round(Number(data.amount) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return;

  const at = Number(data.at) || Date.now();
  const entryId = data.offlineId || crypto.randomUUID();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO entries (id, business_id, customer_id, kind, name, village, amount_paise, paid, note, day, created_at)
     VALUES (?, ?, ?, 'payment', ?, ?, ?, 1, ?, ?, ?)`
  )
    .bind(entryId, business.id, customer.id, customer.name, customer.village || '', amountPaise, clean(data.note, 120), dayKey(at), at)
    .run();
}

async function processToken(env, business, data) {
  const serviceId = clean(data.serviceId, 40);
  const name = clean(data.name, 60);
  const village = clean(data.village, 60);
  const grossWeight = Number(data.grossWeight) || 0;
  const totalLossG = Number(data.totalLossG) || 0;
  const netWeight = Number(data.netWeight) || 0;

  await issueToken(env, business.id, name || 'ग्राहक', village || '', serviceId || null, grossWeight, totalLossG, netWeight);
}

async function processTokenStatus(env, business, data) {
  const id = clean(data.id, 40);
  const status = clean(data.status, 12);
  if (!['serving', 'waiting', 'done'].includes(status)) return;

  await env.DB.prepare('UPDATE tokens SET status = ? WHERE id = ? AND business_id = ?')
    .bind(status, id, business.id)
    .run();
}

async function processCustomer(env, business, data) {
  const name = clean(data.name, 60);
  const village = clean(data.village, 60);
  const phone = normalizePhone(data.phone);
  if (name.length < 2) return;

  const key = normName(name);
  const vKey = normVillage(village);

  const existing = await env.DB.prepare(
    'SELECT id FROM customers WHERE business_id = ? AND name_key = ? AND village_key = ?'
  )
    .bind(business.id, key, vKey)
    .first();

  if (existing) {
    if (phone) {
      await env.DB.prepare('UPDATE customers SET phone = ? WHERE id = ? AND business_id = ?')
        .bind(phone, existing.id, business.id)
        .run();
    }
  } else {
    await env.DB.prepare(
      'INSERT INTO customers (id, business_id, name, name_key, village, village_key, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), business.id, name, key, village, vKey, phone, Date.now())
      .run();
  }
}
