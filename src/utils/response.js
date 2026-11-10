export const COOKIE = 'cb_sid';
export const ADMIN_COOKIE = 'cb_adm';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const SECURITY_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, no-cache, must-revalidate',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

export function json(data, status = 200, extraHeaders = {}, request = null) {
  let cors = {};
  if (request) {
    const origin = request.headers.get('origin');
    if (origin && (origin === 'https://localhost' || origin === 'capacitor://localhost' || origin.startsWith('http://localhost'))) {
      cors = {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type, cookie',
      };
    }
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      ...cors,
      ...extraHeaders,
    },
  });
}

export const bad = (error, status = 400, extraHeaders = {}, request = null) => json({ error, ok: false }, status, extraHeaders, request);

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch (err) {
    return {};
  }
}

export function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return '';
}

export function sessionCookie(token, url, maxAge) {
  const secure = url.protocol === 'https:' ? '; Secure; SameSite=None' : '; SameSite=Lax';
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; Max-Age=${maxAge}`;
}

export function adminSessionCookie(token, url, maxAge = 7 * 24 * 3600) {
  const secure = url.protocol === 'https:' ? '; Secure; SameSite=None' : '; SameSite=Lax';
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; Max-Age=${maxAge}`;
}

export function sameOrigin(request, url) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (
    origin === 'https://localhost' ||
    origin === 'capacitor://localhost' ||
    origin.startsWith('http://localhost')
  ) {
    return true;
  }
  try {
    return new URL(origin).origin === url.origin;
  } catch (err) {
    return false;
  }
}

