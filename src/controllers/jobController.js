// Job & Billing Controller
import { readJson, json, bad } from '../utils/response.js';
import { clean, normalizePhone, normName, normVillage, dayKey } from '../utils/helpers.js';
import { isPhoneticMatch } from '../utils/phonetic.js';
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

  // Loss / wastage deduction calculation
  const lossRateG = body.lossRateG !== undefined ? Number(body.lossRateG) : Number(svc.loss_rate_g || 0);
  const totalLossG = body.totalLossG !== undefined
    ? Number(body.totalLossG)
    : (svc.unit === 'kg' ? Math.round(grossWeight * lossRateG) : 0);
  const netWeight = body.netWeight !== undefined
    ? Number(body.netWeight)
    : (svc.unit === 'kg' ? Math.max(0, grossWeight - (totalLossG / 1000)) : grossWeight);

  let ratePaise = Math.round(Number(body.rate) * 100);
  if (!Number.isFinite(ratePaise) || ratePaise < 0) ratePaise = svc.rate_paise;

  // Charge basis: 'output' (netWeight / तैयार माल) vs 'gross' (grossWeight / कुल आवक)
  const chargeBasis = body.chargeBasis || business.charge_basis || 'output';
  const billWeight = chargeBasis === 'gross' ? grossWeight : netWeight;

  let amountPaise = 0;
  if (body.amount != null && Number(body.amount) > 0) {
    amountPaise = Math.round(Number(body.amount) * 100);
  } else if (body.amountPaise != null && Number(body.amountPaise) > 0) {
    amountPaise = Math.round(Number(body.amountPaise));
  } else {
    amountPaise = Math.round(billWeight * ratePaise);
  }
  if (!(amountPaise > 0)) return bad('रकम सही नहीं है');

  const paid = body.paid ? 1 : 0;
  const name = clean(body.name, 60);
  const village = clean(body.village, 60);
  const phone = normalizePhone(body.phone);
  const note = clean(body.note, 120);
  if (!paid && !name) return bad('उधार के लिए ग्राहक का नाम ज़रूरी है');

  let customerId = clean(body.customerId, 40);
  const isExplicitNew = customerId === 'new' || body.isNewCustomer === true || body.isNewCustomer === '1';
  const photo = typeof body.photo === 'string' ? body.photo.slice(0, 200000) : '';

  if (customerId && customerId !== 'new') {
    const directCust = await env.DB.prepare('SELECT id, phone, photo FROM customers WHERE id = ? AND business_id = ?').bind(customerId, business.id).first();
    if (directCust) {
      customerId = directCust.id;
      if (!directCust.phone && phone) {
        await env.DB.prepare('UPDATE customers SET phone = ? WHERE id = ? AND business_id = ?').bind(phone, directCust.id, business.id).run();
      }
      if (photo && !directCust.photo) {
        await env.DB.prepare('UPDATE customers SET photo = ? WHERE id = ? AND business_id = ?').bind(photo, directCust.id, business.id).run();
      }
    } else {
      customerId = null;
    }
  }

  if (!customerId && name) {
    if (isExplicitNew) {
      // Merchant explicitly marked this as a distinct customer!
      customerId = crypto.randomUUID();
      const key = normName(name);
      const vKey = normVillage(village);
      try {
        await env.DB.prepare('INSERT INTO customers (id, business_id, name, name_key, village, village_key, phone, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(customerId, business.id, name, key, village, vKey, phone, photo, Date.now()).run();
      } catch (err) {
        const disambigKey = phone ? `${key}_${phone.slice(-4)}` : `${key}_${Date.now().toString().slice(-4)}`;
        await env.DB.prepare('INSERT INTO customers (id, business_id, name, name_key, village, village_key, phone, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(customerId, business.id, name, disambigKey, village, vKey, phone, photo, Date.now()).run();
      }
    } else {
      // Automatic Safe Resolution:
      let found = null;

      // 1. If 10-digit phone is provided, match by phone
      if (phone && phone.length === 10) {
        found = await env.DB.prepare('SELECT id, phone, photo, name, village FROM customers WHERE business_id = ? AND phone = ?').bind(business.id, phone).first();
      }

      // 2. If no phone match, find candidates by name and village
      if (!found) {
        const key = normName(name);
        const vKey = normVillage(village);
        const candidates = await env.DB.prepare('SELECT id, phone, village, photo, name, name_key, village_key FROM customers WHERE business_id = ?').bind(business.id).all();
        const matches = (candidates.results || []).filter((c) => {
          const nMatch = c.name_key === key || isPhoneticMatch(c.name, name);
          if (!nMatch) return false;
          if (village) return c.village_key === vKey || isPhoneticMatch(c.village, village);
          return true;
        });

        // SAFETY: Only auto-merge if there is EXACTLY 1 candidate AND phone numbers do not conflict!
        if (matches.length === 1) {
          const cand = matches[0];
          if (!cand.phone || !phone || cand.phone === phone) {
            found = cand;
          }
        }
      }

      if (found) {
        customerId = found.id;
        if (!found.phone && phone) {
          await env.DB.prepare('UPDATE customers SET phone = ? WHERE id = ? AND business_id = ?').bind(phone, found.id, business.id).run();
        }
        if (photo && !found.photo) {
          await env.DB.prepare('UPDATE customers SET photo = ? WHERE id = ? AND business_id = ?').bind(photo, found.id, business.id).run();
        }
      } else {
        // Create new distinct customer
        customerId = crypto.randomUUID();
        const key = normName(name);
        const vKey = normVillage(village);
        try {
          await env.DB.prepare('INSERT INTO customers (id, business_id, name, name_key, village, village_key, phone, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(customerId, business.id, name, key, village, vKey, phone, photo, Date.now()).run();
        } catch (err) {
          const disambigKey = phone ? `${key}_${phone.slice(-4)}` : `${key}_${Date.now().toString().slice(-4)}`;
          await env.DB.prepare('INSERT INTO customers (id, business_id, name, name_key, village, village_key, phone, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(customerId, business.id, name, disambigKey, village, vKey, phone, photo, Date.now()).run();
        }
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
