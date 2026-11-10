// New Order / Job View (Grinding Processing, Product Sales, Raw Material Purchases)
import { state } from '../state.js';
import { inr, unitOf, esc, qtyFmt } from '../utils/formatters.js';
import { serviceCards } from '../components/rows.js';
import { t } from '../i18n.js';

export function currentService() {
  const data = state.data;
  if (!data) return null;
  return data.services.find((s) => s.id === state.job.serviceId) || data.services[0] || null;
}

export function viewJob() {
  const data = state.data;
  if (!data) return '';
  const currentTab = state.jobTab || 'grind';

  return `
  <div class="page-head" style="margin-bottom:12px;">
    <div>
      <h1 class="page-title">
        ${currentTab === 'grind' ? '⚙️ नया बिल व पिसाई (Grinding)' : (currentTab === 'sale' ? '🛒 तैयार माल बिक्री (Sell Product)' : '📥 कच्चा माल खरीद (Buy Grain)')}
      </h1>
      <p class="page-sub">
        ${currentTab === 'grind' ? 'अनाज पिसाई, तेल घानी, घटौती कटौती और टोकन हिसाब' : (currentTab === 'sale' ? 'शुद्ध तेल, ताजा आटा, खली, पॉलिश या अन्य दुकान के सामान की बिक्री' : 'किसानों से सरसों, गेहूँ, धान, खली आदि की खरीद व खाता')}
      </p>
    </div>
  </div>

  <!-- Segmented Switcher for Grinding vs Product Sale vs Grain Purchase -->
  <div class="trade-tabs-wrap" style="display:flex;background:#f1f5f9;padding:4px;border-radius:14px;margin-bottom:16px;gap:4px;border:1px solid #e2e8f0;">
    <button type="button" class="trade-tab-btn ${currentTab === 'grind' ? 'is-active' : ''}" data-act="switch-job-tab" data-tab="grind" style="flex:1;padding:10px 4px;border:none;border-radius:10px;font-weight:750;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s ease;${currentTab === 'grind' ? 'background:#fff;color:#0f172a;box-shadow:0 2px 6px rgba(0,0,0,0.08);' : 'background:transparent;color:#64748b;'}">
      <span>⚙️</span> <span>पिसाई / प्रोसेस</span>
    </button>
    <button type="button" class="trade-tab-btn ${currentTab === 'sale' ? 'is-active' : ''}" data-act="switch-job-tab" data-tab="sale" style="flex:1;padding:10px 4px;border:none;border-radius:10px;font-weight:750;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s ease;${currentTab === 'sale' ? 'background:#fff;color:#059669;box-shadow:0 2px 6px rgba(0,0,0,0.08);' : 'background:transparent;color:#64748b;'}">
      <span>🛒</span> <span>सामान बिक्री</span>
    </button>
    <button type="button" class="trade-tab-btn ${currentTab === 'purchase' ? 'is-active' : ''}" data-act="switch-job-tab" data-tab="purchase" style="flex:1;padding:10px 4px;border:none;border-radius:10px;font-weight:750;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s ease;${currentTab === 'purchase' ? 'background:#fff;color:#d97706;box-shadow:0 2px 6px rgba(0,0,0,0.08);' : 'background:transparent;color:#64748b;'}">
      <span>📥</span> <span>कच्चा माल खरीद</span>
    </button>
  </div>

  ${currentTab === 'grind' ? renderGrindTab(data) : (currentTab === 'sale' ? renderSaleTab(data) : renderPurchaseTab(data))}
  `;
}

function renderGrindTab(data) {
  const job = state.job;
  const svc = currentService();
  const unit = svc ? unitOf(svc.unit) : 'kg';

  const scaleConnected = !!(state.scale && state.scale.connected);
  const liveWt = (state.scale && state.scale.weight) || 0;

  const grossWeight = Number(job.qty) || 0;
  const ratePerUnit = Number(job.rate) || 0;
  const lossRatePerKg = job.lossRateG !== '' && job.lossRateG !== undefined
    ? Number(job.lossRateG)
    : (svc ? Number(svc.lossRateG || 0) : 0);

  const totalLossG = svc && svc.unit === 'kg' ? Math.round(grossWeight * lossRatePerKg) : 0;
  const netWeight = svc && svc.unit === 'kg' ? Math.max(0, grossWeight - (totalLossG / 1000)) : grossWeight;
  const amountPaise = Math.round(grossWeight * ratePerUnit * 100);

  const matchedCustomer = data.customers.find((c) => {
    if (!job.name) return false;
    const nameMatch = c.name.toLowerCase() === job.name.trim().toLowerCase();
    if (!nameMatch) return false;
    if (job.village) {
      return (c.village || '').toLowerCase() === job.village.trim().toLowerCase();
    }
    return true;
  });

  return `
  <form class="card" data-form="job">
    ${job.tokenNo ? `
    <div class="sheet-head" style="margin-bottom:14px;background:var(--brand-soft);padding:10px 14px;border-radius:12px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:700;color:var(--brand)">${t('tokenJobBadge', { no: job.tokenNo })}</span>
      <button type="button" class="btn btn-sm btn-ghost" data-act="clear-job-token">${t('clearToken')}</button>
    </div>` : ''}

    <div class="section-head"><h2 class="section-title">${t('pickService')}</h2></div>
    <div class="service-grid">${serviceCards('job')}</div>

    <div class="two-col">
      <div class="field">
        <label for="j-name">${t('customerName')}</label>
        <input id="j-name" name="name" list="cust-names" maxlength="60" value="${esc(job.name)}"
          placeholder="Name" autocomplete="off">
        <datalist id="cust-names">
          ${data.customers.map((c) => `<option value="${esc(c.name)}">${c.village ? esc(c.village) : ''}${c.phone ? ' · ' + c.phone : ''}</option>`).join('')}
        </datalist>
      </div>
      <div class="field">
        <label for="j-village">${t('villageLabel')}</label>
        <input id="j-village" name="village" list="cust-villages" maxlength="60" value="${esc(job.village || '')}"
          placeholder="Village / Location" autocomplete="off">
        <datalist id="cust-villages">
          ${[...new Set(data.customers.map((c) => c.village).filter(Boolean))].map((v) => `<option value="${esc(v)}"></option>`).join('')}
        </datalist>
      </div>
    </div>

    <div class="field">
      <label for="j-phone">${t('phoneLabel')}</label>
      <input id="j-phone" name="phone" type="tel" inputmode="numeric" maxlength="10"
        value="${esc(job.phone)}" placeholder="10 Digits">
    </div>

    <div id="cust-balance-banner" class="cust-banner ${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? 'due' : (matchedCustomer.balancePaise < 0 ? 'adv' : 'zero')) : ''}" style="${matchedCustomer ? '' : 'display:none'}">
      <span>${matchedCustomer ? (matchedCustomer.village ? `<strong>${esc(matchedCustomer.name)} (${esc(matchedCustomer.village)})</strong>` : `<strong>${esc(matchedCustomer.name)}</strong>`) + ' ledger:' : ''}</span>
      <strong>${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? inr(matchedCustomer.balancePaise) + ' ' + t('dueTag') : (matchedCustomer.balancePaise < 0 ? inr(-matchedCustomer.balancePaise) + ' ' + t('advTag') : t('settledTag'))) : ''}</strong>
    </div>

    <!-- Machine Automation & Hardware Bar -->
    <div class="hardware-quick-bar" style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 8px">
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-ocr" style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:6px" title="Read digital scale display with camera">
        <span>📷</span> <span>Scale OCR</span>
      </button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-bt" style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:6px" title="Connect Bluetooth BLE electronic scale">
        <span>⚖️</span> <span>${scaleConnected ? 'Scale: ' + liveWt + 'kg' : 'BT Scale'}</span>
      </button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-qr-scan" style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:6px" title="Scan Token QR Code">
        <span>🔲</span> <span>Scan QR</span>
      </button>
    </div>

    <div class="two-col">
      <div class="field">
        <label for="j-qty" style="display:flex;justify-content:space-between">
          <span>${t('grossWeight')} (${unit})</span>
          ${scaleConnected ? `<span class="tiny-chip" style="background:#dcfce7;color:#15803d">● Live ${liveWt} kg</span>` : ''}
        </label>
        <input id="j-qty" name="qty" type="number" step="any" min="0" inputmode="decimal"
          value="${job.qty}" placeholder="0.00" required>
      </div>
      <div class="field">
        <label for="j-rate">${t('ratePerUnit', { unit })}</label>
        <input id="j-rate" name="rate" type="number" step="any" min="0" inputmode="decimal"
          value="${job.rate}" placeholder="0.00" required>
      </div>
    </div>

    <!-- Live Dynamic Loss / Deduction Box -->
    <div class="loss-calc-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:12px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:700;font-size:13px;color:#334155;display:flex;align-items:center;gap:6px">
          <span>✂️</span> <span>${t('lossSettingsTitle')}</span>
        </span>
        <span class="tiny-chip" style="background:#e0e7ff;color:#3730a3">घटौती / काट हिसाब</span>
      </div>

      <div class="two-col" style="margin-bottom:8px">
        <div class="field" style="margin-bottom:0">
          <label for="j-loss-rate" class="tiny" style="color:#64748b">${t('lossRateLabel')}</label>
          <input id="j-loss-rate" name="lossRateG" type="number" step="1" min="0" inputmode="numeric"
            value="${job.lossRateG !== undefined && job.lossRateG !== '' ? job.lossRateG : (svc ? svc.lossRateG || 0 : 0)}"
            placeholder="0" style="padding:6px 10px;font-size:13px">
        </div>
        <div class="field" style="margin-bottom:0">
          <label class="tiny" style="color:#64748b">${t('presetLoss')}</label>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button type="button" class="btn btn-sm btn-ghost loss-preset" data-g="0" style="padding:4px 6px;font-size:11px">0g</button>
            <button type="button" class="btn btn-sm btn-ghost loss-preset" data-g="10" style="padding:4px 6px;font-size:11px">10g</button>
            <button type="button" class="btn btn-sm btn-ghost loss-preset" data-g="20" style="padding:4px 6px;font-size:11px">20g</button>
            <button type="button" class="btn btn-sm btn-ghost loss-preset" data-g="50" style="padding:4px 6px;font-size:11px">50g</button>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
        <div style="background:#fff7ed;padding:10px;border-radius:10px;border:1px solid #fed7aa">
          <div style="font-size:11px;color:#c2410c;font-weight:600">${t('totalLoss')}</div>
          <div style="font-size:16px;font-weight:800;color:#ea580c;margin-top:2px" id="loss-total-preview">${totalLossG ? '-' + totalLossG + ' g' : '0 g'}</div>
        </div>
        <div style="background:#f0fdf4;padding:10px;border-radius:10px;border:1px solid #bbf7d0">
          <div style="font-size:11px;color:#15803d;font-weight:600">${t('netWeight')}</div>
          <div style="font-size:16px;font-weight:800;color:#16a34a;margin-top:2px" id="net-qty-preview">${netWeight ? netWeight.toFixed(3) + ' ' + unit : '0 ' + unit}</div>
        </div>
      </div>

      <div class="amount-box" style="margin-top:12px;margin-bottom:0">
        <span class="amt-label">${t('totalAmount')}</span>
        <span class="amt-value" id="amount-preview">${inr(amountPaise)}</span>
      </div>
    </div>

    <div class="field">
      <label>${t('paymentType')}</label>
      <div class="seg">
        <label><input type="radio" name="paid" value="yes"${job.paid ? ' checked' : ''}><span>${t('cashPaid')}</span></label>
        <label><input type="radio" name="paid" value="no"${job.paid ? '' : ' checked'}><span>${t('creditDue')}</span></label>
      </div>
    </div>

    <!-- Udhaar Customer Photo & Identification Card -->
    <div id="udhaar-photo-card" style="display:${job.paid ? 'none' : 'block'};background:#fffbeb;border:1.5px solid #f59e0b;border-radius:14px;padding:14px;margin:14px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-weight:800;color:#b45309;font-size:13.5px;display:flex;align-items:center;gap:6px;">
          <span>📸</span> <span>उधार खाता पहचान (Photo Verification)</span>
        </span>
        <span class="tiny-chip" style="background:#fef3c7;color:#92400e;font-weight:700;">उधार सुरक्षा</span>
      </div>
      <p class="tiny" style="color:#78350f;margin-bottom:12px;line-height:1.4;">
        उधार देते समय ग्राहक का फोटो रखें ताकि बाद में नाम या व्यक्ति पहचानने में कोई भ्रम या गड़बड़ी न हो।
      </p>

      <div style="display:flex;align-items:center;gap:14px;">
        <div id="job-photo-preview-wrap" style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2.5px solid #f59e0b;background:#fff;display:grid;place-items:center;flex-shrink:0;box-shadow:0 2px 8px rgba(245,158,11,0.25);cursor:pointer;" onclick="document.getElementById('job-photo-file').click();">
          <img id="job-photo-img" src="${matchedCustomer ? esc(matchedCustomer.photo || '') : ''}" style="${matchedCustomer && matchedCustomer.photo ? '' : 'display:none;'}width:100%;height:100%;object-fit:cover;">
          <span id="job-photo-ph" style="${matchedCustomer && matchedCustomer.photo ? 'display:none;' : ''}font-size:28px;">👤</span>
        </div>

        <div style="flex:1;">
          <div id="job-photo-cust-name" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:2px;">
            ${matchedCustomer ? esc(matchedCustomer.name) + (matchedCustomer.village ? ` (${esc(matchedCustomer.village)})` : '') : 'ग्राहक का नाम ऊपर लिखें'}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;">
            <label class="btn btn-sm btn-primary" style="background:#d97706;padding:6px 12px;border-radius:8px;font-weight:700;display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;">
              <span>📷</span> <span id="job-photo-btn-txt">${matchedCustomer && matchedCustomer.photo ? 'नया फोटो लें' : 'ग्राहक का फोटो खींचें'}</span>
              <input type="file" id="job-photo-file" accept="image/*" capture="user" style="display:none;">
            </label>
            <button type="button" class="btn btn-sm btn-ghost" id="job-photo-clear" style="${matchedCustomer && matchedCustomer.photo ? 'display:inline-flex;' : 'display:none;'}color:#dc2626;font-size:12px;padding:4px 8px;">हटाएं</button>
          </div>
        </div>
      </div>
      <input type="hidden" id="j-photo" name="photo" value="${matchedCustomer ? esc(matchedCustomer.photo || '') : ''}">
    </div>

    <div class="field">
      <label for="j-note">${t('noteLabel')}</label>
      <input id="j-note" name="note" maxlength="120" value="${esc(job.note)}" placeholder="${t('notePlaceholder')}">
    </div>

    ${job.tokenNo ? '' : `
    <label class="check">
      <input type="checkbox" name="withToken"${job.withToken ? ' checked' : ''}> ${t('alsoIssueToken')}
    </label>`}

    <button class="btn btn-primary btn-block" type="submit">${t('saveJobBtn')}</button>
  </form>`;
}

function renderSaleTab(data) {
  const trade = state.trade;
  const qty = Number(trade.qty) || 0;
  const rate = Number(trade.rate) || 0;
  const amountPaise = trade.amount ? Math.round(Number(trade.amount) * 100) : Math.round(qty * rate * 100);

  // Dynamic user-defined products for sale
  const customProducts = (data.products || []).filter((p) => p.type === 'sale' || p.type === 'both');
  const presets = customProducts.map((p) => ({
    item: p.name,
    unit: p.unit,
    rate: p.defaultRatePaise ? p.defaultRatePaise / 100 : '',
    icon: '📦',
  }));

  const matchedCustomer = data.customers.find((c) => {
    if (!trade.name) return false;
    const nameMatch = c.name.toLowerCase() === trade.name.trim().toLowerCase();
    if (!nameMatch) return false;
    if (trade.village) {
      return (c.village || '').toLowerCase() === trade.village.trim().toLowerCase();
    }
    return true;
  });

  return `
  <form class="card" data-form="trade">
    <input type="hidden" name="kind" value="sale">

    <!-- Quick Dynamic Product Chips -->
    <div class="section-head" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h2 class="section-title">सामान चुनें या नीचे नाम लिखें</h2>
      <button type="button" class="btn btn-sm btn-ghost" data-act="open-product-modal" data-type="sale" style="font-size:12px;color:#059669;font-weight:700;">+ नया सामान जोड़ें</button>
    </div>

    ${presets.length ? `
    <div class="trade-presets-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:8px;margin-bottom:14px;">
      ${presets.map((p) => `
        <button type="button" class="btn btn-soft trade-preset-btn ${trade.item === p.item ? 'is-active' : ''}"
          data-act="pick-trade-preset" data-item="${esc(p.item)}" data-unit="${esc(p.unit)}" data-rate="${p.rate || ''}"
          style="padding:10px 8px;text-align:left;display:flex;flex-direction:column;gap:3px;border-radius:12px;font-size:12px;border:1.5px solid ${trade.item === p.item ? '#059669' : '#e2e8f0'};background:${trade.item === p.item ? '#ecfdf5' : '#fff'};cursor:pointer;">
          <span style="font-size:15px;">${p.icon || '📦'} <strong>${esc(p.item)}</strong></span>
          <span style="color:#64748b;font-size:11px;">${p.rate ? inr(p.rate * 100) + ' / ' + unitOf(p.unit) : unitOf(p.unit)}</span>
        </button>
      `).join('')}
    </div>` : `
    <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="font-size:12px;color:#64748b;">
        <span>📦 अभी कोई सामान सेव नहीं है। नीचे नाम लिखकर बेचें या <strong>+ नया सामान जोड़ें</strong>।</span>
      </div>
      <button type="button" class="btn btn-sm btn-soft" data-act="open-product-modal" data-type="sale" style="font-size:11px;font-weight:700;color:#059669;white-space:nowrap;">+ नया सामान</button>
    </div>`}

    <div class="two-col">
      <div class="field">
        <label for="tr-item">सामान / उत्पाद का नाम *</label>
        <input id="tr-item" name="item" list="sale-items-datalist" maxlength="60" value="${esc(trade.item)}"
          placeholder="e.g. शुद्ध सरसों तेल, ताजा आटा..." required autocomplete="off">
        <datalist id="sale-items-datalist">
          ${presets.map((p) => `<option value="${esc(p.item)}">${p.rate ? inr(p.rate * 100) + ' / ' + unitOf(p.unit) : ''}</option>`).join('')}
        </datalist>
      </div>

      <div class="field">
        <label for="tr-unit">इकाई (Unit)</label>
        <select id="tr-unit" name="unit" style="padding:10px 12px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;font-weight:700;">
          <option value="kg"${trade.unit === 'kg' ? ' selected' : ''}>किलो (kg)</option>
          <option value="ltr"${trade.unit === 'ltr' ? ' selected' : ''}>लीटर (ltr)</option>
          <option value="qtl"${trade.unit === 'qtl' ? ' selected' : ''}>क्विंटल (qtl)</option>
          <option value="bag"${trade.unit === 'bag' ? ' selected' : ''}>बोरी (bag)</option>
          <option value="pkt"${trade.unit === 'pkt' ? ' selected' : ''}>पैकेट (pkt)</option>
          <option value="pc"${trade.unit === 'pc' ? ' selected' : ''}>नग / पीस (pc)</option>
        </select>
      </div>
    </div>

    <div class="two-col">
      <div class="field">
        <label for="tr-qty">मात्रा / वजन (Quantity) *</label>
        <input id="tr-qty" name="qty" type="number" step="any" min="0" inputmode="decimal"
          value="${trade.qty}" placeholder="0.00" required>
      </div>
      <div class="field">
        <label for="tr-rate">भाव / रेट (₹ प्रति इकाई)</label>
        <input id="tr-rate" name="rate" type="number" step="any" min="0" inputmode="decimal"
          value="${trade.rate}" placeholder="0.00">
      </div>
    </div>

    <div class="amount-box" style="margin:12px 0;background:#ecfdf5;border-color:#a7f3d0;">
      <span class="amt-label" style="color:#065f46;">कुल बिक्री रकम (Total Amount)</span>
      <span class="amt-value" id="tr-amount-preview" style="color:#059669;">${inr(amountPaise)}</span>
    </div>

    <div class="two-col">
      <div class="field">
        <label for="tr-name">ग्राहक का नाम</label>
        <input id="tr-name" name="name" list="cust-names" maxlength="60" value="${esc(trade.name)}"
          placeholder="नकद ग्राहक / नाम" autocomplete="off">
      </div>
      <div class="field">
        <label for="tr-village">गाँव / पता</label>
        <input id="tr-village" name="village" list="cust-villages" maxlength="60" value="${esc(trade.village || '')}"
          placeholder="गाँव या स्थान" autocomplete="off">
      </div>
    </div>

    <div class="field">
      <label for="tr-phone">मोबाइल नंबर</label>
      <input id="tr-phone" name="phone" type="tel" inputmode="numeric" maxlength="10"
        value="${esc(trade.phone)}" placeholder="10 Digits">
    </div>

    <div id="tr-cust-balance-banner" class="cust-banner ${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? 'due' : (matchedCustomer.balancePaise < 0 ? 'adv' : 'zero')) : ''}" style="${matchedCustomer ? '' : 'display:none'}">
      <span>${matchedCustomer ? (matchedCustomer.village ? `<strong>${esc(matchedCustomer.name)} (${esc(matchedCustomer.village)})</strong>` : `<strong>${esc(matchedCustomer.name)}</strong>`) + ' खाता:' : ''}</span>
      <strong>${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? inr(matchedCustomer.balancePaise) + ' ' + t('dueTag') : (matchedCustomer.balancePaise < 0 ? inr(-matchedCustomer.balancePaise) + ' ' + t('advTag') : t('settledTag'))) : ''}</strong>
    </div>

    <div class="field">
      <label>भुगतान प्रकार</label>
      <div class="seg">
        <label><input type="radio" name="paid" value="yes"${trade.paid ? ' checked' : ''}><span>💵 नकद बिक्री (Cash)</span></label>
        <label><input type="radio" name="paid" value="no"${trade.paid ? '' : ' checked'}><span>📒 उधार बिक्री (Credit Khata)</span></label>
      </div>
    </div>

    <!-- Udhaar Photo Card -->
    <div id="tr-udhaar-photo-card" style="display:${trade.paid ? 'none' : 'block'};background:#fffbeb;border:1.5px solid #f59e0b;border-radius:14px;padding:14px;margin:14px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-weight:800;color:#b45309;font-size:13.5px;display:flex;align-items:center;gap:6px;">
          <span>📸</span> <span>उधार ग्राहक फोटो सत्यापन</span>
        </span>
        <span class="tiny-chip" style="background:#fef3c7;color:#92400e;font-weight:700;">सुरक्षित खाता</span>
      </div>
      <p class="tiny" style="color:#78350f;margin-bottom:12px;line-height:1.4;">
        उधार पर सामान देते समय ग्राहक का फोटो खींचें ताकि बाद में कोई गलतफहमी न हो।
      </p>

      <div style="display:flex;align-items:center;gap:14px;">
        <div id="tr-photo-preview-wrap" style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2.5px solid #f59e0b;background:#fff;display:grid;place-items:center;flex-shrink:0;cursor:pointer;" onclick="document.getElementById('tr-photo-file').click();">
          <img id="tr-photo-img" src="${matchedCustomer ? esc(matchedCustomer.photo || '') : ''}" style="${matchedCustomer && matchedCustomer.photo ? '' : 'display:none;'}width:100%;height:100%;object-fit:cover;">
          <span id="tr-photo-ph" style="${matchedCustomer && matchedCustomer.photo ? 'display:none;' : ''}font-size:28px;">👤</span>
        </div>

        <div style="flex:1;">
          <div id="tr-photo-cust-name" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:2px;">
            ${matchedCustomer ? esc(matchedCustomer.name) + (matchedCustomer.village ? ` (${esc(matchedCustomer.village)})` : '') : 'ग्राहक का नाम ऊपर लिखें'}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;">
            <label class="btn btn-sm btn-primary" style="background:#d97706;padding:6px 12px;border-radius:8px;font-weight:700;display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;">
              <span>📷</span> <span id="tr-photo-btn-txt">${matchedCustomer && matchedCustomer.photo ? 'नया फोटो लें' : 'ग्राहक का फोटो खींचें'}</span>
              <input type="file" id="tr-photo-file" accept="image/*" capture="user" style="display:none;">
            </label>
            <button type="button" class="btn btn-sm btn-ghost" id="tr-photo-clear" style="${matchedCustomer && matchedCustomer.photo ? 'display:inline-flex;' : 'display:none;'}color:#dc2626;font-size:12px;padding:4px 8px;">हटाएं</button>
          </div>
        </div>
      </div>
      <input type="hidden" id="tr-photo" name="photo" value="${matchedCustomer ? esc(matchedCustomer.photo || '') : ''}">
    </div>

    <div class="field">
      <label for="tr-note">टिप्पणी / विवरण (Note)</label>
      <input id="tr-note" name="note" maxlength="120" value="${esc(trade.note)}" placeholder="e.g. 5 लीटर कैन / डिस्काउंट">
    </div>

    <label class="check" style="margin-bottom:14px;font-size:13px;color:#475569;">
      <input type="checkbox" name="saveProduct" value="1" checked> इस सामान को हमेशा के लिए मेरी उत्पाद सूची में जोड़ें
    </label>

    <button class="btn btn-primary btn-block" type="submit" style="background:#059669;border-color:#059669;padding:14px;font-size:15px;font-weight:800;">
      🛒 सामान बिक्री सुरक्षित करें (Save Sale)
    </button>
  </form>`;
}

function renderPurchaseTab(data) {
  const trade = state.trade;
  const qty = Number(trade.qty) || 0;
  const rate = Number(trade.rate) || 0;
  const amountPaise = trade.amount ? Math.round(Number(trade.amount) * 100) : Math.round(qty * rate * 100);

  const scaleConnected = !!(state.scale && state.scale.connected);
  const liveWt = (state.scale && state.scale.weight) || 0;

  // Dynamic user-defined products for purchase
  const customProducts = (data.products || []).filter((p) => p.type === 'purchase' || p.type === 'both');
  const presets = customProducts.map((p) => ({
    item: p.name,
    unit: p.unit,
    rate: p.defaultRatePaise ? p.defaultRatePaise / 100 : '',
    icon: '🌾',
  }));

  const matchedCustomer = data.customers.find((c) => {
    if (!trade.name) return false;
    const nameMatch = c.name.toLowerCase() === trade.name.trim().toLowerCase();
    if (!nameMatch) return false;
    if (trade.village) {
      return (c.village || '').toLowerCase() === trade.village.trim().toLowerCase();
    }
    return true;
  });

  return `
  <form class="card" data-form="trade">
    <input type="hidden" name="kind" value="purchase">

    <!-- Quick Dynamic Purchase Grain Chips -->
    <div class="section-head" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h2 class="section-title">खरीदी जाने वाली फसल / कच्चा माल</h2>
      <button type="button" class="btn btn-sm btn-ghost" data-act="open-product-modal" data-type="purchase" style="font-size:12px;color:#d97706;font-weight:700;">+ नया आइटम जोड़ें</button>
    </div>

    ${presets.length ? `
    <div class="trade-presets-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:8px;margin-bottom:14px;">
      ${presets.map((p) => `
        <button type="button" class="btn btn-soft trade-preset-btn ${trade.item === p.item ? 'is-active' : ''}"
          data-act="pick-trade-preset" data-item="${esc(p.item)}" data-unit="${esc(p.unit)}" data-rate="${p.rate || ''}"
          style="padding:10px 8px;text-align:left;display:flex;flex-direction:column;gap:3px;border-radius:12px;font-size:12px;border:1.5px solid ${trade.item === p.item ? '#d97706' : '#e2e8f0'};background:${trade.item === p.item ? '#fffbeb' : '#fff'};cursor:pointer;">
          <span style="font-size:15px;">${p.icon || '🌾'} <strong>${esc(p.item)}</strong></span>
          <span style="color:#64748b;font-size:11px;">${p.rate ? inr(p.rate * 100) + ' / ' + unitOf(p.unit) : unitOf(p.unit)}</span>
        </button>
      `).join('')}
    </div>` : `
    <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="font-size:12px;color:#64748b;">
        <span>🌾 अभी कोई फसल सेव नहीं है। नीचे नाम लिखकर खरीदें या <strong>+ नई फसल जोड़ें</strong>।</span>
      </div>
      <button type="button" class="btn btn-sm btn-soft" data-act="open-product-modal" data-type="purchase" style="font-size:11px;font-weight:700;color:#d97706;white-space:nowrap;">+ नई फसल</button>
    </div>`}

    <div class="two-col">
      <div class="field">
        <label for="tr-item">फसल / सामग्री का नाम *</label>
        <input id="tr-item" name="item" list="purchase-items-datalist" maxlength="60" value="${esc(trade.item)}"
          placeholder="e.g. सरसों, गेहूँ, मक्का, धान, खली..." required autocomplete="off">
        <datalist id="purchase-items-datalist">
          ${presets.map((p) => `<option value="${esc(p.item)}">${p.rate ? inr(p.rate * 100) + ' / ' + unitOf(p.unit) : ''}</option>`).join('')}
        </datalist>
      </div>

      <div class="field">
        <label for="tr-unit">इकाई (Unit)</label>
        <select id="tr-unit" name="unit" style="padding:10px 12px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;font-weight:700;">
          <option value="kg"${trade.unit === 'kg' ? ' selected' : ''}>किलो (kg)</option>
          <option value="qtl"${trade.unit === 'qtl' ? ' selected' : ''}>क्विंटल (qtl)</option>
          <option value="bag"${trade.unit === 'bag' ? ' selected' : ''}>बोरी (bag)</option>
          <option value="ltr"${trade.unit === 'ltr' ? ' selected' : ''}>लीटर (ltr)</option>
        </select>
      </div>
    </div>

    <!-- Hardware Scale Bar -->
    <div class="hardware-quick-bar" style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 14px">
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-ocr" style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:6px">
        <span>📷</span> <span>Scale OCR वजन</span>
      </button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-bt" style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:6px">
        <span>⚖️</span> <span>${scaleConnected ? 'कांटा: ' + liveWt + 'kg' : 'Bluetooth कांटा'}</span>
      </button>
    </div>

    <div class="two-col">
      <div class="field">
        <label for="tr-qty" style="display:flex;justify-content:space-between">
          <span>तौल / वजन (Quantity) *</span>
          ${scaleConnected ? `<span class="tiny-chip" style="background:#dcfce7;color:#15803d">● Live ${liveWt} kg</span>` : ''}
        </label>
        <input id="tr-qty" name="qty" type="number" step="any" min="0" inputmode="decimal"
          value="${trade.qty}" placeholder="0.00" required>
      </div>
      <div class="field">
        <label for="tr-rate">खरीद भाव / रेट (₹ प्रति इकाई)</label>
        <input id="tr-rate" name="rate" type="number" step="any" min="0" inputmode="decimal"
          value="${trade.rate}" placeholder="0.00">
      </div>
    </div>

    <div class="amount-box" style="margin:12px 0;background:#fffbeb;border-color:#fde68a;">
      <span class="amt-label" style="color:#92400e;">किसान को देय कुल रकम (Payable)</span>
      <span class="amt-value" id="tr-amount-preview" style="color:#d97706;">${inr(amountPaise)}</span>
    </div>

    <div class="two-col">
      <div class="field">
        <label for="tr-name">किसान / सप्लायर का नाम</label>
        <input id="tr-name" name="name" list="cust-names" maxlength="60" value="${esc(trade.name)}"
          placeholder="किसान का नाम" autocomplete="off">
      </div>
      <div class="field">
        <label for="tr-village">गाँव / पता</label>
        <input id="tr-village" name="village" list="cust-villages" maxlength="60" value="${esc(trade.village || '')}"
          placeholder="गाँव या स्थान" autocomplete="off">
      </div>
    </div>

    <div class="field">
      <label for="tr-phone">मोबाइल नंबर</label>
      <input id="tr-phone" name="phone" type="tel" inputmode="numeric" maxlength="10"
        value="${esc(trade.phone)}" placeholder="10 Digits">
    </div>

    <div id="tr-cust-balance-banner" class="cust-banner ${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? 'due' : (matchedCustomer.balancePaise < 0 ? 'adv' : 'zero')) : ''}" style="${matchedCustomer ? '' : 'display:none'}">
      <span>${matchedCustomer ? (matchedCustomer.village ? `<strong>${esc(matchedCustomer.name)} (${esc(matchedCustomer.village)})</strong>` : `<strong>${esc(matchedCustomer.name)}</strong>`) + ' खाता:' : ''}</span>
      <strong>${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? inr(matchedCustomer.balancePaise) + ' ' + t('dueTag') : (matchedCustomer.balancePaise < 0 ? inr(-matchedCustomer.balancePaise) + ' ' + t('advTag') : t('settledTag'))) : ''}</strong>
    </div>

    <div class="field">
      <label>भुगतान की स्थिति</label>
      <div class="seg">
        <label><input type="radio" name="paid" value="yes"${trade.paid ? ' checked' : ''}><span>🟢 तुरंत नकद दिया (Paid Cash)</span></label>
        <label><input type="radio" name="paid" value="no"${trade.paid ? '' : ' checked'}><span>🟣 किसान खाते में जमा (Payable / Khata)</span></label>
      </div>
    </div>

    <div class="field">
      <label for="tr-note">टिप्पणी / विवरण (Note)</label>
      <input id="tr-note" name="note" maxlength="120" value="${esc(trade.note)}" placeholder="e.g. नमी काट 1kg / ग्रेड A">
    </div>

    <label class="check" style="margin-bottom:14px;font-size:13px;color:#475569;">
      <input type="checkbox" name="saveProduct" value="1" checked> इस फसल को हमेशा के लिए मेरी खरीद सूची में जोड़ें
    </label>

    <button class="btn btn-primary btn-block" type="submit" style="background:#d97706;border-color:#d97706;padding:14px;font-size:15px;font-weight:800;">
      📥 कच्चा माल खरीद बिल सुरक्षित करें (Save Purchase)
    </button>
  </form>`;
}
