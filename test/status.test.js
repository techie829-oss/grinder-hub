import test from 'node:test';
import assert from 'node:assert/strict';
import { checkStatus } from '../src/controllers/statusController.js';

test('Status API: Rejects missing token number', async () => {
  const req = new Request('https://chakkibook.solidrix.com/api/status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone: '9554880713' })
  });
  const env = { DB: {} };
  const res = await checkStatus(req, env, new URL(req.url));
  const data = await res.json();
  assert.equal(res.status, 400);
  assert.equal(data.ok, false);
});

test('Status API: Requires 10-digit phone number for unauthenticated lookup', async () => {
  const req = new Request('https://chakkibook.solidrix.com/api/status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 14, phone: '123' })
  });
  const env = { DB: {} };
  const res = await checkStatus(req, env, new URL(req.url));
  const data = await res.json();
  assert.equal(res.status, 400);
  assert.match(data.error, /10-अंकों का मोबाइल नंबर/);
});
