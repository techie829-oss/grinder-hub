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
  <!-- Sleek POS Header with 3 High-Visibility Tabs -->
  <div class="pos-header">
    <div class="pos-tabs">
      <button type="button" class="pos-tab ${currentTab === 'grind' ? 'is-active is-grind' : ''}" data-act="switch-job-tab" data-tab="grind">
        <span>⚙️ सुविधाएं / सेवा</span>
      </button>
      <button type="button" class="pos-tab ${currentTab === 'sale' ? 'is-active is-sale' : ''}" data-act="switch-job-tab" data-tab="sale">
        <span>🛒 बिक्री</span>
      </button>
      <button type="button" class="pos-tab ${currentTab === 'purchase' ? 'is-active is-purchase' : ''}" data-act="switch-job-tab" data-tab="purchase">
        <span>📥 खरीद</span>
      </button>
    </div>
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
  <form class="card pos-card" data-form="job">
    ${job.tokenNo ? `
    <div class="sheet-head" style="margin-bottom:8px;background:var(--brand-soft);padding:7px 12px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-weight:750;color:var(--brand);font-size:12.5px;">${t('tokenJobBadge', { no: job.tokenNo })}</span>
      <button type="button" class="btn btn-sm btn-ghost" data-act="clear-job-token" style="padding:3px 8px;font-size:11px;">${t('clearToken')}</button>
    </div>` : ''}

    <!-- 1. Compact Service Grid -->
    <div class="pos-sec-head">
      <span>⚙️ सुविधा व सेवा चुनें (Services)</span>
    </div>
    <div class="service-grid pos-svc-grid">${serviceCards('job')}</div>

    <!-- 2. Customer Name & Village (2-in-1 Compact Row) -->
    <div class="pos-row-2">
      <div class="pos-field">
        <label for="j-name">ग्राहक का नाम</label>
        <input id="j-name" name="name" list="cust-names" maxlength="60" value="${esc(job.name)}"
          placeholder="ग्राहक का नाम" autocomplete="off">
        <datalist id="cust-names">
          ${data.customers.map((c) => `<option value="${esc(c.name)}">${c.village ? esc(c.village) : ''}${c.phone ? ' · ' + c.phone : ''}</option>`).join('')}
        </datalist>
      </div>
      <div class="pos-field">
        <label for="j-village">गाँव / स्थान</label>
        <input id="j-village" name="village" list="cust-villages" maxlength="60" value="${esc(job.village || '')}"
          placeholder="गाँव या स्थान" autocomplete="off">
        <datalist id="cust-villages">
          ${[...new Set(data.customers.map((c) => c.village).filter(Boolean))].map((v) => `<option value="${esc(v)}"></option>`).join('')}
        </datalist>
      </div>
    </div>

    <!-- 3. Phone & Quick Hardware Scale Strip -->
    <div style="display:flex;gap:6px;align-items:flex-end;margin-bottom:8px;">
      <div class="pos-field" style="flex:1;margin-bottom:0;">
        <label for="j-phone">मोबाइल नंबर</label>
        <input id="j-phone" name="phone" type="tel" inputmode="numeric" maxlength="10"
          value="${esc(job.phone)}" placeholder="10 Digits">
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-ocr" style="padding:6px 8px;font-size:12px;height:38px;border-radius:10px;" title="Camera Scale OCR">📷 OCR</button>
        <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-bt" style="padding:6px 8px;font-size:12px;height:38px;border-radius:10px;" title="Bluetooth Scale">⚖️ ${scaleConnected ? liveWt + 'k' : 'कांटा'}</button>
        <button type="button" class="btn btn-sm btn-ghost" data-act="hw-qr-scan" style="padding:6px 8px;font-size:12px;height:38px;border-radius:10px;" title="QR Scan">🔲 QR</button>
      </div>
    </div>

    <div id="cust-balance-banner" class="cust-banner ${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? 'due' : (matchedCustomer.balancePaise < 0 ? 'adv' : 'zero')) : ''}" style="${matchedCustomer ? '' : 'display:none'};margin-bottom:8px;">
      <span>${matchedCustomer ? (matchedCustomer.village ? `<strong>${esc(matchedCustomer.name)} (${esc(matchedCustomer.village)})</strong>` : `<strong>${esc(matchedCustomer.name)}</strong>`) + ' ledger:' : ''}</span>
      <strong>${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? inr(matchedCustomer.balancePaise) + ' ' + t('dueTag') : (matchedCustomer.balancePaise < 0 ? inr(-matchedCustomer.balancePaise) + ' ' + t('advTag') : t('settledTag'))) : ''}</strong>
    </div>

    <!-- 4. POS Core Billing Dashboard Box (Weight + Rate = Total) -->
    <div class="pos-billing-strip">
      <div class="pos-bill-input-group">
        <div class="pos-bill-field">
          <label for="j-qty">आवक वजन (${unit}) * ${scaleConnected ? `<span style="color:#15803d;font-weight:700;">● ${liveWt}</span>` : ''}</label>
          <input id="j-qty" name="qty" type="number" step="any" min="0" inputmode="decimal"
            value="${job.qty}" placeholder="0.00" required>
        </div>
        <div class="pos-bill-field">
          <label for="j-rate">दर (₹/${unit})</label>
          <input id="j-rate" name="rate" type="number" step="any" min="0" inputmode="decimal"
            value="${job.rate}" placeholder="0.00" required>
        </div>
      </div>
      <div class="pos-bill-total is-grind">
        <div class="pos-total-sub">कुल सेवा बिल</div>
        <div class="pos-total-val" id="amount-preview">${inr(amountPaise)}</div>
      </div>
    </div>

    <!-- 5. Inline Loss / Deduction Strip -->
    <div class="pos-loss-strip">
      <div class="pos-loss-left">
        <span style="font-weight:750;color:#c2410c;">✂️ काट:</span>
        <input id="j-loss-rate" name="lossRateG" type="number" step="any" min="0" inputmode="numeric"
          value="${job.lossRateG !== undefined && job.lossRateG !== '' ? job.lossRateG : (svc ? svc.lossRateG || 0 : 0)}"
          class="pos-loss-input">
        <span style="color:#64748b;font-size:10px;">g/${unit}</span>
        <button type="button" class="pos-loss-pill loss-preset" data-g="0">0g</button>
        <button type="button" class="pos-loss-pill loss-preset" data-g="10">10g</button>
        <button type="button" class="pos-loss-pill loss-preset" data-g="15">15g</button>
        <button type="button" class="pos-loss-pill loss-preset" data-g="20">20g</button>
      </div>
      <div class="pos-loss-right">
        <span id="loss-total-preview" style="color:#ea580c;font-weight:700;">${totalLossG ? '-' + totalLossG + 'g' : '0g'}</span>
        → <strong id="net-qty-preview" style="color:#16a34a;">${netWeight ? netWeight.toFixed(3) + ' ' + unit : '0 ' + unit}</strong>
      </div>
    </div>

    <!-- 6. Payment Mode Toggle -->
    <div class="pos-pay-toggle">
      <label class="pos-pay-opt"><input type="radio" name="paid" value="yes"${job.paid ? ' checked' : ''}><span>🟢 नकद मिला (Cash Paid)</span></label>
      <label class="pos-pay-opt"><input type="radio" name="paid" value="no"${job.paid ? '' : ' checked'}><span>🟣 बाकी / उधार (Credit Due)</span></label>
    </div>

    <!-- Udhaar Photo Card -->
    <div id="udhaar-photo-card" style="display:${job.paid ? 'none' : 'block'};background:#fffbeb;border:1.5px solid #f59e0b;border-radius:12px;padding:10px;margin:8px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:750;color:#b45309;font-size:12px;">📸 उधार खाता फोटो सत्यापन</span>
        <span class="tiny-chip" style="background:#fef3c7;color:#92400e;font-size:10px;">सुरक्षित उधार</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div id="job-photo-preview-wrap" style="width:48px;height:48px;border-radius:50%;overflow:hidden;border:2px solid #f59e0b;background:#fff;display:grid;place-items:center;flex-shrink:0;cursor:pointer;" onclick="document.getElementById('job-photo-file').click();">
          <img id="job-photo-img" src="${matchedCustomer ? esc(matchedCustomer.photo || '') : ''}" style="${matchedCustomer && matchedCustomer.photo ? '' : 'display:none;'}width:100%;height:100%;object-fit:cover;">
          <span id="job-photo-ph" style="${matchedCustomer && matchedCustomer.photo ? 'display:none;' : ''}font-size:22px;">👤</span>
        </div>
        <div style="flex:1;">
          <div id="job-photo-cust-name" style="font-size:12px;font-weight:750;color:#0f172a;">
            ${matchedCustomer ? esc(matchedCustomer.name) + (matchedCustomer.village ? ` (${esc(matchedCustomer.village)})` : '') : 'ग्राहक का नाम ऊपर लिखें'}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
            <label class="btn btn-sm btn-primary" style="background:#d97706;padding:4px 9px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px;">
              <span>📷</span> <span id="job-photo-btn-txt">${matchedCustomer && matchedCustomer.photo ? 'फोटो बदलें' : 'फोटो खींचें'}</span>
              <input type="file" id="job-photo-file" accept="image/*" capture="user" style="display:none;">
            </label>
            <button type="button" class="btn btn-sm btn-ghost" id="job-photo-clear" style="${matchedCustomer && matchedCustomer.photo ? 'display:inline-flex;' : 'display:none;'}color:#dc2626;font-size:11px;padding:3px 6px;">हटाएं</button>
          </div>
        </div>
      </div>
      <input type="hidden" id="j-photo" name="photo" value="${matchedCustomer ? esc(matchedCustomer.photo || '') : ''}">
    </div>

    <!-- 7. Note & Token checkbox -->
    <div class="pos-field" style="margin-bottom:6px;">
      <input id="j-note" name="note" maxlength="120" value="${esc(job.note)}" placeholder="नोट (वैकल्पिक e.g. बारीक, सूखा माल)">
    </div>

    ${job.tokenNo ? '' : `
    <label class="check" style="margin-bottom:8px;font-size:12px;color:#64748b;">
      <input type="checkbox" name="withToken"${job.withToken ? ' checked' : ''}> इस काम का टोकन पर्ची भी निकालें
    </label>`}

    <button class="btn btn-primary btn-block pos-submit-btn" type="submit">
      ✓ हिसाब में जोड़ें (Save Bill)
    </button>
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
  <form class="card pos-card" data-form="trade">
    <input type="hidden" name="kind" value="sale">

    <!-- 1. Quick Saved Product Chips -->
    <div class="pos-sec-head">
      <span>🛒 तैयार सामान चुनें</span>
      <button type="button" class="btn btn-sm btn-ghost" data-act="open-product-modal" data-type="sale" style="font-size:11.5px;color:#059669;font-weight:700;padding:2px 6px;">+ नया सामान</button>
    </div>

    ${presets.length ? `
    <div class="pos-chip-grid">
      ${presets.map((p) => `
        <button type="button" class="pos-chip-btn ${trade.item === p.item ? 'is-sale-active' : ''}"
          data-act="pick-trade-preset" data-item="${esc(p.item)}" data-unit="${esc(p.unit)}" data-rate="${p.rate || ''}">
          <strong>${p.icon || '📦'} ${esc(p.item)}</strong>
          <span>${p.rate ? inr(p.rate * 100) + '/' + unitOf(p.unit) : unitOf(p.unit)}</span>
        </button>
      `).join('')}
    </div>` : `
    <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:8px 10px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
      <span style="font-size:11.5px;color:#64748b;">📦 कोई सामान सेव नहीं है।</span>
      <button type="button" class="btn btn-sm btn-soft" data-act="open-product-modal" data-type="sale" style="font-size:11px;font-weight:700;color:#059669;padding:3px 8px;">+ जोड़ें</button>
    </div>`}

    <!-- 2. Item Name & Unit (2-in-1 Compact Row) -->
    <div class="pos-row-2">
      <div class="pos-field">
        <label for="tr-item">सामान का नाम *</label>
        <input id="tr-item" name="item" list="sale-items-datalist" maxlength="60" value="${esc(trade.item)}"
          placeholder="जैसे: सरसों तेल, आटा..." required autocomplete="off">
        <datalist id="sale-items-datalist">
          ${presets.map((p) => `<option value="${esc(p.item)}">${p.rate ? inr(p.rate * 100) + ' / ' + unitOf(p.unit) : ''}</option>`).join('')}
        </datalist>
      </div>
      <div class="pos-field">
        <label for="tr-unit">इकाई (Unit)</label>
        <select id="tr-unit" name="unit">
          <option value="kg"${trade.unit === 'kg' ? ' selected' : ''}>किलो (kg)</option>
          <option value="ltr"${trade.unit === 'ltr' ? ' selected' : ''}>लीटर (ltr)</option>
          <option value="qtl"${trade.unit === 'qtl' ? ' selected' : ''}>क्विंटल (qtl)</option>
          <option value="bag"${trade.unit === 'bag' ? ' selected' : ''}>बोरी (bag)</option>
          <option value="pkt"${trade.unit === 'pkt' ? ' selected' : ''}>पैकेट (pkt)</option>
          <option value="pc"${trade.unit === 'pc' ? ' selected' : ''}>नग / पीस (pc)</option>
        </select>
      </div>
    </div>

    <!-- 3. POS Core Billing Dashboard Box (Qty + Rate = Total) -->
    <div class="pos-billing-strip">
      <div class="pos-bill-input-group">
        <div class="pos-bill-field">
          <label for="tr-qty">मात्रा / वजन *</label>
          <input id="tr-qty" name="qty" type="number" step="any" min="0" inputmode="decimal"
            value="${trade.qty}" placeholder="0.00" required>
        </div>
        <div class="pos-bill-field">
          <label for="tr-rate">भाव / रेट (₹)</label>
          <input id="tr-rate" name="rate" type="number" step="any" min="0" inputmode="decimal"
            value="${trade.rate}" placeholder="0.00">
        </div>
      </div>
      <div class="pos-bill-total is-sale">
        <div class="pos-total-sub">कुल बिक्री बिल</div>
        <div class="pos-total-val" id="tr-amount-preview">${inr(amountPaise)}</div>
      </div>
    </div>

    <!-- 4. Customer Info (2-in-1 Compact Row) -->
    <div class="pos-row-2">
      <div class="pos-field">
        <label for="tr-name">ग्राहक का नाम</label>
        <input id="tr-name" name="name" list="cust-names" maxlength="60" value="${esc(trade.name)}"
          placeholder="ग्राहक का नाम" autocomplete="off">
      </div>
      <div class="pos-field">
        <label for="tr-village">गाँव / पता</label>
        <input id="tr-village" name="village" list="cust-villages" maxlength="60" value="${esc(trade.village || '')}"
          placeholder="गाँव या स्थान" autocomplete="off">
      </div>
    </div>

    <div class="pos-field">
      <label for="tr-phone">मोबाइल नंबर</label>
      <input id="tr-phone" name="phone" type="tel" inputmode="numeric" maxlength="10"
        value="${esc(trade.phone)}" placeholder="10 Digits">
    </div>

    <div id="tr-cust-balance-banner" class="cust-banner ${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? 'due' : (matchedCustomer.balancePaise < 0 ? 'adv' : 'zero')) : ''}" style="${matchedCustomer ? '' : 'display:none'};margin-bottom:8px;">
      <span>${matchedCustomer ? (matchedCustomer.village ? `<strong>${esc(matchedCustomer.name)} (${esc(matchedCustomer.village)})</strong>` : `<strong>${esc(matchedCustomer.name)}</strong>`) + ' खाता:' : ''}</span>
      <strong>${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? inr(matchedCustomer.balancePaise) + ' ' + t('dueTag') : (matchedCustomer.balancePaise < 0 ? inr(-matchedCustomer.balancePaise) + ' ' + t('advTag') : t('settledTag'))) : ''}</strong>
    </div>

    <!-- 5. Payment Mode Toggle -->
    <div class="pos-pay-toggle">
      <label class="pos-pay-opt"><input type="radio" name="paid" value="yes"${trade.paid ? ' checked' : ''}><span>💵 नकद बिक्री (Cash)</span></label>
      <label class="pos-pay-opt"><input type="radio" name="paid" value="no"${trade.paid ? '' : ' checked'}><span>📒 उधार बिक्री (Khata)</span></label>
    </div>

    <!-- Udhaar Photo Card -->
    <div id="tr-udhaar-photo-card" style="display:${trade.paid ? 'none' : 'block'};background:#fffbeb;border:1.5px solid #f59e0b;border-radius:12px;padding:10px;margin:8px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:750;color:#b45309;font-size:12px;">📸 उधार ग्राहक फोटो सत्यापन</span>
        <span class="tiny-chip" style="background:#fef3c7;color:#92400e;font-size:10px;">सुरक्षित खाता</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div id="tr-photo-preview-wrap" style="width:48px;height:48px;border-radius:50%;overflow:hidden;border:2px solid #f59e0b;background:#fff;display:grid;place-items:center;flex-shrink:0;cursor:pointer;" onclick="document.getElementById('tr-photo-file').click();">
          <img id="tr-photo-img" src="${matchedCustomer ? esc(matchedCustomer.photo || '') : ''}" style="${matchedCustomer && matchedCustomer.photo ? '' : 'display:none;'}width:100%;height:100%;object-fit:cover;">
          <span id="tr-photo-ph" style="${matchedCustomer && matchedCustomer.photo ? 'display:none;' : ''}font-size:22px;">👤</span>
        </div>
        <div style="flex:1;">
          <div id="tr-photo-cust-name" style="font-size:12px;font-weight:750;color:#0f172a;">
            ${matchedCustomer ? esc(matchedCustomer.name) + (matchedCustomer.village ? ` (${esc(matchedCustomer.village)})` : '') : 'ग्राहक का नाम ऊपर लिखें'}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
            <label class="btn btn-sm btn-primary" style="background:#d97706;padding:4px 9px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px;">
              <span>📷</span> <span id="tr-photo-btn-txt">${matchedCustomer && matchedCustomer.photo ? 'फोटो बदलें' : 'फोटो खींचें'}</span>
              <input type="file" id="tr-photo-file" accept="image/*" capture="user" style="display:none;">
            </label>
            <button type="button" class="btn btn-sm btn-ghost" id="tr-photo-clear" style="${matchedCustomer && matchedCustomer.photo ? 'display:inline-flex;' : 'display:none;'}color:#dc2626;font-size:11px;padding:3px 6px;">हटाएं</button>
          </div>
        </div>
      </div>
      <input type="hidden" id="tr-photo" name="photo" value="${matchedCustomer ? esc(matchedCustomer.photo || '') : ''}">
    </div>

    <!-- 6. Note & Auto-Save Checkbox -->
    <div class="pos-field" style="margin-bottom:6px;">
      <input id="tr-note" name="note" maxlength="120" value="${esc(trade.note)}" placeholder="नोट (वैकल्पिक e.g. कैन पैक / डिस्काउंट)">
    </div>

    <label class="check" style="margin-bottom:8px;font-size:12px;color:#64748b;">
      <input type="checkbox" name="saveProduct" value="1" checked> इस सामान को हमेशा के लिए उत्पाद सूची में जोड़ें
    </label>

    <button class="btn btn-primary btn-block pos-submit-btn" type="submit" style="background:#059669;border-color:#059669;">
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
  <form class="card pos-card" data-form="trade">
    <input type="hidden" name="kind" value="purchase">

    <!-- 1. Quick Saved Crop Chips -->
    <div class="pos-sec-head">
      <span>📥 खरीदी जाने वाली फसल / माल</span>
      <button type="button" class="btn btn-sm btn-ghost" data-act="open-product-modal" data-type="purchase" style="font-size:11.5px;color:#d97706;font-weight:700;padding:2px 6px;">+ नई फसल</button>
    </div>

    ${presets.length ? `
    <div class="pos-chip-grid">
      ${presets.map((p) => `
        <button type="button" class="pos-chip-btn ${trade.item === p.item ? 'is-purchase-active' : ''}"
          data-act="pick-trade-preset" data-item="${esc(p.item)}" data-unit="${esc(p.unit)}" data-rate="${p.rate || ''}">
          <strong>${p.icon || '🌾'} ${esc(p.item)}</strong>
          <span>${p.rate ? inr(p.rate * 100) + '/' + unitOf(p.unit) : unitOf(p.unit)}</span>
        </button>
      `).join('')}
    </div>` : `
    <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:8px 10px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
      <span style="font-size:11.5px;color:#64748b;">🌾 कोई फसल सेव नहीं है।</span>
      <button type="button" class="btn btn-sm btn-soft" data-act="open-product-modal" data-type="purchase" style="font-size:11px;font-weight:700;color:#d97706;padding:3px 8px;">+ जोड़ें</button>
    </div>`}

    <!-- 2. Crop Name & Unit (2-in-1 Compact Row) -->
    <div class="pos-row-2">
      <div class="pos-field">
        <label for="tr-item">फसल / माल का नाम *</label>
        <input id="tr-item" name="item" list="purchase-items-datalist" maxlength="60" value="${esc(trade.item)}"
          placeholder="जैसे: सरसों, गेहूँ, मक्का..." required autocomplete="off">
        <datalist id="purchase-items-datalist">
          ${presets.map((p) => `<option value="${esc(p.item)}">${p.rate ? inr(p.rate * 100) + ' / ' + unitOf(p.unit) : ''}</option>`).join('')}
        </datalist>
      </div>
      <div class="pos-field">
        <label for="tr-unit">इकाई (Unit)</label>
        <select id="tr-unit" name="unit">
          <option value="kg"${trade.unit === 'kg' ? ' selected' : ''}>किलो (kg)</option>
          <option value="qtl"${trade.unit === 'qtl' ? ' selected' : ''}>क्विंटल (qtl)</option>
          <option value="bag"${trade.unit === 'bag' ? ' selected' : ''}>बोरी (bag)</option>
          <option value="ltr"${trade.unit === 'ltr' ? ' selected' : ''}>लीटर (ltr)</option>
        </select>
      </div>
    </div>

    <!-- 3. POS Core Billing Dashboard Box (Qty + Rate = Payable) -->
    <div class="pos-billing-strip">
      <div class="pos-bill-input-group">
        <div class="pos-bill-field">
          <label for="tr-qty">तौल / वजन * ${scaleConnected ? `<span style="color:#15803d;font-weight:700;">● ${liveWt}</span>` : ''}</label>
          <input id="tr-qty" name="qty" type="number" step="any" min="0" inputmode="decimal"
            value="${trade.qty}" placeholder="0.00" required>
        </div>
        <div class="pos-bill-field">
          <label for="tr-rate">खरीद भाव (₹)</label>
          <input id="tr-rate" name="rate" type="number" step="any" min="0" inputmode="decimal"
            value="${trade.rate}" placeholder="0.00">
        </div>
      </div>
      <div class="pos-bill-total is-purchase">
        <div class="pos-total-sub">किसान को देय</div>
        <div class="pos-total-val" id="tr-amount-preview">${inr(amountPaise)}</div>
      </div>
    </div>

    <!-- Quick Scale Shortcuts for Purchase -->
    <div style="display:flex;gap:6px;margin-bottom:8px;">
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-ocr" style="flex:1;padding:6px;font-size:11.5px;height:34px;border-radius:8px;">📷 OCR वजन</button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-bt" style="flex:1;padding:6px;font-size:11.5px;height:34px;border-radius:8px;">⚖️ ${scaleConnected ? 'कांटा: ' + liveWt + 'kg' : 'कांटा जोड़ें'}</button>
    </div>

    <!-- 4. Farmer Info (2-in-1 Compact Row) -->
    <div class="pos-row-2">
      <div class="pos-field">
        <label for="tr-name">किसान का नाम</label>
        <input id="tr-name" name="name" list="cust-names" maxlength="60" value="${esc(trade.name)}"
          placeholder="किसान का नाम" autocomplete="off">
      </div>
      <div class="pos-field">
        <label for="tr-village">गाँव / पता</label>
        <input id="tr-village" name="village" list="cust-villages" maxlength="60" value="${esc(trade.village || '')}"
          placeholder="गाँव या स्थान" autocomplete="off">
      </div>
    </div>

    <div class="pos-field">
      <label for="tr-phone">मोबाइल नंबर</label>
      <input id="tr-phone" name="phone" type="tel" inputmode="numeric" maxlength="10"
        value="${esc(trade.phone)}" placeholder="10 Digits">
    </div>

    <div id="tr-cust-balance-banner" class="cust-banner ${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? 'due' : (matchedCustomer.balancePaise < 0 ? 'adv' : 'zero')) : ''}" style="${matchedCustomer ? '' : 'display:none'};margin-bottom:8px;">
      <span>${matchedCustomer ? (matchedCustomer.village ? `<strong>${esc(matchedCustomer.name)} (${esc(matchedCustomer.village)})</strong>` : `<strong>${esc(matchedCustomer.name)}</strong>`) + ' खाता:' : ''}</span>
      <strong>${matchedCustomer ? (matchedCustomer.balancePaise > 0 ? inr(matchedCustomer.balancePaise) + ' ' + t('dueTag') : (matchedCustomer.balancePaise < 0 ? inr(-matchedCustomer.balancePaise) + ' ' + t('advTag') : t('settledTag'))) : ''}</strong>
    </div>

    <!-- 5. Payment Mode Toggle -->
    <div class="pos-pay-toggle">
      <label class="pos-pay-opt"><input type="radio" name="paid" value="yes"${trade.paid ? ' checked' : ''}><span>🟢 तुरंत नकद दिया</span></label>
      <label class="pos-pay-opt"><input type="radio" name="paid" value="no"${trade.paid ? '' : ' checked'}><span>🟣 किसान खाते में जमा</span></label>
    </div>

    <!-- 6. Note & Auto-Save Checkbox -->
    <div class="pos-field" style="margin-bottom:6px;">
      <input id="tr-note" name="note" maxlength="120" value="${esc(trade.note)}" placeholder="टिप्पणी (e.g. नमी काट 1kg / ग्रेड A)">
    </div>

    <label class="check" style="margin-bottom:8px;font-size:12px;color:#64748b;">
      <input type="checkbox" name="saveProduct" value="1" checked> इस फसल को हमेशा के लिए खरीद सूची में जोड़ें
    </label>

    <button class="btn btn-primary btn-block pos-submit-btn" type="submit" style="background:#d97706;border-color:#d97706;">
      📥 खरीद बिल सुरक्षित करें (Save Purchase)
    </button>
  </form>`;
}
