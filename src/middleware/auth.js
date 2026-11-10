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
  const cookieToken = getCookie(request, COOKIE);
  let authHeaderToken = '';
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    authHeaderToken = authHeader.slice(7).trim();
  }

  // Prioritize Bearer token (explicit client state), fallback to Cookie
  const candidateTokens = [...new Set([authHeaderToken, cookieToken].filter(Boolean))];
  if (!candidateTokens.length) return null;

  for (const token of candidateTokens) {
    const tokenHash = await sha256Hex(token);
    const row = await env.DB.prepare(
      `SELECT b.id, b.name, b.phone, b.address, b.upi, b.note,
              COALESCE(b.status, 'active') AS status,
              COALESCE(b.plan, 'free') AS plan,
              COALESCE(b.is_super_admin, 0) AS is_super_admin,
              s.token_hash
         FROM sessions s JOIN businesses b ON b.id = s.business_id
        WHERE s.token_hash = ? AND s.expires_at > ?`
    )
      .bind(tokenHash, Date.now())
      .first();

    if (row) {
      // Track last active timestamp asynchronously
      env.DB.prepare('UPDATE businesses SET last_active_at = ? WHERE id = ?')
        .bind(Date.now(), row.id)
        .run()
        .catch(() => {});

      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        address: row.address,
        upi: row.upi,
        note: row.note,
        status: row.status,
        plan: row.plan,
        isSuperAdmin: Number(row.is_super_admin) === 1,
        tokenHash: row.token_hash,
      };
    }
  }
  return null;
}

