/**
 * चक्की बुक — multi-tenant SaaS API (Cloudflare Worker + D1)
 *
 * सुरक्षा के नियम:
 *  - हर बिज़नेस का डेटा business_id से अलग रहता है; म्यूटेशन सिर्फ़ सत्र से मिले id पर।
 *  - पासवर्ड PBKDF2-SHA256 (per-business salt) से हैश होकर ही सेव होता है।
 *  - सत्र: 32-बाइट रैंडम टोकन, DB में सिर्फ़ SHA-256 हैश, httpOnly + SameSite=Lax कुकी।
 *  - बदलाव वाली हर कुकी-रीक्वेस्ट पर Origin जाँच (CSRF)।
 *  - तेज़ गलत लॉगिन को रोकने के लिए हल्की दर-सीमा।
 */

const COOKIE = 'cb_sid';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PBKDF2_ITER = 60000;
const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const UNITS = { kg: 'किलो', ltr: 'लीटर', pc: 'नग', plate: 'प्लेट' };
const RANGES = ['today', 'week', 'month', 'all'];

const enc = new TextEncoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await route(request, env, url);
    } catch (err) {
      console.error('api_failure', (err && err.stack) || String(err));
      return bad('सर्वर में गड़बड़ हुई, थोड़ी देर बाद कोशिश करें', 500);
    }
  },
};

/* ------------------------------ helpers ------------------------------ */

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

const bad = (error, status = 400) => json({ error }, status);

async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch (err) {
    return {};
  }
}

const clean = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

function normalizePhone(v) {
  const digits = String(v == null ? '' : v).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normName(v) {
  return clean(v, 60).toLowerCase();
}

function hex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function unhex(s) {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function randomBytes(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return hex(new Uint8Array(digest));
}

async function pbkdf2(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: unhex(saltHex), iterations: PBKDF2_ITER, hash: 'SHA-256' },
    key,
    256
  );
  return hex(new Uint8Array(bits));
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function dayKey(ts = Date.now()) {
  return new Date(ts + IST_OFFSET).toISOString().slice(0, 10);
}

function startOfDay(ts = Date.now()) {
  const d = new Date(ts + IST_OFFSET);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - IST_OFFSET;
}

function rangeStart(range) {
  if (range === 'week') return startOfDay() - 6 * DAY_MS;
  if (range === 'month') return startOfDay() - 29 * DAY_MS;
  if (range === 'all') return 0;
  return startOfDay();
}

function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return '';
}

function sessionCookie(token, url, maxAge) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function sameOrigin(request, url) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === url.origin;
  } catch (err) {
    return false;
  }
}

/* --------------------------- login throttle --------------------------- */

const attempts = new Map();

function throttleKey(request, phone) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  return ip + '|' + phone;
}

function blocked(key) {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.at > 10 * 60 * 1000) {
    attempts.delete(key);
    return false;
  }
  return rec.count >= 8;
}

function noteFail(key) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.at > 10 * 60 * 1000) attempts.set(key, { count: 1, at: now });
  else {
    rec.count += 1;
    rec.at = now;
  }
  if (attempts.size > 2000) attempts.clear();
}

/* ------------------------------ sessions ------------------------------ */

async function createSession(env, businessId, url) {
  const token = b64url(randomBytes(32));
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, business_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  )
    .bind(await sha256Hex(token), businessId, now, now + SESSION_TTL_MS)
    .run();
  return { token, cookie: sessionCookie(token, url, Math.floor(SESSION_TTL_MS / 1000)) };
}

async function currentBusiness(request, env) {
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

/* --------------------------- state assembly --------------------------- */

async function buildState(env, businessId, range) {
  const safeRange = RANGES.includes(range) ? range : 'today';
  const from = rangeStart(safeRange);
  const day = dayKey();

  const results = await env.DB.batch([
    env.DB.prepare(
      'SELECT id, name, unit, rate_paise, sort FROM services WHERE business_id = ? AND active = 1 ORDER BY sort, name'
    ).bind(businessId),
    env.DB.prepare(
      `SELECT c.id, c.name, c.phone, c.created_at,
              COALESCE(SUM(CASE WHEN e.kind = 'job' AND e.paid = 0 THEN e.amount_paise
                                WHEN e.kind = 'payment' THEN -e.amount_paise ELSE 0 END), 0) AS balance_paise,
              MAX(e.created_at) AS last_at
         FROM customers c
         LEFT JOIN entries e ON e.business_id = c.business_id AND e.customer_id = c.id
        WHERE c.business_id = ?
        GROUP BY c.id
        ORDER BY balance_paise DESC, last_at DESC`
    ).bind(businessId),
    env.DB.prepare(
      `SELECT e.id, e.kind, e.customer_id, e.name, e.qty, e.rate_paise, e.amount_paise,
              e.paid, e.note, e.token_no, e.created_at, s.name AS service_name, s.unit AS unit
         FROM entries e
         LEFT JOIN services s ON s.id = e.service_id AND s.business_id = e.business_id
        WHERE e.business_id = ? AND e.created_at >= ?
        ORDER BY e.created_at DESC
        LIMIT 400`
    ).bind(businessId, from),
    env.DB.prepare(
      'SELECT id, no, name, service_id, status, created_at FROM tokens WHERE business_id = ? AND day = ? ORDER BY no'
    ).bind(businessId, day),
    env.DB.prepare(
      `SELECT COUNT(CASE WHEN kind = 'job' THEN 1 END) AS jobs,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN amount_paise ELSE 0 END), 0) AS sale,
              COALESCE(SUM(CASE WHEN kind = 'job' AND paid = 1 THEN amount_paise ELSE 0 END), 0) AS cash_jobs,
              COALESCE(SUM(CASE WHEN kind = 'payment' THEN amount_paise ELSE 0 END), 0) AS recovered,
              COALESCE(SUM(CASE WHEN kind = 'job' AND paid = 0 THEN amount_paise ELSE 0 END), 0) AS credit,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN qty ELSE 0 END), 0) AS qty
         FROM entries WHERE business_id = ? AND created_at >= ?`
    ).bind(businessId, from),
    env.DB.prepare(
      `SELECT e.service_id AS id, COALESCE(s.name, 'हटाई गई सेवा') AS name, COALESCE(s.unit, 'kg') AS unit,
              COUNT(*) AS count, COALESCE(SUM(e.qty), 0) AS qty, COALESCE(SUM(e.amount_paise), 0) AS amount_paise
         FROM entries e LEFT JOIN services s ON s.id = e.service_id
        WHERE e.business_id = ? AND e.created_at >= ? AND e.kind = 'job'
        GROUP BY e.service_id
        ORDER BY amount_paise DESC`
    ).bind(businessId, from),
    env.DB.prepare('SELECT last_no FROM day_counters WHERE business_id = ? AND day = ?').bind(businessId, day),
    env.DB.prepare('SELECT id, name, phone, address, upi, note, created_at FROM businesses WHERE id = ?').bind(businessId),
  ]);

  const services = results[0].results.map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.unit,
    ratePaise: s.rate_paise,
  }));

  const customers = results[1].results.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    balancePaise: c.balance_paise || 0,
    lastAt: c.last_at || null,
  }));

  const entries = results[2].results.map((e) => ({
    id: e.id,
    kind: e.kind,
    customerId: e.customer_id,
    name: e.name || '',
    qty: e.qty,
    ratePaise: e.rate_paise,
    amountPaise: e.amount_paise,
    paid: !!e.paid,
    note: e.note || '',
    tokenNo: e.token_no,
    serviceName: e.service_name || '',
    unit: e.unit || 'kg',
    at: e.created_at,
  }));

  const tokensToday = results[3].results.map((t) => ({
    id: t.id,
    no: t.no,
    name: t.name,
    serviceId: t.service_id,
    status: t.status,
    at: t.created_at,
  }));

  const s = results[4].results[0] || {};
  const counter = results[6].results[0];
  const biz = results[7].results[0] || {};

  let outstandingPaise = 0;
  let outstandingCount = 0;
  for (const c of customers) {
    if (c.balancePaise > 0) {
      outstandingPaise += c.balancePaise;
      outstandingCount += 1;
    }
  }

  const maxTokenNo = tokensToday.reduce((m, t) => Math.max(m, t.no), 0);
  const lastNo = counter && counter.last_no ? counter.last_no : maxTokenNo;

  return {
    business: {
      id: biz.id,
      name: biz.name,
      phone: biz.phone,
      address: biz.address || '',
      upi: biz.upi || '',
      note: biz.note || '',
      since: biz.created_at,
    },
    services,
    customers,
    entries,
    tokens: {
      day,
      serving: tokensToday.find((t) => t.status === 'serving') || null,
      waiting: tokensToday.filter((t) => t.status === 'waiting'),
      done: tokensToday.filter((t) => t.status === 'done').length,
      total: tokensToday.length,
      nextNo: lastNo + 1,
    },
    stats: {
      range: safeRange,
      jobs: s.jobs || 0,
      salePaise: s.sale || 0,
      cashPaise: (s.cash_jobs || 0) + (s.recovered || 0),
      creditPaise: s.credit || 0,
      qty: s.qty || 0,
      outstandingPaise,
      outstandingCount,
      byService: results[5].results.map((r) => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        count: r.count,
        qty: r.qty,
        amountPaise: r.amount_paise,
      })),
    },
  };
}

/* ------------------------------- tokens ------------------------------- */

async function nextTokenNo(env, businessId, day) {
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

async function issueToken(env, businessId, name, serviceId) {
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
    serviceId: serviceId || null,
    status: anyServing ? 'waiting' : 'serving',
    at: Date.now(),
  };
  await env.DB.prepare(
    'INSERT INTO tokens (id, business_id, day, no, name, service_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(token.id, businessId, day, token.no, token.name, token.serviceId, token.status, token.at)
    .run();
  return token;
}

/* -------------------------------- routes ------------------------------ */

async function route(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '') || '/api';
  const method = request.method.toUpperCase();

  if (path === '/api/signup' && method === 'POST') return signup(request, env, url);
  if (path === '/api/login' && method === 'POST') return login(request, env, url);
  if (path === '/api/logout' && method === 'POST') return logout(request, env, url);

  if (method !== 'GET' && !sameOrigin(request, url)) {
    return bad('अनुरोध अस्वीकार हुआ', 403);
  }

  const business = await currentBusiness(request, env);
  if (!business) return bad('लॉगिन ज़रूरी है', 401);

  const range = url.searchParams.get('range') || 'today';

  if (path === '/api/state' && method === 'GET') {
    return json({ ok: true, state: await buildState(env, business.id, range) });
  }
  if (path === '/api/jobs' && method === 'POST') return createJob(request, env, business, range);
  if (path === '/api/payments' && method === 'POST') return createPayment(request, env, business, range);
  if (path === '/api/tokens' && method === 'POST') return createToken(request, env, business, range);
  if (path === '/api/tokens/status' && method === 'POST') return setTokenStatus(request, env, business, range);
  if (path === '/api/tokens/delete' && method === 'POST') return deleteToken(request, env, business, range);
  if (path === '/api/services' && method === 'POST') return saveService(request, env, business, range);
  if (path === '/api/services/delete' && method === 'POST') return deleteService(request, env, business, range);
  if (path === '/api/settings' && method === 'POST') return saveSettings(request, env, business, range);
  if (path === '/api/entries/delete' && method === 'POST') return deleteEntry(request, env, business, range);
  if (path === '/api/customer' && method === 'GET') return customerDetail(request, env, business, url);
  if (path === '/api/export' && method === 'GET') return exportData(env, business);

  return bad('रास्ता नहीं मिला', 404);
}

/* ---------------------------- auth handlers --------------------------- */

async function signup(request, env, url) {
  const body = await readJson(request);
  const shopName = clean(body.shopName, 60);
  const phone = normalizePhone(body.phone);
  const password = String(body.password == null ? '' : body.password);

  if (shopName.length < 2) return bad('दुकान का नाम लिखें');
  if (phone.length !== 10) return bad('10 अंकों का मोबाइल नंबर डालें');
  if (password.length < 6) return bad('पासवर्ड कम से कम 6 अक्षर रखें');

  const existing = await env.DB.prepare('SELECT id FROM businesses WHERE phone = ?').bind(phone).first();
  if (existing) return bad('यह नंबर पहले से रजिस्टर है — लॉगिन करें', 409);

  const id = crypto.randomUUID();
  const salt = hex(randomBytes(16));
  const hash = await pbkdf2(password, salt);
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO businesses (id, name, phone, address, upi, note, pass_hash, salt, created_at)
     VALUES (?, ?, ?, '', '', '', ?, ?, ?)`
  )
    .bind(id, shopName, phone, hash, salt, now)
    .run();

  const defaults = [
    ['आटा चक्की', 'kg', 800],
    ['मसाला पीसाई', 'kg', 2000],
    ['तेल घानी', 'ltr', 1500],
  ];
  await env.DB.batch(
    defaults.map(([name, unit, rate], i) =>
      env.DB.prepare(
        'INSERT INTO services (id, business_id, name, unit, rate_paise, active, sort) VALUES (?, ?, ?, ?, ?, 1, ?)'
      ).bind(crypto.randomUUID(), id, name, unit, rate, i)
    )
  );

  const session = await createSession(env, id, url);
  return json(
    { ok: true, state: await buildState(env, id, 'today') },
    200,
    { 'set-cookie': session.cookie }
  );
}

async function login(request, env, url) {
  const body = await readJson(request);
  const phone = normalizePhone(body.phone);
  const password = String(body.password == null ? '' : body.password);
  if (phone.length !== 10 || !password) return bad('मोबाइल नंबर और पासवर्ड भरें');

  const key = throttleKey(request, phone);
  if (blocked(key)) return bad('बहुत बार गलत कोशिश हुई — 10 मिनट बाद फिर आएँ', 429);

  const row = await env.DB.prepare('SELECT * FROM businesses WHERE phone = ?').bind(phone).first();
  const invalid = () => {
    noteFail(key);
    return bad('मोबाइल नंबर या पासवर्ड गलत है', 401);
  };
  if (!row) return invalid();

  const hash = await pbkdf2(password, row.salt);
  if (!safeEqual(hash, row.pass_hash)) return invalid();

  attempts.delete(key);
  await env.DB.prepare('DELETE FROM sessions WHERE business_id = ? AND expires_at < ?').bind(row.id, Date.now()).run();
  const session = await createSession(env, row.id, url);
  return json(
    { ok: true, state: await buildState(env, row.id, 'today') },
    200,
    { 'set-cookie': session.cookie }
  );
}

async function logout(request, env, url) {
  if (!sameOrigin(request, url)) return bad('अनुरोध अस्वीकार हुआ', 403);
  const token = getCookie(request, COOKIE);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', url, 0) });
}

/* --------------------------- data handlers ---------------------------- */

async function createJob(request, env, business, range) {
  const body = await readJson(request);
  const serviceId = clean(body.serviceId, 40);
  const svc = await env.DB.prepare(
    'SELECT id, name, unit, rate_paise FROM services WHERE id = ? AND business_id = ? AND active = 1'
  )
    .bind(serviceId, business.id)
    .first();
  if (!svc) return bad('सेवा चुनें');

  const qty = Number(body.qty);
  if (!Number.isFinite(qty) || qty <= 0) return bad('वज़न या मात्रा भरें');
  if (qty > 100000) return bad('मात्रा बहुत ज़्यादा है');

  let ratePaise = Math.round(Number(body.rate) * 100);
  if (!Number.isFinite(ratePaise) || ratePaise < 0) ratePaise = svc.rate_paise;
  const amountPaise = Math.round(qty * ratePaise);
  if (!(amountPaise > 0)) return bad('रकम सही नहीं है');

  const paid = body.paid ? 1 : 0;
  const name = clean(body.name, 60);
  const phone = normalizePhone(body.phone);
  const note = clean(body.note, 120);
  if (!paid && !name) return bad('उधार के लिए ग्राहक का नाम ज़रूरी है');

  let customerId = null;
  if (name) {
    const key = normName(name);
    const found = await env.DB.prepare('SELECT id, phone FROM customers WHERE business_id = ? AND name_key = ?')
      .bind(business.id, key)
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
          'INSERT INTO customers (id, business_id, name, name_key, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(customerId, business.id, name, key, phone, Date.now())
          .run();
      } catch (err) {
        const again = await env.DB.prepare(
          'SELECT id FROM customers WHERE business_id = ? AND name_key = ?'
        )
          .bind(business.id, key)
          .first();
        if (!again) throw err;
        customerId = again.id;
      }
    }
  }

  let token = null;
  if (body.withToken) {
    token = await issueToken(env, business.id, name || 'ग्राहक', svc.id);
  }

  const entryId = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO entries (id, business_id, customer_id, kind, service_id, name, qty, rate_paise,
       amount_paise, paid, note, token_no, day, created_at)
     VALUES (?, ?, ?, 'job', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(entryId, business.id, customerId, svc.id, name, qty, ratePaise, amountPaise, paid, note, token ? token.no : null, dayKey(now), now)
    .run();

  const state = await buildState(env, business.id, range);
  return json({ ok: true, entryId, token, state });
}

async function createPayment(request, env, business, range) {
  const body = await readJson(request);
  const customerId = clean(body.customerId, 40);
  const customer = await env.DB.prepare('SELECT id, name FROM customers WHERE id = ? AND business_id = ?')
    .bind(customerId, business.id)
    .first();
  if (!customer) return bad('ग्राहक नहीं मिला', 404);

  const amountPaise = Math.round(Number(body.amount) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return bad('सही रकम भरें');
  if (amountPaise > 100000000) return bad('रकम बहुत ज़्यादा है');

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO entries (id, business_id, customer_id, kind, name, amount_paise, paid, note, day, created_at)
     VALUES (?, ?, ?, 'payment', ?, ?, 1, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), business.id, customer.id, customer.name, amountPaise, clean(body.note, 120), dayKey(now), now)
    .run();

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

async function createToken(request, env, business, range) {
  const body = await readJson(request);
  const serviceId = clean(body.serviceId, 40);
  let svc = null;
  if (serviceId) {
    svc = await env.DB.prepare('SELECT id FROM services WHERE id = ? AND business_id = ? AND active = 1')
      .bind(serviceId, business.id)
      .first();
    if (!svc) return bad('सेवा नहीं मिली');
  }
  const token = await issueToken(env, business.id, clean(body.name, 60) || 'ग्राहक', svc ? svc.id : null);
  return json({ ok: true, token, state: await buildState(env, business.id, range) });
}

async function setTokenStatus(request, env, business, range) {
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

async function deleteToken(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  await env.DB.prepare('DELETE FROM tokens WHERE id = ? AND business_id = ?').bind(id, business.id).run();
  return json({ ok: true, state: await buildState(env, business.id, range) });
}

async function saveService(request, env, business, range) {
  const body = await readJson(request);
  const name = clean(body.name, 40);
  const unit = UNITS[body.unit] ? body.unit : 'kg';
  const ratePaise = Math.round(Number(body.rate) * 100);
  if (name.length < 2) return bad('सेवा का नाम लिखें');
  if (!Number.isFinite(ratePaise) || ratePaise < 0) return bad('दर सही लिखें');

  const id = clean(body.id, 40);
  if (id) {
    const existing = await env.DB.prepare('SELECT id FROM services WHERE id = ? AND business_id = ?')
      .bind(id, business.id)
      .first();
    if (!existing) return bad('सेवा नहीं मिली', 404);
    await env.DB.prepare(
      'UPDATE services SET name = ?, unit = ?, rate_paise = ?, active = ? WHERE id = ? AND business_id = ?'
    )
      .bind(name, unit, ratePaise, body.active === false ? 0 : 1, id, business.id)
      .run();
  } else {
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM services WHERE business_id = ? AND active = 1')
      .bind(business.id)
      .first();
    await env.DB.prepare(
      'INSERT INTO services (id, business_id, name, unit, rate_paise, active, sort) VALUES (?, ?, ?, ?, ?, 1, ?)'
    )
      .bind(crypto.randomUUID(), business.id, name, unit, ratePaise, count ? count.n : 0)
      .run();
  }

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

async function deleteService(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  const active = await env.DB.prepare('SELECT COUNT(*) AS n FROM services WHERE business_id = ? AND active = 1')
    .bind(business.id)
    .first();
  if (active && active.n <= 1) return bad('कम से कम एक सेवा चालू रखें');
  await env.DB.prepare('UPDATE services SET active = 0 WHERE id = ? AND business_id = ?').bind(id, business.id).run();
  return json({ ok: true, state: await buildState(env, business.id, range) });
}

async function saveSettings(request, env, business, range) {
  const body = await readJson(request);
  const name = clean(body.name, 60);
  if (name.length < 2) return bad('दुकान का नाम लिखें');
  const address = clean(body.address, 160);
  const upi = clean(body.upi, 60);
  const note = clean(body.note, 120);
  await env.DB.prepare('UPDATE businesses SET name = ?, address = ?, upi = ?, note = ? WHERE id = ?')
    .bind(name, address, upi, note, business.id)
    .run();
  return json({ ok: true, state: await buildState(env, business.id, range) });
}

async function deleteEntry(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  await env.DB.prepare('DELETE FROM entries WHERE id = ? AND business_id = ?').bind(id, business.id).run();
  return json({ ok: true, state: await buildState(env, business.id, range) });
}

async function customerDetail(request, env, business, url) {
  const id = clean(url.searchParams.get('id'), 40);
  const customer = await env.DB.prepare('SELECT id, name, phone FROM customers WHERE id = ? AND business_id = ?')
    .bind(id, business.id)
    .first();
  if (!customer) return bad('ग्राहक नहीं मिला', 404);

  const rows = await env.DB.prepare(
    `SELECT e.id, e.kind, e.qty, e.rate_paise, e.amount_paise, e.paid, e.note, e.token_no,
            e.created_at, s.name AS service_name, s.unit AS unit
       FROM entries e LEFT JOIN services s ON s.id = e.service_id AND s.business_id = e.business_id
      WHERE e.business_id = ? AND e.customer_id = ?
      ORDER BY e.created_at DESC LIMIT 200`
  )
    .bind(business.id, id)
    .all();

  return json({
    ok: true,
    customer: { id: customer.id, name: customer.name, phone: customer.phone || '' },
    entries: rows.results.map((e) => ({
      id: e.id,
      kind: e.kind,
      qty: e.qty,
      ratePaise: e.rate_paise,
      amountPaise: e.amount_paise,
      paid: !!e.paid,
      note: e.note || '',
      tokenNo: e.token_no,
      serviceName: e.service_name || '',
      unit: e.unit || 'kg',
      at: e.created_at,
    })),
  });
}

async function exportData(env, business) {
  const [biz, services, customers, entries, tokens] = await env.DB.batch([
    env.DB.prepare('SELECT id, name, phone, address, upi, note, created_at FROM businesses WHERE id = ?').bind(business.id),
    env.DB.prepare('SELECT id, name, unit, rate_paise, active FROM services WHERE business_id = ?').bind(business.id),
    env.DB.prepare('SELECT id, name, phone, created_at FROM customers WHERE business_id = ?').bind(business.id),
    env.DB.prepare('SELECT * FROM entries WHERE business_id = ? ORDER BY created_at').bind(business.id),
    env.DB.prepare('SELECT * FROM tokens WHERE business_id = ? ORDER BY day DESC, no').bind(business.id),
  ]);

  const payload = {
    app: 'chakki-book',
    exportedAt: new Date().toISOString(),
    business: biz.results[0] || null,
    services: services.results,
    customers: customers.results,
    entries: entries.results,
    tokens: tokens.results,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="chakki-book-${dayKey()}.json"`,
      'cache-control': 'no-store',
    },
  });
}
