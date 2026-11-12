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
      version: '2.8.3',
      versionCode: 6,
      downloadUrl: '/tolmaal.apk',
      releasedAt: Date.now(),
      changelog: [
        'टोकन बिलिंग व डिलीवरी सुधार (बिल बनने पर टोकन स्वतः साफ)',
        'पूरे हुए टोकन को 1-क्लिक में डिलीवर या साफ़ करने की सुविधा',
        'स्वचालित हिसाब गणना व ग्राहक नाम लेबल सुधार',
        'कैमरा, स्कैनर और वॉइस ऑर्डर परमिशन सुधार',
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
  if (path === '/api/settings' && method === 'POST') return saveSettings(request, env, business, range);
  if (path === '/api/entries/delete' && method === 'POST') return deleteEntry(request, env, business, range);
  if (path === '/api/customer' && method === 'GET') return customerDetail(request, env, business, url);
  if ((path === '/api/customers' || path === '/api/customers/save') && method === 'POST') return saveCustomer(request, env, business, range);
  if (path === '/api/customers/delete' && method === 'POST') return deleteCustomer(request, env, business, range);
  if (path === '/api/password' && method === 'POST') return changePassword(request, env, business, range);
  if (path === '/api/export' && method === 'GET') return exportData(env, business);

  return bad('रास्ता नहीं मिला', 404);
}

