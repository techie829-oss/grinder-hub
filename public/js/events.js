// Centralized DOM Event Listeners & Dispatcher with Offline-First Fallback
import { state } from './state.js';
import { api, withBusy, loadState, applyState, toast, loadAdminData, getApiUrl, getAuthHeaders, performLogout, performAdminLogout } from './api.js';
import { inr, unitOf, esc, qtyFmt } from './utils/formatters.js';
import { printReceipt } from './utils/print.js';
import { entryWaText, openWhatsApp } from './utils/whatsapp.js';
import { closeModal, openCustomer, openCustomerEditModal, showJobDone, findEntry, openStatusModal, renderStatusResult, renderUniversalSearchResults } from './components/modals.js';
import { customerRows } from './components/rows.js';
import { filteredCustomers } from './views/customerView.js';
import { currentService } from './views/jobView.js';
import { showAuthError } from './views/authView.js';
import { isPhoneticMatch, latinToDeva, devaToLatin, toBilingualName } from './utils/phonetic.js';
import { setLanguage, t } from './i18n.js';
import { enqueueOfflineAction, syncOfflineQueue, saveOfflineSnapshot } from './sync.js';

export const VILLAGE_STANDARDIZATION_MAP = {
  'kewalpurwa': 'केवलपुरवा',
  'kewal purwa': 'केवलपुरवा',
  'केवल पुरवा': 'केवलपुरवा',
  'ashogapur': 'अशोगापुर',
  'asogapur': 'अशोगापुर',
  'nakaha': 'नकहा',
  'sahajani': 'सहजननी',
  'sahjani': 'सहजननी',
  'सहजनी': 'सहजननी',
  'sahajnani': 'सहजननी',
  'chandidin purwa': 'चंदीदीन पुरवा',
  'chandidin': 'चंदीदीन पुरवा',
  'चंदीदीनपुरवा': 'चंदीदीन पुरवा',
  'ahiran purwa': 'अहिरन पुरवा',
  'ahiran': 'अहिरन पुरवा',
  'अहिरनपुरवा': 'अहिरन पुरवा',
  'loniyan purwa': 'लोनियन पुरवा',
  'lonian purwa': 'लोनियन पुरवा',
  'लोनिअन पुरवा': 'लोनियन पुरवा',
  'लोनियनपुरवा': 'लोनियन पुरवा',
  'padari purwa': 'पडरी पुरवा',
  'padri purva': 'पडरी पुरवा',
  'padri purwa': 'पडरी पुरवा',
  'पडरीपुरवा': 'पडरी पुरवा',
  'choupheri': 'चौफेरी',
  'chaupheri': 'चौफेरी',
  'jhandi': 'झंडी',
  'bilriya': 'बिलरिया',
  'bilaria': 'बिलरिया',
  'lodhanpurwa': 'लोधनपुरवा',
  'lodhan purwa': 'लोधनपुरवा',
  'लोधन पुरवा': 'लोधनपुरवा',
};

export function standardizeVillage(v) {
  if (!v) return '';
  const trimmed = String(v).trim();
  const lower = trimmed.toLowerCase();
  if (VILLAGE_STANDARDIZATION_MAP[lower]) return VILLAGE_STANDARDIZATION_MAP[lower];
  if (VILLAGE_STANDARDIZATION_MAP[trimmed]) return VILLAGE_STANDARDIZATION_MAP[trimmed];
  return trimmed;
}

export function recalcJob() {
  const qtyEl = document.getElementById('j-qty');
  const rateEl = document.getElementById('j-rate');
  const lossRateEl = document.getElementById('j-loss-rate');
  const amtPreview = document.getElementById('amount-preview');
  const grossPreview = document.getElementById('gross-qty-preview');
  const lossPreview = document.getElementById('loss-total-preview');
  const netPreview = document.getElementById('net-qty-preview');
  const outputNetPreview = document.getElementById('output-net-preview');

  if (!qtyEl || !rateEl) return;
  const svc = currentService();
  const unit = svc ? unitOf(svc.unit) : 'kg';

  const enteredWeight = Number(qtyEl.value) || 0;
  const rateVal = Number(rateEl.value) || 0;
  const modeInput = document.getElementById('j-weight-mode');
  const weightMode = (modeInput && modeInput.value) || state.job.weightMode || 'gross';

  let grossWeight = enteredWeight;
  let totalLossG = 0;
  let netWeight = enteredWeight;
  let billWeight = enteredWeight;

  if (weightMode === 'output') {
    // Direct Output Entry — No chakoti / loss deduction
    grossWeight = enteredWeight;
    netWeight = enteredWeight;
    totalLossG = 0;
    billWeight = enteredWeight;
  } else {
    const lossRateVal = lossRateEl ? (Number(lossRateEl.value) || 0) : (svc ? Number(svc.lossRateG || 0) : 0);
    state.job.lossRateG = lossRateEl ? lossRateEl.value : String(lossRateVal);
    totalLossG = svc && svc.unit === 'kg' ? Math.round(grossWeight * lossRateVal) : 0;
    netWeight = svc && svc.unit === 'kg' ? Math.max(0, grossWeight - (totalLossG / 1000)) : grossWeight;

    // Default business chargeBasis from Settings
    const chargeBasis = state.data?.business?.chargeBasis || 'output';
    billWeight = chargeBasis === 'gross' ? grossWeight : netWeight;
  }

  const amountPaise = Math.round(billWeight * rateVal * 100);

  state.job.qty = qtyEl.value;
  state.job.rate = rateEl.value;
  state.job.totalLossG = totalLossG;
  state.job.netWeight = netWeight;
  state.job.grossWeight = grossWeight;

  if (amtPreview) amtPreview.textContent = inr(amountPaise);
  if (grossPreview) grossPreview.textContent = grossWeight ? `${grossWeight.toFixed(2)} ${unit}` : `0 ${unit}`;
  if (lossPreview) lossPreview.textContent = totalLossG ? `-${totalLossG} g` : '0 g';
  if (netPreview) netPreview.textContent = netWeight ? `${netWeight.toFixed(3)} ${unit}` : `0 ${unit}`;
  if (outputNetPreview) outputNetPreview.textContent = enteredWeight ? `${qtyFmt(enteredWeight)} ${unit}` : `0 ${unit}`;

  const calcHint = document.getElementById('j-calc-hint');
  if (calcHint) calcHint.textContent = inr(amountPaise);

  const jAmount = document.getElementById('j-amount');
  if (jAmount && !jAmount.dataset.manual) {
    jAmount.value = amountPaise ? (amountPaise / 100).toFixed(2).replace(/\.00$/, '') : '';
    state.job.amount = jAmount.value;
  }

  // Update round-off helper pills if present
  const baseRupees = Math.round(amountPaise / 100);
  const floorRupees = Math.floor(amountPaise / 100);
  const ceilRupees = Math.ceil(amountPaise / 100);
  const roundPills = document.querySelectorAll('.round-pill');
  if (roundPills && roundPills.length >= 3) {
    roundPills[0].dataset.val = String(floorRupees);
    roundPills[0].textContent = `₹${floorRupees}`;
    roundPills[1].dataset.val = String(baseRupees);
    roundPills[1].textContent = `₹${baseRupees}`;
    roundPills[2].dataset.val = String(ceilRupees);
    roundPills[2].textContent = `₹${ceilRupees}`;
  }
}

export function recalcToken() {
  const qtyEl = document.getElementById('t-qty');
  const lossRateEl = document.getElementById('t-loss-rate');
  const grossPreview = document.getElementById('t-gross-preview');
  const lossPreview = document.getElementById('t-loss-preview');
  const netPreview = document.getElementById('t-net-preview');
  const estPreview = document.getElementById('t-est-preview');

  if (!qtyEl) return;
  const svc = (state.data?.services || []).find((s) => s.id === state.tokenForm.serviceId);
  const unit = svc ? unitOf(svc.unit) : 'kg';

  const grossWeight = Number(qtyEl.value) || 0;
  const lossRateVal = lossRateEl ? (Number(lossRateEl.value) || 0) : (svc ? Number(svc.lossRateG || 0) : 0);

  state.tokenForm.qty = qtyEl.value;
  state.tokenForm.lossRateG = lossRateEl ? lossRateEl.value : String(lossRateVal);

  const totalLossG = svc && svc.unit === 'kg' ? Math.round(grossWeight * lossRateVal) : 0;
  const netWeight = svc && svc.unit === 'kg' ? Math.max(0, grossWeight - (totalLossG / 1000)) : grossWeight;
  const estAmountPaise = svc ? Math.round(grossWeight * svc.ratePaise) : 0;

  state.tokenForm.totalLossG = totalLossG;
  state.tokenForm.netWeight = netWeight;

  if (grossPreview) grossPreview.textContent = grossWeight ? `${grossWeight} ${unit}` : `0 ${unit}`;
  if (lossPreview) lossPreview.textContent = totalLossG ? `-${totalLossG} g` : '0 g';
  if (netPreview) netPreview.textContent = netWeight ? `${netWeight.toFixed(3).replace(/\.?0+$/, '')} ${unit}` : `0 ${unit}`;
  if (estPreview) estPreview.textContent = inr(estAmountPaise);
}

export function pickService(target, id) {
  const svc = state.data.services.find((s) => s.id === id);
  if (!svc) return;

  if (target === 'job') {
    state.job.serviceId = id;
    state.job.rate = String(svc.ratePaise / 100);
    state.job.lossRateG = String(svc.lossRateG || 0);

    document.querySelectorAll('[data-act="pick-svc"][data-target="job"]').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.id === id);
    });

    const qtyLabel = document.getElementById('j-qty-label');
    const rateLabel = document.getElementById('j-rate-label');
    const lossLabel = document.getElementById('j-loss-rate-label');
    const rateInput = document.getElementById('j-rate');
    const lossInput = document.getElementById('j-loss-rate');

    if (qtyLabel) qtyLabel.textContent = t('qtyLabel', { unit: unitOf(svc.unit) });
    if (rateLabel) rateLabel.textContent = t('rateLabel', { unit: unitOf(svc.unit) });
    if (lossLabel) lossLabel.textContent = t('lossRateLabel', { unit: unitOf(svc.unit) });
    if (rateInput) rateInput.value = state.job.rate;
    if (lossInput) lossInput.value = state.job.lossRateG;
    const jAmount = document.getElementById('j-amount');
    if (jAmount) delete jAmount.dataset.manual;

    recalcJob();
  } else {
    state.tokenForm.serviceId = id;
    document.querySelectorAll('[data-act="pick-svc"][data-target="token"]').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.id === id);
    });

    const qtyLabel = document.getElementById('t-qty-label');
    const lossLabel = document.getElementById('t-loss-rate-label');
    const lossInput = document.getElementById('t-loss-rate');

    if (qtyLabel) qtyLabel.innerHTML = `कुल आवक वज़न (${unitOf(svc.unit)}) *`;
    if (lossLabel) lossLabel.textContent = `काट / घटौती दर (g/${unitOf(svc.unit)})`;
    if (lossInput && svc.lossRateG !== undefined) {
      lossInput.value = svc.lossRateG || 0;
      state.tokenForm.lossRateG = String(svc.lossRateG || 0);
    }
    recalcToken();
  }
}

export function goTo(view) {
  state.view = view;
  state.q = '';
  closeModal();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (view === 'admin') {
    window.location.hash = '#admin';
    loadAdminData();
    return;
  }
  if (window.location.hash === '#admin') {
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {}
  }

  if (!state.data) {
    window.__appRender?.();
    return;
  }
  if (view === 'reports') {
    loadState(state.range);
    return;
  }
  if (state.data.stats.range !== 'today') {
    loadState('today');
    return;
  }
  window.__appRender?.();
}

export function updateCustomerDisambiguation(prefix = 'j', isConfirmed = false) {
  const isJob = prefix === 'j';
  const nameEl = document.getElementById(isJob ? 'j-name' : 'tr-name');
  const villageEl = document.getElementById(isJob ? 'j-village' : 'tr-village');
  const phoneEl = document.getElementById(isJob ? 'j-phone' : 'tr-phone');
  const hiddenIdEl = document.getElementById(isJob ? 'j-customer-id' : 'tr-customer-id');
  const hiddenNewEl = document.getElementById(isJob ? 'j-is-new-customer' : 'tr-is-new-customer');
  const disambigWrap = document.getElementById(isJob ? 'cust-disambig-wrap' : 'tr-cust-disambig-wrap');
  const banner = document.getElementById(isJob ? 'cust-balance-banner' : 'tr-cust-balance-banner');

  const photoCustName = document.getElementById(isJob ? 'job-photo-cust-name' : 'tr-photo-cust-name');
  const photoImg = document.getElementById(isJob ? 'job-photo-img' : 'tr-photo-img');
  const photoPh = document.getElementById(isJob ? 'job-photo-ph' : 'tr-photo-ph');
  const photoHidden = document.getElementById(isJob ? 'j-photo' : 'tr-photo');
  const photoBtnTxt = document.getElementById(isJob ? 'job-photo-btn-txt' : 'tr-photo-btn-txt');
  const photoClear = document.getElementById(isJob ? 'job-photo-clear' : 'tr-photo-clear');

  const rawName = (nameEl?.value || '').trim();
  const rawVillage = (villageEl?.value || '').trim();
  const rawPhone = (phoneEl?.value || '').replace(/\D/g, '');

  if (photoCustName) {
    photoCustName.textContent = rawName ? `${rawName}${rawVillage ? ' (' + rawVillage + ')' : ''}` : 'ग्राहक का नाम ऊपर लिखें';
  }

  if (!state.data || !disambigWrap || !banner) return;

  // 1. If operator previously chose to force create a new customer
  if (hiddenNewEl && hiddenNewEl.value === '1') {
    disambigWrap.style.display = 'block';
    disambigWrap.innerHTML = `
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
        <div style="font-size:12px;color:#166534;line-height:1.35;">
          <strong>✨ नया अलग खाता बनेगा:</strong> ${esc(rawName || 'नया ग्राहक')}${rawVillage ? ' (' + esc(rawVillage) + ')' : ''}<br>
          <span style="font-size:11px;color:#15803d;">अलग पहचान के लिए नाम में उपनाम या पिता का नाम जोड़ें (उदा: ${esc(rawName || 'दिनेश')} (मास्टर जी))</span>
        </div>
        <button type="button" class="btn btn-xs btn-ghost" data-act="reset-cust-match" data-prefix="${prefix}" style="font-size:11px;color:#4f46e5;font-weight:750;padding:4px 8px;border-radius:6px;border:1px solid #c7d2fe;background:#fff;white-space:nowrap;flex-shrink:0;">
          🔄 दोबारा खोजें
        </button>
      </div>`;
    banner.style.display = 'none';
    if (hiddenIdEl) hiddenIdEl.value = 'new';
    return;
  }

  // 2. If already confirmed selection exists
  const currentCustId = hiddenIdEl?.value;
  if (currentCustId && currentCustId !== 'new') {
    const matched = (state.data.customers || []).find((c) => c.id === currentCustId);
    if (matched && (!rawName || isPhoneticMatch(matched.name, rawName) || matched.name.toLowerCase() === rawName.toLowerCase())) {
      disambigWrap.style.display = 'none';
      renderCustomerBanner(matched, banner, prefix, photoImg, photoPh, photoHidden, photoBtnTxt, photoClear);
      return;
    }
  }

  // 3. If no input to search
  if (rawName.length < 1 && rawPhone.length < 2) {
    disambigWrap.style.display = 'none';
    banner.style.display = 'none';
    if (hiddenIdEl) hiddenIdEl.value = '';
    if (photoImg) { photoImg.src = ''; photoImg.style.display = 'none'; }
    if (photoPh) photoPh.style.display = 'block';
    if (photoHidden) photoHidden.value = '';
    if (photoBtnTxt) photoBtnTxt.textContent = 'ग्राहक का फोटो खींचें';
    if (photoClear) photoClear.style.display = 'none';
    return;
  }

  // 4. Search matching candidates
  const candidates = (state.data.customers || []).filter((c) => {
    // Exact or partial phone match
    if (rawPhone && c.phone) {
      const cPhone = c.phone.replace(/\D/g, '');
      if (cPhone.includes(rawPhone)) return true;
    }
    if (!rawName) return false;

    // Direct name match or substring
    const cNameLower = (c.name || '').toLowerCase();
    const qLower = rawName.toLowerCase();
    if (cNameLower.includes(qLower)) return true;

    // Village filter if specified
    if (rawVillage && c.village && !isPhoneticMatch(c.village, rawVillage)) {
      return false;
    }

    // Phonetic Hindi/English match
    if (isPhoneticMatch(c.name, rawName)) return true;
    if (isPhoneticMatch(c.name, latinToDeva(rawName))) return true;

    return false;
  });

  // Sort candidates
  candidates.sort((a, b) => {
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    const q = rawName.toLowerCase();
    if (aName === q) return -1;
    if (bName === q) return 1;
    if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
    if (!aName.startsWith(q) && bName.startsWith(q)) return 1;
    return 0;
  });

  const matches = candidates.slice(0, 8);

  if (matches.length === 0) {
    banner.style.display = 'none';
    if (hiddenIdEl) hiddenIdEl.value = '';
    if (rawName.length >= 2 || rawPhone.length >= 4) {
      disambigWrap.style.display = 'block';
      disambigWrap.innerHTML = `
        <div class="cust-suggest-box" style="padding:10px 12px;background:#f8fafc;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div style="font-size:12px;color:#334155;line-height:1.4;">
              <span>ℹ️</span> <strong>"${esc(rawName || rawPhone)}"</strong> रिकॉर्ड में नहीं मिला।
            </div>
            <button type="button" class="cust-suggest-close" data-act="close-cust-suggest" data-prefix="${prefix}">✕</button>
          </div>
          <div style="margin-top:6px;font-size:11.5px;color:#16a34a;font-weight:600;">
            ✓ यह नया ग्राहक माना जाएगा और बिल सेव करते ही इसका खाता बन जाएगा।
          </div>
        </div>`;
    } else {
      disambigWrap.style.display = 'none';
    }
    return;
  }

  // Exact 100% full match
  const exact = matches.length === 1 && (
    (rawName && matches[0].name.trim().toLowerCase() === rawName.trim().toLowerCase()) ||
    (rawPhone.length === 10 && matches[0].phone && matches[0].phone.replace(/\D/g, '') === rawPhone) ||
    isConfirmed
  );

  if (exact) {
    const c = matches[0];
    disambigWrap.style.display = 'none';
    if (hiddenIdEl) hiddenIdEl.value = c.id;
    if (hiddenNewEl) hiddenNewEl.value = '0';
    renderCustomerBanner(c, banner, prefix, photoImg, photoPh, photoHidden, photoBtnTxt, photoClear);
    return;
  }

  // Show modern suggestions list
  if (hiddenIdEl) hiddenIdEl.value = '';
  banner.style.display = 'none';
  disambigWrap.style.display = 'block';
  disambigWrap.innerHTML = `
    <div class="cust-suggest-box">
      <div class="cust-suggest-header">
        <div class="cust-suggest-title">
          <span>👥</span> <span>ग्राहक सूची (${matches.length})</span>
        </div>
        <button type="button" class="cust-suggest-close" data-act="close-cust-suggest" data-prefix="${prefix}" title="बंद करें">✕</button>
      </div>
      <div class="cust-suggest-list">
        ${matches.map((c) => {
          const balCls = c.balancePaise > 0 ? 'due' : (c.balancePaise < 0 ? 'adv' : 'zero');
          const balTxt = c.balancePaise > 0
            ? inr(c.balancePaise) + ' बाकी'
            : (c.balancePaise < 0 ? inr(-c.balancePaise) + ' जमा' : '₹0 चुकता');
          return `
          <div class="cust-suggest-item" data-act="pick-disambig-cust" data-prefix="${prefix}" data-id="${c.id}">
            <div class="cust-suggest-avatar">
              ${c.photo ? `<img src="${c.photo}" alt="${esc(c.name)}">` : `<span>${esc((c.name || 'G').charAt(0).toUpperCase())}</span>`}
            </div>
            <div class="cust-suggest-info">
              <div class="cust-suggest-name-row">
                <span class="cust-suggest-name">${esc(c.name)}</span>
                ${c.village ? `<span class="cust-suggest-village">📍 ${esc(c.village)}</span>` : ''}
              </div>
              <div class="cust-suggest-meta">
                ${c.phone ? `<span class="cust-suggest-phone">📞 ${esc(c.phone)}</span>` : '<span class="cust-suggest-phone muted">फोन नहीं</span>'}
                <span class="cust-suggest-bal ${balCls}">${balTxt}</span>
              </div>
            </div>
            <button type="button" class="cust-suggest-pick-btn" data-act="pick-disambig-cust" data-prefix="${prefix}" data-id="${c.id}">
              चुनें ✓
            </button>
          </div>`;
        }).join('')}
      </div>
      <div class="cust-suggest-footer">
        <span style="font-size:11px;color:#64748b;">यह इनमें से कोई नहीं हैं?</span>
        <button type="button" class="btn btn-xs cust-new-btn" data-act="force-new-cust" data-prefix="${prefix}">
          ➕ नया अलग खाता बनाएं
        </button>
      </div>
    </div>
  `;

  // Auto-scroll into view smoothly so keyboard doesn't hide it
  try {
    disambigWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (ignored) {}
}

function renderCustomerBanner(c, banner, prefix, photoImg, photoPh, photoHidden, photoBtnTxt, photoClear) {
  const cls = c.balancePaise > 0 ? 'due' : (c.balancePaise < 0 ? 'adv' : 'zero');
  const balTxt = c.balancePaise > 0
    ? inr(c.balancePaise) + ' ' + t('dueTag')
    : (c.balancePaise < 0 ? inr(-c.balancePaise) + ' ' + t('advTag') : t('settledTag'));

  banner.className = `cust-banner ${cls}`;
  banner.style.display = 'flex';
  banner.style.alignItems = 'center';
  banner.style.justifyContent = 'space-between';
  banner.style.gap = '8px';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;min-width:0;" class="ellipsis">
      ${c.photo ? `<img src="${c.photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid #a5b4fc;flex-shrink:0;">` : `<span class="avatar small" style="width:28px;height:28px;font-size:12px;flex-shrink:0;">${esc((c.name || 'G').charAt(0).toUpperCase())}</span>`}
      <div class="ellipsis" style="line-height:1.25;">
        <div><strong>${esc(c.name)}${c.village ? ' (' + esc(c.village) + ')' : ''}</strong></div>
        <div style="font-size:11.5px;">खाता: <strong>${balTxt}</strong> ${c.phone ? `<span style="font-size:11px;color:#64748b;">(📞 ${esc(c.phone)})</span>` : ''}</div>
      </div>
    </div>
    <button type="button" class="btn btn-xs btn-ghost" data-act="force-new-cust" data-prefix="${prefix}" title="अगर यह व्यक्ति अलग हैं तो नया खाता बनाएं" style="color:#dc2626;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid #fecaca;background:#fff;white-space:nowrap;flex-shrink:0;">
      ✕ यह वो नहीं हैं
    </button>
  `;

  if (c.photo) {
    if (photoImg) { photoImg.src = c.photo; photoImg.style.display = 'block'; }
    if (photoPh) photoPh.style.display = 'none';
    if (photoHidden) photoHidden.value = c.photo;
    if (photoBtnTxt) photoBtnTxt.textContent = 'नया फोटो लें';
    if (photoClear) photoClear.style.display = 'inline-flex';
  }
}

export function setupEventListeners() {
  // Global click handler
  document.addEventListener('click', async (ev) => {
    // Tap anywhere on a customer suggestion card item to select
    const suggestItem = ev.target.closest('.cust-suggest-item');
    if (suggestItem && !ev.target.closest('.cust-suggest-pick-btn')) {
      const pickBtn = suggestItem.querySelector('.cust-suggest-pick-btn');
      if (pickBtn) {
        pickBtn.click();
        return;
      }
    }

    // Dismiss suggestions when clicking outside customer inputs
    const isInsideCust = ev.target.closest('#cust-disambig-wrap, #tr-cust-disambig-wrap, #j-name, #j-village, #j-phone, #tr-name, #tr-village, #tr-phone');
    if (!isInsideCust) {
      const jWrap = document.getElementById('cust-disambig-wrap');
      const trWrap = document.getElementById('tr-cust-disambig-wrap');
      const jNew = document.getElementById('j-is-new-customer');
      if (jWrap && (!jNew || jNew.value !== '1')) jWrap.style.display = 'none';
      const trNew = document.getElementById('tr-is-new-customer');
      if (trWrap && (!trNew || trNew.value !== '1')) trWrap.style.display = 'none';
    }

    // Photo clear buttons
    if (ev.target && ev.target.id === 'job-photo-clear') {
      const hidden = document.getElementById('j-photo');
      const img = document.getElementById('job-photo-img');
      const ph = document.getElementById('job-photo-ph');
      const btnTxt = document.getElementById('job-photo-btn-txt');
      if (hidden) hidden.value = '';
      if (img) { img.src = ''; img.style.display = 'none'; }
      if (ph) ph.style.display = 'block';
      ev.target.style.display = 'none';
      if (btnTxt) btnTxt.textContent = 'ग्राहक का फोटो खींचें';
      toast('फोटो हटाई गई');
      return;
    }

    if (ev.target && ev.target.id === 'cust-photo-clear') {
      const hidden = document.getElementById('ec-photo');
      const img = document.getElementById('cust-photo-img');
      const ph = document.getElementById('cust-photo-placeholder');
      const btnTxt = document.getElementById('cust-photo-btn-text');
      if (hidden) hidden.value = '';
      if (img) { img.src = ''; img.style.display = 'none'; }
      if (ph) ph.style.display = 'block';
      ev.target.style.display = 'none';
      if (btnTxt) btnTxt.textContent = 'ग्राहक का फोटो लें';
      toast('फोटो हटाई गई');
      return;
    }

    if (ev.target && ev.target.id === 'tr-photo-clear') {
      const hidden = document.getElementById('tr-photo');
      const img = document.getElementById('tr-photo-img');
      const ph = document.getElementById('tr-photo-ph');
      const btnTxt = document.getElementById('tr-photo-btn-txt');
      if (hidden) hidden.value = '';
      if (img) { img.src = ''; img.style.display = 'none'; }
      if (ph) ph.style.display = 'block';
      ev.target.style.display = 'none';
      if (btnTxt) btnTxt.textContent = 'ग्राहक का फोटो खींचें';
      toast('फोटो हटाई गई');
      return;
    }

    const lossPreset = ev.target.closest('.token-loss-preset');
    if (lossPreset) {
      const loss = lossPreset.dataset.loss;
      const lossInput = document.getElementById('t-loss-rate');
      if (lossInput) {
        lossInput.value = loss;
        state.tokenForm.lossRateG = loss;
        recalcToken();
      }
      return;
    }

    const jobLossPreset = ev.target.closest('.pos-loss-pill.loss-preset');
    if (jobLossPreset) {
      const g = jobLossPreset.dataset.g;
      const lossInput = document.getElementById('j-loss-rate');
      if (lossInput) {
        lossInput.value = g;
        state.job.lossRateG = g;
        recalcJob();
      }
      return;
    }

    const roundPill = ev.target.closest('.round-pill');
    if (roundPill) {
      const val = roundPill.dataset.val;
      const jAmt = document.getElementById('j-amount');
      if (jAmt) {
        jAmt.value = val;
        jAmt.dataset.manual = '1';
      }
      state.job.amount = val;
      return;
    }

    const backdrop = ev.target.closest('.sheet-backdrop');
    if (backdrop && ev.target === backdrop) {
      closeModal();
      return;
    }

    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;

    switch (act) {
      case 'goto':
        goTo(el.dataset.view);
        break;

      case 'trigger-sync':
        toast('Syncing with server…');
        await syncOfflineQueue();
        break;

      case 'download-app-update': {
        const { triggerAppDownload } = await import('./utils/updater.js');
        triggerAppDownload();
        break;
      }

      case 'open-update-modal': {
        const { openUpdatePromptModal } = await import('./utils/updater.js');
        openUpdatePromptModal();
        break;
      }

      case 'dismiss-update-banner': {
        const { dismissUpdateBanner } = await import('./utils/updater.js');
        dismissUpdateBanner();
        break;
      }

      case 'check-app-update': {
        const { isUpdateAvailable, openUpdatePromptModal, getInstalledAppInfo } = await import('./utils/updater.js');
        if (isUpdateAvailable()) {
          openUpdatePromptModal();
        } else {
          const installed = getInstalledAppInfo();
          toast(`आपका ऐप पहले से ही नवीनतम वर्ज़न (v${installed.version}) पर है ✓`);
        }
        break;
      }

      case 'copy-update-link': {
        const link = el.dataset.url || 'https://tolmaal.solidrix.com/download';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(() => {
            toast('डाउनलोड लिंक कॉपी हो गया! अपने ब्राउज़र में खोलें ✓');
          }).catch(() => {
            prompt('डाउनलोड लिंक यहाँ से कॉपी करें:', link);
          });
        } else {
          prompt('डाउनलोड लिंक यहाँ से कॉपी करें:', link);
        }
        break;
      }

      case 'hard-refresh': {
        const icon = el.querySelector('.refresh-icon');
        if (icon) icon.classList.add('is-spinning');
        toast('डेटा ताज़ा हो रहा है…');

        // 1. Reset all form inputs and transient state
        state.job.qty = '';
        state.job.rate = '';
        state.job.lossRateG = '';
        state.job.totalLossG = 0;
        state.job.netWeight = 0;
        state.job.amount = '';
        state.job.paid = true;
        state.job.name = '';
        state.job.village = '';
        state.job.phone = '';
        state.job.photo = '';
        state.job.note = '';
        state.job.withToken = false;
        state.job.tokenId = null;
        state.job.tokenNo = null;

        state.trade.qty = '';
        state.trade.rate = '';
        state.trade.item = '';
        state.trade.paid = true;
        state.trade.name = '';
        state.trade.village = '';
        state.trade.phone = '';
        state.trade.photo = '';
        state.trade.note = '';

        state.tokenForm.name = '';
        state.tokenForm.village = '';
        state.tokenForm.phone = '';
        state.tokenForm.note = '';
        state.tokenForm.qty = '';
        state.tokenForm.lossRateG = '';
        state.tokenForm.totalLossG = 0;
        state.tokenForm.netWeight = 0;

        state.q = '';
        closeModal();

        // 2. Sync any pending offline queue first
        try {
          await syncOfflineQueue();
        } catch (e) {}

        // 3. Force re-fetch fresh state with cache-busting timestamp
        try {
          const fresh = await api('/api/state?range=' + encodeURIComponent(state.range) + '&_t=' + Date.now());
          if (fresh && fresh.state) {
            applyState(fresh.state);
          } else {
            await loadState(state.range);
          }
        } catch (e) {
          await loadState(state.range);
        }

        // 4. Trigger ServiceWorker check for background updates
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((r) => r.update());
          }).catch(() => {});
        }

        window.__appRender?.();
        if (icon) setTimeout(() => icon.classList.remove('is-spinning'), 600);
        toast('डेटा ताज़ा व फॉर्म रीसेट ✓');
        break;
      }

      case 'auth-mode':
        state.auth.mode = el.dataset.mode || 'login';
        state.auth.error = '';
        try {
          if (state.auth.mode === 'status') {
            window.location.hash = '#status';
          } else if (state.auth.mode === 'login') {
            window.location.hash = '#login';
          } else if (state.auth.mode === 'signup') {
            window.location.hash = '#signup';
          }
        } catch (e) {}
        window.__appRender?.();
        break;

      case 'range':
        state.range = el.dataset.range;
        await loadState(state.range);
        break;

      case 'pick-svc':
        pickService(el.dataset.target, el.dataset.id);
        break;

      case 'switch-job-tab':
        state.jobTab = el.dataset.tab || 'grind';
        if (el.dataset.goto) goTo(el.dataset.goto);
        else window.__appRender?.();
        break;

      case 'pick-trade-preset':
        state.trade.item = el.dataset.item || '';
        state.trade.unit = el.dataset.unit || 'kg';
        state.trade.rate = el.dataset.rate || '';
        window.__appRender?.();
        break;

      case 'clear-job-token':
        state.job.tokenId = null;
        state.job.tokenNo = null;
        state.job.note = '';
        state.job.amount = '';
        window.__appRender?.();
        break;

      case 'set-weight-mode': {
        const mode = el.dataset.mode || 'gross';
        state.job.weightMode = mode;
        const modeInput = document.getElementById('j-weight-mode');
        if (modeInput) modeInput.value = mode;

        // Update toggle button styles without full page reload
        const modeButtons = document.querySelectorAll('[data-act="set-weight-mode"]');
        modeButtons.forEach((btn) => {
          const isSelected = btn.dataset.mode === mode;
          btn.className = `btn btn-xs ${isSelected ? 'btn-primary' : 'btn-ghost'}`;
          btn.style.color = isSelected ? '#fff' : '#475569';
        });

        // Toggle label and strips without clearing customer name, phone or village
        const qtyLabel = document.getElementById('j-qty-label');
        const svc = currentService();
        const unit = svc ? unitOf(svc.unit) : 'kg';
        if (qtyLabel) {
          qtyLabel.innerHTML = mode === 'output'
            ? `तैयार माल (Output) वजन (${unit}) *`
            : `आवक वजन (${unit}) *`;
        }
        const lossStrip = document.getElementById('j-loss-strip');
        const outputStrip = document.getElementById('j-output-info-strip');
        if (lossStrip) lossStrip.style.display = mode === 'output' ? 'none' : 'flex';
        if (outputStrip) outputStrip.style.display = mode === 'output' ? 'flex' : 'none';

        const jAmount = document.getElementById('j-amount');
        if (jAmount) delete jAmount.dataset.manual;
        recalcJob();
        break;
      }

      case 'issue-token-from-job': {
        const qtyVal = parseFloat(document.getElementById('j-qty')?.value) || parseFloat(state.job.qty) || 0;
        if (!(qtyVal > 0)) {
          toast('कृपया वजन दर्ज करें', true);
          document.getElementById('j-qty')?.focus();
          break;
        }

        const modeInput = document.getElementById('j-weight-mode');
        const weightMode = (modeInput && modeInput.value) || state.job.weightMode || 'gross';

        const name = String(document.getElementById('j-name')?.value || state.job.name || '').trim();
        const village = String(document.getElementById('j-village')?.value || state.job.village || '').trim();
        const phone = String(document.getElementById('j-phone')?.value || state.job.phone || '').trim();

        let grossWeight = qtyVal;
        let lossRateG = 0;
        let totalLossG = 0;
        let netWeight = qtyVal;

        if (weightMode === 'output') {
          grossWeight = qtyVal;
          netWeight = qtyVal;
          lossRateG = 0;
          totalLossG = 0;
        } else {
          lossRateG = parseFloat(document.getElementById('j-loss-rate')?.value) || parseFloat(state.job.lossRateG) || 0;
          totalLossG = Math.round(qtyVal * lossRateG);
          netWeight = Math.max(0, qtyVal - (totalLossG / 1000));
        }

        const note = String(document.getElementById('j-note')?.value || state.job.note || '').trim();
        const hideLoss = Boolean(state.data?.business?.hideLossOnSlip !== false);
        const chargeBasis = weightMode === 'output' ? 'output' : (state.data?.business?.chargeBasis || 'output');

        const payload = {
          serviceId: state.job.serviceId,
          name,
          village,
          phone,
          grossWeight,
          lossRateG,
          totalLossG,
          netWeight,
          chargeBasis,
          hideLoss,
          note,
        };

        await withBusy(el, async () => {
          const data = await api('/api/tokens', payload);
          if (data && data.offline) {
            const nextNo = state.data.tokens.nextNo;
            state.data.tokens.nextNo += 1;
            enqueueOfflineAction('token', { ...payload, no: nextNo, at: Date.now() });

            const offTok = {
              id: 'offline-' + crypto.randomUUID(),
              no: nextNo,
              name: name || 'Customer',
              village: village || '',
              phone: phone || '',
              serviceId: payload.serviceId,
              grossWeight: qtyVal,
              lossG: totalLossG,
              netWeight: netWeight,
              hideLoss,
              note,
              status: 'waiting',
              at: Date.now(),
            };
            state.data.tokens.waiting.push(offTok);
            saveOfflineSnapshot(state.data);

            state.job.name = '';
            state.job.village = '';
            state.job.phone = '';
            state.job.qty = '';
            state.job.note = '';
            state.job.amount = '';

            window.__appRender?.();
            const { openTokenReceiptModal } = await import('./components/modals.js');
            openTokenReceiptModal(offTok);
            toast(`टोकन #${nextNo} जारी किया गया (ऑफ़लाइन)`);
            return;
          }

          if (data && data.ok) {
            applyState(data.state);
            state.job.name = '';
            state.job.village = '';
            state.job.phone = '';
            state.job.qty = '';
            state.job.note = '';
            state.job.amount = '';

            window.__appRender?.();
            if (data.token) {
              const { openTokenReceiptModal } = await import('./components/modals.js');
              openTokenReceiptModal(data.token);
            }
            toast(`टोकन #${data.token?.no || ''} जारी किया गया!`);
          }
        });
        break;
      }

      // --- Order / Token Status & Universal Search Actions ---
      case 'open-status-modal':
        openStatusModal();
        break;

      case 'status-voice-search': {
        const pulse = document.getElementById('status-voice-pulse');
        const queryInput = document.getElementById('status-search-query');
        const { startQuickVoiceSearch } = await import('./hardware/voiceCommander.js');
        const { renderUniversalSearchResults } = await import('./components/modals.js');
        try {
          if (pulse) pulse.style.display = 'block';
          startQuickVoiceSearch(
            (transcript) => {
              if (pulse) pulse.style.display = 'none';
              if (queryInput) {
                queryInput.value = transcript;
                queryInput.focus();
              }
              renderUniversalSearchResults(transcript);
              toast(`Voice: "${transcript}" ✓`);
            },
            (err) => {
              if (pulse) pulse.style.display = 'none';
              toast(`Voice search: ${err}`);
            },
            () => {
              if (pulse) pulse.style.display = 'block';
            }
          );
        } catch (err) {
          if (pulse) pulse.style.display = 'none';
          toast(err.message);
        }
        break;
      }

      case 'cust-voice-search': {
        const queryInput = document.getElementById('cust-search');
        const { startQuickVoiceSearch } = await import('./hardware/voiceCommander.js');
        try {
          startQuickVoiceSearch(
            (transcript) => {
              if (queryInput) {
                queryInput.value = transcript;
                state.q = transcript;
                const list = document.getElementById('cust-list');
                import('./views/customerView.js').then(({ filteredCustomers }) => {
                  import('./components/rows.js').then(({ customerRows }) => {
                    if (list) list.innerHTML = customerRows(filteredCustomers());
                  });
                });
              }
              toast(`Voice: "${transcript}" ✓`);
            },
            (err) => {
              toast(`Voice search: ${err}`);
            }
          );
        } catch (err) {
          toast(err.message);
        }
        break;
      }

      case 'search-to-job': {
        const cid = el.dataset.id;
        const cust = (state.data?.customers || []).find((c) => c.id === cid);
        if (cust) {
          state.job.name = cust.name;
          state.job.village = cust.village || '';
          state.job.phone = cust.phone || '';
          closeModal();
          goTo('job');
          toast(`Selected: ${cust.name}`);
        }
        break;
      }

      case 'reset-token-counter': {
        if (!confirm('क्या आप टोकन नंबर को तुरंत #1 पर रीसेट करना चाहते हैं?')) return;
        const res = await api('/api/tokens/reset-counter', {});
        if (res && res.ok && res.state) {
          applyState(res.state);
          toast('टोकन नंबर #1 पर रीसेट हो गया ✓');
        }
        break;
      }

      case 'status-scan-qr': {
        const { openQrScannerModal } = await import('./hardware/hardwareModal.js');
        openQrScannerModal(async (parsed, rawVal) => {
          let tokenNo = parsed.tokenNo || null;
          let phone = '';

          const phoneMatch = String(rawVal).match(/(?:\+91|0)?([6-9]\d{9})/);
          if (phoneMatch) phone = phoneMatch[1];
          if (!tokenNo) {
            const match = String(rawVal).match(/(?:token[:#\s]*|#\s*)(\d+)/i);
            if (match) tokenNo = parseInt(match[1], 10);
          }

          const onPageTokenInput = document.getElementById('status-token-no');
          if (!onPageTokenInput) {
            openStatusModal(tokenNo || '', phone || '');
          }

          if (tokenNo) {
            const phoneInput = document.getElementById('status-phone');
            const tokenInput = document.getElementById('status-token-no');
            if (phoneInput && phone) phoneInput.value = phone;
            if (tokenInput && tokenNo) tokenInput.value = tokenNo;

            const isShopOwner = !!state.data;
            if (isShopOwner || (phone && phone.length === 10)) {
              toast(`QR स्कैन सफल: टोकन #${tokenNo}`);
              const res = await fetch(getApiUrl('/api/status'), {
                method: 'POST',
                headers: { 'content-type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ token: tokenNo, phone }),
                credentials: 'include',
              }).then((r) => r.json()).catch(() => null);
              renderStatusResult(res);
            } else {
              toast(`टोकन #${tokenNo} स्कैन हुआ! कृपया अपना मोबाइल नंबर दर्ज करें।`);
              if (phoneInput) phoneInput.focus();
            }
          } else {
            toast('QR कोड से टोकन नंबर नहीं मिल सका');
          }
        });
        break;
      }

      // --- Super Admin Platform Actions ---
      case 'admin-refresh':
        toast('डेटा ताज़ा हो रहा है...');
        await loadAdminData();
        break;

      case 'admin-logout':
        await performAdminLogout();
        break;

      case 'admin-filter':
        state.admin.filter = el.dataset.filter;
        window.__appRender?.();
        break;

      case 'admin-toggle-status': {
        const businessId = el.dataset.id;
        const newStatus = el.dataset.status;
        const res = await api('/api/admin/tenants/status', { businessId, status: newStatus });
        if (res && res.ok) {
          toast(res.message || `स्टेटस अपडेट: ${newStatus}`);
          await loadAdminData();
        }
        break;
      }

      case 'admin-reset-pw': {
        const businessId = el.dataset.id;
        const name = el.dataset.name;
        const newPassword = prompt(`"${name}" के लिए नया पासवर्ड दर्ज करें (कम से कम 6 अक्षर):`);
        if (!newPassword) return;
        if (newPassword.trim().length < 6) {
          toast('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए');
          return;
        }
        const res = await api('/api/admin/tenants/reset-password', { businessId, newPassword: newPassword.trim() });
        if (res && res.ok) {
          toast('पासवर्ड सफलतापूर्वक बदला गया ✓');
        }
        break;
      }

      case 'admin-impersonate': {
        const businessId = el.dataset.id;
        const name = el.dataset.name;
        if (!confirm(`क्या आप "${name}" की दुकान में प्रवेश करना चाहते हैं?`)) return;
        const res = await api('/api/admin/tenants/impersonate', { businessId });
        if (res && res.ok && res.state) {
          applyState(res.state);
          toast(`"${name}" की दुकान खुली ✓`);
          goTo('dashboard');
        }
        break;
      }

      // --- Hardware & Machine Automation Actions ---
      case 'hw-scale-ocr': {
        const target = el.dataset.target || (state.view === 'token' ? 'token' : 'job');
        const { openScaleOcrModal } = await import('./hardware/hardwareModal.js');
        openScaleOcrModal((lockedWeight) => {
          if (target === 'token') {
            state.tokenForm.qty = String(lockedWeight);
            const qtyInput = document.getElementById('t-qty');
            if (qtyInput) qtyInput.value = state.tokenForm.qty;
            recalcToken();
          } else {
            state.job.qty = String(lockedWeight);
            const qtyInput = document.getElementById('j-qty');
            if (qtyInput) qtyInput.value = state.job.qty;
            recalcJob();
          }
          window.__appRender?.();
          toast(`Scale reading locked: ${lockedWeight} kg ✓`);
        });
        break;
      }

      case 'hw-scale-bt': {
        const { openScaleConnectModal } = await import('./hardware/hardwareModal.js');
        openScaleConnectModal((lockedWeight) => {
          state.job.qty = String(lockedWeight);
          const qtyInput = document.getElementById('j-qty');
          if (qtyInput) qtyInput.value = state.job.qty;
          recalcJob();
          window.__appRender?.();
          toast(`Scale reading locked: ${lockedWeight} kg ✓`);
        });
        break;
      }

      case 'hw-lock-scale-wt': {
        const { getLiveWeight } = await import('./hardware/scaleBluetooth.js');
        const { weight } = getLiveWeight();
        if (weight > 0) {
          state.job.qty = String(weight);
          const qtyInput = document.getElementById('j-qty');
          if (qtyInput) qtyInput.value = state.job.qty;
          recalcJob();
          toast(`Locked weight: ${weight} kg ✓`);
        } else {
          toast('Scale reading is 0.00 kg. Place bag on scale.');
        }
        break;
      }

      case 'hw-voice-mic': {
        const { openVoiceOrderModal } = await import('./hardware/hardwareModal.js');
        openVoiceOrderModal((parsed) => {
          if (parsed.name) state.job.name = parsed.name;
          if (parsed.village) state.job.village = parsed.village;
          if (parsed.qty) state.job.qty = String(parsed.qty);
          if (parsed.serviceId) {
            state.job.serviceId = parsed.serviceId;
            const svc = state.data.services.find((s) => s.id === parsed.serviceId);
            if (svc) {
              state.job.rate = String(svc.ratePaise / 100);
              state.job.lossRateG = String(svc.lossRateG || 0);
            }
          }
          window.__appRender?.();
          recalcJob();
          toast(`Voice order: ${parsed.name || ''} ${parsed.qty ? parsed.qty + 'kg' : ''} ✓`);
        });
        break;
      }

      case 'hw-qr-scan':
      case 'hw-scan-qr': {
        const { openQrScannerModal } = await import('./hardware/hardwareModal.js');
        openQrScannerModal((parsed, rawVal) => {
          let tokenNo = parsed.tokenNo || null;
          let phone = '';

          const phoneMatch = String(rawVal).match(/(?:\+91|0)?([6-9]\d{9})/);
          if (phoneMatch) phone = phoneMatch[1];
          if (!tokenNo) {
            const match = String(rawVal).match(/(?:token[:#\s]*|#\s*)(\d+)/i);
            if (match) tokenNo = parseInt(match[1], 10);
          }

          if (parsed.type === 'token' || tokenNo) {
            const tNo = tokenNo || parsed.tokenNo;
            const tok = state.data?.tokens?.serving?.no === tNo
              ? state.data.tokens.serving
              : (state.data?.tokens?.waiting?.find((t) => t.no === tNo) ||
                 (state.data?.tokens?.doneList || []).find((t) => t.no === tNo));
            if (tok) {
              state.job.tokenId = tok.id;
              state.job.tokenNo = tok.no;
              state.job.name = tok.name;
              state.job.village = tok.village || '';
              if (tok.phone) state.job.phone = tok.phone;
              if (tok.serviceId) {
                state.job.serviceId = tok.serviceId;
                const svc = state.data?.services?.find((s) => s.id === tok.serviceId);
                if (svc) {
                  state.job.rate = String(svc.ratePaise / 100);
                  state.job.lossRateG = String(svc.lossRateG || 0);
                }
              }
              if (tok.grossWeight) state.job.qty = String(tok.grossWeight);
              goTo('job');
              toast(`Loaded Token #${tNo} ✓`);
            } else {
              if (tNo) state.job.tokenNo = tNo;
              if (phone) state.job.phone = phone;
              goTo('job');
              toast(`Token #${tNo} scanned ✓`);
            }
          } else if (parsed.type === 'customer' || phone) {
            if (phone) {
              state.job.phone = phone;
              const matched = state.data?.customers?.find((c) => c.phone === phone);
              if (matched) {
                state.job.name = matched.name;
                state.job.village = matched.village || '';
              }
            }
            if (parsed.name) state.job.name = parsed.name;
            if (parsed.village) state.job.village = parsed.village;
            goTo('job');
            toast(`Customer: ${state.job.name || phone || 'Scanned'} ✓`);
          } else {
            toast(`Scanned: ${rawVal}`);
          }
        });
        break;
      }

      case 'token-notify-wa': {
        const tok = state.data.tokens.serving?.id === el.dataset.id
          ? state.data.tokens.serving
          : (state.data.tokens.waiting.find((x) => x.id === el.dataset.id) ||
             (state.data.tokens.doneList || []).find((x) => x.id === el.dataset.id));
        if (tok) {
          const { sendAataReadyNotification } = await import('./hardware/whatsappNotify.js');
          sendAataReadyNotification(tok);
        }
        break;
      }

      case 'token-share-wa': {
        const tok = state.data.tokens.serving?.id === el.dataset.id
          ? state.data.tokens.serving
          : (state.data.tokens.waiting.find((x) => x.id === el.dataset.id) ||
             (state.data.tokens.doneList || []).find((x) => x.id === el.dataset.id));
        if (tok) {
          const { sendTokenIssuedNotification } = await import('./hardware/whatsappNotify.js');
          sendTokenIssuedNotification(tok);
        }
        break;
      }

      case 'token-print-pos': {
        const tok = state.data.tokens.serving?.id === el.dataset.id
          ? state.data.tokens.serving
          : (state.data.tokens.waiting.find((x) => x.id === el.dataset.id) ||
             (state.data.tokens.doneList || []).find((x) => x.id === el.dataset.id));
        if (tok) {
          const { printThermalToken, isPrinterConnected } = await import('./hardware/thermalPrinter.js');
          if (isPrinterConnected()) {
            try {
              await printThermalToken(tok);
              toast('Token slip printed on Bluetooth POS ✓');
            } catch (err) {
              toast('Printer error: ' + err.message);
            }
          } else {
            const { printTokenReceipt } = await import('./utils/print.js');
            printTokenReceipt(tok);
          }
        }
        break;
      }

      case 'open-hw-modal': {
        const { openHardwareDevicesModal } = await import('./hardware/hardwareModal.js');
        openHardwareDevicesModal();
        break;
      }

      case 'token-done':
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { id: el.dataset.id, status: 'done' });
          if (data && data.offline) {
            enqueueOfflineAction('tokenStatus', { id: el.dataset.id, status: 'done' });
            const tok = state.data.tokens.serving?.id === el.dataset.id
              ? state.data.tokens.serving
              : (state.data.tokens.waiting || []).find((x) => x.id === el.dataset.id);
            if (tok) {
              tok.status = 'done';
              // Move to doneList so it appears in the completed section
              if (!state.data.tokens.doneList) state.data.tokens.doneList = [];
              state.data.tokens.doneList.unshift(tok);
            }
            if (state.data.tokens.serving?.id === el.dataset.id) state.data.tokens.serving = null;
            state.data.tokens.waiting = (state.data.tokens.waiting || []).filter((x) => x.id !== el.dataset.id);
            state.data.tokens.done = (state.data.tokens.done || 0) + 1;
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('Token marked done (offline)');
          } else if (data) {
            applyState(data.state);
            toast('Token completed ✓');
          }
        });
        break;

      case 'token-start':
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { id: el.dataset.id, status: 'serving' });
          if (data && data.offline) {
            enqueueOfflineAction('tokenStatus', { id: el.dataset.id, status: 'serving' });
            const tok = state.data.tokens.waiting.find((x) => x.id === el.dataset.id);
            if (tok) {
              tok.status = 'serving';
              state.data.tokens.serving = tok;
              state.data.tokens.waiting = state.data.tokens.waiting.filter((x) => x.id !== el.dataset.id);
            }
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('Calling token (offline)');
          } else if (data) {
            applyState(data.state);
            toast('Calling token');
          }
        });
        break;

      case 'token-next':
      case 'token-call-next': {
        const next = state.data.tokens.waiting[0];
        if (!next) {
          toast('Queue is empty');
          return;
        }
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { id: next.id, status: 'serving' });
          if (data && data.offline) {
            enqueueOfflineAction('tokenStatus', { id: next.id, status: 'serving' });
            next.status = 'serving';
            state.data.tokens.serving = next;
            state.data.tokens.waiting.shift();
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast(`Calling token #${next.no} (offline)`);
          } else if (data) {
            applyState(data.state);
            toast(`Calling token #${next.no}`);
          }
        });
        break;
      }

      case 'token-cancel':
        if (!confirm('क्या आप यह टोकन हटाना चाहते हैं?')) return;
        await withBusy(el, async () => {
          const data = await api('/api/tokens/delete', { id: el.dataset.id });
          if (data && data.offline) {
            enqueueOfflineAction('tokenDelete', { id: el.dataset.id });
            state.data.tokens.waiting = (state.data.tokens.waiting || []).filter((x) => x.id !== el.dataset.id);
            state.data.tokens.doneList = (state.data.tokens.doneList || []).filter((x) => x.id !== el.dataset.id);
            if (state.data.tokens.serving?.id === el.dataset.id) state.data.tokens.serving = null;
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('Token deleted (offline)');
          } else if (data) {
            applyState(data.state);
            toast(t('tokenCancelled'));
          }
        });
        break;

      case 'token-deliver':
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { id: el.dataset.id, status: 'delivered' });
          if (data && data.offline) {
            enqueueOfflineAction('tokenStatus', { id: el.dataset.id, status: 'delivered' });
            state.data.tokens.doneList = (state.data.tokens.doneList || []).filter((x) => x.id !== el.dataset.id);
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('माल डिलीवर हुआ (offline)');
          } else if (data) {
            applyState(data.state);
            toast('माल डिलीवर हुआ ✓');
          }
        });
        break;

      case 'clear-all-done-tokens':
        if (!confirm('क्या आप पूरे हुए सभी टोकन साफ़ करना चाहते हैं?')) return;
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { allDone: true, status: 'delivered' });
          if (data && data.offline) {
            (state.data.tokens?.doneList || []).forEach((t) => {
              enqueueOfflineAction('tokenStatus', { id: t.id, status: 'delivered' });
            });
            state.data.tokens.doneList = [];
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('सभी पूरे हुए टोकन साफ़ हुए (offline)');
          } else if (data) {
            applyState(data.state);
            toast('सभी पूरे हुए टोकन साफ़ हुए ✓');
          }
        });
        break;

      case 'token-to-job': {
        const tok = state.data.tokens.serving?.id === el.dataset.id
          ? state.data.tokens.serving
          : (state.data.tokens.waiting.find((x) => x.id === el.dataset.id) ||
             (state.data.tokens.doneList || []).find((x) => x.id === el.dataset.id));
        if (!tok) return;
        state.job.name = tok.name === 'Customer' || tok.name === 'ग्राहक' ? '' : tok.name;
        state.job.village = tok.village || '';
        state.job.phone = tok.phone || '';
        state.job.note = tok.note || '';
        state.job.amount = '';
        state.job.tokenId = tok.id;
        state.job.tokenNo = tok.no;
        if (tok.serviceId) {
          state.job.serviceId = tok.serviceId;
          const svc = state.data.services.find((s) => s.id === tok.serviceId);
          if (svc) {
            state.job.rate = String(svc.ratePaise / 100);
            state.job.lossRateG = String(svc.lossRateG || 0);
          }
        }
        if (tok.grossWeight) state.job.qty = String(tok.grossWeight);
        if (tok.grossWeight && tok.lossG) {
          state.job.lossRateG = String(Math.round(tok.lossG / tok.grossWeight));
        }
        state.job.totalLossG = tok.lossG || 0;
        state.job.netWeight = tok.netWeight || tok.grossWeight || 0;
        state.jobTab = 'grind';
        closeModal();
        goTo('job');
        setTimeout(() => recalcJob(), 50);
        break;
      }

      case 'pick-disambig-cust': {
        const prefix = el.dataset.prefix || 'j';
        const custId = el.dataset.id;
        const cust = (state.data?.customers || []).find((c) => c.id === custId);
        if (!cust) return;

        const nameEl = document.getElementById(prefix === 'j' ? 'j-name' : 'tr-name');
        const villageEl = document.getElementById(prefix === 'j' ? 'j-village' : 'tr-village');
        const phoneEl = document.getElementById(prefix === 'j' ? 'j-phone' : 'tr-phone');
        const hiddenIdEl = document.getElementById(prefix === 'j' ? 'j-customer-id' : 'tr-customer-id');
        const hiddenNewEl = document.getElementById(prefix === 'j' ? 'j-is-new-customer' : 'tr-is-new-customer');
        const disambigWrap = document.getElementById(prefix === 'j' ? 'cust-disambig-wrap' : 'tr-cust-disambig-wrap');

        if (nameEl) nameEl.value = cust.name;
        if (villageEl) villageEl.value = cust.village || '';
        if (phoneEl) phoneEl.value = cust.phone || '';
        if (hiddenIdEl) hiddenIdEl.value = cust.id;
        if (hiddenNewEl) hiddenNewEl.value = '0';
        if (disambigWrap) disambigWrap.style.display = 'none';

        if (prefix === 'j') {
          state.job.name = cust.name;
          state.job.village = cust.village || '';
          state.job.phone = cust.phone || '';
          state.job.customerId = cust.id;
        } else {
          state.trade.name = cust.name;
          state.trade.village = cust.village || '';
          state.trade.phone = cust.phone || '';
          state.trade.customerId = cust.id;
        }

        toast(`ग्राहक चुना गया: ${cust.name}`);
        updateCustomerDisambiguation(prefix, true);
        break;
      }

      case 'close-cust-suggest': {
        const prefix = el.dataset.prefix || 'j';
        const disambigWrap = document.getElementById(prefix === 'j' ? 'cust-disambig-wrap' : 'tr-cust-disambig-wrap');
        if (disambigWrap) disambigWrap.style.display = 'none';
        break;
      }

      case 'quick-pick-village': {
        const prefix = el.dataset.prefix || 'j';
        const villageName = el.dataset.village;
        const villageEl = document.getElementById(
          prefix === 'j' ? 'j-village' : (prefix === 'tr' ? 'tr-village' : (prefix === 'ec' ? 'ec-village' : 't-village'))
        );
        if (villageEl) {
          villageEl.value = villageName;
        }
        if (prefix === 'j') state.job.village = villageName;
        else if (prefix === 'tr') state.trade.village = villageName;
        else if (prefix === 't') state.tokenForm.village = villageName;

        const parent = el.closest('.village-chips-scroll');
        if (parent) {
          parent.querySelectorAll('.btn-village-chip').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.village === villageName);
          });
        }
        if (prefix === 'j' || prefix === 'tr') {
          updateCustomerDisambiguation(prefix);
        }
        break;
      }

      case 'force-new-cust': {
        const prefix = el.dataset.prefix || 'j';
        const hiddenIdEl = document.getElementById(prefix === 'j' ? 'j-customer-id' : 'tr-customer-id');
        const hiddenNewEl = document.getElementById(prefix === 'j' ? 'j-is-new-customer' : 'tr-is-new-customer');
        const photoImg = document.getElementById(prefix === 'j' ? 'job-photo-img' : 'tr-photo-img');
        const photoPh = document.getElementById(prefix === 'j' ? 'job-photo-ph' : 'tr-photo-ph');
        const photoHidden = document.getElementById(prefix === 'j' ? 'j-photo' : 'tr-photo');
        const photoBtnTxt = document.getElementById(prefix === 'j' ? 'job-photo-btn-txt' : 'tr-photo-btn-txt');
        const photoClear = document.getElementById(prefix === 'j' ? 'job-photo-clear' : 'tr-photo-clear');

        if (hiddenIdEl) hiddenIdEl.value = 'new';
        if (hiddenNewEl) hiddenNewEl.value = '1';
        if (photoImg) { photoImg.src = ''; photoImg.style.display = 'none'; }
        if (photoPh) photoPh.style.display = 'block';
        if (photoHidden) photoHidden.value = '';
        if (photoBtnTxt) photoBtnTxt.textContent = 'ग्राहक का फोटो खींचें';
        if (photoClear) photoClear.style.display = 'none';

        toast('अलग नया खाता चुना गया — नाम में पिता का नाम या उपनाम जोड़ें');
        updateCustomerDisambiguation(prefix);
        break;
      }

      case 'reset-cust-match': {
        const prefix = el.dataset.prefix || 'j';
        const hiddenIdEl = document.getElementById(prefix === 'j' ? 'j-customer-id' : 'tr-customer-id');
        const hiddenNewEl = document.getElementById(prefix === 'j' ? 'j-is-new-customer' : 'tr-is-new-customer');
        if (hiddenIdEl) hiddenIdEl.value = '';
        if (hiddenNewEl) hiddenNewEl.value = '0';
        updateCustomerDisambiguation(prefix);
        break;
      }

      case 'open-cust':
        await openCustomer(el.dataset.id);
        break;

      case 'new-cust':
      case 'add-cust-modal':
        openCustomerEditModal();
        break;

      case 'edit-cust':
      case 'edit-cust-modal':
        openCustomerEditModal(el.dataset.id);
        break;

      case 'del-cust': {
        const id = el.dataset.id;
        const customer = state.data.customers.find((c) => c.id === id);
        if (!customer) return;
        if (customer.balancePaise !== 0) {
          alert('Customer has unsettled due balance. Settle ledger before deleting.');
          return;
        }
        if (!confirm(`Delete customer "${customer.name}${customer.village ? ' (' + customer.village + ')' : ''}"?`)) return;
        await withBusy(el, async () => {
          const data = await api('/api/customers/delete', { id });
          if (data && data.offline) {
            enqueueOfflineAction('customerDelete', { id });
            state.data.customers = state.data.customers.filter((c) => c.id !== id);
            saveOfflineSnapshot(state.data);
            closeModal();
            window.__appRender?.();
            toast('Customer deleted (offline)');
          } else if (data) {
            applyState(data.state);
            closeModal();
            toast('Customer deleted');
          }
        });
        break;
      }

      case 'close-modal':
        closeModal();
        break;

      case 'print-entry': {
        const e = findEntry(el.dataset.id);
        if (e) printReceipt(e);
        break;
      }

      case 'pos-print-entry': {
        const e = findEntry(el.dataset.id);
        if (e) {
          const { printThermalBill, isPrinterConnected } = await import('./hardware/thermalPrinter.js');
          if (isPrinterConnected()) {
            try {
              await printThermalBill(e);
              toast('Bill printed on Bluetooth POS ✓');
            } catch (err) {
              toast('Printer error: ' + err.message);
            }
          } else {
            printReceipt(e);
          }
        }
        break;
      }

      case 'wa-entry': {
        const e = findEntry(el.dataset.id);
        if (e) {
          const customer = e.customerId ? state.data.customers.find((c) => c.id === e.customerId) : null;
          openWhatsApp(entryWaText(e), customer ? customer.phone : '');
        }
        break;
      }

      case 'wa-remind': {
        const c = state.customer?.customer || state.customer;
        if (!c) return;
        const biz = state.data.business;
        const balance = c.balancePaise || 0;
        const msg = `*${biz.name}*\nHello ${c.name}${c.village ? ' (' + c.village + ')' : ''},\nYour pending due balance is *${inr(balance)}*.\n${biz.upi ? 'UPI: ' + biz.upi + '\n' : ''}Thank you! 🙏`;
        openWhatsApp(msg, c.phone);
        break;
      }

      case 'job-for-cust': {
        const c = state.customer?.customer || state.customer;
        if (!c) return;
        state.job.name = c.name;
        state.job.village = c.village || '';
        state.job.phone = c.phone || '';
        closeModal();
        goTo('job');
        break;
      }

      case 'cust-filter': {
        state.custFilter = el.dataset.filter;
        document.querySelectorAll('[data-act="cust-filter"]').forEach((b) => {
          b.classList.toggle('is-on', b.dataset.filter === state.custFilter);
        });
        const box = document.getElementById('cust-list');
        if (box) box.innerHTML = customerRows(filteredCustomers());
        break;
      }

      case 'del-entry': {
        if (!confirm('Delete this ledger entry?')) return;
        await withBusy(el, async () => {
          const data = await api('/api/entries/delete', { id: el.dataset.id });
          if (data && data.offline) {
            enqueueOfflineAction('entryDelete', { id: el.dataset.id });
            state.data.entries = state.data.entries.filter((x) => x.id !== el.dataset.id);
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('Entry deleted (offline)');
          } else if (data) {
            applyState(data.state);
            toast('Entry deleted');
          }
        });
        break;
      }

      case 'open-product-modal': {
        const { openProductModal } = await import('./components/modals.js');
        openProductModal(null, el.dataset.type || 'both');
        break;
      }

      case 'open-village-modal': {
        const { openVillageModal } = await import('./components/modals.js');
        openVillageModal(null);
        break;
      }

      case 'edit-village': {
        const { openVillageModal } = await import('./components/modals.js');
        openVillageModal({
          id: el.dataset.id,
          name: el.dataset.name,
          displayOrder: el.dataset.order,
        });
        break;
      }

      case 'del-village': {
        const id = el.dataset.id;
        const name = el.dataset.name;
        if (!confirm(`क्या आप वाकई गाँव "${name || ''}" को सूची से हटाना चाहते हैं?`)) return;
        await withBusy(el, async () => {
          const data = await api('/api/villages/delete', { id, name });
          if (data && data.state) {
            applyState(data.state);
            const { closeModal } = await import('./components/modals.js');
            closeModal();
            toast('गाँव सूची से हटाया गया');
          }
        });
        break;
      }

      case 'seed-default-villages': {
        await withBusy(el, async () => {
          const data = await api('/api/villages/seed', {});
          if (data && data.state) {
            applyState(data.state);
            toast('12 मुख्य स्थानीय गाँव लोड हो गए ✓');
          }
        });
        break;
      }

      case 'edit-product': {
        const { openProductModal } = await import('./components/modals.js');
        openProductModal(el.dataset.id);
        break;
      }

      case 'del-product': {
        const id = el.dataset.id;
        if (!confirm('क्या आप वाकई इस सामान को सूची से हटाना चाहते हैं?')) return;
        await withBusy(el, async () => {
          const data = await api('/api/products/delete', { id });
          if (data && data.state) {
            applyState(data.state);
            toast('सामान हटा दिया गया');
          }
        });
        break;
      }

      case 'del-service':
        if (!confirm('Delete this product / service?')) return;
        await withBusy(el, async () => {
          const data = await api('/api/services/delete', { id: el.dataset.id });
          if (data) {
            applyState(data.state);
            toast('Service deleted');
          }
        });
        break;

      case 'logout':
        await performLogout();
        break;

      default:
        break;
    }
  });

  // Global change listener (language selector, photo pickers, payment mode)
  document.addEventListener('change', async (ev) => {
    const tEl = ev.target;
    if (!tEl) return;

    if (tEl.id === 'j-name') state.job.name = tEl.value;
    if (tEl.id === 'j-village') {
      const std = standardizeVillage(tEl.value);
      if (std) tEl.value = std;
      state.job.village = tEl.value;
    }
    if (tEl.id === 'j-phone') state.job.phone = tEl.value;
    if (tEl.id === 'tr-name') state.trade.name = tEl.value;
    if (tEl.id === 'tr-village') {
      const std = standardizeVillage(tEl.value);
      if (std) tEl.value = std;
      state.trade.village = tEl.value;
    }
    if (tEl.id === 'tr-phone') state.trade.phone = tEl.value;
    if (tEl.id === 'j-name' || tEl.id === 'j-village' || tEl.id === 'j-phone') {
      updateCustomerDisambiguation('j');
    }
    if (tEl.id === 'tr-name' || tEl.id === 'tr-village' || tEl.id === 'tr-phone') {
      updateCustomerDisambiguation('tr');
    }

    if (tEl.dataset.act === 'change-lang') {
      setLanguage(tEl.value);
      window.__appRender?.();
      toast(tEl.value === 'hi' ? 'भाषा बदली गई' : 'Language updated');
      return;
    }

    if (tEl.name === 'paid') {
      const form = tEl.closest('form');
      if (form && form.dataset.form === 'trade') {
        const trUdhaarCard = document.getElementById('tr-udhaar-photo-card');
        if (trUdhaarCard) {
          trUdhaarCard.style.display = tEl.value === 'no' ? 'block' : 'none';
        }
      } else {
        const udhaarCard = document.getElementById('udhaar-photo-card');
        if (udhaarCard) {
          udhaarCard.style.display = tEl.value === 'no' ? 'block' : 'none';
        }
      }
      return;
    }

    if (tEl.id === 'job-photo-file') {
      const file = tEl.files?.[0];
      if (file) {
        try {
          const { processImageFile } = await import('./utils/photo.js');
          const dataUrl = await processImageFile(file);
          const hidden = document.getElementById('j-photo');
          const img = document.getElementById('job-photo-img');
          const ph = document.getElementById('job-photo-ph');
          const clearBtn = document.getElementById('job-photo-clear');
          const btnTxt = document.getElementById('job-photo-btn-txt');
          if (hidden) hidden.value = dataUrl;
          if (img) { img.src = dataUrl; img.style.display = 'block'; }
          if (ph) ph.style.display = 'none';
          if (clearBtn) clearBtn.style.display = 'inline-flex';
          if (btnTxt) btnTxt.textContent = 'फोटो बदलें';
          toast('उधार ग्राहक का फोटो सुरक्षित हुआ ✓');
        } catch (err) {
          toast(err.message || 'फोटो प्रोसेस नहीं हो सकी');
        }
      }
      return;
    }

    if (tEl.id === 'cust-photo-file') {
      const file = tEl.files?.[0];
      if (file) {
        try {
          const { processImageFile } = await import('./utils/photo.js');
          const dataUrl = await processImageFile(file);
          const hidden = document.getElementById('ec-photo');
          const img = document.getElementById('cust-photo-img');
          const ph = document.getElementById('cust-photo-placeholder');
          const clearBtn = document.getElementById('cust-photo-clear');
          const btnTxt = document.getElementById('cust-photo-btn-text');
          if (hidden) hidden.value = dataUrl;
          if (img) { img.src = dataUrl; img.style.display = 'block'; }
          if (ph) ph.style.display = 'none';
          if (clearBtn) clearBtn.style.display = 'inline-flex';
          if (btnTxt) btnTxt.textContent = 'फोटो बदलें';
          toast('ग्राहक का फोटो सुरक्षित हुआ ✓');
        } catch (err) {
          toast(err.message || 'फोटो प्रोसेस नहीं हो सकी');
        }
      }
      return;
    }

    if (tEl.id === 'tr-photo-file') {
      const file = tEl.files?.[0];
      if (file) {
        try {
          const { processImageFile } = await import('./utils/photo.js');
          const dataUrl = await processImageFile(file);
          const hidden = document.getElementById('tr-photo');
          const img = document.getElementById('tr-photo-img');
          const ph = document.getElementById('tr-photo-ph');
          const clearBtn = document.getElementById('tr-photo-clear');
          const btnTxt = document.getElementById('tr-photo-btn-txt');
          if (hidden) hidden.value = dataUrl;
          if (img) { img.src = dataUrl; img.style.display = 'block'; }
          if (ph) ph.style.display = 'none';
          if (clearBtn) clearBtn.style.display = 'inline-flex';
          if (btnTxt) btnTxt.textContent = 'फोटो बदलें';
          toast('ग्राहक फोटो सुरक्षित हुआ ✓');
        } catch (err) {
          toast(err.message || 'फोटो प्रोसेस नहीं हो सकी');
        }
      }
      return;
    }
  });

  function showTranslitHelper(inputEl) {
    if (!inputEl) return;
    const val = (inputEl.value || '').trim();
    let helper = document.getElementById('typing-translit-helper');
    if (!val || /[\u0900-\u097F]/.test(val) || val.length < 2) {
      if (helper) helper.remove();
      return;
    }
    const deva = latinToDeva(val);
    if (!deva || deva === val || !/[\u0900-\u097F]/.test(deva)) {
      if (helper) helper.remove();
      return;
    }

    if (!helper) {
      helper = document.createElement('div');
      helper.id = 'typing-translit-helper';
      helper.style.cssText = 'margin-top:4px;display:flex;align-items:center;gap:6px;font-size:11.5px;color:#4f46e5;';
    }

    helper.innerHTML = `
      <span style="color:#64748b;">English टाइपिंग:</span>
      <button type="button" class="btn btn-xs btn-subtle" style="background:#eef2ff;color:#4f46e5;font-weight:750;border:1px solid #c7d2fe;padding:2px 8px;border-radius:6px;cursor:pointer;">
        ✨ ${deva} (हिंदी में करें)
      </button>
    `;

    const btn = helper.querySelector('button');
    if (btn) {
      btn.onmousedown = (e) => {
        e.preventDefault();
        inputEl.value = deva;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        helper.remove();
      };
    }

    if (inputEl.parentNode) {
      inputEl.parentNode.insertBefore(helper, inputEl.nextSibling);
    }
  }

  // Global blur listener to clean up helper
  document.addEventListener('focusout', (ev) => {
    setTimeout(() => {
      const helper = document.getElementById('typing-translit-helper');
      if (helper && document.activeElement !== ev.target) helper.remove();
    }, 200);
  });

  // Global focus listener to re-trigger suggestions if input already has text
  document.addEventListener('focusin', (ev) => {
    const tEl = ev.target;
    if (tEl && (tEl.id === 'j-name' || tEl.id === 'j-phone')) {
      const val = (tEl.value || '').trim();
      if (val.length >= 1) updateCustomerDisambiguation('j');
    }
    if (tEl && (tEl.id === 'tr-name' || tEl.id === 'tr-phone')) {
      const val = (tEl.value || '').trim();
      if (val.length >= 1) updateCustomerDisambiguation('tr');
    }
  });

  // Global input listener
  document.addEventListener('input', (ev) => {
    const tEl = ev.target;

    // Live Hindi transliteration helper on name & village inputs
    if (tEl.id === 'j-name' || tEl.id === 'j-village' || tEl.id === 'tr-name' || tEl.id === 'tr-village' || tEl.id === 'ec-name' || tEl.id === 'ec-village') {
      showTranslitHelper(tEl);
    }

    // Customer edit bilingual auto-sync
    if (tEl.id === 'ec-name') {
      const enEl = document.getElementById('ec-name-en');
      if (enEl && !enEl.dataset.manual && tEl.value) {
        enEl.value = devaToLatin(tEl.value).split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }
    if (tEl.id === 'ec-name-en') {
      tEl.dataset.manual = '1';
      const hiEl = document.getElementById('ec-name');
      if (hiEl && !hiEl.value && tEl.value) {
        hiEl.value = latinToDeva(tEl.value);
      }
    }

    if (tEl.dataset.act === 'admin-search' || tEl.id === 'admin-search-input') {
      state.admin.q = tEl.value;
      window.__appRender?.();
      return;
    }

    if (tEl.id === 'cust-search') {
      state.q = tEl.value;
      const box = document.getElementById('cust-list');
      if (box) box.innerHTML = customerRows(filteredCustomers());
      return;
    }

    if (tEl.id === 'j-qty' || tEl.id === 'j-rate' || tEl.id === 'j-loss-rate') {
      recalcJob();
      return;
    }

    if (tEl.id === 'status-search-query') {
      renderUniversalSearchResults(tEl.value);
      return;
    }

    if (tEl.id === 'j-name') state.job.name = tEl.value;
    if (tEl.id === 'j-village') {
      const std = standardizeVillage(tEl.value);
      if (std) tEl.value = std;
      state.job.village = tEl.value;
    }
    if (tEl.id === 'j-phone') state.job.phone = tEl.value;
    if (tEl.id === 'tr-name') state.trade.name = tEl.value;
    if (tEl.id === 'tr-village') {
      const std = standardizeVillage(tEl.value);
      if (std) tEl.value = std;
      state.trade.village = tEl.value;
    }
    if (tEl.id === 'tr-phone') state.trade.phone = tEl.value;

    if (tEl.id === 'j-phone' || tEl.id === 'j-name' || tEl.id === 'j-village') {
      updateCustomerDisambiguation('j');
      return;
    }

    if (tEl.id === 'tr-phone' || tEl.id === 'tr-name' || tEl.id === 'tr-village') {
      updateCustomerDisambiguation('tr');
      return;
    }

    if (tEl.id === 'j-amount') {
      tEl.dataset.manual = '1';
      state.job.amount = tEl.value;
      return;
    }

    if (tEl.id === 'j-note') {
      state.job.note = tEl.value;
      return;
    }

    if (tEl.id === 't-note') {
      state.tokenForm.note = tEl.value;
      return;
    }

    // Live calculation for Trade (Sale / Purchase)
    if (tEl.id === 'tr-qty' || tEl.id === 'tr-rate') {
      const qty = Number(document.getElementById('tr-qty')?.value) || 0;
      const rate = Number(document.getElementById('tr-rate')?.value) || 0;
      const preview = document.getElementById('tr-amount-preview');
      if (preview) {
        preview.textContent = inr(Math.round(qty * rate * 100));
      }
    }

    // Live Customer Lookup and Photo for Trade
    if (tEl.id === 'tr-name' || tEl.id === 'tr-village' || tEl.id === 'tr-phone') {
      updateCustomerDisambiguation('tr');
      return;
    }

    // Live calculation & customer lookup for Token Form
    if (tEl.id === 't-qty' || tEl.id === 't-loss-rate') {
      recalcToken();
    }

    if (tEl.id === 't-name' || tEl.id === 't-village' || tEl.id === 't-phone') {
      const rawName = (document.getElementById('t-name')?.value || '').trim();
      const rawVillage = (document.getElementById('t-village')?.value || '').trim();
      state.tokenForm.name = rawName;
      state.tokenForm.village = rawVillage;
      state.tokenForm.phone = (document.getElementById('t-phone')?.value || '').trim();

      if (rawName && state.data?.customers) {
        const match = state.data.customers.find((c) => {
          const nameMatch = c.name.toLowerCase() === rawName.toLowerCase();
          if (!nameMatch) return false;
          if (rawVillage) return (c.village || '').toLowerCase() === rawVillage.toLowerCase();
          return true;
        });
        if (match) {
          const villageInput = document.getElementById('t-village');
          const phoneInput = document.getElementById('t-phone');
          if (villageInput && !villageInput.value && match.village) {
            villageInput.value = match.village;
            state.tokenForm.village = match.village;
          }
          if (phoneInput && !phoneInput.value && match.phone) {
            phoneInput.value = match.phone;
            state.tokenForm.phone = match.phone;
          }
        }
      }
    }
  });

  // Global form submit handler
  document.addEventListener('submit', async (ev) => {
    const adminForm = ev.target.closest('#admin-login-form, form[data-act="admin-login-submit"]');
    if (adminForm) {
      ev.preventDefault();
      const keyInput = document.getElementById('admin-master-key');
      const masterKey = keyInput ? keyInput.value.trim() : '';
      if (!masterKey) return;
      const btn = adminForm.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'प्रमाणित हो रहा है...';
      }
      try {
        const res = await api('/api/admin/login', { masterKey });
        if (res && res.ok) {
          state.admin.authenticated = true;
          state.admin.error = '';
          toast('सुपर एडमिन सत्यापित हुआ ✓');
          await loadAdminData();
        } else {
          state.admin.authenticated = false;
          state.admin.error = (res && res.error) || 'अमान्य मास्टर की';
          window.__appRender?.();
        }
      } catch (err) {
        state.admin.error = 'लॉगिन में त्रुटि हुई';
        window.__appRender?.();
      } finally {
        if (btn && btn.isConnected) {
          btn.disabled = false;
          btn.textContent = 'सुपर एडमिन लॉगिन करें';
        }
      }
      return;
    }

    const statusForm = ev.target.closest('#status-check-form, form[data-act="status-check-submit"]');
    if (statusForm) {
      ev.preventDefault();
      const tokenNo = document.getElementById('status-token-no')?.value;
      const phone = document.getElementById('status-phone')?.value;
      const btn = statusForm.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'जाँच हो रही है...';
      }
      try {
        const res = await fetch(getApiUrl('/api/status'), {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ token: tokenNo, phone: phone ? phone.trim() : '' }),
          credentials: 'include',
        }).then((r) => r.json()).catch(() => null);
        renderStatusResult(res);
      } catch (err) {
        renderStatusResult({ ok: false, error: 'सर्वर से संपर्क नहीं हो सका' });
      } finally {
        if (btn && btn.isConnected) {
          btn.disabled = false;
          btn.textContent = '🔍 लाइव स्थिति देखें';
        }
      }
      return;
    }

    const form = ev.target.closest('form[data-form]');
    if (!form) return;
    ev.preventDefault();
    const kind = form.dataset.form;
    const fd = new FormData(form);

    if (kind === 'auth') {
      const mode = state.auth.mode;
      const phone = String(fd.get('phone') || '').trim();
      const password = String(fd.get('password') || '');
      const shopName = String(fd.get('shopName') || '').trim();

      const btn = form.querySelector('[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '…';
      }

      try {
        const path = getApiUrl(mode === 'signup' ? '/api/signup' : '/api/login');
        const payload = mode === 'signup' ? { phone, password, shopName } : { phone, password };
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showAuthError(data.error || 'Authentication error');
        } else {
          if (data.token && typeof localStorage !== 'undefined') {
            localStorage.setItem('cb_token', data.token);
          }
          state.auth.error = '';
          state.view = 'dashboard';
          state.data = data.state;
          saveOfflineSnapshot(data.state);
          window.__appRender?.();
          toast(mode === 'signup' ? 'Welcome! Shop created' : 'Welcome back');
        }
      } catch (err) {
        showAuthError('Connection error. Please try again.');
      } finally {
        if (btn && btn.isConnected) {
          btn.disabled = false;
          btn.textContent = state.auth.mode === 'signup' ? t('signupBtn') : t('loginBtn');
        }
      }
      return;
    }

    if (kind === 'job') {
      const submitBtn = form.querySelector('[type="submit"]');
      if (state.busy) return;
      state.busy = true;
      if (submitBtn) submitBtn.disabled = true;

      state.job.name = String(fd.get('name') || '').trim();
      state.job.village = String(fd.get('village') || '').trim();
      state.job.phone = String(fd.get('phone') || '').trim();
      state.job.note = String(fd.get('note') || '').trim();
      state.job.paid = fd.get('paid') !== 'no';
      state.job.withToken = fd.get('withToken') === 'on';

      const weightMode = fd.get('weightMode') || state.job.weightMode || 'gross';
      const enteredQty = Number(fd.get('qty'));
      const rate = Number(fd.get('rate'));

      let grossWeight = enteredQty;
      let lossRateG = 0;
      let totalLossG = 0;
      let netWeight = enteredQty;
      let chargeBasis = 'output';

      if (weightMode === 'output') {
        grossWeight = enteredQty;
        netWeight = enteredQty;
        lossRateG = 0;
        totalLossG = 0;
        chargeBasis = 'output';
      } else {
        lossRateG = Number(fd.get('lossRateG') || 0);
        totalLossG = Math.round(grossWeight * lossRateG);
        netWeight = Math.max(0, grossWeight - (totalLossG / 1000));
        chargeBasis = state.data?.business?.chargeBasis || 'output';
      }

      const billWeight = chargeBasis === 'gross' ? grossWeight : netWeight;
      const calcPaise = Math.round(billWeight * rate * 100);
      const rawAmt = fd.get('amount');
      const customAmt = rawAmt !== null && rawAmt !== '' ? Number(rawAmt) : NaN;
      const amountPaise = !isNaN(customAmt) && customAmt >= 0 ? Math.round(customAmt * 100) : calcPaise;
      const hideLoss = fd.get('hideLoss') === '1' || Boolean(state.data?.business?.hideLossOnSlip !== false);

      const jobPayload = {
        serviceId: state.job.serviceId,
        grossWeight,
        rate,
        lossRateG,
        totalLossG,
        netWeight,
        chargeBasis,
        hideLoss,
        amount: !isNaN(customAmt) ? customAmt : undefined,
        amountPaise,
        paid: state.job.paid,
        name: state.job.name,
        village: state.job.village,
        phone: state.job.phone,
        photo: String(fd.get('photo') || '').trim(),
        note: state.job.note,
        withToken: state.job.withToken,
        tokenId: state.job.tokenId,
        tokenNo: state.job.tokenNo,
        customerId: String(fd.get('customerId') || '').trim() || undefined,
        isNewCustomer: fd.get('isNewCustomer') === '1',
      };

      const data = await api('/api/jobs', jobPayload);
      state.busy = false;
      if (submitBtn && submitBtn.isConnected) submitBtn.disabled = false;

      // Handle offline mode fallback
      if (data && data.offline) {
        const offlineEntryId = 'offline-' + crypto.randomUUID();
        const svc = currentService();
        const now = Date.now();

        enqueueOfflineAction('job', { ...jobPayload, offlineId: offlineEntryId, at: now });

        const newEntry = {
          id: offlineEntryId,
          kind: 'job',
          name: jobPayload.name,
          village: jobPayload.village,
          grossWeight,
          lossG: totalLossG,
          netWeight,
          hideLoss: jobPayload.hideLoss,
          ratePaise: Math.round(rate * 100),
          amountPaise,
          paid: jobPayload.paid,
          note: jobPayload.note,
          tokenNo: jobPayload.tokenNo,
          serviceName: svc ? svc.name : 'Grinding',
          unit: svc ? svc.unit : 'kg',
          at: now,
        };

        state.data.entries.unshift(newEntry);
        state.data.stats.jobs += 1;
        state.data.stats.grossWeight += grossWeight;
        state.data.stats.lossG += totalLossG;
        state.data.stats.netWeight += netWeight;
        state.data.stats.salePaise += amountPaise;

        if (jobPayload.paid) {
          state.data.stats.cashPaise += amountPaise;
        } else {
          state.data.stats.creditPaise += amountPaise;
          state.data.stats.outstandingPaise += amountPaise;
          // Optimistically update customer balance if present
          const cust = state.data.customers.find(
            (c) => c.name.toLowerCase() === jobPayload.name.toLowerCase() &&
                   (c.village || '').toLowerCase() === (jobPayload.village || '').toLowerCase()
          );
          if (cust) cust.balancePaise += amountPaise;
        }

        if (jobPayload.tokenId) {
          state.data.tokens.doneList = (state.data.tokens.doneList || []).filter((x) => x.id !== jobPayload.tokenId);
          if (state.data.tokens.serving?.id === jobPayload.tokenId) state.data.tokens.serving = null;
          state.data.tokens.waiting = (state.data.tokens.waiting || []).filter((x) => x.id !== jobPayload.tokenId);
        } else if (jobPayload.tokenNo) {
          state.data.tokens.doneList = (state.data.tokens.doneList || []).filter((x) => x.no !== jobPayload.tokenNo);
          if (state.data.tokens.serving?.no === jobPayload.tokenNo) state.data.tokens.serving = null;
          state.data.tokens.waiting = (state.data.tokens.waiting || []).filter((x) => x.no !== jobPayload.tokenNo);
        }

        saveOfflineSnapshot(state.data);

        // Reset form inputs
        state.job.qty = '';
        state.job.name = '';
        state.job.village = '';
        state.job.phone = '';
        state.job.note = '';
        state.job.amount = '';
        state.job.paid = true;
        state.job.withToken = false;
        state.job.tokenId = null;
        state.job.tokenNo = null;

        window.__appRender?.();
        showJobDone({ entryId: offlineEntryId, token: null, state: state.data });
        toast('Saved Offline — Will sync automatically');
        return;
      }

      if (data && data.state) {
        state.data = data.state;
        saveOfflineSnapshot(data.state);

        state.job.qty = '';
        state.job.name = '';
        state.job.village = '';
        state.job.phone = '';
        state.job.note = '';
        state.job.amount = '';
        state.job.paid = true;
        state.job.withToken = false;
        state.job.tokenId = null;
        state.job.tokenNo = null;

        const svc = currentService();
        state.job.rate = svc ? String(svc.ratePaise / 100) : '';
        state.job.lossRateG = svc ? String(svc.lossRateG || 0) : '0';
        window.__appRender?.();

        if (data.entryId) {
          showJobDone(data);
        } else {
          toast(t('jobDoneTitle'));
        }
      }
      return;
    }

    if (kind === 'token') {
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const name = String(fd.get('name') || '').trim();
        const village = String(fd.get('village') || '').trim();
        const phone = String(fd.get('phone') || '').trim();
        const note = String(fd.get('note') || '').trim();
        const qty = parseFloat(fd.get('qty')) || 0;
        const lossRateG = parseFloat(fd.get('lossRateG')) || 0;
        const totalLossG = qty > 0 ? Math.round(qty * lossRateG) : 0;
        const netWeight = qty > 0 ? Math.max(0, qty - (totalLossG / 1000)) : 0;

        const payload = {
          serviceId: state.tokenForm.serviceId,
          name,
          village,
          phone,
          grossWeight: qty,
          lossRateG,
          totalLossG,
          netWeight,
          note,
        };

        const data = await api('/api/tokens', payload);
        if (data && data.offline) {
          const nextNo = state.data.tokens.nextNo;
          state.data.tokens.nextNo += 1;
          enqueueOfflineAction('token', { ...payload, no: nextNo, at: Date.now() });

          const offTok = {
            id: 'offline-' + crypto.randomUUID(),
            no: nextNo,
            name: name || 'Customer',
            village: village || '',
            phone: phone || '',
            serviceId: payload.serviceId,
            grossWeight: qty,
            lossG: totalLossG,
            netWeight: netWeight,
            note,
            status: 'waiting',
            at: Date.now(),
          };
          state.data.tokens.waiting.push(offTok);

          saveOfflineSnapshot(state.data);
          form.reset();
          state.tokenForm.name = '';
          state.tokenForm.village = '';
          state.tokenForm.phone = '';
          state.tokenForm.note = '';
          state.tokenForm.qty = '';
          window.__appRender?.();
          const { openTokenReceiptModal } = await import('./components/modals.js');
          openTokenReceiptModal(offTok);
          toast(`Token #${nextNo} issued (offline)`);
          return;
        }

        if (data && data.ok) {
          applyState(data.state);
          form.reset();
          state.tokenForm.name = '';
          state.tokenForm.village = '';
          state.tokenForm.phone = '';
          state.tokenForm.note = '';
          state.tokenForm.qty = '';
          const { openTokenReceiptModal } = await import('./components/modals.js');
          openTokenReceiptModal(data.token);
          toast(`Token #${data.token.no} issued ✓`);
        }
      });
      return;
    }

    if (kind === 'customer') {
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const payload = {
          name: String(fd.get('name') || '').trim(),
          nameEn: String(fd.get('nameEn') || '').trim(),
          village: String(fd.get('village') || '').trim(),
          phone: String(fd.get('phone') || '').trim(),
          photo: String(fd.get('photo') || '').trim(),
        };
        const id = fd.get('id');
        if (id) payload.id = id;

        const data = await api('/api/customers', payload);
        if (data && data.offline) {
          enqueueOfflineAction('customer', payload);
          const bilingualName = toBilingualName(payload.name, payload.nameEn);
          if (!id) {
            state.data.customers.push({
              id: 'offline-' + crypto.randomUUID(),
              name: bilingualName,
              village: payload.village,
              phone: payload.phone,
              photo: payload.photo || '',
              balancePaise: 0,
              lastAt: Date.now(),
            });
          } else {
            const existing = state.data.customers.find((c) => c.id === id);
            if (existing) {
              existing.name = bilingualName;
              existing.village = payload.village;
              existing.phone = payload.phone;
              if (payload.photo) existing.photo = payload.photo;
            }
          }
          saveOfflineSnapshot(state.data);
          closeModal();
          window.__appRender?.();
          toast('ग्राहक संपर्क सुरक्षित (ऑफलाइन)');
          return;
        }

        if (data) {
          applyState(data.state);
          closeModal();
          toast('ग्राहक संपर्क सुरक्षित ✓');
        }
      });
      return;
    }

    if (kind === 'payment') {
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const payload = {
          customerId: fd.get('customerId'),
          amount: Number(fd.get('amount')),
          note: String(fd.get('note') || '').trim(),
        };

        const data = await api('/api/payments', payload);
        if (data && data.offline) {
          const offlineId = 'offline-' + crypto.randomUUID();
          const amountPaise = Math.round(payload.amount * 100);
          const cust = state.data.customers.find((c) => c.id === payload.customerId);
          const now = Date.now();

          enqueueOfflineAction('payment', { ...payload, offlineId, at: now });

          state.data.entries.unshift({
            id: offlineId,
            kind: 'payment',
            customerId: payload.customerId,
            name: cust ? cust.name : 'Customer',
            village: cust ? cust.village : '',
            grossWeight: 0,
            lossG: 0,
            netWeight: 0,
            amountPaise,
            paid: true,
            note: payload.note,
            at: now,
          });

          if (cust) cust.balancePaise -= amountPaise;
          state.data.stats.cashPaise += amountPaise;
          state.data.stats.outstandingPaise -= amountPaise;

          saveOfflineSnapshot(state.data);
          closeModal();
          window.__appRender?.();
          toast('Payment recorded (offline)');
          return;
        }

        if (data) {
          applyState(data.state);
          closeModal();
          toast('Payment recorded ✓');
        }
      });
      return;
    }

    if (kind === 'password') {
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const data = await api('/api/password', {
          currentPassword: fd.get('currentPassword'),
          newPassword: fd.get('newPassword'),
        });
        if (data) {
          applyState(data.state);
          form.reset();
          toast('Password updated ✓');
        }
      });
      return;
    }

    if (kind === 'settings') {
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const tokenMode = form.querySelector('input[name="tokenMode"]:checked')?.value || 'daily';
        const chargeBasis = form.querySelector('input[name="chargeBasis"]:checked')?.value || 'output';
        const hideLossOnSlip = Boolean(form.querySelector('input[name="hideLossOnSlip"]')?.checked);
        const data = await api('/api/settings', {
          name: fd.get('name'),
          address: fd.get('address'),
          upi: fd.get('upi'),
          note: fd.get('note'),
          tokenMode,
          chargeBasis,
          hideLossOnSlip,
        });
        if (data) {
          applyState(data.state);
          toast('Settings saved');
        }
      });
      return;
    }

    if (kind === 'service') {
      const body = {
        name: fd.get('name'),
        unit: fd.get('unit'),
        rate: Number(fd.get('rate')),
        lossRateG: Number(fd.get('lossRateG')) || 0,
      };
      if (fd.get('id')) body.id = fd.get('id');
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const data = await api('/api/services', body);
        if (data) {
          applyState(data.state);
          toast('Product / Service saved');
        }
      });
      return;
    }

    if (kind === 'product') {
      const body = {
        name: String(fd.get('name') || '').trim(),
        type: String(fd.get('type') || 'both'),
        unit: String(fd.get('unit') || 'kg'),
        rate: Number(fd.get('rate')) || 0,
      };
      if (fd.get('id')) body.id = fd.get('id');
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const data = await api('/api/products', body);
        if (data && data.state) {
          applyState(data.state);
          closeModal();
          toast(body.id ? 'सामान अपडेट हुआ ✓' : 'नया सामान सूची में जुड़ा ✓');
        }
      });
      return;
    }

    if (kind === 'village') {
      const body = {
        name: String(fd.get('name') || '').trim(),
        displayOrder: parseInt(fd.get('displayOrder') || 0, 10),
      };
      if (fd.get('id')) body.id = fd.get('id');
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const data = await api('/api/villages', body);
        if (data && data.state) {
          applyState(data.state);
          const { closeModal } = await import('./components/modals.js');
          closeModal();
          toast(body.id ? 'गाँव अपडेट हुआ ✓' : 'नया गाँव सूची में जुड़ा ✓');
        }
      });
      return;
    }

    if (kind === 'trade') {
      const subBtn = form.querySelector('[type="submit"]');
      const trKind = String(fd.get('kind') || 'sale');
      const item = String(fd.get('item') || '').trim();
      const unit = String(fd.get('unit') || 'kg');
      const qty = Number(fd.get('qty'));
      const rate = Number(fd.get('rate')) || 0;
      const paid = fd.get('paid') === 'yes';
      const name = String(fd.get('name') || '').trim();
      const village = String(fd.get('village') || '').trim();
      const phone = String(fd.get('phone') || '').trim();
      const photo = String(fd.get('photo') || '').trim();
      const note = String(fd.get('note') || '').trim();
      const saveProduct = fd.get('saveProduct') === '1';

      if (!item) {
        toast(trKind === 'purchase' ? 'फ़सल का नाम भरें' : 'सामान का नाम भरें');
        return;
      }
      if (!qty || qty <= 0) {
        toast('मात्रा या वज़न सही भरें');
        return;
      }
      if (!paid && !name) {
        toast(trKind === 'purchase' ? 'खाते में रखने के लिए किसान का नाम भरें' : 'उधार के लिए ग्राहक का नाम भरें');
        return;
      }

      const amount = rate > 0 ? (qty * rate) : 0;
      const payload = {
        kind: trKind,
        item,
        unit,
        qty,
        rate,
        amount,
        paid,
        name,
        village,
        phone,
        photo,
        note,
        saveProduct,
        customerId: String(fd.get('customerId') || '').trim() || undefined,
        isNewCustomer: fd.get('isNewCustomer') === '1',
      };

      await withBusy(subBtn, async () => {
        const data = await api('/api/trades', payload);
        if (data && data.offline) {
          const offlineId = 'offline-' + crypto.randomUUID();
          enqueueOfflineAction('trade', { ...payload, offlineId, at: Date.now() });
          toast('बिल सुरक्षित (ऑफलाइन)');
          state.trade = { item: '', unit: 'kg', qty: '', rate: '', amount: '', paid: true, name: '', village: '', phone: '', photo: '', note: '' };
          window.__appRender?.();
          return;
        }

        if (data && data.state) {
          applyState(data.state);
          state.trade = { item: '', unit: 'kg', qty: '', rate: '', amount: '', paid: true, name: '', village: '', phone: '', photo: '', note: '' };
          toast(trKind === 'purchase' ? 'कच्चा माल खरीद बिल सुरक्षित हुआ ✓' : 'सामान बिक्री बिल सुरक्षित हुआ ✓');

          const { showJobDone } = await import('./components/modals.js');
          showJobDone({
            kind: trKind,
            name: payload.name || (trKind === 'purchase' ? 'किसान' : 'ग्राहक'),
            serviceName: payload.item,
            qty: payload.qty,
            unit: payload.unit,
            amountPaise: Math.round(payload.amount * 100),
            paid: payload.paid,
            note: payload.note,
          });
        }
      });
      return;
    }
  });
}
