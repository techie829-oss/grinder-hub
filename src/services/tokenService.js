// Token Sequence and Allocation Service
import { dayKey, normName, normVillage, normalizePhone } from '../utils/helpers.js';

export async function nextTokenNo(env, businessId, day, tokenMode = 'daily') {
  if (tokenMode === 'loop100') {
    const row = await env.DB.prepare(
      `INSERT INTO day_counters (business_id, day, last_no) VALUES (?, ?, 1)
       ON CONFLICT(business_id, day) DO UPDATE SET last_no = CASE WHEN last_no >= 100 THEN 1 ELSE last_no + 1 END
       RETURNING last_no`
    )
      .bind(businessId, day)
      .first();
    if (row && row.last_no) return row.last_no;
    const max = await env.DB.prepare('SELECT COALESCE(MAX(no), 0) AS n FROM tokens WHERE business_id = ? AND day = ?')
      .bind(businessId, day)
      .first();
    const nextVal = (max ? max.n : 0) + 1;
    return nextVal > 100 ? 1 : nextVal;
  }

  const row = await env.DB.prepare(
    `INSERT INTO day_counters (business_id, day, last_no) VALUES (?, ?, 1)
     ON CONFLICT(business_id, day) DO UPDATE SET last_no = last_no + 1
     RETURNING last_no`
  )
    .bind(businessId, day)
    .first();
  if (row && row.last_no) return row.last_no;
  const max = await env.DB.prepare('SELECT COALESCE(MAX(no), 0) AS n FROM tokens WHERE business_id = ? AND day = ?')
    .bind(businessId, day)
    .first();
  return (max ? max.n : 0) + 1;
}

export async function issueToken(env, businessId, name, village, serviceId, grossWeight = 0, totalLossG = 0, netWeight = 0, phone = '', note = '', tokenMode = null) {
  const day = dayKey();
  if (!tokenMode) {
    const biz = await env.DB.prepare('SELECT COALESCE(token_mode, "daily") AS token_mode FROM businesses WHERE id = ?').bind(businessId).first();
    tokenMode = (biz && biz.token_mode) || 'daily';
  }
  const no = await nextTokenNo(env, businessId, day, tokenMode);
  const anyServing = await env.DB.prepare(
    "SELECT id FROM tokens WHERE business_id = ? AND day = ? AND status = 'serving' LIMIT 1"
  )
    .bind(businessId, day)
    .first();

  const token = {
    id: crypto.randomUUID(),
    no,
    name: name || 'ग्राहक',
    village: village || '',
    phone: phone || '',
    note: note || '',
    serviceId: serviceId || null,
    grossWeight: Number(grossWeight) || 0,
    lossG: Number(totalLossG) || 0,
    netWeight: Number(netWeight) || 0,
    status: anyServing ? 'waiting' : 'serving',
    at: Date.now(),
  };

  try {
    await env.DB.prepare(
      `INSERT INTO tokens (id, business_id, day, no, name, village, phone, service_id, gross_weight, loss_g, net_weight, note, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        token.id,
        businessId,
        day,
        token.no,
        token.name,
        token.village,
        token.phone,
        token.serviceId,
        token.grossWeight,
        token.lossG,
        token.netWeight,
        token.note,
        token.status,
        token.at
      )
      .run();
  } catch (err) {
    await env.DB.prepare(
      `INSERT INTO tokens (id, business_id, day, no, name, village, phone, service_id, gross_weight, loss_g, net_weight, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        token.id,
        businessId,
        day,
        token.no,
        token.name,
        token.village,
        token.phone,
        token.serviceId,
        token.grossWeight,
        token.lossG,
        token.netWeight,
        token.status,
        token.at
      )
      .run();
  }

  // Auto-sync customer to Contacts / Phonebook if name provided
  if (name && name !== 'ग्राहक' && name !== 'Customer') {
    try {
      const key = normName(name);
      const vKey = normVillage(village || '');
      const cleanPhone = normalizePhone(phone);
      const found = await env.DB.prepare(
        'SELECT id, phone, village FROM customers WHERE business_id = ? AND name_key = ? AND village_key = ?'
      )
        .bind(businessId, key, vKey)
        .first();

      if (found) {
        if (!found.phone && cleanPhone) {
          await env.DB.prepare('UPDATE customers SET phone = ? WHERE id = ? AND business_id = ?')
            .bind(cleanPhone, found.id, businessId)
            .run();
        }
      } else {
        const custId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO customers (id, business_id, name, name_key, village, village_key, phone, photo, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, '', ?)`
        )
          .bind(custId, businessId, name, key, village || '', vKey, cleanPhone, Date.now())
          .run();
      }
    } catch (e) {
      console.error('Auto-create customer from token error:', e);
    }
  }

  return token;
}
