// Thermal Printer Receipt Generator
import { state, printEl } from '../state.js';
import { esc, inr, qtyFmt, unitOf, dateTxt, timeTxt } from './formatters.js';

export function printReceipt(entry) {
  if (!entry) return;
  const biz = state.data.business;
  const customer = entry.customerId ? state.data.customers.find((c) => c.id === entry.customerId) : null;
  const balance = customer ? customer.balancePaise : null;
  const isPayment = entry.kind === 'payment';
  const note = biz.note || 'Thank you! Visit again 🙏';
  const nameShow = customer ? customer.name : (entry.name || 'Customer');
  const villageShow = customer ? (customer.village || '') : (entry.village || '');

  const lossG = entry.lossG || entry.katotiG || 0;
  const netWeight = entry.netWeight != null ? entry.netWeight : entry.netQty;
  const hasLoss = !isPayment && (lossG > 0 || netWeight != null);

  printEl.innerHTML = `
    <div class="receipt">
      <div class="r-shop">${esc(biz.name)}</div>
      ${biz.address ? `<div class="r-sub">${esc(biz.address)}</div>` : ''}
      <div class="r-sub">${esc(biz.phone)}</div>
      <div class="r-line"></div>
      <div class="r-row"><span>Date</span><span>${dateTxt(entry.at)} ${timeTxt(entry.at)}</span></div>
      ${entry.tokenNo ? `<div class="r-row"><span>Token</span><span>#${entry.tokenNo}</span></div>` : ''}
      <div class="r-row"><span>Customer</span><span>${esc(nameShow)}${villageShow ? ' (' + esc(villageShow) + ')' : ''}</span></div>
      <div class="r-line"></div>
      ${isPayment
        ? `<div class="r-row"><span>Payment Received</span><span>${inr(entry.amountPaise)}</span></div>`
        : `<div class="r-row"><span>Product / Service</span><span>${esc(entry.serviceName)}</span></div>
           <div class="r-row"><span>Gross Weight</span><span>${qtyFmt(entry.qty)} ${unitOf(entry.unit)}</span></div>
           ${hasLoss ? `
           <div class="r-row"><span>Loss / Wastage</span><span>-${lossG} g</span></div>
           <div class="r-row"><span>Net Output Flour</span><span><strong>${qtyFmt(netWeight)} ${unitOf(entry.unit)}</strong></span></div>
           ` : ''}
           <div class="r-row"><span>Rate</span><span>${inr(entry.ratePaise, true)} / ${unitOf(entry.unit)}</span></div>
           <div class="r-total r-row"><span>Total Bill</span><span>${inr(entry.amountPaise)}</span></div>
           <div class="r-row"><span>Status</span><span>${entry.paid ? 'PAID (Cash)' : 'DUE (Credit)'}</span></div>`}
      ${balance != null ? `<div class="r-row"><span>Total Due Balance</span><span>${inr(balance)}</span></div>` : ''}
      ${entry.note ? `<div class="r-row"><span>Note</span><span>${esc(entry.note)}</span></div>` : ''}
      <div class="r-line"></div>
      ${biz.upi ? `<div class="r-sub">UPI: ${esc(biz.upi)}</div>` : ''}
      <div class="r-thanks">${esc(note)}</div>
    </div>`;
  window.print();
}
