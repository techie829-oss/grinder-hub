import { state } from '../state.js';
import { tokenCard } from '../components/tokenCard.js';
import { queueRow } from '../components/rows.js';
import { emptyBlock, esc } from '../utils/formatters.js';
import { t } from '../i18n.js';

export function viewTokens() {
  const tObj = state.data?.tokens || { total: 0, waiting: [], done: 0, doneList: [], nextNo: 1, serving: null };
  const waitingList = tObj.waiting || [];
  const doneList = tObj.doneList || [];

  return `
  ${tokenCard()}

  <div class="page-head mt-20" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:gap:10px;margin-bottom:14px;">
    <div>
      <div style="display:flex;align-items:center;gap:8px;">
        <h1 class="page-title" style="margin:0;">${t('navToken')} / ${t('queueBoard')}</h1>
        <span class="tiny-chip" style="${tObj.tokenMode === 'loop100' ? 'background:#fef3c7;color:#b45309;' : 'background:#f1f5f9;color:#475569;'}font-weight:750;">
          ${tObj.tokenMode === 'loop100' ? '🔄 1-100 चक्र' : '📅 प्रतिदिन 1 से'}
        </span>
      </div>
      <p class="page-sub" style="margin-top:4px;">${t('queueStatusSub', { n: tObj.total })}</p>
    </div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
      <button type="button" class="btn btn-subtle btn-sm" data-act="reset-token-counter" title="टोकन नंबर #1 पर रीसेट करें" style="border:1.5px solid #cbd5e1;padding:8px 10px;border-radius:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;background:#fff;font-size:12px;">
        <span>🔄</span> <span>#1 रीसेट</span>
      </button>
      <button type="button" class="btn btn-primary btn-sm" data-act="switch-job-tab" data-tab="grind" data-goto="job" style="border-radius:10px;font-weight:750;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;">
        <span>🎫</span> <span>${t('newTokenServices')}</span>
      </button>
      <button type="button" class="btn btn-subtle btn-sm" data-act="open-status-modal" style="border:1.5px solid #cbd5e1;padding:8px 14px;border-radius:10px;font-weight:700;display:inline-flex;align-items:center;gap:6px;background:#fff;">
        <span>🔍</span> <span>खोजें</span>
      </button>
    </div>
  </div>

  <!-- Today Active Queue (Serving + Waiting) -->
  <section class="card" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:16px;">
    <div class="section-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <h2 class="section-title" style="font-size:16px;margin:0;font-weight:800;color:#0f172a;">${t('todayQueue')}</h2>
        <span class="tiny-chip" style="background:#e0e7ff;color:#3730a3;font-weight:750;">${waitingList.length + (tObj.serving ? 1 : 0)} ${t('activeBadge')}</span>
      </div>
      <span class="muted" style="font-weight:700;font-size:12.5px;">${waitingList.length} ${t('inLine')}</span>
    </div>
    <div class="row-list">
      ${tObj.serving ? queueRow(tObj.serving, true) : ''}
      ${waitingList.map((x) => queueRow(x, false)).join('')}
      ${tObj.serving || waitingList.length ? '' : emptyBlock(t('queueEmpty'), t('queueEmptySub'))}
    </div>
    ${tObj.done ? `<p class="tiny mt-8" style="color:#15803d;font-weight:700;">${t('tokenDoneToday', { n: tObj.done })}</p>` : ''}
  </section>

  <!-- Today Completed Tokens List (Done & Ready for 1-Click Final Billing) -->
  ${(doneList.length) ? `
  <section class="card" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:16px;">
    <div class="section-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <h2 class="section-title" style="display:flex;align-items:center;gap:6px;color:#15803d;font-size:15px;margin:0;font-weight:800;">
        <span>✅</span> <span>${t('completedTokensToday', { n: doneList.length })}</span>
      </h2>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="tiny-chip" style="background:#dcfce7;color:#15803d;font-weight:700;">${t('goodsReadyBadge')}</span>
        <button type="button" class="btn btn-xs btn-ghost" data-act="clear-all-done-tokens" style="font-size:11.5px;color:#dc2626;border:1px solid #fecaca;padding:3px 8px;border-radius:6px;background:#fff;font-weight:700;" title="सभी पूरे हुए टोकन साफ़ करें">
          ✕ सब साफ़ करें
        </button>
      </div>
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
              ${tok.serviceName || t('serviceLabel')} ${tok.grossWeight ? `· ${tok.grossWeight}kg (${t('returnNet')}: ${tok.netWeight || tok.grossWeight}kg)` : ''}
              ${tok.phone ? ' · 📞 ' + tok.phone : ''}
              ${tok.note ? ' · 📝 ' + esc(tok.note) : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
            <button type="button" class="btn btn-sm btn-primary" data-act="token-to-job" data-id="${tok.id}" style="padding:6px 10px;font-size:12px;font-weight:750;">
              ${t('createBillAction')}
            </button>
            <button type="button" class="btn btn-sm btn-soft" data-act="token-deliver" data-id="${tok.id}" title="माल दे दिया / साफ़ करें" style="padding:6px 8px;font-size:12px;font-weight:700;border:1px solid #cbd5e1;background:#f8fafc;color:#15803d;">
              ✓ दिया
            </button>
            <button type="button" class="icon-btn" data-act="token-cancel" data-id="${tok.id}" title="रद्द करें / हटाएं" style="border:1px solid #fecaca;color:#dc2626;padding:4px 8px;border-radius:8px;font-size:11px;background:#fff;">
              ✕
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  </section>` : ''}
  `;
}
