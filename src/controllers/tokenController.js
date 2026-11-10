// Queue and Token Management Controller
import { readJson, json, bad } from '../utils/response.js';
import { clean } from '../utils/helpers.js';
import { issueToken } from '../services/tokenService.js';
import { buildState } from '../services/stateService.js';

export async function createToken(request, env, business, range) {
  const body = await readJson(request);
  const serviceId = clean(body.serviceId, 40);
  let svc = null;
  if (serviceId) {
    svc = await env.DB.prepare(
      'SELECT id, unit, rate_paise, COALESCE(loss_rate_g, 0) AS loss_rate_g FROM services WHERE id = ? AND business_id = ? AND active = 1'
    )
      .bind(serviceId, business.id)
      .first();
    if (!svc) return bad('सेवा नहीं मिली');
  }

  const name = clean(body.name, 60);
  const village = clean(body.village, 60);
  const phone = body.phone ? String(body.phone).replace(/\D/g, '').slice(-10) : '';
  const grossWeight = Number(body.grossWeight != null ? body.grossWeight : body.qty) || 0;
  const lossRateG = body.lossRateG !== undefined ? Number(body.lossRateG) : (svc ? Number(svc.loss_rate_g || 0) : 0);
  const totalLossG = body.totalLossG !== undefined ? Number(body.totalLossG) : (grossWeight ? Math.round(grossWeight * lossRateG) : 0);
  const netWeight = body.netWeight !== undefined ? Number(body.netWeight) : (grossWeight ? Math.max(0, grossWeight - (totalLossG / 1000)) : 0);

  const token = await issueToken(env, business.id, name || 'ग्राहक', village || '', svc ? svc.id : null, grossWeight, totalLossG, netWeight, phone);
  return json({ ok: true, token, state: await buildState(env, business.id, range) });
}

export async function setTokenStatus(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  const status = clean(body.status, 12);
  if (!['serving', 'waiting', 'done'].includes(status)) return bad('गलत स्थिति');

  const token = await env.DB.prepare('SELECT id, day, no FROM tokens WHERE id = ? AND business_id = ?')
    .bind(id, business.id)
    .first();
  if (!token) return bad('टोकन नहीं मिला', 404);

  const statements = [];
  if (status === 'serving') {
    statements.push(
      env.DB.prepare(
        "UPDATE tokens SET status = 'waiting' WHERE business_id = ? AND day = ? AND status = 'serving' AND id <> ?"
      ).bind(business.id, token.day, id)
    );
  }
  statements.push(
    env.DB.prepare('UPDATE tokens SET status = ? WHERE id = ? AND business_id = ?').bind(status, id, business.id)
  );
  await env.DB.batch(statements);

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

export async function deleteToken(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  await env.DB.prepare('DELETE FROM tokens WHERE id = ? AND business_id = ?').bind(id, business.id).run();
  return json({ ok: true, state: await buildState(env, business.id, range) });
}
