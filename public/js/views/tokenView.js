import { state } from '../state.js';
import { tokenCard } from '../components/tokenCard.js';
import { serviceCards, queueRow } from '../components/rows.js';
import { emptyBlock, esc, inr, qtyFmt, unitOf } from '../utils/formatters.js';
import { t } from '../i18n.js';

export function viewTokens() {
  const tObj = state.data?.tokens || { total: 0, waiting: [], done: 0, doneList: [], nextNo: 1, serving: null };
  const waitingList = tObj.waiting || [];
  const doneList = tObj.doneList || [];
  const services = state.data?.services || [];

  // Default selected service if none active
  if (!state.tokenForm.serviceId && services.length) {
    state.tokenForm.serviceId = services[0].id;
    if (state.tokenForm.lossRateG === '' && services[0].lossRateG !== undefined) {
      state.tokenForm.lossRateG = String(services[0].lossRateG || 0);
    }
  }

  const selectedSvc = services.find((s) => s.id === state.tokenForm.serviceId) || services[0] || null;
  const unit = selectedSvc ? unitOf(selectedSvc.unit) : 'kg';

  const scaleConnected = !!(state.scale && state.scale.connected);
  const liveWt = scaleConnected && state.scale.weight != null ? state.scale.weight.toFixed(2) : '';

  const custOptions = (state.data?.customers || [])
    .map((c) => `<option value="${esc(c.name)}">${esc(c.village || '')}${c.phone ? ' · ' + esc(c.phone) : ''}</option>`)
    .join('');
  const villageSet = [...new Set((state.data?.customers || []).map((c) => c.village).filter(Boolean))];
  const villageOptions = villageSet.map((v) => `<option value="${esc(v)}"></option>`).join('');

  const initQty = parseFloat(state.tokenForm.qty) || 0;
  const initLossRate = state.tokenForm.lossRateG !== '' ? (parseFloat(state.tokenForm.lossRateG) || 0) : (selectedSvc ? (selectedSvc.lossRateG || 0) : 0);
  const initLossG = initQty > 0 ? Math.round(initQty * initLossRate) : 0;
  const initNet = initQty > 0 ? Math.max(0, initQty - (initLossG / 1000)) : 0;
  const initEstPaise = (initQty && selectedSvc) ? Math.round(initQty * selectedSvc.ratePaise) : 0;

  return `
  ${tokenCard()}

  <div class="page-head mt-20" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
    <div>
      <h1 class="page-title">${t('navToken')} / कतार बोर्ड</h1>
      <p class="page-sub">माल जमा पर्ची, वजन व काट हिसाब · आज कुल ${tObj.total} टोकन</p>
    </div>
    <button type="button" class="btn btn-subtle btn-sm" data-act="open-status-modal" style="border:1.5px solid #cbd5e1;padding:8px 14px;border-radius:10px;font-weight:700;display:inline-flex;align-items:center;gap:6px;background:#fff;">
      <span>📷</span> <span>QR स्कैन / स्टेटस चेक</span>
    </button>
  </div>

  <div class="grid-2">
    <!-- Left: New Token Entry (POS Drop-off Form) -->
    <section class="card" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:16px;">
      <div class="section-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <h2 class="section-title" style="display:flex;align-items:center;gap:6px;font-size:15px;margin:0;">
          <span>🎫</span> <span>${t('newTokenTitle')} (माल जमा पर्ची)</span>
        </h2>
        <span class="tiny-chip" style="background:#e0e7ff;color:#3730a3;font-weight:750;">नंबर #${tObj.nextNo}</span>
      </div>

      <!-- Service Selection -->
      <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">1. सामग्री / सेवा चुनें:</div>
      <div class="service-grid" style="margin-bottom:12px;">${serviceCards('token')}</div>

      <form data-form="token">
        <!-- Customer Details Strip -->
        <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">2. ग्राहक का विवरण:</div>
        <div class="two-col" style="margin-bottom:8px;">
          <div class="field" style="margin-bottom:0;">
            <label for="t-name">${t('customerName')}</label>
            <input id="t-name" name="name" list="token-cust-names" maxlength="60" value="${esc(state.tokenForm.name || '')}" placeholder="जैसे: रमेश" autocomplete="off">
            <datalist id="token-cust-names">${custOptions}</datalist>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label for="t-village">${t('villageLabel')}</label>
            <input id="t-village" name="village" list="token-cust-villages" maxlength="60" value="${esc(state.tokenForm.village || '')}" placeholder="जैसे: रामपुर" autocomplete="off">
            <datalist id="token-cust-villages">${villageOptions}</datalist>
          </div>
        </div>

        <!-- Phone + Hardware Integration Toolbar -->
        <div style="display:flex;align-items:flex-end;gap:6px;margin-bottom:12px;">
          <div class="field" style="flex:1;margin-bottom:0;">
            <label for="t-phone">मोबाइल नंबर (WhatsApp पर्ची हेतु)</label>
            <input id="t-phone" name="phone" type="tel" inputmode="numeric" maxlength="10" value="${esc(state.tokenForm.phone || '')}" placeholder="10 अंकों का नंबर">
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-ocr" data-target="token" style="padding:6px 8px;font-size:12px;height:38px;border-radius:10px;" title="Camera Scale OCR">📷 OCR</button>
            <button type="button" class="btn btn-sm btn-ghost" data-act="hw-scale-bt" data-target="token" style="padding:6px 8px;font-size:12px;height:38px;border-radius:10px;" title="Bluetooth Scale">⚖️ ${scaleConnected ? liveWt + 'k' : 'कांटा'}</button>
            <button type="button" class="btn btn-sm btn-ghost" data-act="hw-qr-scan" data-target="token" style="padding:6px 8px;font-size:12px;height:38px;border-radius:10px;" title="QR Scan">🔲 QR</button>
          </div>
        </div>

        <!-- Weight & Loss Deduction Inputs (The Core Requirement) -->
        <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">3. आवक वजन व काट हिसाब:</div>
        <div class="pos-billing-strip" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:12px;margin-bottom:10px;">
          <div class="two-col" style="margin-bottom:8px;">
            <div class="field" style="margin-bottom:0;">
              <label for="t-qty" id="t-qty-label" style="font-weight:700;color:#0f172a;">
                कुल आवक वज़न (${unit}) * ${scaleConnected ? `<span style="color:#15803d;font-weight:750;">● ${liveWt}</span>` : ''}
              </label>
              <input id="t-qty" name="qty" type="number" step="any" min="0" inputmode="decimal"
                value="${state.tokenForm.qty || ''}" placeholder="0.00" required
                style="font-size:18px;font-weight:800;color:#0f172a;">
            </div>
            <div class="field" style="margin-bottom:0;">
              <label for="t-loss-rate" id="t-loss-rate-label" style="font-weight:700;color:#ea580c;">
                काट / घटौती दर (g/${unit})
              </label>
              <input id="t-loss-rate" name="lossRateG" type="number" step="any" min="0" inputmode="numeric"
                value="${initLossRate}" placeholder="15"
                style="font-size:18px;font-weight:800;color:#ea580c;">
            </div>
          </div>

          <!-- Quick Deduction Preset Pills -->
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
            <span style="font-size:11.5px;color:#64748b;font-weight:700;">काट दर:</span>
            <button type="button" class="btn btn-xs token-loss-preset" data-loss="0" style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;font-weight:600;">0g</button>
            <button type="button" class="btn btn-xs token-loss-preset" data-loss="10" style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;font-weight:600;">10g</button>
            <button type="button" class="btn btn-xs token-loss-preset" data-loss="15" style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;font-weight:600;">15g</button>
            <button type="button" class="btn btn-xs token-loss-preset" data-loss="20" style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;font-weight:600;">20g</button>
            <button type="button" class="btn btn-xs token-loss-preset" data-loss="50" style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;font-weight:600;">50g</button>
          </div>

          <!-- Live Output Preview Calculation Strip -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:6px;text-align:center;background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:8px 4px;margin-top:6px;">
            <div>
              <div style="font-size:10.5px;color:#64748b;font-weight:700;">आवक वजन</div>
              <div id="t-gross-preview" style="font-size:13.5px;font-weight:800;color:#0f172a;margin-top:2px;">
                ${initQty ? initQty + ' ' + unit : '0 ' + unit}
              </div>
            </div>
            <div>
              <div style="font-size:10.5px;color:#ea580c;font-weight:700;">कुल काट</div>
              <div id="t-loss-preview" style="font-size:13.5px;font-weight:800;color:#ea580c;margin-top:2px;">
                ${initLossG ? '-' + initLossG + ' g' : '0 g'}
              </div>
            </div>
            <div style="background:#f0fdf4;border-radius:6px;padding:2px;">
              <div style="font-size:10.5px;color:#15803d;font-weight:800;">शुद्ध वापसी माल</div>
              <div id="t-net-preview" style="font-size:14.5px;font-weight:900;color:#15803d;margin-top:2px;">
                ${initNet ? qtyFmt(initNet) + ' ' + unit : '0 ' + unit}
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:#64748b;padding:0 2px;">
            <span>अनुमानित सेवा शुल्क: <strong id="t-est-preview" style="color:#0f172a;font-size:13px;">${inr(initEstPaise)}</strong></span>
            <span style="font-size:11px;color:#16a34a;font-weight:600;">✓ बाद में 1-क्लिक में बिल बनेगा</span>
          </div>
        </div>

        <button class="btn btn-primary btn-block" type="submit" style="font-weight:800;padding:12px;font-size:14.5px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;box-shadow:0 3px 10px rgba(79,70,229,0.25);">
          <span>🎫</span> <span>${t('issueTokenBtn', { no: tObj.nextNo })} (वजन व काट सहित पर्ची)</span>
        </button>
      </form>
    </section>

    <!-- Right: Today Queue (Serving + Waiting) -->
    <section class="card" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:16px;">
      <div class="section-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <h2 class="section-title" style="font-size:15px;margin:0;">${t('todayQueue')}</h2>
        <span class="muted" style="font-weight:700;">${waitingList.length} ${t('inLine')}</span>
      </div>
      <div class="row-list">
        ${tObj.serving ? queueRow(tObj.serving, true) : ''}
        ${waitingList.map((x) => queueRow(x, false)).join('')}
        ${tObj.serving || waitingList.length ? '' : emptyBlock(t('queueEmpty'), t('queueEmptySub'))}
      </div>
      ${tObj.done ? `<p class="tiny mt-8" style="color:#15803d;font-weight:700;">${t('tokenDoneToday', { n: tObj.done })}</p>` : ''}
    </section>
  </div>

  <!-- Today Completed Tokens List (Done & Ready for 1-Click Final Billing) -->
  ${(doneList.length) ? `
  <section class="card mt-14" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:16px;">
    <div class="section-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h2 class="section-title" style="display:flex;align-items:center;gap:6px;color:#15803d;font-size:15px;margin:0;">
        <span>✅</span> <span>आज पूरे हुए टोकन व काम (${doneList.length})</span>
      </h2>
      <span class="tiny-chip" style="background:#dcfce7;color:#15803d;font-weight:700;">पूर्ण / तैयार</span>
    </div>
    <div class="row-list">
      ${doneList.map((tok) => `
        <div class="row-item" style="padding:10px 4px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;">
          <span class="token-badge" style="width:36px;height:36px;border-radius:10px;background:#e0e7ff;color:#3730a3;font-weight:800;font-size:14px;display:grid;place-items:center;flex-shrink:0;">#${tok.no}</span>
          <div class="grow" style="min-width:0;">
            <div style="font-weight:750;font-size:13.5px;color:#0f172a;display:flex;align-items:center;gap:6px;">
              <span>${esc(tok.name)}</span>
              ${tok.village ? `<span class="tiny-chip">${esc(tok.village)}</span>` : ''}
            </div>
            <div class="tiny" style="color:#64748b;margin-top:2px;">
              ${tok.serviceName || 'सेवा'} ${tok.grossWeight ? `· ${tok.grossWeight}kg (शुद्ध: ${tok.netWeight || tok.grossWeight}kg)` : ''}
              ${tok.phone ? ' · 📞 ' + tok.phone : ''}
            </div>
          </div>
          <div style="flex-shrink:0;">
            <button type="button" class="btn btn-sm btn-primary" data-act="token-to-job" data-id="${tok.id}" style="padding:6px 12px;font-size:12px;font-weight:750;">
              🧾 बिल बनाएं
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  </section>` : ''}`;
}
