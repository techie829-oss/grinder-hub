import { state } from '../state.js';
import { esc } from '../utils/formatters.js';
import { t } from '../i18n.js';

export function tokenCard() {
  const tObj = state.data?.tokens || { waiting: [], done: 0, nextNo: 1, serving: null };
  const serving = tObj.serving;
  const waitingCount = tObj.waiting ? tObj.waiting.length : 0;
  return `
  <section class="token-card${serving ? '' : ' is-idle'}">
    <div>
      <div class="token-eyebrow">${serving ? t('activeToken') : t('tokenBoard')}</div>
      <div class="token-no${serving ? '' : ' is-empty'}">${serving ? serving.no : '—'}</div>
      <div class="token-who">
        ${serving ? esc(serving.name) + (serving.village ? ` <span class="tiny-chip">${esc(serving.village)}</span>` : '') : t('noActiveToken')}
        ${serving && serving.grossWeight ? `<div class="tiny" style="color:#a5b4fc;margin-top:2px;">${serving.serviceName || t('serviceLabel')} · ⚖️ ${t('inwardGross')}: ${serving.grossWeight}kg (${t('returnNet')}: ${serving.netWeight || serving.grossWeight}kg)</div>` : ''}
      </div>
      <div class="token-stats">
        <div><b>${waitingCount}</b>${t('inLine')}</div>
        <div><b>${tObj.done || 0}</b>${t('doneCount')}</div>
        <div><b>${tObj.nextNo || 1}</b>${t('nextNo')}</div>
      </div>
    </div>
    <div class="token-actions">
      ${serving ? `<button class="btn btn-primary" data-act="token-to-job" data-id="${serving.id}">${t('createBill')}</button>` : ''}
      ${serving ? `<button class="btn btn-gold" data-act="token-done" data-id="${serving.id}">${t('markDone')}</button>` : ''}
      ${serving ? `<button class="btn btn-soft" data-act="token-print-pos" data-id="${serving.id}" title="Print Slip">${t('printSlip')}</button>` : ''}
      ${waitingCount ? `<button class="btn btn-soft" data-act="token-next">${t('callNext')}</button>` : ''}
      <button class="btn btn-ghost" data-act="goto" data-view="token">${t('tokenBoard')}</button>
    </div>
  </section>`;
}

