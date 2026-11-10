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
  </div>`;
}

