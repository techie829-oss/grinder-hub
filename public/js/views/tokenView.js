import { state } from '../state.js';
import { tokenCard } from '../components/tokenCard.js';
import { serviceCards, queueRow } from '../components/rows.js';
import { emptyBlock } from '../utils/formatters.js';
import { t } from '../i18n.js';

export function viewTokens() {
  const tObj = state.data.tokens;
  return `
  ${tokenCard()}

  <div class="page-head mt-20" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
    <div>
      <h1 class="page-title">${t('navToken')}</h1>
      <p class="page-sub">नंबर हर दिन 1 से शुरू होता है · आज कुल ${tObj.total} टोकन</p>
    </div>
    <button type="button" class="btn btn-subtle btn-sm" data-act="open-status-modal" style="border:1.5px solid #cbd5e1;padding:8px 14px;border-radius:10px;font-weight:700;display:inline-flex;align-items:center;gap:6px;background:#fff;">
      <span>📷</span> <span>QR स्कैन / स्टेटस चेक</span>
    </button>
  </div>

  <div class="grid-2">
    <section class="card">
      <div class="section-head"><h2 class="section-title">${t('newTokenTitle')}</h2></div>
      <div class="service-grid">${serviceCards('token')}</div>
      <form data-form="token">
        <div class="two-col">
          <div class="field">
            <label for="t-name">${t('customerName')}</label>
            <input id="t-name" name="name" maxlength="60" placeholder="जैसे: रमेश" autocomplete="off">
          </div>
          <div class="field">
            <label for="t-village">${t('villageLabel')}</label>
            <input id="t-village" name="village" maxlength="60" placeholder="जैसे: रामपुर" autocomplete="off">
          </div>
        </div>
        <button class="btn btn-primary btn-block" type="submit">${t('issueTokenBtn', { no: tObj.nextNo })}</button>
      </form>
    </section>

    <section class="card">
      <div class="section-head">
        <h2 class="section-title">${t('todayQueue')}</h2>
        <span class="muted">${tObj.waiting.length} ${t('inLine')}</span>
      </div>
      <div class="row-list">
        ${tObj.serving ? queueRow(tObj.serving, true) : ''}
        ${tObj.waiting.map((x) => queueRow(x, false)).join('')}
        ${tObj.serving || tObj.waiting.length ? '' : emptyBlock(t('queueEmpty'), t('queueEmptySub'))}
      </div>
      ${tObj.done ? `<p class="tiny mt-8">${t('tokenDoneToday', { n: tObj.done })}</p>` : ''}
    </section>
  </div>

  ${(tObj.doneList && tObj.doneList.length) ? `
  <section class="card mt-14" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:16px;">
    <div class="section-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h2 class="section-title" style="display:flex;align-items:center;gap:6px;color:#15803d;font-size:15px;margin:0;">
        <span>✅</span> <span>आज पूरे हुए टोकन व काम (${tObj.doneList.length})</span>
      </h2>
      <span class="tiny-chip" style="background:#dcfce7;color:#15803d;font-weight:700;">पूर्ण / Completed</span>
    </div>
    <div class="row-list">
      ${tObj.doneList.map((tok) => `
        <div class="row-item" style="padding:10px 4px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;">
          <span class="token-badge" style="width:36px;height:36px;border-radius:10px;background:#e0e7ff;color:#3730a3;font-weight:800;font-size:14px;display:grid;place-items:center;flex-shrink:0;">#${tok.no}</span>
          <div class="grow" style="min-width:0;">
            <div style="font-weight:750;font-size:13.5px;color:#0f172a;display:flex;align-items:center;gap:6px;">
              <span>${esc(tok.name)}</span>
              ${tok.village ? `<span class="tiny-chip">${esc(tok.village)}</span>` : ''}
            </div>
            <div class="tiny" style="color:#64748b;margin-top:2px;">
              ${tok.serviceName || 'पिसाई'} ${tok.grossWeight ? `· ${tok.grossWeight}kg (शुद्ध: ${tok.netWeight || tok.grossWeight}kg)` : ''}
              ${tok.phone ? ' · ' + tok.phone : ''}
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

