import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDaySummary } from '../src/controllers/reportController.js';

test('Day Summary Controller: computes metrics for paid, unpaid, delivered, and pending', async () => {
  const business = { id: 'biz-test-123' };
  const mockTokens = [
    {
      id: 'tok-1',
      no: 1,
      name: 'रमेश (Ramesh)',
      village: 'केवलपुरवा (Kewalpurwa)',
      phone: '9876543210',
      service_id: 'svc-1',
      service_name: 'गेहूँ पिसाई',
      gross_weight: 30,
      loss_g: 300,
      net_weight: 29.7,
      status: 'delivered',
      created_at: 1731650000000,
    },
    {
      id: 'tok-2',
      no: 2,
      name: 'सुरेश (Suresh)',
      village: 'अशोगापुर (Ashogapur)',
      phone: '9876543211',
      service_id: 'svc-1',
      service_name: 'गेहूँ पिसाई',
      gross_weight: 20,
      loss_g: 200,
      net_weight: 19.8,
      status: 'waiting',
      created_at: 1731651000000,
    },
    {
      id: 'tok-3',
      no: 3,
      name: 'दिनेश (Dinesh)',
      village: 'सहजनी (Sahajani)',
      phone: '',
      service_id: 'svc-1',
      service_name: 'गेहूँ पिसाई',
      gross_weight: 25,
      loss_g: 250,
      net_weight: 24.75,
      status: 'done',
      created_at: 1731652000000,
    },
  ];

  const mockEntries = [
    {
      id: 'entry-1',
      kind: 'job',
      customer_id: 'cust-1',
      name: 'रमेश (Ramesh)',
      village: 'केवलपुरवा (Kewalpurwa)',
      item_name: '',
      gross_weight: 30,
      loss_g: 300,
      net_weight: 29.7,
      rate_paise: 300,
      amount_paise: 9000,
      paid: 1, // Paid cash!
      token_no: 1,
      created_at: 1731650500000,
      service_name: 'गेहूँ पिसाई',
      unit: 'kg',
    },
    {
      id: 'entry-2',
      kind: 'job',
      customer_id: 'cust-3',
      name: 'दिनेश (Dinesh)',
      village: 'सहजनी (Sahajani)',
      item_name: '',
      gross_weight: 25,
      loss_g: 250,
      net_weight: 24.75,
      rate_paise: 300,
      amount_paise: 7500,
      paid: 0, // Unpaid / Udhaar!
      token_no: 3,
      created_at: 1731652500000,
      service_name: 'गेहूँ पिसाई',
      unit: 'kg',
    },
    {
      id: 'entry-direct-sale',
      kind: 'sale',
      customer_id: null,
      name: 'दुकान ग्राहक',
      village: '',
      item_name: 'सरसों तेल',
      gross_weight: 1,
      loss_g: 0,
      net_weight: 1,
      rate_paise: 15000,
      amount_paise: 15000,
      paid: 1,
      token_no: null,
      created_at: 1731653000000,
      service_name: 'सरसों तेल',
      unit: 'ltr',
    },
  ];

  const env = {
    DB: {
      prepare() {
        return {
          bind() {
            return this;
          },
        };
      },
      async batch() {
        return [
          { results: mockTokens },
          { results: mockEntries },
          { results: [{ day: '2026-11-15' }] },
        ];
      },
    },
  };

  const url = new URL('https://tolmaal.solidrix.com/api/day-summary?day=2026-11-15');
  const request = new Request(url);

  const res = await getDaySummary(request, env, business, url);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.day, '2026-11-15');

  // Verify Summary KPIs:
  // Paid: token 1 (9000) + direct sale (15000) = 24000 paise (₹240)
  assert.equal(data.summary.paidCashCount, 2);
  assert.equal(data.summary.paidCashAmountPaise, 24000);

  // Unpaid: token 3 (7500 paise = ₹75)
  assert.equal(data.summary.unpaidUdhaarCount, 1);
  assert.equal(data.summary.unpaidUdhaarAmountPaise, 7500);

  // Delivered: token 1 (status 'delivered') + direct sale = 2
  assert.equal(data.summary.deliveredCount, 2);
  assert.equal(data.summary.deliveredWeightKg, 29.7);

  // Pending: token 2 ('waiting') + token 3 ('done') = 2
  assert.equal(data.summary.pendingCount, 2);
  assert.equal(data.summary.pendingWeightKg, 19.8 + 24.75);

  // Orders count: 3 tokens + 1 direct entry = 4 orders
  assert.equal(data.orders.length, 4);

  // First token should be token 1 with billed: true, isPaid: true
  const tok1 = data.orders.find((o) => o.tokenNo === 1);
  assert.equal(tok1.isBilled, true);
  assert.equal(tok1.isPaid, true);
  assert.equal(tok1.isDelivered, true);

  // Second token should be token 2 with billed: false, isPaid: null, isDelivered: false
  const tok2 = data.orders.find((o) => o.tokenNo === 2);
  assert.equal(tok2.isBilled, false);
  assert.equal(tok2.isPaid, null);
  assert.equal(tok2.isDelivered, false);

  // Third token should be token 3 with billed: true, isPaid: false (udhaar), isDelivered: false (done, not yet picked up)
  const tok3 = data.orders.find((o) => o.tokenNo === 3);
  assert.equal(tok3.isBilled, true);
  assert.equal(tok3.isPaid, false);
  assert.equal(tok3.isDelivered, false);
});
