import { state } from '../state.js';
import { tokenCard } from '../components/tokenCard.js';
import { tokenTicketCard } from '../components/rows.js';
import { emptyBlock, esc } from '../utils/formatters.js';
import { t } from '../i18n.js';

export function viewTokens() {
  const tObj = state.data?.tokens || { total: 0, waiting: [], done: 0, doneList: [], nextNo: 1, serving: null };
  const waitingList = tObj.waiting || [];
  const doneList = tObj.doneList || [];

  return `
  ${tokenCard()}

  <div class="page-head mt-20" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
    <div>
      <div style="display:flex;align-items:center;gap:8px;">
        <h1 class="page-title" style="margin:0;">${t('navToken')} / ${t('queueBoard')}</h1>
        <span class="tiny-chip" style="${tObj.tokenMode === 'loop100' ? 'background:#fef3c7;color:#b45309;' : 'background:#f1f5f9;color:#475569;'}font-weight:750;">
          ${tObj.tokenMode === 'loop100' ? '🔄 1-100 चक्र' : '📅 प्रतिदिन 1 से'}
        </span>
      </div>
      <p class="page-sub" style="margin-top:4px;">${t('queueStatusSub', { n: tObj.total })}</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
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
    <div class="token-tickets-wrap">
      ${tObj.serving ? tokenTicketCard(tObj.serving, 'serving') : ''}
      ${waitingList.map((x) => tokenTicketCard(x, 'waiting')).join('')}
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
    <div class="token-tickets-wrap">
      ${doneList.map((tok) => tokenTicketCard(tok, 'done')).join('')}
    </div>
  </section>` : ''}
  `;
}
