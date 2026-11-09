import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inr, unitOf, qtyFmt } from '../public/js/utils/formatters.js';

describe('Chakki Book Calculations & Formatters Suite', () => {

  describe('Flour Grinding Loss & Net Weight Calculations', () => {
    function computeJob(grossWeight, rate, lossRateG) {
      const gross = Math.max(0, Number(grossWeight) || 0);
      const r = Math.max(0, Number(rate) || 0);
      const lossGPerKg = Math.max(0, Number(lossRateG) || 0);

      const totalLossG = Math.round(gross * lossGPerKg);
      const netWeight = Math.max(0, Math.round((gross - (totalLossG / 1000)) * 1000) / 1000);
      const amount = Math.round(gross * r);

      return { grossWeight: gross, totalLossG, netWeight, amount };
    }

    it('should accurately calculate standard 30kg wheat with 10g/kg loss at ₹3/kg', () => {
      const result = computeJob(30, 3, 10);
      assert.equal(result.grossWeight, 30);
      assert.equal(result.totalLossG, 300); // 30 * 10g = 300g
      assert.equal(result.netWeight, 29.7);  // 30 - 0.3kg = 29.7kg
      assert.equal(result.amount, 90);       // 30 * ₹3 = ₹90
    });

    it('should handle high loss rate like maize (20g/kg) on 50kg bag', () => {
      const result = computeJob(50, 3.5, 20);
      assert.equal(result.grossWeight, 50);
      assert.equal(result.totalLossG, 1000); // 50 * 20g = 1000g (1kg)
      assert.equal(result.netWeight, 49.0);  // 50 - 1kg = 49kg
      assert.equal(result.amount, 175);      // 50 * 3.5 = ₹175
    });

    it('should handle zero loss rate (e.g. whole spices or unlossy items)', () => {
      const result = computeJob(15, 25, 0);
      assert.equal(result.grossWeight, 15);
      assert.equal(result.totalLossG, 0);
      assert.equal(result.netWeight, 15);
      assert.equal(result.amount, 375);
    });

    it('should handle fractional/decimal weights accurately (12.350 kg)', () => {
      const result = computeJob(12.35, 4, 15);
      assert.equal(result.totalLossG, 185);
      assert.equal(result.netWeight, 12.165);
      assert.equal(result.amount, 49);
    });

    it('should safeguard against negative weights or invalid numbers', () => {
      const result = computeJob(-10, 'invalid', -5);
      assert.equal(result.amount, 0);
    });

    it('should ensure net weight never drops below zero', () => {
      const result = computeJob(0.1, 5, 2000);
      assert.ok(result.netWeight >= 0);
    });
  });

  describe('Currency & Unit Formatters', () => {
    it('should format INR currency properly from paise with symbol', () => {
      assert.equal(inr(0), '₹0');
      assert.equal(inr(9000), '₹90');
      assert.equal(inr(125000), '₹1,250');
      assert.equal(inr(-5000), '₹-50');
    });

    it('should resolve standard units or fallback to kg', () => {
      assert.equal(unitOf('kg'), 'kg');
      assert.equal(unitOf('ltr'), 'ltr');
      assert.equal(unitOf('pc'), 'pc');
      assert.equal(unitOf('unknown'), 'kg');
      assert.equal(unitOf(null), 'kg');
    });

    it('should format quantities with locale number format', () => {
      assert.equal(qtyFmt(30), '30');
      assert.equal(qtyFmt(29.7), '29.7');
      assert.equal(qtyFmt(0), '0');
    });
  });

  describe('Customer Udhaar & Ledger Logic', () => {
    it('should calculate customer total balance correctly', () => {
      const transactions = [
        { type: 'job', amount: 90, paid: false }, // credit (udhaar): +90
        { type: 'payment', amount: 50 },          // payment: -50
        { type: 'job', amount: 150, paid: true },  // cash job: balance unchanged
      ];

      const balance = transactions.reduce((acc, tx) => {
        if (tx.type === 'job' && !tx.paid) return acc + tx.amount;
        if (tx.type === 'payment') return acc - tx.amount;
        return acc;
      }, 0);

      assert.equal(balance, 40); // 90 - 50 = 40 remaining udhaar
    });
  });

});
