// Modal Dialog Components
import { state, modalRoot } from '../state.js';
import { esc, inr, qtyFmt, unitOf, dateTxt, timeTxt, emptyBlock, phoneFmt } from '../utils/formatters.js';
import { api } from '../api.js';
import { isPhoneticMatch } from '../utils/phonetic.js';
import { t } from '../i18n.js';

export function showModal(html) {
  modalRoot.innerHTML = `<div class="sheet-backdrop"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  if (document.body) document.body.classList.add('no-scroll');
}

export function closeModal() {
  modalRoot.innerHTML = '';
  if (document.body) document.body.classList.remove('no-scroll');
  state.customer = null;
}

export function customerBalance(id) {
  const customer = state.data.customers.find((c) => c.id === id);
  return customer ? customer.balancePaise : 0;
}

export async function openCustomer(id) {
  const localCust = state.data?.customers?.find((c) => c.id === id);
  if (localCust) {
    const localEntries = (state.data?.entries || []).filter((e) => e.customerId === id);
    state.customer = {
      customer: localCust,
      entries: localEntries,
      loading: true,
    };
    renderCustomerModal();
  } else {
    showModal(`
      <div style="padding:28px 16px;text-align:center;">
        <div style="font-size:28px;margin-bottom:8px;">⏳</div>
        <div style="font-weight:750;color:#334155;font-size:14px;">ग्राहक विवरण लोड हो रहा है...</div>
      </div>
    `);
  }

  try {
    const data = await api('/api/customer?id=' + encodeURIComponent(id));
    if (data && data.customer) {
      if (state.customer && state.customer.customer?.id === id) {
        state.customer = { ...data, loading: false };
        renderCustomerModal();
      }
    }
  } catch (err) {
    if (state.customer) {
      state.customer.loading = false;
      renderCustomerModal();
    }
  }
}

export function renderCustomerModal() {
  const current = state.customer;
  if (!current) return;
  const balance = customerBalance(current.customer.id);
  const isDue = balance > 0;
  const isAdv = balance < 0;
  const statusColor = isDue ? '#b45309' : (isAdv ? '#4338ca' : '#15803d');
  const statusBg = isDue ? '#fffbeb' : (isAdv ? '#eef2ff' : '#f0fdf4');
  const statusBorder = isDue ? '#fde68a' : (isAdv ? '#c7d2fe' : '#bbf7d0');
  const statusLabel = isDue ? t('dueTitle') : (isAdv ? t('advTitle') : t('settledTitle'));

  showModal(`
    <!-- Ultra-Compact Customer Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1 1 auto;">
        ${current.customer.photo
          ? `<img src="${current.customer.photo}" alt="${esc(current.customer.name)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #4f46e5;flex:0 0 40px;">`
          : `<div style="width:40px;height:40px;border-radius:50%;font-size:17px;font-weight:800;background:#e0e7ff;color:#3730a3;display:grid;place-items:center;flex:0 0 40px;">${esc(current.customer.name.charAt(0) || '?')}</div>`}
        <div style="min-width:0;flex:1 1 auto;line-height:1.2;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-0.2px;">${esc(current.customer.name)}</span>
            ${current.customer.village ? `<span style="font-size:11px;background:#f1f5f9;color:#334155;padding:1px 6px;border-radius:6px;font-weight:600;">📍 ${esc(current.customer.village)}</span>` : ''}
          </div>
          <div style="font-size:11.5px;color:#64748b;margin-top:2px;">
            ${current.customer.phone
              ? `<a href="tel:${current.customer.phone}" style="color:#4f46e5;font-weight:700;text-decoration:none;">📞 ${phoneFmt(current.customer.phone)}</a>`
              : '<span style="color:#94a3b8;">बिना फोन</span>'}
            <span style="margin:0 4px;color:#cbd5e1;">•</span>
            <span>${current.entries.length} हिसाब प्रविष्टियाँ</span>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex:0 0 auto;">
        <button type="button" class="btn btn-sm btn-subtle" data-act="edit-cust" data-id="${current.customer.id}" title="नाम, गाँव या फोटो बदलें" style="padding:4px 8px;font-size:12px;height:32px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;">
          ✏️
        </button>
        ${balance === 0 ? `
        <button type="button" class="btn btn-sm btn-subtle" data-act="del-cust" data-id="${current.customer.id}" title="ग्राहक हटाएं" style="padding:4px 8px;font-size:12px;height:32px;border-radius:8px;border:1px solid #fecaca;color:#dc2626;background:#fff;">
          🗑️
        </button>` : ''}
        <button type="button" class="icon-btn" data-act="close-modal" aria-label="Close" style="width:32px;height:32px;border-radius:8px;">✕</button>
      </div>
    </div>

    <!-- Balance & Primary Action Row -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:${statusBg};border:1.5px solid ${statusBorder};border-radius:12px;margin-bottom:10px;">
      <div>
        <div style="font-size:11px;font-weight:750;color:${statusColor};text-transform:uppercase;letter-spacing:0.3px;">${statusLabel}</div>
        <div style="font-size:20px;font-weight:850;color:${statusColor};line-height:1.15;">${inr(Math.abs(balance))}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        ${isDue ? `
        <button type="button" class="btn btn-sm" data-act="wa-remind" data-id="${current.customer.id}" title="WhatsApp पर तगादा भेजें" style="background:#25d366;color:#fff;font-weight:750;font-size:12px;height:34px;padding:0 10px;border-radius:8px;border:none;">
          📲 तगादा
        </button>` : ''}
        <button type="button" class="btn btn-primary btn-sm" data-act="job-for-cust" data-id="${current.customer.id}" style="font-weight:800;font-size:12.5px;height:34px;padding:0 12px;border-radius:8px;">
          + नया काम
        </button>
      </div>
    </div>

    <!-- Compact Payment Input Bar -->
    <form data-form="payment" style="display:flex;align-items:center;gap:6px;background:#f8fafc;padding:8px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;">
      <input type="hidden" name="customerId" value="${current.customer.id}">
      <div style="position:relative;flex:1 1 38%;">
        <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-weight:800;color:#64748b;font-size:13px;">₹</span>
        <input id="p-amount" name="amount" type="number" step="any" min="0" inputmode="decimal"
          value="${balance > 0 ? (balance / 100) : ''}" placeholder="रकम"
          style="width:100%;height:36px;padding:0 8px 0 22px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13.5px;font-weight:750;background:#fff;box-sizing:border-box;">
      </div>
      <input id="p-note" name="note" maxlength="120" placeholder="नोट (Cash/UPI)"
        style="flex:1 1 37%;height:36px;padding:0 8px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:12px;background:#fff;box-sizing:border-box;">
      <button class="btn btn-primary" type="submit" style="flex:0 0 auto;height:36px;padding:0 12px;font-size:12.5px;font-weight:800;border-radius:8px;white-space:nowrap;">
        + जमा
      </button>
    </form>

    <!-- Ledger Section -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:800;color:#0f172a;">
        ${t('oldLedger')} (${current.entries.length})
        ${current.loading ? '<span style="font-size:11px;color:#4f46e5;font-weight:600;margin-left:4px;">(ताज़ा हो रहा है...)</span>' : ''}
      </div>
    </div>
    <div class="row-list" style="max-height:240px;overflow-y:auto;padding-right:2px;">
      ${current.entries.length
        ? current.entries.map((e) => {
            const lossG = e.lossG || 0;
            const netWeight = e.netWeight;
            const hasLoss = e.kind !== 'payment' && (lossG > 0 || netWeight != null);
            return `
            <div class="row-item" style="padding:8px 6px;gap:8px;">
              <span class="avatar small${e.kind === 'payment' ? ' pay' : ''}" style="width:30px;height:30px;font-size:13px;flex:0 0 30px;">${e.kind === 'payment' ? '₹' : esc((e.serviceName || 'C').charAt(0))}</span>
              <span class="grow" style="min-width:0;">
                <span class="row-title ellipsis" style="font-size:13px;font-weight:750;">${e.kind === 'payment' ? 'भुगतान प्राप्त' : esc(e.serviceName || 'Order') + ' · ' + qtyFmt(e.qty) + ' ' + unitOf(e.unit)}</span>
                <span class="row-sub" style="font-size:11px;">
                  ${dateTxt(e.at)} · ${timeTxt(e.at)}${e.tokenNo ? ' · #' + e.tokenNo : ''}
                  ${hasLoss ? ` · <span style="color:#ea580c">-${lossG}g</span> · <span style="color:#16a34a">${qtyFmt(netWeight)} ${unitOf(e.unit)}</span>` : ''}
                </span>
              </span>
              <span class="row-amt${e.kind === 'payment' ? ' amt-plus' : ''}" style="font-size:13px;font-weight:800;white-space:nowrap;">${e.kind === 'payment' ? '+' : ''}${inr(e.amountPaise)}</span>
              <div style="display:flex;align-items:center;gap:2px;flex:0 0 auto;">
                <button type="button" class="icon-btn" data-act="print-entry" data-id="${e.id}" aria-label="Print Receipt" title="रसीद प्रिंट" style="width:28px;height:28px;font-size:12px;">🧾</button>
                <button type="button" class="icon-btn" data-act="wa-entry" data-id="${e.id}" aria-label="WhatsApp" title="व्हाट्सएप रसीद" style="width:28px;height:28px;font-size:12px;">📱</button>
                <button type="button" class="icon-btn" data-act="del-entry" data-id="${e.id}" aria-label="Delete" title="हटाएं" style="width:28px;height:28px;font-size:12px;color:#dc2626;">✕</button>
              </div>
            </div>`;
          }).join('')
        : `<div style="text-align:center;padding:16px 8px;color:#94a3b8;font-size:12px;background:#f8fafc;border-radius:10px;border:1px dashed #cbd5e1;">कोई पुराना हिसाब दर्ज नहीं है</div>`}
    </div>
  `);
}

export function openCustomerEditModal(id) {
  const cust = id ? state.data.customers.find((c) => c.id === id) : null;
  const isNew = !cust;
  showModal(`
    <div class="sheet-head">
      <h3>${isNew ? 'नया ग्राहक संपर्क जोड़ें' : 'ग्राहक संपर्क विवरण बदलें'}</h3>
      <button class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
    </div>
    <form data-form="customer">
      <input type="hidden" name="id" value="${cust ? cust.id : ''}">

      <!-- Customer Photo Identification Section -->
      <div style="text-align:center;margin-bottom:16px;">
        <div id="cust-photo-preview" style="width:84px;height:84px;border-radius:50%;overflow:hidden;border:3px solid #4f46e5;margin:0 auto 8px;display:grid;place-items:center;background:#f8fafc;box-shadow:0 4px 12px rgba(0,0,0,0.08);cursor:pointer;" onclick="document.getElementById('cust-photo-file').click();">
          <img id="cust-photo-img" src="${cust ? esc(cust.photo || '') : ''}" style="${cust && cust.photo ? '' : 'display:none;'}width:100%;height:100%;object-fit:cover;">
          <span id="cust-photo-placeholder" style="${cust && cust.photo ? 'display:none;' : ''}font-size:36px;">👤</span>
        </div>
        <input type="file" id="cust-photo-file" accept="image/*" capture="user" style="display:none;">
        <input type="hidden" id="ec-photo" name="photo" value="${cust ? esc(cust.photo || '') : ''}">
        <div style="display:flex;justify-content:center;gap:8px;">
          <button type="button" class="btn btn-sm btn-subtle" onclick="document.getElementById('cust-photo-file').click();" style="border:1.5px solid #cbd5e1;padding:6px 14px;border-radius:10px;font-weight:700;display:inline-flex;align-items:center;gap:6px;background:#fff;">
            <span>📷</span> <span id="cust-photo-btn-text">${cust && cust.photo ? 'फोटो बदलें' : 'ग्राहक का फोटो लें'}</span>
          </button>
          <button type="button" class="btn btn-sm btn-ghost" id="cust-photo-clear" style="${cust && cust.photo ? '' : 'display:none;'}color:#dc2626;padding:6px 10px;">हटाएं</button>
        </div>
        <div style="font-size:11.5px;color:#64748b;margin-top:4px;">उधार के समय सही पहचान के लिए फोटो बहुत उपयोगी है</div>
      </div>

      <div class="field">
        <label for="ec-name">${t('customerName')} <span class="req">*</span></label>
        <input id="ec-name" name="name" maxlength="60" value="${esc(cust ? cust.name : '')}" placeholder="उदा. दिनेश कुमार (मास्टर जी)" required autocomplete="off">
        <div style="font-size:11px;color:#64748b;margin-top:3px;">💡 एक ही नाम के कई लोग हों तो पिता का नाम या उपनाम जोड़ें (उदा. दिनेश (रामबली))</div>
      </div>
      <div class="field">
        <label for="ec-village">${t('villageLabel')}</label>
        <input id="ec-village" name="village" maxlength="60" value="${esc(cust ? (cust.village || '') : '')}" placeholder="Village / Area" autocomplete="off">
      </div>
      <div class="field">
        <label for="ec-phone">${t('phoneLabel')}</label>
        <input id="ec-phone" name="phone" type="tel" inputmode="numeric" maxlength="10" value="${esc(cust ? (cust.phone || '') : '')}" placeholder="${t('phonePlaceholder')}">
      </div>
      <button class="btn btn-primary btn-block mt-14" type="submit">${isNew ? t('newCustomerBtn') : t('saveCustomerBtn')}</button>
    </form>
  `);
}

export function showJobDone(payload) {
  const { entryId, token, state: snapshot } = payload;
  const currentSnapshot = snapshot || state.data;
  const entry = entryId && currentSnapshot ? currentSnapshot.entries.find((e) => e.id === entryId) : null;
  const customer = entry && entry.customerId && currentSnapshot ? currentSnapshot.customers.find((c) => c.id === entry.customerId) : null;
  const nameDisplay = (customer ? customer.name : (entry?.name || payload.name)) || 'Customer';
  const villageDisplay = (customer ? customer.village : (entry?.village || payload.village)) || '';

  const kind = entry ? entry.kind : (payload.kind || 'job');
  const itemName = (entry ? (entry.serviceName || entry.itemName) : payload.serviceName) || 'माल';
  const qtyVal = entry ? (entry.grossWeight || entry.qty) : payload.qty;
  const unitVal = entry ? entry.unit : (payload.unit || 'kg');
  const amountPaise = entry ? entry.amountPaise : (payload.amountPaise || 0);
  const isPaid = entry ? entry.paid : payload.paid;

  const lossG = entry ? (entry.lossG || 0) : 0;
  const netWeight = entry ? entry.netWeight : null;
  const hasLoss = kind === 'job' && (lossG > 0 || netWeight != null);

  let title = t('jobDoneTitle');
  let kindBadge = '⚙️ सुविधा / सेवा';
  if (kind === 'sale') {
    title = 'बिक्री पर्ची तैयार है';
    kindBadge = '🛒 सामान बिक्री';
  } else if (kind === 'purchase') {
    title = 'ख़रीद रसीद तैयार है';
    kindBadge = '📥 कच्चा माल ख़रीद';
  }

  showModal(`
    <div class="done-mark" style="${kind === 'sale' ? 'background:#ecfdf5;color:#059669;' : (kind === 'purchase' ? 'background:#fffbeb;color:#d97706;' : '')}">✓</div>
    <div style="text-align:center;margin-top:6px;">
      <span class="tiny-chip" style="${kind === 'sale' ? 'background:#ecfdf5;color:#059669;font-weight:700;' : (kind === 'purchase' ? 'background:#fffbeb;color:#d97706;font-weight:700;' : 'background:#e0e7ff;color:#3730a3;font-weight:700;')}">${kindBadge}</span>
      <h3 style="margin:4px 0 0;font-size:18px;">${title}</h3>
    </div>
    <div class="done-card">
      <div class="done-amount" style="${kind === 'purchase' ? 'color:#d97706;' : (kind === 'sale' ? 'color:#059669;' : '')}">${inr(amountPaise)}</div>
      <div class="muted" style="font-weight:600">${esc(itemName)}${qtyVal ? ' · ' + qtyFmt(qtyVal) + ' ' + unitOf(unitVal) : ''}</div>
      ${hasLoss ? `
      <div style="margin:8px 0;padding:6px 10px;background:#f8fafc;border-radius:8px;font-size:12px;display:flex;justify-content:space-around">
        <span style="color:#ea580c">घटौती: -${lossG}g</span>
        <span style="color:#16a34a;font-weight:700">शुद्ध आटा: ${qtyFmt(netWeight)} ${unitOf(unitVal)}</span>
      </div>` : ''}
      <div class="muted" style="margin-top:4px;">
        <span style="font-weight:700;color:${isPaid ? '#16a34a' : '#d97706'}">${isPaid ? (kind === 'purchase' ? 'नकद दिया' : t('cashPaid')) : (kind === 'purchase' ? 'खाते में जमा' : t('creditDue'))}</span> · ${esc(nameDisplay)}${villageDisplay ? ' (' + esc(villageDisplay) + ')' : ''}
      </div>
      ${token ? `<div class="mt-8"><span class="token-chip">टोकन #${token.no}</span></div>` : ''}
      ${customer && customer.balancePaise > 0 ? `<div class="mt-8"><span class="badge amber">कुल बाकी: ${inr(customer.balancePaise)}</span></div>` : ''}
    </div>
    <div class="sheet-actions" style="display:flex;gap:8px;flex-wrap:wrap">
      ${entryId ? `
        <button type="button" class="btn btn-ghost" data-act="print-entry" data-id="${entryId}">${t('printSlip')}</button>
        <button type="button" class="btn btn-ghost" data-act="pos-print-entry" data-id="${entryId}">🖨️ POS Print</button>
        <button type="button" class="btn btn-ghost" data-act="wa-entry" data-id="${entryId}">${t('shareWhatsApp')}</button>
      ` : ''}
    </div>
    <button type="button" class="btn btn-primary btn-block" data-act="close-modal">${t('okBtn')}</button>
  `);
}

export function findEntry(id) {
  const inState = state.data.entries.find((e) => e.id === id);
  if (inState) return inState;
  if (state.customer) {
    const found = state.customer.entries.find((e) => e.id === id);
    if (found) {
      return {
        ...found,
        name: state.customer.customer.name,
        village: state.customer.customer.village,
        customerId: state.customer.customer.id,
      };
    }
  }
  return null;
}

export function openStatusModal(initialTokenNo = '', initialPhone = '') {
  const isShopOwner = !!state.data;
  const initialVal = initialTokenNo || initialPhone || '';

  showModal(`
    <div class="sheet-head" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:22px;">🔍</span>
        <div>
          <div class="sheet-title" style="font-size:17px;font-weight:800;color:#0f172a;">${t('universalSearchTitle')}</div>
          <div style="font-size:11.5px;color:#64748b;">${t('universalSearchPlaceholder')}</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
    </div>

    <!-- Universal Search Input Bar with Voice Search Button -->
    <div style="position:relative;margin-bottom:10px;">
      <input id="status-search-query" type="text" class="input" placeholder="${t('universalSearchPlaceholder')}" value="${esc(initialVal)}" style="padding:12px 48px 12px 14px;font-size:15px;height:48px;border:2px solid #6366f1;border-radius:12px;width:100%;font-weight:650;box-sizing:border-box;" autofocus autocomplete="off">
      <button type="button" class="btn-voice-search" data-act="status-voice-search" title="${t('voiceSearchBtn')}" style="position:absolute;right:6px;top:6px;bottom:6px;width:36px;background:linear-gradient(135deg, #6366f1, #4f46e5);color:#fff;border:none;border-radius:8px;font-size:17px;display:flex;align-items:center;justify-content:center;cursor:pointer;">🎙️</button>
    </div>

    <!-- Voice Listening Pulse Banner -->
    <div id="status-voice-pulse" style="display:none;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;padding:8px 12px;border-radius:10px;font-size:12.5px;font-weight:750;text-align:center;margin-bottom:10px;">
      🎙️ ${t('voiceListeningPrompt')}
    </div>

    <!-- Quick Camera QR Scan Button -->
    <div style="margin-bottom:12px;">
      <button type="button" class="btn btn-sm btn-subtle" data-act="status-scan-qr" style="width:100%;padding:10px;border:1.5px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span>📷</span> <span>${t('scanReceiptQrBtn')}</span>
      </button>
    </div>

    <!-- Live Results Container -->
    <div id="status-result-box" style="margin-top:10px;margin-bottom:12px;max-height:55vh;overflow-y:auto;"></div>

    ${!isShopOwner ? `
    <!-- Customer Public Status Lookup by Token & Phone -->
    <form id="status-check-form" data-act="status-check-submit" style="display:flex;flex-direction:column;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;">
      <div>
        <label for="status-phone" style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">
          ${t('customerPhoneFieldLabel')} <span style="color:#dc2626;">*</span>
        </label>
        <input id="status-phone" type="tel" inputmode="numeric" maxlength="10" class="input" placeholder="9554880713" value="${esc(initialPhone)}" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:14px;">
      </div>

      <div>
        <label for="status-token-no" style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">
          ${t('tokenNoFieldLabel')} <span style="color:#dc2626;">*</span>
        </label>
        <input id="status-token-no" type="number" inputmode="numeric" class="input" placeholder="${t('tokenNoPlaceholder')}" value="${esc(initialTokenNo)}" required style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:14px;">
      </div>

      <button type="submit" class="btn btn-primary btn-block" style="padding:12px;border-radius:10px;font-weight:750;font-size:14px;">
        ${t('checkLiveStatusBtn')}
      </button>
    </form>
    ` : ''}
  `);

  if (initialVal && isShopOwner) {
    renderUniversalSearchResults(initialVal);
  }
}

export function renderUniversalSearchResults(query) {
  const box = document.getElementById('status-result-box');
  if (!box || !state.data) return;

  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    box.innerHTML = '';
    return;
  }

  const cleanDigits = q.replace(/\D/g, '');
  const isNumericOnly = /^\d+$/.test(q);

  // 1. Match Customers by name OR phone OR village (bilingual phonetic search)
  const matchedCustomers = (state.data.customers || []).filter((c) => {
    const nameMatch = isPhoneticMatch(c.name, q);
    const villageMatch = c.village && isPhoneticMatch(c.village, q);
    const phoneMatch = cleanDigits && cleanDigits.length >= 3 && (c.phone || '').includes(cleanDigits);
    return nameMatch || villageMatch || phoneMatch;
  }).slice(0, 6);

  // 2. Match Tokens by token # OR customer name OR village OR phone
  const allTokens = [
    ...(state.data.tokens?.serving ? [state.data.tokens.serving] : []),
    ...(state.data.tokens?.waiting || []),
    ...(state.data.tokens?.doneList || []),
  ];
  const matchedTokens = allTokens.filter((tok) => {
    const numMatch = isNumericOnly && tok.no === parseInt(cleanDigits, 10);
    const nameMatch = isPhoneticMatch(tok.name, q);
    const villageMatch = tok.village && isPhoneticMatch(tok.village, q);
    const phoneMatch = cleanDigits && cleanDigits.length >= 3 && (tok.phone || '').includes(cleanDigits);
    return numMatch || nameMatch || villageMatch || phoneMatch;
  }).slice(0, 6);

  if (matchedCustomers.length === 0 && matchedTokens.length === 0) {
    box.innerHTML = `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;color:#64748b;padding:16px;border-radius:12px;text-align:center;font-size:13px;font-weight:600;">
        ${t('noMatchingRecords')} "${esc(query)}"
      </div>`;
    return;
  }

  let html = '';

  // Render matching tokens
  if (matchedTokens.length > 0) {
    html += `
      <div style="font-size:12px;font-weight:800;color:#475569;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <span>🎫</span> <span>${t('matchingTokens')} (${matchedTokens.length})</span>
      </div>
      <div class="row-list" style="margin-bottom:12px;">
        ${matchedTokens.map((tok) => {
          const isDone = tok.status === 'done';
          const isServing = tok.status === 'serving';
          const badgeBg = isDone ? '#dcfce7' : (isServing ? '#dbeafe' : '#fef3c7');
          const badgeColor = isDone ? '#15803d' : (isServing ? '#1d4ed8' : '#b45309');
          const badgeText = isDone ? 'पूर्ण' : (isServing ? 'सक्रिय' : 'कतार में');
          return `
            <div style="padding:10px;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <span style="width:34px;height:34px;background:#e0e7ff;color:#3730a3;font-weight:850;font-size:14px;border-radius:8px;display:grid;place-items:center;flex-shrink:0;">#${tok.no}</span>
                <div style="min-width:0;">
                  <div style="font-weight:750;font-size:13.5px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${esc(tok.name)}${tok.village ? ` <span style="font-size:11px;color:#64748b;">(${esc(tok.village)})</span>` : ''}
                  </div>
                  <div style="font-size:11px;color:#64748b;margin-top:2px;">
                    ${tok.serviceName || 'सेवा'} ${tok.grossWeight ? `· ⚖️ ${tok.grossWeight}kg` : ''} ${tok.phone ? `· 📞 ${tok.phone}` : ''}
                  </div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <span style="font-size:10.5px;font-weight:750;background:${badgeBg};color:${badgeColor};padding:3px 8px;border-radius:6px;">${badgeText}</span>
                <button type="button" class="btn btn-sm btn-primary" data-act="token-to-job" data-id="${tok.id}" style="padding:6px 10px;font-size:12px;font-weight:750;">
                  🧾 बिल
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // Render matching customers
  if (matchedCustomers.length > 0) {
    html += `
      <div style="font-size:12px;font-weight:800;color:#475569;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <span>👤</span> <span>${t('matchingCustomers')} (${matchedCustomers.length})</span>
      </div>
      <div class="row-list">
        ${matchedCustomers.map((c) => {
          const bal = c.balancePaise || 0;
          const balCls = bal > 0 ? '#b91c1c' : (bal < 0 ? '#15803d' : '#64748b');
          const balBg = bal > 0 ? '#fef2f2' : (bal < 0 ? '#f0fdf4' : '#f8fafc');
          const balTxt = bal > 0 ? inr(bal) + ' बाकी' : (bal < 0 ? inr(-bal) + ' जमा' : 'बराबर');
          return `
            <div style="padding:10px;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="min-width:0;">
                <div style="font-weight:750;font-size:13.5px;color:#0f172a;">
                  ${esc(c.name)}${c.village ? ` <span style="font-size:11px;color:#64748b;">(${esc(c.village)})</span>` : ''}
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;">
                  ${c.phone ? `<span>📞 ${c.phone}</span>` : ''}
                  <span style="background:${balBg};color:${balCls};font-weight:750;padding:1px 6px;border-radius:4px;">${balTxt}</span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <button type="button" class="btn btn-sm btn-primary" data-act="search-to-job" data-id="${c.id}" style="padding:6px 10px;font-size:12px;font-weight:750;">
                  + नया काम
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  box.innerHTML = html;
}

export function renderStatusResult(res) {
  const box = document.getElementById('status-result-box');
  if (!box) return;

  if (!res || !res.ok || !res.token) {
    box.innerHTML = `
      <div style="background:#fee2e2;color:#b91c1c;padding:14px;border-radius:12px;font-size:13px;font-weight:600;text-align:center;">
        ${esc((res && res.error) || 'कोई रिकॉर्ड नहीं मिला')}
      </div>`;
    return;
  }

  const t = res.token;
  const isDone = t.status === 'done';
  const isServing = t.status === 'serving';

  let badgeBg = '#fef3c7';
  let badgeColor = '#b45309';
  let icon = '⏳';
  if (isDone) {
    badgeBg = '#dcfce7';
    badgeColor = '#15803d';
    icon = '✓';
  } else if (isServing) {
    badgeBg = '#dbeafe';
    badgeColor = '#1d4ed8';
    icon = '⚙️';
  }

  box.innerHTML = `
    <div style="background:#fff;border:2px solid ${badgeColor};border-radius:16px;padding:18px;box-shadow:0 8px 24px rgba(0,0,0,0.06);margin-top:6px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:22px;font-weight:900;color:#0f172a;">टोकन #${t.tokenNo}</span>
        <span style="background:${badgeBg};color:${badgeColor};font-weight:800;font-size:13px;padding:4px 12px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;">
          <span>${icon}</span> <span>${esc(t.statusText)}</span>
        </span>
      </div>

      ${t.queuePosition > 0 ? `
        <div style="background:#fefce8;border:1px solid #fef08a;border-radius:10px;padding:10px 14px;font-size:13px;color:#854d0e;font-weight:700;margin-bottom:14px;">
          👥 लाइन में स्थिति: आपसे पहले अभी <b>${t.queuePosition} टोकन</b> बाकी हैं।
        </div>
      ` : ''}

      ${isServing ? `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;font-size:13px;color:#1e40af;font-weight:700;margin-bottom:14px;">
          ⚙️ कार्य प्रक्रिया जारी है — कुछ ही देर में तैयार हो जाएगा।
        </div>
      ` : ''}

      ${isDone ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;font-size:13px;color:#166534;font-weight:700;margin-bottom:14px;">
          🎉 कार्य पूरा व तैयार है! कृपया अपनी पर्ची दिखाकर माल प्राप्त करें।
        </div>
      ` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12.5px;color:#475569;border-top:1px solid #f1f5f9;padding-top:12px;">
        <div><b>ग्राहक:</b> ${esc(t.name)}${t.village ? ' (' + esc(t.village) + ')' : ''}</div>
        <div><b>सुविधा/सेवा:</b> ${esc(t.serviceName)}</div>
        <div><b>कुल वज़न:</b> ${t.grossWeight} ${t.unit}</div>
        <div><b>कटौती / छीजत:</b> -${t.lossG} g</div>
        <div style="grid-column:1 / -1;font-size:14px;font-weight:800;color:#0f172a;background:#f8fafc;padding:8px 12px;border-radius:8px;">
          शुद्ध प्राप्ति (Net Output): <span style="color:#059669;">${t.netWeight} ${t.unit}</span>
        </div>
        ${t.amountPaise != null ? `
          <div style="grid-column:1 / -1;display:flex;justify-content:space-between;font-weight:700;font-size:13px;padding-top:4px;">
            <span>बिल: ${inr(t.amountPaise)}</span>
            <span style="color:${t.paid ? '#16a34a' : '#dc2626'}">${t.paid ? '✓ भुगतान प्राप्त (PAID)' : '⚠️ बाकी (DUE)'}</span>
          </div>
        ` : ''}
      </div>

      <div style="margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:8px;font-size:11.5px;color:#64748b;display:flex;justify-content:space-between;">
        <span>🏪 ${esc(t.shopName)}</span>
        <span>📞 ${esc(t.shopPhone)}</span>
      </div>
    </div>
  `;
}

export function openProductModal(productId = null, defaultType = 'both') {
  const p = productId && state.data && state.data.products ? state.data.products.find((x) => x.id === productId) : null;
  const isEdit = !!p;
  const type = p ? p.type : (defaultType || 'both');
  const unit = p ? p.unit : 'kg';
  const rate = p && p.defaultRatePaise ? (p.defaultRatePaise / 100) : '';

  showModal(`
    <div class="sheet-head">
      <div>
        <h3 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">
          ${isEdit ? '✏️ सामान विवरण बदलें' : '📦 नया सामान / उत्पाद जोड़ें'}
        </h3>
        <p class="tiny muted" style="margin-top:2px;">
          दुकान में ख़रीदने या बेचने वाली फ़सल, तेल, खली, अनाज या अन्य सामग्री दर्ज करें
        </p>
      </div>
      <button class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
    </div>

    <form data-form="product" style="display:flex;flex-direction:column;gap:12px;margin-top:12px;">
      ${isEdit ? `<input type="hidden" name="id" value="${esc(p.id)}">` : ''}

      <div class="field">
        <label for="prod-name">सामान का नाम *</label>
        <input id="prod-name" name="name" maxlength="60" value="${isEdit ? esc(p.name) : ''}"
          placeholder="e.g. शुद्ध सरसों तेल, ताजा आटा, मक्का, खली, धान 1509..." required autofocus>
      </div>

      <div class="two-col">
        <div class="field">
          <label for="prod-type">प्रकार (Category)</label>
          <select id="prod-type" name="type" style="padding:10px 12px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;font-weight:700;">
            <option value="both"${type === 'both' ? ' selected' : ''}>🔄 दोनों (ख़रीद व बिक्री)</option>
            <option value="sale"${type === 'sale' ? ' selected' : ''}>🛒 सिर्फ बिक्री (Sale)</option>
            <option value="purchase"${type === 'purchase' ? ' selected' : ''}>📥 सिर्फ ख़रीद (Purchase)</option>
          </select>
        </div>

        <div class="field">
          <label for="prod-unit">मापक इकाई (Unit)</label>
          <select id="prod-unit" name="unit" style="padding:10px 12px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;font-weight:700;">
            <option value="kg"${unit === 'kg' ? ' selected' : ''}>किलो (kg)</option>
            <option value="ltr"${unit === 'ltr' ? ' selected' : ''}>लीटर (ltr)</option>
            <option value="qtl"${unit === 'qtl' ? ' selected' : ''}>क्विंटल (qtl)</option>
            <option value="bag"${unit === 'bag' ? ' selected' : ''}>बोरी (bag)</option>
            <option value="pkt"${unit === 'pkt' ? ' selected' : ''}>पैकेट (pkt)</option>
            <option value="pc"${unit === 'pc' ? ' selected' : ''}>नग / पीस (pc)</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label for="prod-rate">डिफ़ॉल्ट भाव / रेट (₹ प्रति इकाई - वैकल्पिक)</label>
        <input id="prod-rate" name="rate" type="number" step="any" min="0" inputmode="decimal"
          value="${rate}" placeholder="0.00">
        <span class="tiny muted">बिल बनाते समय यह भाव अपने आप भर जाएगा (जिसे आप कभी भी बदल सकते हैं)</span>
      </div>

      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn btn-primary" type="submit" style="flex:1;padding:12px;font-weight:800;">
          ${isEdit ? 'बदलाव सुरक्षित करें' : 'सामान जोड़ें ✓'}
        </button>
        ${isEdit ? `
          <button type="button" class="btn btn-ghost" data-act="del-product" data-id="${esc(p.id)}" style="color:#dc2626;font-weight:700;">
            हटाएं
          </button>
        ` : ''}
      </div>
    </form>
  `);
}

export function openTokenReceiptModal(tok) {
  const biz = state.data?.business || { name: 'तौल-माल' };
  const hideLoss = (tok.hideLoss != null) ? Boolean(tok.hideLoss) : Boolean(biz.hideLossOnSlip != null ? biz.hideLossOnSlip : 1);
  const svc = tok.serviceId ? state.data?.services?.find((s) => s.id === tok.serviceId) : null;
  const svcName = svc ? svc.name : (tok.serviceName || 'सुविधा / सेवा');
  const unit = svc ? unitOf(svc.unit) : 'kg';
  const gross = tok.grossWeight || 0;
  const lossG = tok.lossG || 0;
  const net = tok.netWeight || gross;
  const billWeight = (biz.chargeBasis === 'gross') ? gross : net;
  const estAmountPaise = (billWeight && svc) ? Math.round(billWeight * svc.ratePaise) : 0;

  showModal(`
    <div class="sheet-head" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:26px;">🎫</span>
        <div>
          <div class="sheet-title" style="font-size:18px;font-weight:800;color:#0f172a;">टोकन पर्ची जारी हुई</div>
          <div style="font-size:12px;color:#64748b;">${esc(biz.name)} · ग्राहक माल जमा रसीद</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
    </div>

    <!-- Token Hero Number -->
    <div style="background:linear-gradient(135deg, #1e1b4b, #312e81);color:#fff;border-radius:14px;padding:16px;text-align:center;margin-bottom:16px;box-shadow:0 4px 14px rgba(49,46,129,0.25);">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;font-weight:700;">टोकन नंबर (Token Number)</div>
      <div style="font-size:42px;font-weight:900;line-height:1.1;margin:4px 0;letter-spacing:2px;color:#fbbf24;">#${tok.no}</div>
      <div style="font-size:14.5px;font-weight:700;color:#e0e7ff;margin-top:4px;">
        ${esc(tok.name)}${tok.village ? ` (${esc(tok.village)})` : ''}
      </div>
      ${tok.phone ? `<div style="font-size:12px;color:#a5b4fc;margin-top:2px;">📞 ${esc(tok.phone)}</div>` : ''}
    </div>

    <!-- Weight & Deduction Summary Grid -->
    <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;font-size:13px;">
        <span style="color:#64748b;font-weight:600;">सामग्री / सेवा:</span>
        <span style="font-weight:750;color:#0f172a;">${esc(svcName)}</span>
      </div>

      ${hideLoss ? `
      <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1.5px solid #cbd5e1;border-radius:10px;padding:10px 14px;">
        <div>
          <div style="font-size:11px;color:#64748b;font-weight:700;">वजन / मात्रा</div>
          <div style="font-size:18px;font-weight:900;color:#0f172a;margin-top:2px;">${gross ? qtyFmt(gross) + ' ' + unit : '—'}</div>
        </div>
        ${estAmountPaise > 0 ? `
        <div style="text-align:right;">
          <div style="font-size:11px;color:#64748b;font-weight:700;">अनुमानित पिसाई शुल्क</div>
          <div style="font-size:18px;font-weight:900;color:#15803d;margin-top:2px;">${inr(estAmountPaise)}</div>
        </div>` : ''}
      </div>
      ` : `
      <div style="display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:8px;text-align:center;">
        <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 4px;">
          <div style="font-size:11px;color:#64748b;font-weight:700;">आवक वजन</div>
          <div style="font-size:15px;font-weight:800;color:#0f172a;margin-top:2px;">${gross ? qtyFmt(gross) + ' ' + unit : '—'}</div>
        </div>
        <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 4px;">
          <div style="font-size:11px;color:#ea580c;font-weight:700;">काट / घटौती</div>
          <div style="font-size:15px;font-weight:800;color:#ea580c;margin-top:2px;">${lossG ? '-' + lossG + 'g' : '0g'}</div>
        </div>
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:8px 4px;">
          <div style="font-size:11px;color:#15803d;font-weight:800;">शुद्ध वापसी माल</div>
          <div style="font-size:16px;font-weight:900;color:#15803d;margin-top:2px;">${net ? qtyFmt(net) + ' ' + unit : '—'}</div>
        </div>
      </div>
      `}
      ${estAmountPaise > 0 && !hideLoss ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;font-size:13px;">
          <span style="color:#64748b;font-weight:600;">अनुमानित सेवा शुल्क:</span>
          <span style="font-size:15px;font-weight:800;color:#1e293b;">${inr(estAmountPaise)}</span>
        </div>
      ` : ''}

      ${tok.note ? `
        <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #cbd5e1;font-size:12px;color:#334155;">
          <strong>📝 नोट:</strong> ${esc(tok.note)}
        </div>
      ` : ''}
    </div>

    <!-- Action Buttons -->
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button type="button" class="btn btn-soft" data-act="token-print-pos" data-id="${tok.id}" style="padding:10px;font-weight:750;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          <span>🖨️</span> <span>पर्ची प्रिंट</span>
        </button>
        <button type="button" class="btn btn-soft" data-act="token-share-wa" data-id="${tok.id}" style="padding:10px;font-weight:750;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:#dcfce7;color:#15803d;border:1px solid #86efac;">
          <span>💬</span> <span>WhatsApp पर्ची</span>
        </button>
      </div>

      <button type="button" class="btn btn-primary" data-act="token-to-job" data-id="${tok.id}" style="padding:12px;font-weight:800;font-size:14px;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
        <span>🧾</span> <span>अभी बिल बनाएं व डिलीवर करें</span>
      </button>

      <button type="button" class="btn btn-ghost" data-act="close-modal" style="padding:8px;font-weight:700;color:#64748b;">
        ✕ बंद करें (टोकन कतार में सेव है)
      </button>
    </div>
  `);
}

