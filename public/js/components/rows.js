// Reusable List Row & Card Components
import { state } from '../state.js';
import { esc, inr, qtyFmt, unitOf, dateTxt, timeTxt, relTxt, emptyBlock, phoneFmt } from '../utils/formatters.js';
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
        <span class="row-sub">${esc(entry.name || 'Customer')}${entry.village ? ' (' + esc(entry.village) + ')' : ''} · ${dateTxt(entry.at)} · ${timeTxt(entry.at)}${entry.note ? ' · "' + esc(entry.note) + '"' : ''}</span>
      </span>
      <span class="row-amt amt-plus">+${inr(entry.amountPaise)}</span>
      ${delBtn}
    </div>`;
  }

  if (entry.kind === 'debit') {
    return `
    <div class="row-item" style="border-left:3px solid #dc2626;padding-left:8px;">
      <span class="avatar small" style="background:#fee2e2;color:#b91c1c;font-weight:700;">📦</span>
      <span class="grow" style="min-width:0;">
        <span class="row-title ellipsis">
          <strong style="color:#b91c1c;">🔴 उधार दिया: ${esc(entry.itemName || 'माल / रोकड़')}</strong>
          ${entry.grossWeight ? ` · <span style="font-weight:800;color:#ea580c;">${qtyFmt(entry.grossWeight)} ${unitOf(entry.unit)}</span>` : ''}
        </span>
        <span class="row-sub">
          ${esc(entry.name || 'ग्राहक')}${entry.village ? ' (' + esc(entry.village) + ')' : ''} · ${dateTxt(entry.at)}
          ${entry.note ? ` · <span style="color:#0f172a;font-weight:600;">"${esc(entry.note)}"</span>` : ''}
        </span>
      </span>
      <span class="badge" style="background:#fee2e2;color:#991b1b;font-weight:800;">उधार</span>
      <span class="row-amt" style="color:#dc2626;font-weight:800;">
        ${entry.amountPaise > 0 ? '-' + inr(entry.amountPaise) : (entry.grossWeight ? entry.grossWeight + ' ' + unitOf(entry.unit) : 'उधार')}
      </span>
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

export function expenseRow(ex, options = {}) {
  const catIcons = {
    diesel: '⛽ डीज़ल',
    electricity: '⚡ बिजली',
    labor: '👷 मजदूरी',
    tea: '☕ चाय-नाश्ता',
    maintenance: '🔧 मेंटेनेंस/ग्रीस',
    other: '📦 अन्य खर्चा'
  };
  const iconLabel = catIcons[ex.category] || ex.category;
  return `
  <div class="row-item" style="border-left:3px solid #ea580c;padding-left:8px;">
    <span class="avatar small" style="background:#fff7ed;color:#c2410c;font-size:14px;display:grid;place-items:center;border-radius:8px;">📉</span>
    <span class="grow" style="min-width:0;">
      <div class="row-title ellipsis">
        <strong>${iconLabel}</strong> · <span class="tiny-chip" style="font-size:10px;padding:1px 5px;">${ex.paymentMode === 'cash' ? '💵 नकद (गल्ला)' : '📱 UPI/ऑनलाइन'}</span>
      </div>
      <div class="row-sub">
        ${dateTxt(ex.at)} · ${timeTxt(ex.at)}${ex.note ? ` · <span style="color:#0f172a;font-weight:600;">"${esc(ex.note)}"</span>` : ''}
      </div>
    </span>
    <span class="row-amt" style="color:#ea580c;font-weight:800;white-space:nowrap;">-${inr(ex.amountPaise)}</span>
    <button type="button" class="icon-btn" data-act="del-expense" data-id="${ex.id}" aria-label="Delete" title="खर्च हटाएं" style="color:#dc2626;margin-left:4px;">✕</button>
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
        ${lossG > 0 ? `
          <span class="tw-item gross">आवक: <b>${qtyFmt(gross)} ${unit}</b></span>
          <span class="tw-item loss">काट: <b>-${lossG}g</b></span>
          <span class="tw-item net">वापसी: <b>${qtyFmt(net)} ${unit}</b></span>
        ` : `
          <span class="tw-item net" style="color:#15803d;font-weight:750;">
            तैयार वजन: <b>${qtyFmt(net || gross)} ${unit}</b> <span class="tiny-chip" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;font-size:10.5px;">✓ तैयार माल (सीधा Output)</span>
          </span>
        `}
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
    return state.data?.customers?.length
      ? emptyBlock(t('noCustomerFound'), t('noCustomerSub'))
      : emptyBlock(t('noCustomerYet'), t('noCustomerYetSub'));
  }
  return list.map((c) => {
    const cls = c.balancePaise > 0 ? 'due' : (c.balancePaise < 0 ? 'adv' : 'zero');
    const text = c.balancePaise > 0
      ? inr(c.balancePaise) + ' ' + t('dueTag')
      : (c.balancePaise < 0 ? inr(-c.balancePaise) + ' ' + t('advTag') : '✓ ' + t('settledTag'));
    const avatarHtml = c.photo
      ? `<img src="${c.photo}" class="cust-card-avatar-img" alt="${esc(c.name)}">`
      : `<span class="cust-card-avatar-txt">${esc((c.name || 'G').trim().charAt(0) || '?')}</span>`;

    const cleanPhone = (c.phone || '').trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');

    return `
    <div class="cust-card">
      <!-- Card Top: Avatar, Customer Name & Village, Khata Status Badge -->
      <div class="cust-card-top" data-act="open-cust" data-id="${c.id}" role="button" tabindex="0">
        <div class="cust-card-avatar">
          ${avatarHtml}
        </div>
        <div class="cust-card-info">
          <div class="cust-card-name ellipsis">${esc(c.name)}</div>
          <div class="cust-card-sub">
            ${c.village ? `<span class="cust-pill loc">📍 ${esc(c.village)}</span>` : '<span class="cust-pill muted">गाँव दर्ज नहीं</span>'}
            ${cleanPhone ? `<span class="cust-pill phone">📞 ${esc(phoneFmt(cleanPhone))}</span>` : ''}
          </div>
        </div>
        <div class="cust-card-bal-wrap">
          <span class="cust-bal-pill ${cls}">${text}</span>
        </div>
      </div>

      <!-- Card Meta: Last active and/or Add Phone shortcut -->
      <div class="cust-card-meta">
        <span class="cust-meta-txt">
          ${c.lastAt ? `🕒 अंतिम काम: <b>${relTxt(c.lastAt)}</b>` : '✨ <span style="color:#94a3b8;">नया खाता</span>'}
        </span>
        ${!cleanPhone ? `
          <button type="button" class="cust-link-btn" data-act="edit-cust" data-id="${c.id}" title="फ़ोन नंबर जोड़ें">
            + फ़ोन जोड़ें
          </button>
        ` : ''}
      </div>

      <!-- Card Footer: Quick Actions Bar -->
      <div class="cust-card-actions">
        <div class="cust-primary-actions">
          <button type="button" class="btn btn-sm btn-cust-ledger" data-act="open-cust" data-id="${c.id}" title="खाता और लेन-देन देखें">
            📖 खाता देखें
          </button>
          <button type="button" class="btn btn-sm btn-cust-job" data-act="cust-new-job" data-id="${c.id}" title="इस ग्राहक के लिए नया बिल/काम बनाएं">
            🌾 नया काम
          </button>
        </div>
        <div class="cust-icon-actions">
          ${cleanPhone ? `
            <a href="tel:${esc(cleanPhone)}" class="cust-icon-btn call" title="कॉल करें" aria-label="कॉल करें">
              📞
            </a>
            <a href="https://wa.me/91${esc(cleanDigits)}" target="_blank" rel="noopener noreferrer" class="cust-icon-btn wa" title="व्हाट्सएप भेजें" aria-label="व्हाट्सएप">
              💬
            </a>
          ` : ''}
          <button type="button" class="cust-icon-btn edit" data-act="edit-cust" data-id="${c.id}" title="सुधारें (Edit)" aria-label="सुधारें">
            ✏️
          </button>
        </div>
      </div>
    </div>`;
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
