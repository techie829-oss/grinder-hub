import { json, bad, sameOrigin } from './utils/response.js';
import { ensureSchema } from './middleware/schema.js';
import { currentBusiness } from './middleware/auth.js';
import { buildState } from './services/stateService.js';
import { signup, login, logout, changePassword } from './controllers/authController.js';
import { createJob, createPayment, deleteEntry } from './controllers/jobController.js';
import { createTrade } from './controllers/tradeController.js';
import { createToken, setTokenStatus, deleteToken } from './controllers/tokenController.js';
import { customerDetail, saveCustomer, deleteCustomer } from './controllers/customerController.js';
import { saveService, deleteService } from './controllers/serviceController.js';
import { saveProduct, deleteProduct } from './controllers/productController.js';
import { saveVillage, deleteVillage, seedDefaultVillages } from './controllers/villageController.js';
import { saveSettings, exportData, resetTokenCounter } from './controllers/settingsController.js';
import { syncBatch } from './controllers/syncController.js';
import {
  adminLogin,
  adminLogout,
  adminGetTenants,
  adminSetTenantStatus,
  adminSetTenantPlan,
  adminResetTenantPassword,
  adminImpersonateTenant,
} from './controllers/adminController.js';
import { checkStatus } from './controllers/statusController.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const isAllowedOrigin = origin && (
      origin === 'https://localhost' ||
      origin === 'capacitor://localhost' ||
      origin.startsWith('http://localhost') ||
      origin === 'https://tolmaal.solidrix.com' ||
      origin === 'https://chakkibook.solidrix.com' ||
      origin.endsWith('.solidrix.com')
    );

    if (request.method === 'OPTIONS') {
      const allowOrigin = isAllowedOrigin ? origin : (origin || '*');
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': allowOrigin,
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization, cookie, x-admin-key',
          'access-control-max-age': '86400',
        },
      });
    }
    if (!url.pathname.startsWith('/api/')) {
      if (url.pathname === '/tolmaal.apk' || url.pathname.endsWith('.apk')) {
        const assetRes = await env.ASSETS.fetch(request);
        const headers = new Headers(assetRes.headers);
        headers.set('content-type', 'application/vnd.android.package-archive');
        headers.set('content-disposition', 'attachment; filename="tolmaal.apk"');
        headers.set('cache-control', 'public, max-age=60');
        return new Response(assetRes.body, {
          status: assetRes.status,
          statusText: assetRes.statusText,
          headers,
        });
      }
      if (url.pathname === '/download') {
        const downloadPage = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TolMaal App Download — तौल-माल (Solidrix)</title>
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; display: grid; min-height: 100vh; place-items: center; padding: 20px; }
    .card { background: #fff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-width: 420px; width: 100%; padding: 28px 24px; text-align: center; border: 1px solid #e2e8f0; }
    .logo { width: 72px; height: 72px; border-radius: 18px; margin: 0 auto 16px; display: block; box-shadow: 0 4px 12px rgba(79,70,229,0.25); }
    h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    p.sub { font-size: 13.5px; color: #64748b; margin-bottom: 22px; }
    .btn-dl { display: flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 16px; font-weight: 800; padding: 15px 20px; border-radius: 14px; text-decoration: none; box-shadow: 0 6px 20px rgba(5,150,105,0.35); margin-bottom: 14px; transition: transform 0.1s ease; }
    .btn-dl:active { transform: scale(0.98); }
    .btn-mirror { display: block; font-size: 13px; font-weight: 700; color: #4f46e5; text-decoration: none; padding: 8px; margin-bottom: 20px; }
    .steps { background: #f1f5f9; border-radius: 14px; padding: 16px; text-align: left; font-size: 12.5px; color: #334155; line-height: 1.6; }
    .steps strong { color: #0f172a; display: block; margin-bottom: 8px; font-size: 13px; }
    .steps ol { padding-left: 18px; }
    .steps li { margin-bottom: 6px; }
    .safe-badge { display: inline-flex; align-items: center; gap: 6px; background: #ecfdf5; color: #047857; font-size: 11.5px; font-weight: 700; padding: 5px 10px; border-radius: 20px; margin-top: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/icon.svg" class="logo" alt="TolMaal Logo">
    <h1>तौल-माल (TolMaal)</h1>
    <p class="sub">आटा चक्की व व्यापार प्रबंधन मोबाइल ऐप (v2.8.3)</p>
    <a href="/tolmaal.apk" class="btn-dl" id="dl-btn">
      <span>📥</span> <span>अभी ऐप डाउनलोड करें (APK)</span>
    </a>
    <a href="https://tolmaal.rohitkmarch96.workers.dev/tolmaal.apk" class="btn-mirror">
      🔄 यदि डाउनलोड शुरू न हो तो यहाँ क्लिक करें (Mirror)
    </a>
    <div class="steps">
      <strong>📱 इंस्टॉल कैसे करें:</strong>
      <ol>
        <li>ऊपर दिए गए हरे बटन पर क्लिक करें।</li>
        <li>मोबाइल के <strong>Notification Bar</strong> में डाउनलोड पूरा होने पर <strong>tolmaal.apk</strong> पर टैप करें।</li>
        <li><strong>"Install"</strong> या <strong>"Update"</strong> चुनें।</li>
        <li>आपका कोई भी पुराना डेटा या हिसाब डिलीट नहीं होगा!</li>
      </ol>
    </div>
    <div class="safe-badge">
      <span>🔒 100% सुरक्षित और वायरस मुक्त</span>
    </div>
  </div>
  <script>
    // Auto trigger download after 1 second if redirected
    if (new URLSearchParams(window.location.search).has('auto')) {
      setTimeout(() => {
        window.location.href = '/tolmaal.apk';
      }, 800);
    }
  </script>
</body>
</html>`;
        return new Response(downloadPage, {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public, max-age=60',
          },
        });
      }
      const assetRes = await env.ASSETS.fetch(request);
      const headers = new Headers(assetRes.headers);
      headers.set('cache-control', 'no-cache, no-store, must-revalidate');
      return new Response(assetRes.body, {
        status: assetRes.status,
        statusText: assetRes.statusText,
        headers,
      });
    }
    try {
      await ensureSchema(env);
      const res = await route(request, env, url);
      if (isAllowedOrigin) {
        const headers = new Headers(res.headers);
        headers.set('access-control-allow-origin', origin);
        headers.set('access-control-allow-credentials', 'true');
        headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
        headers.set('access-control-allow-headers', 'content-type, authorization, cookie, x-admin-key');
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      }
      return res;
    } catch (err) {
      console.error('api_failure', (err && err.stack) || String(err));
      return bad('सर्वर में गड़बड़ हुई, थोड़ी देर बाद कोशिश करें', 500);
    }
  },
};

async function route(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '') || '/api';
  const method = request.method.toUpperCase();

  // Public auth & app info routes
  if (path === '/api/signup' && method === 'POST') return signup(request, env, url);
  if (path === '/api/login' && method === 'POST') return login(request, env, url);
  if (path === '/api/logout' && method === 'POST') return logout(request, env, url);
  if (path === '/api/status' && (method === 'GET' || method === 'POST')) return checkStatus(request, env, url);
  if (path === '/api/app-version' && method === 'GET') {
    return json({
      ok: true,
      version: '2.8.12',
      versionCode: 14,
      downloadUrl: '/tolmaal.apk',
      releasedAt: Date.now(),
      changelog: [
        'माल जमा (टोकन) और हाथों-हाथ डिलीवरी बिल के बीच स्पष्ट विभाजक व UX सुधार',
        'गलती से डायरेक्ट बिल दबने से रोकने के लिए हाई-विजिबिलिटी कार्ड व चेतावनी',
        'टोकन और कस्टमर लेजर सिंक व द्विभाषी सुधार',
      ]
    });
  }

  // Super Admin / Tenant Management routes
  if (path === '/api/admin/login' && method === 'POST') return adminLogin(request, env, url);
  if (path === '/api/admin/logout' && method === 'POST') return adminLogout(request, env, url);
  if (path === '/api/admin/tenants' && method === 'GET') return adminGetTenants(request, env);
  if (path === '/api/admin/tenants/status' && method === 'POST') return adminSetTenantStatus(request, env);
  if (path === '/api/admin/tenants/plan' && method === 'POST') return adminSetTenantPlan(request, env);
  if (path === '/api/admin/tenants/reset-password' && method === 'POST') return adminResetTenantPassword(request, env);
  if (path === '/api/admin/tenants/impersonate' && method === 'POST') return adminImpersonateTenant(request, env, url);

  // CSRF validation for state-modifying requests
  if (method !== 'GET' && !sameOrigin(request, url)) {
    return bad('अनुरोध अस्वीकार हुआ (CSRF)', 403);
  }

  // Session verification & tenant isolation
  const business = await currentBusiness(request, env);
  if (!business) return bad('लॉगिन ज़रूरी है', 401);

  if (business.status === 'suspended' && path !== '/api/state') {
    return bad('यह दुकान खाता अस्थायी रूप से निलंबित (Suspended) है। कृपया सपोर्ट से संपर्क करें।', 403);
  }

  const range = url.searchParams.get('range') || 'today';

  // API endpoints
  if (path === '/api/state' && method === 'GET') {
    return json({ ok: true, state: await buildState(env, business.id, range) });
  }
  if (path === '/api/sync' && method === 'POST') return syncBatch(request, env, business, range);
  if (path === '/api/jobs' && method === 'POST') return createJob(request, env, business, range);
  if (path === '/api/trades' && method === 'POST') return createTrade(request, env, business, range);
  if (path === '/api/payments' && method === 'POST') return createPayment(request, env, business, range);
  if (path === '/api/tokens' && method === 'POST') return createToken(request, env, business, range);
  if (path === '/api/tokens/status' && method === 'POST') return setTokenStatus(request, env, business, range);
  if (path === '/api/tokens/delete' && method === 'POST') return deleteToken(request, env, business, range);
  if (path === '/api/tokens/reset-counter' && method === 'POST') return resetTokenCounter(request, env, business, range);
  if (path === '/api/services' && method === 'POST') return saveService(request, env, business, range);
  if (path === '/api/services/delete' && method === 'POST') return deleteService(request, env, business, range);
  if (path === '/api/products' && method === 'POST') return saveProduct(request, env, business, range);
  if (path === '/api/products/delete' && method === 'POST') return deleteProduct(request, env, business, range);
  if (path === '/api/villages' && method === 'POST') return saveVillage(request, env, business, range);
  if (path === '/api/villages/delete' && method === 'POST') return deleteVillage(request, env, business, range);
  if (path === '/api/villages/seed' && method === 'POST') return seedDefaultVillages(request, env, business, range);
  if (path === '/api/settings' && method === 'POST') return saveSettings(request, env, business, range);
  if (path === '/api/entries/delete' && method === 'POST') return deleteEntry(request, env, business, range);
  if (path === '/api/customer' && method === 'GET') return customerDetail(request, env, business, url);
  if ((path === '/api/customers' || path === '/api/customers/save') && method === 'POST') return saveCustomer(request, env, business, range);
  if (path === '/api/customers/delete' && method === 'POST') return deleteCustomer(request, env, business, range);
  if (path === '/api/password' && method === 'POST') return changePassword(request, env, business, range);
  if (path === '/api/export' && method === 'GET') return exportData(env, business);

  return bad('रास्ता नहीं मिला', 404);
}

