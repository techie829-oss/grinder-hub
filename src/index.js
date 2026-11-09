import { json, bad, sameOrigin } from './utils/response.js';
import { ensureSchema } from './middleware/schema.js';
import { currentBusiness } from './middleware/auth.js';
import { buildState } from './services/stateService.js';
import { signup, login, logout, changePassword } from './controllers/authController.js';
import { createJob, createPayment, deleteEntry } from './controllers/jobController.js';
import { createToken, setTokenStatus, deleteToken } from './controllers/tokenController.js';
import { customerDetail, saveCustomer, deleteCustomer } from './controllers/customerController.js';
import { saveService, deleteService } from './controllers/serviceController.js';
import { saveSettings, exportData } from './controllers/settingsController.js';
import { syncBatch } from './controllers/syncController.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('origin') || '*';
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type, cookie',
          'access-control-max-age': '86400',
        },
      });
    }
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }
    try {
      await ensureSchema(env);
      return await route(request, env, url);
    } catch (err) {
      console.error('api_failure', (err && err.stack) || String(err));
      return bad('सर्वर में गड़बड़ हुई, थोड़ी देर बाद कोशिश करें', 500);
    }
  },
};

async function route(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '') || '/api';
  const method = request.method.toUpperCase();

  // Public auth routes
  if (path === '/api/signup' && method === 'POST') return signup(request, env, url);
  if (path === '/api/login' && method === 'POST') return login(request, env, url);
  if (path === '/api/logout' && method === 'POST') return logout(request, env, url);

  // CSRF validation for state-modifying requests
  if (method !== 'GET' && !sameOrigin(request, url)) {
    return bad('अनुरोध अस्वीकार हुआ (CSRF)', 403);
  }

  // Session verification & tenant isolation
  const business = await currentBusiness(request, env);
  if (!business) return bad('लॉगिन ज़रूरी है', 401);

  const range = url.searchParams.get('range') || 'today';

  // API endpoints
  if (path === '/api/state' && method === 'GET') {
    return json({ ok: true, state: await buildState(env, business.id, range) });
  }
  if (path === '/api/sync' && method === 'POST') return syncBatch(request, env, business, range);
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
  if ((path === '/api/customers' || path === '/api/customers/save') && method === 'POST') return saveCustomer(request, env, business, range);
  if (path === '/api/customers/delete' && method === 'POST') return deleteCustomer(request, env, business, range);
  if (path === '/api/password' && method === 'POST') return changePassword(request, env, business, range);
  if (path === '/api/export' && method === 'GET') return exportData(env, business);

  return bad('रास्ता नहीं मिला', 404);
}

