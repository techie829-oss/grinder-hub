// Multi-tenant Authentication Controller
import { readJson, json, bad, sameOrigin, sessionCookie, getCookie, COOKIE } from '../utils/response.js';
import { clean, normalizePhone } from '../utils/helpers.js';
import { randomBytes, hex, pbkdf2, safeEqual, sha256Hex } from '../utils/crypto.js';
import { throttleKey, blocked, noteFail, clearThrottle } from '../middleware/throttle.js';
import { createSession } from '../middleware/auth.js';
import { buildState } from '../services/stateService.js';

export const DEFAULT_SERVICES = [
  { name: 'गेहूँ (Wheat)', unit: 'kg', ratePaise: 300, lossRateG: 15 },
  { name: 'मक्का (Maize)', unit: 'kg', ratePaise: 350, lossRateG: 20 },
  { name: 'चना / बेसन (Chana)', unit: 'kg', ratePaise: 400, lossRateG: 15 },
  { name: 'बाजरा (Bajra)', unit: 'kg', ratePaise: 350, lossRateG: 20 },
  { name: 'ज्वार (Jowar)', unit: 'kg', ratePaise: 350, lossRateG: 20 },
  { name: 'मसाला (Spices)', unit: 'kg', ratePaise: 2500, lossRateG: 0 },
  { name: 'सरसों तेल घानी (Mustard Oil)', unit: 'ltr', ratePaise: 1500, lossRateG: 0 },
];

export async function signup(request, env, url) {
  const body = await readJson(request);
  const shopName = clean(body.shopName, 60);
  const phone = normalizePhone(body.phone);
  const password = String(body.password == null ? '' : body.password);

  if (shopName.length < 2) return bad('दुकान का नाम लिखें');
  if (phone.length !== 10) return bad('10 अंकों का मोबाइल नंबर डालें');
  if (password.length < 6) return bad('पासवर्ड कम से कम 6 अक्षर रखें');

  const existing = await env.DB.prepare('SELECT id FROM businesses WHERE phone = ?').bind(phone).first();
  if (existing) return bad('यह नंबर पहले से रजिस्टर है — लॉगिन करें', 409);

  const businessId = crypto.randomUUID();
  const salt = hex(randomBytes(16));
  const passHash = await pbkdf2(password, salt);
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO businesses (id, name, phone, address, upi, note, pass_hash, salt, created_at)
     VALUES (?, ?, ?, '', '', '', ?, ?, ?)`
  )
    .bind(businessId, shopName, phone, passHash, salt, now)
    .run();

  await env.DB.batch(
    DEFAULT_SERVICES.map((item, index) =>
      env.DB.prepare(
        'INSERT INTO services (id, business_id, name, unit, rate_paise, loss_rate_g, active, sort) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
      ).bind(crypto.randomUUID(), businessId, item.name, item.unit, item.ratePaise, item.lossRateG, index)
    )
  );

  const session = await createSession(env, businessId, url);
  return json(
    { ok: true, token: session.token, state: await buildState(env, businessId, 'today') },
    200,
    { 'set-cookie': session.cookie }
  );
}

export async function login(request, env, url) {
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

  if (row.status === 'suspended') {
    return bad('यह दुकान खाता निलंबित (Suspended) है। कृपया प्लेटफॉर्म एडमिन से संपर्क करें।', 403);
  }

  clearThrottle(key);
  await env.DB.prepare('DELETE FROM sessions WHERE business_id = ? AND expires_at < ?').bind(row.id, Date.now()).run();
  const session = await createSession(env, row.id, url);
  return json(
    { ok: true, token: session.token, state: await buildState(env, row.id, 'today') },
    200,
    { 'set-cookie': session.cookie }
  );
}

export async function logout(request, env, url) {
  if (!sameOrigin(request, url)) return bad('अनुरोध अस्वीकार हुआ', 403);
  const token = getCookie(request, COOKIE);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', url, 0) });
}

export async function changePassword(request, env, business, range) {
  const body = await readJson(request);
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!currentPassword || !newPassword) return bad('मौजूदा और नया पासवर्ड भरें');
  if (newPassword.length < 6) return bad('नया पासवर्ड कम से कम 6 अक्षर का रखें');

  const biz = await env.DB.prepare('SELECT pass_hash, salt FROM businesses WHERE id = ?').bind(business.id).first();
  if (!biz) return bad('खाता नहीं मिला', 404);

  const hash = await pbkdf2(currentPassword, biz.salt);
  if (!safeEqual(hash, biz.pass_hash)) return bad('मौजूदा पासवर्ड गलत है', 400);

  const newSalt = hex(randomBytes(16));
  const newHash = await pbkdf2(newPassword, newSalt);
  await env.DB.prepare('UPDATE businesses SET pass_hash = ?, salt = ? WHERE id = ?')
    .bind(newHash, newSalt, business.id)
    .run();

  return json({ ok: true, state: await buildState(env, business.id, range) });
}
