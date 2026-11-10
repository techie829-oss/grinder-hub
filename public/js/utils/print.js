// Thermal Printer Receipt Generator
import { state, printEl } from '../state.js';
import { esc, inr, qtyFmt, unitOf, dateTxt, timeTxt } from './formatters.js';
import qrcode from '../vendor/qrcode.js';

export function createQrSvg(text, cellSize = 3.2, margin = 0) {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(String(text));
    qr.make();
    return qr.createSvgTag(cellSize, margin);
  } catch (err) {
    console.error('Failed to generate QR code SVG:', err);
    return '';
  }
}

export function printReceipt(entry) {
  if (!entry) return;
  const biz = state.data?.business || { name: 'तौल-माल' };
  const customer = entry.customerId ? state.data.customers.find((c) => c.id === entry.customerId) : null;
  const balance = customer ? customer.balancePaise : null;
  const isPayment = entry.kind === 'payment';
  const note = biz.note || 'Thank you! Visit again 🙏';
  const nameShow = customer ? customer.name : (entry.name || 'Customer');
  const villageShow = customer ? (customer.village || '') : (entry.village || '');

  const lossG = entry.lossG || 0;
  const netWeight = entry.netWeight;
  const hasLoss = !isPayment && (lossG > 0 || netWeight != null);

  printEl.innerHTML = `
    <div class="receipt">
      <div class="r-shop">${esc(biz.name)}</div>
      ${biz.address ? `<div class="r-sub">${esc(biz.address)}</div>` : ''}
      ${biz.phone ? `<div class="r-sub">${esc(biz.phone)}</div>` : ''}
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
      ${entry.tokenNo ? `
      <div style="text-align:center;margin:10px auto;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="display:inline-block;background:#fff;padding:4px;border:1px solid #cbd5e1;border-radius:6px;">
          ${createQrSvg(`TOKEN:${entry.tokenNo}`, 2.8, 0)}
        </div>
        <div style="font-size:10px;font-weight:750;color:#0f172a;margin-top:3px;">TOKEN #${entry.tokenNo}</div>
      </div>` : ''}
      <div class="r-line"></div>
      ${biz.upi ? `<div class="r-sub">UPI: ${esc(biz.upi)}</div>` : ''}
      <div class="r-thanks">${esc(note)}</div>
    </div>`;
  window.print();
}

export function printTokenReceipt(tokenRow) {
  if (!tokenRow) return;
  const biz = state.data?.business || { name: 'तौल-माल (TolMaal)' };
  const svc = tokenRow.serviceId ? state.data.services.find((s) => s.id === tokenRow.serviceId) : null;
  const svcName = svc ? svc.name : (tokenRow.serviceName || 'सुविधा / सेवा');
  const unit = svc ? unitOf(svc.unit) : 'kg';
  const gross = tokenRow.grossWeight || 0;
  const lossG = tokenRow.lossG || 0;
  const net = tokenRow.netWeight || gross;

  printEl.innerHTML = `
    <div class="receipt">
      <div class="r-shop">${esc(biz.name)}</div>
      ${biz.address ? `<div class="r-sub">${esc(biz.address)}</div>` : ''}
      ${biz.phone ? `<div class="r-sub">Ph: ${esc(biz.phone)}</div>` : ''}
      <div class="r-line"></div>
      <div style="text-align:center;font-size:13px;font-weight:750;margin:2px 0;">टोकन पर्ची (TOKEN SLIP)</div>
      <div style="text-align:center;font-size:32px;font-weight:900;letter-spacing:1px;margin:4px 0;line-height:1;">#${tokenRow.no}</div>
      <div class="r-line"></div>
      <div class="r-row"><span>तारीख व समय</span><span>${dateTxt(tokenRow.at)} ${timeTxt(tokenRow.at)}</span></div>
      <div class="r-row"><span>ग्राहक</span><span>${esc(tokenRow.name)}${tokenRow.village ? ' (' + esc(tokenRow.village) + ')' : ''}</span></div>
      ${tokenRow.phone ? `<div class="r-row"><span>मोबाइल</span><span>${esc(tokenRow.phone)}</span></div>` : ''}
      <div class="r-row"><span>सामग्री / सेवा</span><span>${esc(svcName)}</span></div>
      <div class="r-line"></div>
      ${gross > 0 ? `<div class="r-row"><span>कुल आवक वजन</span><span>${qtyFmt(gross)} ${unit}</span></div>` : ''}
      ${lossG > 0 ? `<div class="r-row"><span>काट / घटौती</span><span>-${lossG} g</span></div>` : ''}
      ${net > 0 ? `<div class="r-row" style="font-size:13.5px;font-weight:800;"><span>शुद्ध वापसी माल</span><span>${qtyFmt(net)} ${unit}</span></div>` : ''}
      <div class="r-line"></div>

      <!-- Scannable Token QR Code -->
      <div style="text-align:center;margin:8px auto;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="display:inline-block;background:#fff;padding:6px;border-radius:8px;border:1px solid #000;">
          ${createQrSvg(`TOKEN:${tokenRow.no}`, 3.5, 0)}
        </div>
        <div style="font-size:12px;font-weight:850;color:#000;margin-top:4px;letter-spacing:0.5px;">TOKEN #${tokenRow.no}</div>
        <div style="font-size:10px;color:#334155;margin-top:2px;">कैमरे से QR स्कैन कर लाइव स्टेटस देखें</div>
      </div>

      <div class="r-line"></div>
      <div class="r-thanks" style="text-align:center;margin-top:6px;">सामान लेते समय यह पर्ची दिखाएं। धन्यवाद!</div>
    </div>`;
  window.print();
}
