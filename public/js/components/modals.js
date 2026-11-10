// Modal Dialog Components
import { state, modalRoot } from '../state.js';
import { esc, inr, qtyFmt, unitOf, dateTxt, timeTxt, emptyBlock, phoneFmt } from '../utils/formatters.js';
import { api } from '../api.js';
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
  const data = await api('/api/customer?id=' + encodeURIComponent(id));
  if (!data) return;
  state.customer = data;
  renderCustomerModal();
}

export function renderCustomerModal() {
  const current = state.customer;
  if (!current) return;
  const balance = customerBalance(current.customer.id);
  const cls = balance > 0 ? 'due' : (balance < 0 ? 'adv' : '');
  const label = balance > 0 ? t('dueTitle') : (balance < 0 ? t('advTitle') : t('settledTitle'));

  showModal(`
    <div class="sheet-head" style="align-items:center;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${current.customer.photo
          ? `<img src="${current.customer.photo}" alt="${esc(current.customer.name)}" style="width:58px;height:58px;border-radius:50%;object-fit:cover;border:2.5px solid #4f46e5;box-shadow:0 4px 12px rgba(79,70,229,0.25);">`
          : `<div class="avatar" style="width:58px;height:58px;border-radius:50%;font-size:24px;font-weight:800;background:#e0e7ff;color:#3730a3;">${esc(current.customer.name.charAt(0) || '?')}</div>`}
        <div>
          <h3 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            ${esc(current.customer.name)}${current.customer.village ? ` <span class="tiny-chip" style="background:#f1f5f9;color:#334155;">${esc(current.customer.village)}</span>` : ''}
          </h3>
          <div class="muted" style="margin-top:2px;">
            ${current.customer.phone
              ? `<a href="tel:${current.customer.phone}" style="color:#4f46e5;font-weight:700;display:inline-flex;align-items:center;gap:4px;">📞 ${phoneFmt(current.customer.phone)}</a>`
              : '<span style="color:#94a3b8;">फोन नंबर नहीं दर्ज</span>'}
            · ${current.entries.length} हिसाब प्रविष्टियाँ
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="btn btn-sm btn-ghost" data-act="edit-cust" data-id="${current.customer.id}" title="नाम, गाँव या फोटो बदलें">✏️ ${t('editCustomer')}</button>
        ${balance === 0 ? `<button class="btn btn-sm btn-ghost" data-act="del-cust" data-id="${current.customer.id}" style="color:var(--red)">${t('deleteCustomer')}</button>` : ''}
        <button class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
      </div>
    </div>

    <div class="bal-panel ${cls}">
      <span class="bal-label">${label}</span>
      <span class="bal-val">${inr(Math.abs(balance))}</span>
    </div>

    <form data-form="payment">
      <input type="hidden" name="customerId" value="${current.customer.id}">
      <div class="two-col">
        <div class="field">
          <label for="p-amount">${t('amountRs')}</label>
          <input id="p-amount" name="amount" type="number" step="any" min="0" inputmode="decimal"
            value="${balance > 0 ? (balance / 100) : ''}" placeholder="0.00">
        </div>
        <div class="field">
          <label for="p-note">${t('noteLabel')}</label>
          <input id="p-note" name="note" maxlength="120" placeholder="e.g. Cash / UPI">
        </div>
      </div>
      <button class="btn btn-primary btn-block" type="submit">${t('recordPaymentBtn')}</button>
    </form>

    <div class="btn-row mt-14">
      ${balance > 0 ? `<button class="btn btn-ghost btn-sm" data-act="wa-remind" data-id="${current.customer.id}">${t('remindWhatsApp')}</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-act="job-for-cust" data-id="${current.customer.id}">${t('jobForCustomer')}</button>
    </div>

    <div class="section-head mt-20"><h4 class="section-title">${t('oldLedger')}</h4></div>
    <div class="row-list">
      ${current.entries.length
        ? current.entries.map((e) => {
            const lossG = e.lossG || 0;
            const netWeight = e.netWeight;
            const hasLoss = e.kind !== 'payment' && (lossG > 0 || netWeight != null);
            return `
            <div class="row-item">
              <span class="avatar small${e.kind === 'payment' ? ' pay' : ''}">${e.kind === 'payment' ? '₹' : esc((e.serviceName || 'C').charAt(0))}</span>
              <span class="grow">
                <span class="row-title ellipsis">${e.kind === 'payment' ? 'Payment' : esc(e.serviceName || 'Order') + ' · ' + qtyFmt(e.qty) + ' ' + unitOf(e.unit)}</span>
                <span class="row-sub">
                  ${dateTxt(e.at)} · ${timeTxt(e.at)}${e.tokenNo ? ' · #' + e.tokenNo : ''}
                  ${hasLoss ? ` · <span style="color:#ea580c">-${lossG}g</span> · <span style="color:#16a34a">${qtyFmt(netWeight)} ${unitOf(e.unit)}</span>` : ''}
                </span>
              </span>
              <span class="row-amt${e.kind === 'payment' ? ' amt-plus' : ''}">${e.kind === 'payment' ? '+' : ''}${inr(e.amountPaise)}</span>
              <button type="button" class="icon-btn" data-act="print-entry" data-id="${e.id}" aria-label="Print Receipt">🧾</button>
              <button type="button" class="icon-btn" data-act="wa-entry" data-id="${e.id}" aria-label="WhatsApp">📱</button>
              <button type="button" class="icon-btn" data-act="del-entry" data-id="${e.id}" aria-label="Delete">✕</button>
            </div>`;
          }).join('')
        : emptyBlock('No entries', 'No previous ledger history found.')}
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
        <input id="ec-name" name="name" maxlength="60" value="${esc(cust ? cust.name : '')}" placeholder="Customer name" required autocomplete="off">
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
  let kindBadge = '⚙️ पिसाई';
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
  showModal(`
    <div class="sheet-head" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:24px;">🔍</span>
        <div>
          <div class="sheet-title" style="font-size:18px;font-weight:800;color:#0f172a;">टोकन व पिसाई स्टेटस (Order Status)</div>
          <div style="font-size:12px;color:#64748b;">QR कोड स्कैन करें या मोबाइल नंबर व टोकन नंबर से जाँचें</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
    </div>

    <!-- Quick Camera QR Scan Button -->
    <div style="background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:14px;padding:14px;text-align:center;margin-bottom:18px;">
      <button type="button" class="btn btn-primary" data-act="status-scan-qr" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px;font-weight:700;border-radius:10px;background:linear-gradient(135deg, #4338ca, #312e81);">
        <span>📷</span> <span>रसीद / पर्ची का QR कोड स्कैन करें</span>
      </button>
      <div style="font-size:11.5px;color:#64748b;margin-top:6px;">कैमरा खोलकर पर्ची पर छपा QR कोड सामने लाएँ</div>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <div style="flex:1;height:1px;background:#e2e8f0;"></div>
      <span style="font-size:12px;color:#94a3b8;font-weight:600;">या नंबर से खोजें</span>
      <div style="flex:1;height:1px;background:#e2e8f0;"></div>
    </div>

    <!-- Manual Form -->
    <form id="status-check-form" data-act="status-check-submit" style="display:flex;flex-direction:column;gap:12px;">
      <div>
        <label for="status-phone" style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">
          ग्राहक का 10-अंकों का मोबाइल नंबर ${isShopOwner ? '<span style="color:#64748b;font-weight:400;">(वैकल्पिक)</span>' : '<span style="color:#dc2626;">*</span>'}
        </label>
        <input id="status-phone" type="tel" inputmode="numeric" maxlength="10" class="input" placeholder="जैसे: 9554880713" value="${esc(initialPhone)}" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:14px;">
      </div>

      <div>
        <label for="status-token-no" style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">
          टोकन नंबर <span style="color:#dc2626;">*</span>
        </label>
        <input id="status-token-no" type="number" inputmode="numeric" class="input" placeholder="जैसे: 14" value="${esc(initialTokenNo)}" required style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:14px;">
      </div>

      <button type="submit" class="btn btn-primary btn-block" style="padding:14px;border-radius:12px;font-weight:700;font-size:15px;margin-top:6px;min-height:50px;">
        🔍 लाइव स्थिति देखें
      </button>
    </form>

    <!-- Results Container -->
    <div id="status-result-box" style="margin-top:16px;margin-bottom:20px;"></div>
  `);
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
          ⚙️ चक्की पर पिसाई जारी है — कुछ ही देर में आटा तैयार हो जाएगा।
        </div>
      ` : ''}

      ${isDone ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;font-size:13px;color:#166534;font-weight:700;margin-bottom:14px;">
          🎉 आटा तैयार है! कृपया अपनी पर्ची दिखाकर चक्की से अनाज प्राप्त करें।
        </div>
      ` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12.5px;color:#475569;border-top:1px solid #f1f5f9;padding-top:12px;">
        <div><b>ग्राहक:</b> ${esc(t.name)}${t.village ? ' (' + esc(t.village) + ')' : ''}</div>
        <div><b>अनाज:</b> ${esc(t.serviceName)}</div>
        <div><b>कुल वज़न:</b> ${t.grossWeight} ${t.unit}</div>
        <div><b>कटौती / छीजत:</b> -${t.lossG} g</div>
        <div style="grid-column:1 / -1;font-size:14px;font-weight:800;color:#0f172a;background:#f8fafc;padding:8px 12px;border-radius:8px;">
          शुद्ध आटा (Net Output): <span style="color:#059669;">${t.netWeight} ${t.unit}</span>
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

