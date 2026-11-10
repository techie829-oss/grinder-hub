// Token Sequence and Allocation Service
import { dayKey } from '../utils/helpers.js';

export async function nextTokenNo(env, businessId, day) {
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

export async function issueToken(env, businessId, name, village, serviceId, grossWeight = 0, totalLossG = 0, netWeight = 0, phone = '') {
  const day = dayKey();
  const no = await nextTokenNo(env, businessId, day);
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
    serviceId: serviceId || null,
    grossWeight: Number(grossWeight) || 0,
    lossG: Number(totalLossG) || 0,
    netWeight: Number(netWeight) || 0,
    status: anyServing ? 'waiting' : 'serving',
    at: Date.now(),
  };

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

  return token;
}
