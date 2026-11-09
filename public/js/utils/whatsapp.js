// WhatsApp Message Formatter & Dispatcher
import { state } from '../state.js';
import { inr, qtyFmt, unitOf, dateTxt, timeTxt } from './formatters.js';

export function entryWaText(entry) {
  const biz = state.data.business;
  const customer = entry.customerId ? state.data.customers.find((c) => c.id === entry.customerId) : null;
  const nameShow = customer ? customer.name : (entry.name || 'Customer');
  const villageShow = customer ? (customer.village || '') : (entry.village || '');
  const lines = [`*${biz.name}*`, `${dateTxt(entry.at)} ${timeTxt(entry.at)}`, ''];
  lines.push(`Customer: *${nameShow}*${villageShow ? ' (' + villageShow + ')' : ''}`);

  if (entry.kind === 'payment') {
    lines.push(`Payment Received: *${inr(entry.amountPaise)}*`);
  } else {
    const lossG = entry.lossG || entry.katotiG || 0;
    const netWeight = entry.netWeight != null ? entry.netWeight : entry.netQty;

    lines.push(`Product: *${entry.serviceName}*`);
    lines.push(`Gross Weight: ${qtyFmt(entry.qty)} ${unitOf(entry.unit)}`);
    if (lossG > 0 || netWeight != null) {
      lines.push(`Loss Deduction: -${lossG} g`);
      lines.push(`Net Output Flour: *${qtyFmt(netWeight)} ${unitOf(entry.unit)}*`);
    }
    lines.push(`Rate: ${inr(entry.ratePaise, true)} / ${unitOf(entry.unit)}`);
    lines.push(`Total Bill: *${inr(entry.amountPaise)}*`);
    lines.push(`Payment: ${entry.paid ? 'PAID ✓' : 'DUE (Credit)'}`);
  }

  if (entry.tokenNo) lines.push(`Token: #${entry.tokenNo}`);
  if (customer) lines.push(`Total Due Balance: *${inr(customer.balancePaise)}*`);
  if (biz.upi) lines.push(`UPI: ${biz.upi}`);
  lines.push('', 'Thank you! Visit again 🙏');
  return lines.join('\n');
}

export function openWhatsApp(text, phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const to = digits.length >= 10 ? '91' + digits.slice(-10) : '';
  window.open('https://wa.me/' + to + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
}
