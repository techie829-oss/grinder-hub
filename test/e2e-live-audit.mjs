// Comprehensive End-to-End Live System & API Audit
import assert from 'node:assert/strict';

const BASE_URL = 'https://tolmaal.solidrix.com';
const TEST_PHONE = '9554880713';
const TEST_PASS = '9554880713';

console.log('🚀 Starting TolMaal Live End-to-End Bug Audit on:', BASE_URL);

let authToken = '';
let testBizId = '';
let testCustomerId = '';
let testTokenId = '';
let testTokenNo = 0;
let testJobEntryId = '';
let testSaleEntryId = '';
let testPaymentEntryId = '';
let testPurchaseEntryId = '';

async function runAudit() {
  const results = { pass: 0, fail: 0, errors: [] };

  function check(name, fn) {
    return async () => {
      process.stdout.write(`  ⏳ ${name}... `);
      try {
        await fn();
        console.log('✅ PASS');
        results.pass++;
      } catch (err) {
        console.log('❌ FAIL');
        console.error(`     Reason: ${err.message}`);
        results.fail++;
        results.errors.push({ name, error: err.message });
      }
    };
  }

  console.log('\n--- 1. Authentication & Security Audit ---');

  await check('Login with bad credentials rejects with 401/error', async () => {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: TEST_PHONE, password: 'wrongpassword' }),
    });
    assert.equal(res.status, 401, 'Should return 401 on bad password');
    const data = await res.json();
    assert.equal(data.ok, false);
  })();

  await check('Login with valid credentials returns Bearer Token & state', async () => {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: TEST_PHONE, password: TEST_PASS }),
    });
    assert.equal(res.status, 200, 'Should return 200 OK');
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.token, 'Must return bearer token');
    authToken = data.token;
    testBizId = data.state.business.id;
    assert.ok(testBizId, 'Must return business id');
  })();

  await check('Protected endpoint rejects requests without Authorization header', async () => {
    const res = await fetch(`${BASE_URL}/api/state?range=today`);
    assert.equal(res.status, 401, 'Should return 401 Unauthorized without auth');
  })();

  await check('Protected endpoint accepts Bearer Token in Authorization header', async () => {
    const res = await fetch(`${BASE_URL}/api/state?range=today`, {
      headers: { 'authorization': `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200, 'Should return 200 OK with Bearer token');
    const data = await res.json();
    assert.ok(data.state, 'Must return state');
  })();

  console.log('\n--- 2. Business State & Data Integrity Audit ---');

  await check('State contains required structures (business, services, products, tokens, stats)', async () => {
    const res = await fetch(`${BASE_URL}/api/state?range=today`, {
      headers: { 'authorization': `Bearer ${authToken}` },
    });
    const { state } = await res.json();
    assert.ok(state.business.id, 'Business id required');
    assert.ok(Array.isArray(state.services), 'Services array required');
    assert.ok(state.services.length > 0, 'Services must not be empty');
    assert.ok(Array.isArray(state.products), 'Products array required');
    assert.ok(state.tokens, 'Tokens object required');
    assert.ok(state.stats, 'Stats object required');
    
    // Check services have ratePaise and lossRateG
    const wheatSvc = state.services.find(s => s.id === 'svc-1');
    assert.ok(wheatSvc, 'Wheat service svc-1 should exist');
    assert.ok(typeof wheatSvc.ratePaise === 'number', 'ratePaise must be numeric');
    assert.ok(typeof wheatSvc.lossRateG === 'number', 'lossRateG must be numeric');
  })();

  console.log('\n--- 3. Token Issuance & Weight/Deduction Calculation Audit ---');

  await check('Create Token with gross weight, loss rate, net weight, and phone', async () => {
    const grossWeight = 42.5;
    const lossRateG = 15;
    const totalLossG = Math.round(grossWeight * lossRateG); // 638g
    const netWeight = Math.max(0, grossWeight - (totalLossG / 1000)); // 41.862 kg
    const testPhone = '9871122334';
    const testName = 'परीक्षण रमेश';
    const testVillage = 'रामपुर टेस्ट';

    const res = await fetch(`${BASE_URL}/api/tokens`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        serviceId: 'svc-1',
        name: testName,
        village: testVillage,
        phone: testPhone,
        grossWeight,
        lossRateG,
        totalLossG,
        netWeight,
      }),
    });

    assert.equal(res.status, 200, 'Token creation should return 200');
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.token, 'Should return created token');
    testTokenId = data.token.id;
    testTokenNo = data.token.no;
    assert.ok(testTokenNo > 0, 'Token number must be > 0');
    assert.equal(data.token.grossWeight, grossWeight, 'Gross weight must match');
    assert.equal(data.token.lossG, totalLossG, 'Total loss must match');
    assert.equal(data.token.netWeight, netWeight, 'Net weight must match');
    assert.equal(data.token.phone, testPhone, 'Phone must match');

    // Verify auto-sync to customers
    const cust = (data.state.customers || []).find(c => c.name === testName);
    assert.ok(cust, 'Customer should be auto-created in contacts');
    assert.equal(cust.phone, testPhone, 'Customer phone must match');
    testCustomerId = cust.id;
  })();

  console.log('\n--- 4. Public Customer Order Status Tracking Audit ---');

  await check('Public /api/status can track token without merchant credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: testTokenNo,
        phone: '9871122334',
      }),
    });

    assert.equal(res.status, 200, 'Public status check should return 200');
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.token, 'Should return token details to customer');
    assert.equal(data.token.tokenNo || data.token.no, testTokenNo);
    assert.equal(data.token.grossWeight, 42.5);
    assert.equal(data.token.lossG, 638);
    assert.equal(data.token.netWeight, 41.862);
  })();

  console.log('\n--- 5. Token-to-Job 1-Click Billing Transition Audit ---');

  await check('Create Job from Token with decimal rate (1.20) and verify token auto-completes to done', async () => {
    const res = await fetch(`${BASE_URL}/api/jobs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        serviceId: 'svc-1',
        qty: 42.5,
        rate: 1.20, // Decimal rate e.g. 1.2
        lossRateG: 15,
        totalLossG: 638,
        netWeight: 41.862,
        paid: true,
        name: 'परीक्षण रमेश',
        village: 'रामपुर टेस्ट',
        phone: '9871122334',
        tokenId: testTokenId,
        tokenNo: testTokenNo,
      }),
    });

    assert.equal(res.status, 200, 'Job creation should return 200');
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.entryId, 'Should return created job entryId');
    testJobEntryId = data.entryId;

    // Verify token transitioned to done
    const doneTok = (data.state.tokens.doneList || []).find(t => t.id === testTokenId);
    assert.ok(doneTok, 'Token should now appear in doneList');
    assert.equal(doneTok.status, 'done');
    assert.equal(doneTok.grossWeight, 42.5);

    // Verify job entry details
    const entry = (data.state.entries || []).find(e => e.id === testJobEntryId);
    assert.ok(entry, 'Entry should exist in daily log');
    assert.equal(entry.tokenNo, testTokenNo);
    assert.equal(entry.amountPaise, Math.round(42.5 * 1.20 * 100)); // 5100 paise = ₹51.00
  })();

  console.log('\n--- 6. Trade Store Sale & Farmer Raw Material Purchase Audit ---');

  let testUdhaarCustId = '';

  await check('Record store sale on Credit (Udhaar) and verify customer ledger updates', async () => {
    const res = await fetch(`${BASE_URL}/api/trades`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        type: 'sale',
        itemName: 'शुद्ध सरसों तेल',
        unit: 'ltr',
        qty: 2.5,
        rate: 150.0,
        paid: false, // Credit
        name: 'सुरेश उधार ग्राहक',
        village: 'शाहगंज',
        phone: '9811223344',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    testSaleEntryId = data.entryId;

    // Verify customer balance reflects credit due (2.5 * 150 = 375 = 37500 paise)
    const cust = (data.state.customers || []).find(c => c.name === 'सुरेश उधार ग्राहक');
    assert.ok(cust, 'Udhaar customer must be created');
    testUdhaarCustId = cust.id;
    assert.equal(cust.balancePaise, 37500, 'Customer ledger balance must reflect ₹375 due');
  })();

  await check('Record customer payment to clear Udhaar ledger', async () => {
    const res = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        customerId: testUdhaarCustId,
        amount: 375, // Pay full ₹375
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    testPaymentEntryId = data.entryId;

    const cust = (data.state.customers || []).find(c => c.id === testUdhaarCustId);
    assert.equal(cust.balancePaise, 0, 'Customer balance should be settled to 0');
  })();

  await check('Record raw material purchase from farmer and verify cash impact', async () => {
    const res = await fetch(`${BASE_URL}/api/trades`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        type: 'purchase',
        itemName: 'गेहूँ किसान खरीद',
        unit: 'kg',
        qty: 100,
        rate: 22.5, // ₹2250 total
        paid: true, // Paid cash immediately
        name: 'रामलाल किसान',
        village: 'नसीराबाद',
        phone: '9822334455',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    testPurchaseEntryId = data.entryId;
    assert.ok(data.state.stats.purchasePaise > 0, 'Purchase paise should be recorded in stats');
  })();

  console.log('\n--- 7. Cleanup & Rollback of Test Records ---');

  await check('Delete test job, sale, payment and purchase entries cleanly', async () => {
    for (const id of [testJobEntryId, testSaleEntryId, testPaymentEntryId, testPurchaseEntryId]) {
      if (id) {
        const res = await fetch(`${BASE_URL}/api/entries/delete`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ id }),
        });
        assert.equal(res.status, 200);
      }
    }
  })();

  console.log('\n=======================================');
  console.log(`Audit Summary: Total: ${results.pass + results.fail} | Passed: ${results.pass} | Failed: ${results.fail}`);
  console.log('=======================================');

  if (results.fail > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
