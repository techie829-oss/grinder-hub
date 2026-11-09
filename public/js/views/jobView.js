// New Order / Job View (with Live Dynamic Loss & Net Weight Calculator)
import { state } from '../state.js';
import { inr, unitOf, esc } from '../utils/formatters.js';
import { serviceCards } from '../components/rows.js';
import { t } from '../i18n.js';
import { isScaleConnected, getLiveWeight } from '../hardware/scaleBluetooth.js';

export function currentService() {
  const data = state.data;
  if (!data) return null;
  return data.services.find((s) => s.id === state.job.serviceId) || data.services[0] || null;
}

export function viewJob() {
  const data = state.data;
  const job = state.job;
  const svc = currentService();
  const unit = svc ? unitOf(svc.unit) : 'kg';

  const scaleConnected = isScaleConnected();
  const liveWt = getLiveWeight();

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
  <div class="page-head">
    <div>
      <h1 class="page-title">${t('newJobTitle')}</h1>
      <p class="page-sub">${t('newJobSub')}</p>
    </div>
  </div>

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
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-bt" style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:6px" title="Connect Bluetooth digital scale">
        <span>⚖️</span> <span id="hw-bt-label">${scaleConnected ? 'Scale ON' : 'Scale BT'}</span>
      </button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-voice-mic" style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:6px" title="Hands-free voice order in Hindi/English">
        <span>🎙️</span> <span>Voice</span>
      </button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scan-qr" style="flex:1;min-width:110px;display:flex;align-items:center;justify-content:center;gap:6px" title="Scan Token QR Code">
        <span>📱</span> <span>Scan QR</span>
      </button>
    </div>

    <div id="scale-live-meter" style="display:${scaleConnected ? 'flex' : 'none'};background:var(--brand-soft);border:1.5px solid var(--brand);padding:10px 14px;border-radius:12px;margin-bottom:12px;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="sync-dot online"></span>
        <span style="font-weight:700;color:var(--brand);font-size:0.9rem">Live Scale:</span>
        <span id="scale-live-val" style="font-size:1.3rem;font-weight:800;font-family:monospace;color:var(--brand)">${liveWt.weight ? liveWt.weight.toFixed(2) : '0.00'} kg</span>
      </div>
      <button type="button" class="btn btn-sm btn-primary" data-act="hw-lock-scale-wt" id="btn-lock-scale-wt">Lock Weight</button>
    </div>

    <div class="grid-3 mt-14" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px">
      <div class="field">
        <label for="j-qty" id="j-qty-label">${t('qtyLabel', { unit })}</label>
        <input id="j-qty" name="qty" type="number" inputmode="decimal" step="0.01" min="0"
          value="${esc(job.qty)}" placeholder="0.00">
      </div>
      <div class="field">
        <label for="j-rate" id="j-rate-label">${t('rateLabel', { unit })}</label>
        <input id="j-rate" name="rate" type="number" inputmode="decimal" step="0.5" min="0"
          value="${esc(job.rate)}">
      </div>
      <div class="field">
        <label for="j-loss-rate" id="j-loss-rate-label">${t('lossRateLabel', { unit })}</label>
        <input id="j-loss-rate" name="lossRateG" type="number" inputmode="decimal" step="1" min="0"
          value="${esc(job.lossRateG !== '' ? job.lossRateG : (svc ? (svc.lossRateG || 0) : 0))}" placeholder="0">
      </div>
    </div>

    <!-- Live Auto Calculation Breakdown Card -->
    <div class="chakki-calc-card" style="margin:16px 0;padding:14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;text-align:center">
        <div style="background:#fff;padding:10px;border-radius:10px;border:1px solid #edf2f7">
          <div style="font-size:11px;color:#64748b;font-weight:600">${t('grossWeight')}</div>
          <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:2px" id="gross-qty-preview">${grossWeight ? grossWeight.toFixed(2) + ' ' + unit : '0 ' + unit}</div>
        </div>
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
