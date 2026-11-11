import test from 'node:test';
import assert from 'node:assert/strict';
import { isSuperAdmin } from '../src/controllers/adminController.js';

test('Super Admin Auth: Rejects requests without credentials', async () => {
  const req = new Request('https://chakkibook.solidrix.com/api/admin/tenants', {
    method: 'GET',
    headers: {}
  });
  const env = { SUPER_ADMIN_KEY: 'test_master_key_123', DB: {} };
  const auth = await isSuperAdmin(req, env);
  assert.equal(auth, false, 'Should be unauthenticated');
});

test('Super Admin Auth: Accepts request with valid x-admin-key header', async () => {
  const req = new Request('https://chakkibook.solidrix.com/api/admin/tenants', {
    method: 'GET',
    headers: { 'x-admin-key': 'test_master_key_123' }
  });
  const env = { SUPER_ADMIN_KEY: 'test_master_key_123', DB: {} };
  const auth = await isSuperAdmin(req, env);
  assert.equal(auth, true, 'Should be authenticated via master key');
});

test('Super Admin Auth: Rejects request with invalid x-admin-key header', async () => {
  const req = new Request('https://chakkibook.solidrix.com/api/admin/tenants', {
    method: 'GET',
    headers: { 'x-admin-key': 'wrong_key' }
  });
  const env = { SUPER_ADMIN_KEY: 'test_master_key_123', DB: {} };
  const auth = await isSuperAdmin(req, env);
  assert.equal(auth, false, 'Should be rejected with wrong key');
});

test('Session Cookie Expiration: Emits Max-Age=0 and 1970 date on logout', async () => {
  const { sessionCookie, COOKIE } = await import('../src/utils/response.js');
  const cookie = sessionCookie('', new URL('https://tolmaal.solidrix.com'), 0);
  assert.match(cookie, new RegExp(`^${COOKIE}=`));
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
});

