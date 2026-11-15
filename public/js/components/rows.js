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

export function tokenTicketCard(tok, type = 'waiting') {
  const isServing = type === 'serving' || tok.status === 'serving';
  const isDone = type === 'done' || tok.status === 'done';
  const isWaiting = !isServing && !isDone;

  const svc = tok.serviceId ? (state.data?.services || []).find((s) => s.id === tok.serviceId) : null;
  const svcName = svc ? esc(svc.name) : (tok.serviceName ? esc(tok.serviceName) : '');
  const unit = unitOf(svc ? svc.unit : 'kg');

  const gross = Number(tok.grossWeight) || 0;
  const lossG = Number(tok.lossG) || 0;
  const net = tok.netWeight != null ? Number(tok.netWeight) : (gross ? Math.max(0, gross - (lossG / 1000)) : 0);

  const cardCls = isServing ? 'token-ticket is-serving' : (isDone ? 'token-ticket is-done' : 'token-ticket is-waiting');

  let statusBadge = '';
  if (isServing) {
    statusBadge = `<span class="ticket-status-pill serving"><span class="pulse-dot"></span> चल रहा है</span>`;
  } else if (isDone) {
    statusBadge = `<span class="ticket-status-pill done">✓ माल तैयार</span>`;
  } else {
    statusBadge = `<span class="ticket-status-pill waiting">${relTxt(tok.at)}</span>`;
  }

  return `
  <div class="${cardCls}">
    <!-- Header: Token Badge, Customer Name & Status -->
    <div class="ticket-head">
      <div class="ticket-badge">#${tok.no}</div>
      <div class="ticket-info">
        <div class="ticket-name ellipsis">${esc(tok.name || 'ग्राहक')}</div>
        <div class="ticket-sub">
          ${tok.village ? `<span class="ticket-pill loc">📍 ${esc(tok.village)}</span>` : ''}
          ${tok.phone ? `<span class="ticket-pill phone">📞 ${esc(tok.phone)}</span>` : ''}
          ${tok.note ? `<span class="ticket-pill note">📝 ${esc(tok.note)}</span>` : ''}
        </div>
      </div>
      <div class="ticket-status-wrap">
        ${statusBadge}
      </div>
    </div>

    <!-- Weight & Service Bar (Always rounded with qtyFmt, never raw float!) -->
    <div class="ticket-body">
      ${svcName ? `<span class="ticket-pill svc">🌾 ${svcName}</span>` : ''}
      <div class="ticket-weights">
        ${gross ? `<span class="tw-item gross">आवक: <b>${qtyFmt(gross)} ${unit}</b></span>` : ''}
        ${lossG > 0 ? `<span class="tw-item loss">काट: <b>-${lossG}g</b></span>` : ''}
        ${net > 0 ? `<span class="tw-item net">वापसी: <b>${qtyFmt(net)} ${unit}</b></span>` : ''}
      </div>
    </div>

    <!-- Action Bar: Cleanly split into Primary Actions (left) & Quick Utilities (right) -->
    <div class="ticket-actions">
      <div class="ticket-primary-actions">
        <button type="button" class="btn btn-sm btn-primary btn-ticket-bill" data-act="token-to-job" data-id="${tok.id}">
          🧾 बिल बनाएं
        </button>
        ${isDone ? `
          <button type="button" class="btn btn-sm btn-soft btn-ticket-deliver" data-act="token-deliver" data-id="${tok.id}" title="ग्राहक को माल दिया">
            ✓ दिया
          </button>
        ` : (isServing ? `
          <button type="button" class="btn btn-sm btn-gold btn-ticket-done" data-act="token-done" data-id="${tok.id}">
            ✅ पूरा हुआ
          </button>
        ` : `
          <button type="button" class="btn btn-sm btn-soft btn-ticket-start" data-act="token-start" data-id="${tok.id}">
            ▶️ बुलाएँ
          </button>
        `)}
      </div>

      <div class="ticket-util-actions">
        <button type="button" class="ticket-icon-btn edit" data-act="token-edit" data-id="${tok.id}" title="टोकन विवरण सुधारें (Edit)">
          ✏️
        </button>
        <button type="button" class="ticket-icon-btn wa" data-act="token-notify-wa" data-id="${tok.id}" title="WhatsApp 'Aata Ready' Notification">
          💬
        </button>
        <button type="button" class="ticket-icon-btn print" data-act="token-print-pos" data-id="${tok.id}" title="थर्मल पर्ची प्रिंट">
          🖨️
        </button>
        <button type="button" class="ticket-icon-btn del" data-act="token-cancel" data-id="${tok.id}" title="रद्द करें / हटाएं">
          ✕
        </button>
      </div>
    </div>
  </div>`;
}

export function queueRow(tokenRow, isServing) {
  return tokenTicketCard(tokenRow, isServing ? 'serving' : 'waiting');
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
