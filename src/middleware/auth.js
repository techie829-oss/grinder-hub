import { getCookie, sessionCookie, COOKIE, SESSION_TTL_MS } from '../utils/response.js';
import { b64url, randomBytes, sha256Hex } from '../utils/crypto.js';

export async function createSession(env, businessId, url) {
  const token = b64url(randomBytes(32));
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, business_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  )
    .bind(await sha256Hex(token), businessId, now, now + SESSION_TTL_MS)
    .run();
  return { token, cookie: sessionCookie(token, url, Math.floor(SESSION_TTL_MS / 1000)) };
}

export async function currentBusiness(request, env) {
  const token = getCookie(request, COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT b.id, b.name, b.phone, b.address, b.upi, b.note, s.token_hash
       FROM sessions s JOIN businesses b ON b.id = s.business_id
      WHERE s.token_hash = ? AND s.expires_at > ?`
  )
    .bind(await sha256Hex(token), Date.now())
    .first();
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    upi: row.upi,
    note: row.note,
    tokenHash: row.token_hash,
  };
}

