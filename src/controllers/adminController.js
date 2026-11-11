// Super Admin & Multi-Tenant Management Controller
import { json, bad, readJson, getCookie, sessionCookie, adminSessionCookie, COOKIE, ADMIN_COOKIE } from '../utils/response.js';
import { randomBytes, hex, pbkdf2, safeEqual, sha256Hex } from '../utils/crypto.js';
import { createSession } from '../middleware/auth.js';
import { buildState } from '../services/stateService.js';

const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function isSuperAdmin(request, env) {
  const masterKey = env.SUPER_ADMIN_KEY || 'chakki_admin_2026';

  // Check 1: Header x-admin-key
  const headerKey = request.headers.get('x-admin-key');
  if (headerKey && headerKey === masterKey) return true;

  // Check 2: Admin cookie cb_adm
  const token = getCookie(request, ADMIN_COOKIE);
  if (token) {
    const tokenHash = await sha256Hex(token);
    const row = await env.DB.prepare(
      'SELECT business_id FROM sessions WHERE token_hash = ? AND expires_at > ?'
    ).bind(tokenHash, Date.now()).first();
    if (row && (row.business_id === 'SUPER_ADMIN' || row.business_id.startsWith('ADMIN:'))) {
      return true;
    }
  }

  // Check 3: Current logged in business is flagged as is_super_admin = 1
  const bizToken = getCookie(request, COOKIE);
  if (bizToken) {
    const bizTokenHash = await sha256Hex(bizToken);
    const row = await env.DB.prepare(
      `SELECT b.is_super_admin FROM sessions s JOIN businesses b ON b.id = s.business_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    ).bind(bizTokenHash, Date.now()).first();
    if (row && Number(row.is_super_admin) === 1) {
      return true;
    }
  }

  return false;
}

export async function adminLogin(request, env, url) {
  const body = await readJson(request);
  const masterKeyInput = String(body.masterKey || body.key || '').trim();
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');
  const masterKey = env.SUPER_ADMIN_KEY || 'chakki_admin_2026';

  let authenticated = false;
  let adminIdentity = 'SUPER_ADMIN';

  // Authenticate by master key
  if (masterKeyInput && masterKeyInput === masterKey) {
    authenticated = true;
  } else if (phone && password) {
    // Authenticate by super admin business phone + password
    const biz = await env.DB.prepare(
      'SELECT id, pass_hash, salt, is_super_admin FROM businesses WHERE phone = ?'
    ).bind(phone).first();
    if (biz && Number(biz.is_super_admin) === 1) {
      const hash = await pbkdf2(password, biz.salt);
      if (safeEqual(hash, biz.pass_hash)) {
        authenticated = true;
        adminIdentity = `ADMIN:${biz.id}`;
      }
    }
  }

  if (!authenticated) {
    return bad('गलत मास्टर की या सुपर एडमिन पासवर्ड', 401);
  }

  // Generate secure admin session
  const token = hex(randomBytes(32));
  const tokenHash = await sha256Hex(token);
  const now = Date.now();

  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, business_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  )
    .bind(tokenHash, adminIdentity, now, now + ADMIN_SESSION_TTL_MS)
    .run();

  return json(
    { ok: true, message: 'सुपर एडमिन सत्यापित हुआ' },
    200,
    { 'set-cookie': adminSessionCookie(token, url, Math.floor(ADMIN_SESSION_TTL_MS / 1000)) }
  );
}

export async function adminLogout(request, env, url) {
  const token = getCookie(request, ADMIN_COOKIE);
  const headerToken = request.headers.get('x-admin-key') || '';
  const tokens = [...new Set([token, headerToken].filter(Boolean))];
  for (const t of tokens) {
    try {
      const tokenHash = await sha256Hex(t);
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    } catch (_) {}
  }
  return json(
    { ok: true, message: 'लॉगआउट सफल' },
    200,
    { 'set-cookie': adminSessionCookie('', url, 0) },
    request
  );
}

export async function adminGetTenants(request, env) {
  const isAuth = await isSuperAdmin(request, env);
  if (!isAuth) return bad('सुपर एडमिन एक्सेस अस्वीकृत (Unauthorized)', 401);

  // Platform metrics aggregation
  const [tenantStats, entryStats, tokenStats, custStats] = await env.DB.batch([
    env.DB.prepare(`
      SELECT 
        COUNT(*) AS total_tenants,
        COUNT(CASE WHEN status != 'suspended' THEN 1 END) AS active_tenants,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) AS suspended_tenants,
        COUNT(CASE WHEN plan = 'pro' THEN 1 END) AS pro_tenants
      FROM businesses
    `),
    env.DB.prepare(`
      SELECT 
        COUNT(CASE WHEN kind = 'job' THEN 1 END) AS total_jobs,
        COALESCE(SUM(gross_weight), 0) AS total_weight_kg,
        COALESCE(SUM(loss_g), 0) AS total_loss_g,
        COALESCE(SUM(amount_paise), 0) AS total_revenue_paise
      FROM entries
    `),
    env.DB.prepare('SELECT COUNT(*) AS total_tokens FROM tokens'),
    env.DB.prepare('SELECT COUNT(*) AS total_customers FROM customers')
  ]);

  const tMetrics = tenantStats.results[0] || {};
  const eMetrics = entryStats.results[0] || {};
  const tokMetrics = tokenStats.results[0] || {};
  const cMetrics = custStats.results[0] || {};

  // Fetch full tenant list with operational statistics
  const tenantsQuery = await env.DB.prepare(`
    SELECT 
      b.id,
      b.name,
      b.phone,
      b.address,
      b.upi,
      COALESCE(b.status, 'active') AS status,
      COALESCE(b.plan, 'free') AS plan,
      COALESCE(b.is_super_admin, 0) AS is_super_admin,
      b.created_at,
      COALESCE(b.last_active_at, 0) AS last_active_at,
      (SELECT COUNT(*) FROM customers c WHERE c.business_id = b.id) AS customer_count,
      (SELECT COUNT(*) FROM tokens t WHERE t.business_id = b.id) AS token_count,
      (SELECT COUNT(*) FROM entries e WHERE e.business_id = b.id AND e.kind = 'job') AS job_count,
      (SELECT COALESCE(SUM(e.gross_weight), 0) FROM entries e WHERE e.business_id = b.id AND e.kind = 'job') AS total_weight_kg,
      (SELECT COALESCE(SUM(e.amount_paise), 0) FROM entries e WHERE e.business_id = b.id AND e.kind = 'job') AS total_revenue_paise
    FROM businesses b
    ORDER BY b.created_at DESC
  `).all();

  const tenants = (tenantsQuery.results || []).map((t) => ({
    id: t.id,
    name: t.name,
    phone: t.phone,
    address: t.address || '',
    upi: t.upi || '',
    status: t.status || 'active',
    plan: t.plan || 'free',
    isSuperAdmin: Number(t.is_super_admin) === 1,
    createdAt: t.created_at,
    lastActiveAt: t.last_active_at || t.created_at,
    customerCount: Number(t.customer_count) || 0,
    tokenCount: Number(t.token_count) || 0,
    jobCount: Number(t.job_count) || 0,
    totalWeightKg: Number(t.total_weight_kg) || 0,
    totalRevenuePaise: Number(t.total_revenue_paise) || 0,
  }));

  return json({
    ok: true,
    metrics: {
      totalTenants: Number(tMetrics.total_tenants) || 0,
      activeTenants: Number(tMetrics.active_tenants) || 0,
      suspendedTenants: Number(tMetrics.suspended_tenants) || 0,
      proTenants: Number(tMetrics.pro_tenants) || 0,
      totalJobs: Number(eMetrics.total_jobs) || 0,
      totalWeightKg: Number(eMetrics.total_weight_kg) || 0,
      totalLossG: Number(eMetrics.total_loss_g) || 0,
      totalRevenuePaise: Number(eMetrics.total_revenue_paise) || 0,
      totalTokens: Number(tokMetrics.total_tokens) || 0,
      totalCustomers: Number(cMetrics.total_customers) || 0,
    },
    tenants,
  });
}

export async function adminSetTenantStatus(request, env) {
  const isAuth = await isSuperAdmin(request, env);
  if (!isAuth) return bad('सुपर एडमिन एक्सेस अस्वीकृत', 401);

  const body = await readJson(request);
  const businessId = String(body.businessId || '').trim();
  const status = String(body.status || '').trim().toLowerCase();

  if (!businessId) return bad('दुकान आईडी ज़रूरी है');
  if (!['active', 'suspended'].includes(status)) return bad('मान्य स्टेटस: active या suspended');

  await env.DB.prepare('UPDATE businesses SET status = ? WHERE id = ?').bind(status, businessId).run();

  // If suspending, terminate active sessions immediately
  if (status === 'suspended') {
    await env.DB.prepare('DELETE FROM sessions WHERE business_id = ?').bind(businessId).run().catch(() => {});
  }

  return json({ ok: true, businessId, status, message: `दुकान स्टेटस अपडेट: ${status}` });
}

export async function adminSetTenantPlan(request, env) {
  const isAuth = await isSuperAdmin(request, env);
  if (!isAuth) return bad('सुपर एडमिन एक्सेस अस्वीकृत', 401);

  const body = await readJson(request);
  const businessId = String(body.businessId || '').trim();
  const plan = String(body.plan || '').trim().toLowerCase();

  if (!businessId) return bad('दुकान आईडी ज़रूरी है');
  if (!['free', 'pro', 'enterprise'].includes(plan)) return bad('मान्य प्लान: free, pro, enterprise');

  await env.DB.prepare('UPDATE businesses SET plan = ? WHERE id = ?').bind(plan, businessId).run();
  return json({ ok: true, businessId, plan, message: `दुकान प्लान अपडेट: ${plan}` });
}

export async function adminResetTenantPassword(request, env) {
  const isAuth = await isSuperAdmin(request, env);
  if (!isAuth) return bad('सुपर एडमिन एक्सेस अस्वीकृत', 401);

  const body = await readJson(request);
  const businessId = String(body.businessId || '').trim();
  const newPassword = String(body.newPassword || '').trim();

  if (!businessId) return bad('दुकान आईडी ज़रूरी है');
  if (newPassword.length < 6) return bad('नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए');

  const salt = hex(randomBytes(16));
  const passHash = await pbkdf2(newPassword, salt);

  await env.DB.prepare('UPDATE businesses SET pass_hash = ?, salt = ? WHERE id = ?')
    .bind(passHash, salt, businessId)
    .run();

  // Invalidate previous sessions so user logs in with new credentials
  await env.DB.prepare('DELETE FROM sessions WHERE business_id = ?').bind(businessId).run().catch(() => {});

  return json({ ok: true, businessId, message: 'पासवर्ड सफलतापूर्वक बदल दिया गया' });
}

export async function adminImpersonateTenant(request, env, url) {
  const isAuth = await isSuperAdmin(request, env);
  if (!isAuth) return bad('सुपर एडमिन एक्सेस अस्वीकृत', 401);

  const body = await readJson(request);
  const businessId = String(body.businessId || '').trim();
  if (!businessId) return bad('दुकान आईडी ज़रूरी है');

  const biz = await env.DB.prepare('SELECT id, name FROM businesses WHERE id = ?').bind(businessId).first();
  if (!biz) return bad('दुकान नहीं मिली', 404);

  // Generate standard session cookie for target business
  const session = await createSession(env, businessId, url);
  const targetState = await buildState(env, businessId, 'today');

  return json(
    { ok: true, impersonated: true, businessId, shopName: biz.name, state: targetState },
    200,
    { 'set-cookie': session.cookie }
  );
}

