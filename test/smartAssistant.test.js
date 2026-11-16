import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSmartQuery } from '../public/js/utils/smartAssistant.js';
import { state } from '../public/js/state.js';

test('Smart Assistant NLP Suite: Natural Hindi & Hinglish Parsing', async (t) => {
  // Mock customer state with two customers named Satish from different villages
  state.data = {
    customers: [
      { id: 'c1', name: 'सतीश (Satish)', village: 'सहजनी (Sahajani)', phone: '9876543210' },
      { id: 'c2', name: 'सतीश (Satish)', village: 'अशोगापुर (Ashogapur)', phone: '9123456780' },
      { id: 'c3', name: 'रमेश (Ramesh)', village: 'केवलपुरवा', phone: '9000000001' },
      { id: 'c4', name: 'सुरेश (Suresh)', village: 'लोनियन पुरवा', phone: '9000000002' },
    ]
  };

  await t.test('Case 1: Commodity loan - सतीश का आटा अभी पिसा नहीं था तो 1kg उधार ले गए', () => {
    const res = parseSmartQuery('सतीश का आटा अभी पिसा नहीं था तो 1kg उधार ले गए');
    assert.ok(res);
    assert.equal(res.type, 'customer_debit');
    assert.equal(res.customer.name, 'सतीश (Satish)');
    assert.equal(res.itemName, 'आटा');
    assert.equal(res.weightKg, 1);
    assert.equal(res.unit, 'kg');
    assert.equal(res.note, 'सतीश का आटा अभी पिसा नहीं था तो 1kg उधार ले गए');
  });

  await t.test('Case 2: Name + Village only - सतीश सहजनी (should open customer)', () => {
    const res = parseSmartQuery('सतीश सहजनी');
    assert.ok(res);
    assert.equal(res.type, 'open_customer');
    assert.equal(res.customer.id, 'c1');
    assert.equal(res.customer.village, 'सहजनी (Sahajani)');
  });

  await t.test('Case 3: Customer payment - सतीश सहजनी 500 जमा', () => {
    const res = parseSmartQuery('सतीश सहजनी 500 जमा');
    assert.ok(res);
    assert.equal(res.type, 'customer_credit');
    assert.equal(res.customer.id, 'c1');
    assert.equal(res.amount, 500);
  });

  await t.test('Case 4: Shop Expense - डीजल 500', () => {
    const res = parseSmartQuery('डीजल 500');
    assert.ok(res);
    assert.equal(res.type, 'expense');
    assert.equal(res.category, 'diesel');
    assert.equal(res.amount, 500);
  });

  await t.test('Case 5: Shop Expense - चाय 40', () => {
    const res = parseSmartQuery('चाय 40');
    assert.ok(res);
    assert.equal(res.type, 'expense');
    assert.equal(res.category, 'tea');
    assert.equal(res.amount, 40);
  });

  await t.test('Case 6: Customer Udhaar - रमेश को 200 दिया', () => {
    const res = parseSmartQuery('रमेश को 200 दिया');
    assert.ok(res);
    assert.equal(res.type, 'customer_debit');
    assert.equal(res.customer.id, 'c3');
    assert.equal(res.amount, 200);
  });
});
