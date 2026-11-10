// Reusable List Row & Card Components
import { state } from '../state.js';
import { esc, inr, qtyFmt, unitOf, dateTxt, timeTxt, relTxt, emptyBlock } from '../utils/formatters.js';
import { t } from '../i18n.js';

export function entryRow(entry, options = {}) {
  const delBtn = options.del
    ? `<button type="button" class="icon-btn" data-act="del-entry" data-id="${entry.id}" aria-label="Delete">✕</button>`
    : '';

  if (entry.kind === 'payment') {
    return `
    <div class="row-item">
      <span class="avatar small pay">₹</span>
      <span class="grow">
        <span class="row-title" style="display:flex;align-items:center;gap:6px;">
          <span>💵 भुगतान मिला</span>
        </span>
        <span class="row-sub">${esc(entry.name || 'Customer')}${entry.village ? ' (' + esc(entry.village) + ')' : ''} · ${dateTxt(entry.at)} · ${timeTxt(entry.at)}</span>
      </span>
      <span class="row-amt amt-plus">+${inr(entry.amountPaise)}</span>
      ${delBtn}
    </div>`;
  }

  if (entry.kind === 'sale') {
    return `
    <div class="row-item">
      <span class="avatar small" style="background:#ecfdf5;color:#059669;font-weight:700;">🛒</span>
      <span class="grow">
        <span class="row-title ellipsis">
          <strong>${esc(entry.serviceName || entry.itemName || 'माल बिक्री')}</strong> · ${qtyFmt(entry.grossWeight)} ${unitOf(entry.unit)}
        </span>
        <span class="row-sub">${esc(entry.name || 'नकद ग्राहक')}${entry.village ? ' (' + esc(entry.village) + ')' : ''} · ${dateTxt(entry.at)}</span>
      </span>
      <span class="badge ${entry.paid ? 'green' : 'amber'}">${entry.paid ? 'नकद बिक्री' : 'उधार बिक्री'}</span>
      <span class="row-amt">${inr(entry.amountPaise)}</span>
      ${delBtn}
    </div>`;
  }

  if (entry.kind === 'purchase') {
    return `
    <div class="row-item">
      <span class="avatar small" style="background:#fffbeb;color:#d97706;font-weight:700;">📥</span>
      <span class="grow">
        <span class="row-title ellipsis">
          <strong>${esc(entry.serviceName || entry.itemName || 'फसल खरीद')}</strong> · ${qtyFmt(entry.grossWeight)} ${unitOf(entry.unit)}
        </span>
        <span class="row-sub">${esc(entry.name || 'किसान/सप्लायर')}${entry.village ? ' (' + esc(entry.village) + ')' : ''} · ${dateTxt(entry.at)}</span>
      </span>
      <span class="badge" style="background:${entry.paid ? '#eff6ff;color:#2563eb' : '#f5f3ff;color:#7c3aed'}">${entry.paid ? 'नकद दिया' : 'खाते में जमा'}</span>
      <span class="row-amt" style="color:#d97706;">-${inr(entry.amountPaise)}</span>
      ${delBtn}
    </div>`;
  }

  const lossG = entry.lossG || 0;
  const netWeight = entry.netWeight;
  const lossDetail = (lossG > 0 || netWeight != null)
    ? `<span class="tiny-chip" style="background:#fff7ed;color:#ea580c">-${lossG}g</span>` +
      (netWeight ? `<span class="tiny-chip" style="background:#f0fdf4;color:#16a34a">${qtyFmt(netWeight)} ${unitOf(entry.unit)}</span>` : '')
    : '';

  return `
  <div class="row-item">
    <span class="avatar small">${esc((entry.name || entry.serviceName || 'C').trim().charAt(0))}</span>
    <span class="grow">
      <span class="row-title ellipsis">
        ${entry.serviceName ? esc(entry.serviceName) : 'Order'} · ${qtyFmt(entry.grossWeight)} ${unitOf(entry.unit)}
        ${lossDetail}
      </span>
      <span class="row-sub">${esc(entry.name || 'Walk-in')}${entry.village ? ' (' + esc(entry.village) + ')' : ''} · ${dateTxt(entry.at)}${entry.tokenNo ? ' · #' + entry.tokenNo : ''}</span>
    </span>
    <span class="badge ${entry.paid ? 'green' : 'amber'}">${entry.paid ? t('cashPaid') : t('creditDue')}</span>
    <span class="row-amt">${inr(entry.amountPaise)}</span>
    ${delBtn}
  </div>`;
}

export function queueRow(tokenRow, isServing) {
  const svc = tokenRow.serviceId ? state.data.services.find((s) => s.id === tokenRow.serviceId) : null;
  const svcName = svc ? esc(svc.name) : '';
  const lossG = tokenRow.lossG || 0;
  const netWeight = tokenRow.netWeight;
  const lossTxt = lossG > 0 ? ` · -${lossG}g` : '';
  const netTxt = netWeight > 0 ? ` · ${qtyFmt(netWeight)} ${unitOf(svc ? svc.unit : 'kg')}` : '';

  return `
  <div class="row-item queue-item">
    <span class="queue-no${isServing ? ' serving' : ''}">${tokenRow.no}</span>
    <span class="grow">
      <span class="row-title ellipsis">
        ${esc(tokenRow.name)}${tokenRow.village ? ` <span class="tiny-chip">${esc(tokenRow.village)}</span>` : ''}
        ${svcName ? `<span class="tiny-chip">${svcName}</span>` : ''}
      </span>
      <span class="row-sub">
        ${isServing ? t('servingNow') : relTxt(tokenRow.at)}
        ${tokenRow.grossWeight ? ` · ${qtyFmt(tokenRow.grossWeight)} ${unitOf(svc ? svc.unit : 'kg')}` : ''}
        ${lossTxt}${netTxt}
      </span>
    </span>
    <div class="queue-actions">
      <button class="btn btn-sm btn-primary" data-act="token-to-job" data-id="${tokenRow.id}">${t('createBillShort')}</button>
      ${isServing
        ? `<button class="btn btn-sm btn-soft" data-act="token-done" data-id="${tokenRow.id}">${t('done')}</button>`
        : `<button class="btn btn-sm btn-soft" data-act="token-start" data-id="${tokenRow.id}">${t('call')}</button>`}
      <button type="button" class="icon-btn" data-act="token-notify-wa" data-id="${tokenRow.id}" title="WhatsApp 'Aata Ready' Notification">💬</button>
      <button type="button" class="icon-btn" data-act="token-print-pos" data-id="${tokenRow.id}" title="Thermal POS Print">🖨️</button>
      <button type="button" class="icon-btn" data-act="token-cancel" data-id="${tokenRow.id}" aria-label="Cancel">✕</button>
    </div>
  </div>`;
}

export function customerRows(list) {
  if (!list.length) {
    return state.data.customers.length
      ? emptyBlock(t('noCustomerFound'), t('noCustomerSub'))
      : emptyBlock(t('noCustomerYet'), t('noCustomerYetSub'));
  }
  return list.map((c) => {
    const cls = c.balancePaise > 0 ? 'due' : (c.balancePaise < 0 ? 'adv' : 'zero');
    const text = c.balancePaise > 0
      ? inr(c.balancePaise) + ' ' + t('dueTag')
      : (c.balancePaise < 0 ? inr(-c.balancePaise) + ' ' + t('advTag') : t('settledTag'));
    const avatarHtml = c.photo
      ? `<img src="${c.photo}" class="avatar" alt="${esc(c.name)}" style="object-fit:cover;border:1.5px solid #cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,0.08);">`
      : `<span class="avatar">${esc(c.name.trim().charAt(0) || '?')}</span>`;

    return `
    <button type="button" class="row-item" data-act="open-cust" data-id="${c.id}">
      ${avatarHtml}
      <span class="grow">
        <span class="row-title ellipsis">${esc(c.name)}${c.village ? ` <span class="tiny-chip">${esc(c.village)}</span>` : ''}</span>
        <span class="row-sub">${c.phone ? '📞 ' + esc(c.phone) : '—'}${c.lastAt ? ' · ' + relTxt(c.lastAt) : ''}</span>
      </span>
      <span class="bal ${cls}">${text}</span>
    </button>`;
  }).join('');
}

export function serviceCards(target) {
  const data = state.data;
  const chosen = target === 'job' ? state.job.serviceId : state.tokenForm.serviceId;
  return data.services.map((s) => {
    const lossRateG = s.lossRateG || 0;
    return `
    <button type="button" class="svc-card pos-svc-card${chosen === s.id ? ' is-on' : ''}"
      data-act="pick-svc" data-target="${target}" data-id="${s.id}">
      <strong>${esc(s.name)}</strong>
      <div class="pos-svc-sub">
        <span>${inr(s.ratePaise, true)}/${unitOf(s.unit)}</span>
        ${lossRateG > 0 ? `<span class="pos-svc-loss">-${lossRateG}g</span>` : ''}
      </div>
    </button>`;
  }).join('');
}
