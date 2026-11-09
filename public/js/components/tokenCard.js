import { state } from '../state.js';
import { esc } from '../utils/formatters.js';
import { t } from '../i18n.js';

export function tokenCard() {
  const tObj = state.data.tokens;
  const serving = tObj.serving;
  return `
  <section class="token-card${serving ? '' : ' is-idle'}">
    <div>
      <div class="token-eyebrow">${serving ? t('activeToken') : t('tokenBoard')}</div>
      <div class="token-no${serving ? '' : ' is-empty'}">${serving ? serving.no : '—'}</div>
      <div class="token-who">${serving ? esc(serving.name) + (serving.village ? ` <span class="tiny-chip">${esc(serving.village)}</span>` : '') : t('noActiveToken')}</div>
      <div class="token-stats">
        <div><b>${tObj.waiting.length}</b>${t('inLine')}</div>
        <div><b>${tObj.done}</b>${t('doneCount')}</div>
        <div><b>${tObj.nextNo}</b>${t('nextNo')}</div>
      </div>
    </div>
    <div class="token-actions">
      ${serving ? `<button class="btn btn-primary" data-act="token-to-job" data-id="${serving.id}">${t('createBill')}</button>` : ''}
      ${serving ? `<button class="btn btn-gold" data-act="token-done" data-id="${serving.id}">${t('markDone')}</button>` : ''}
      ${tObj.waiting.length ? `<button class="btn btn-soft" data-act="token-next">${t('callNext')}</button>` : ''}
      <button class="btn btn-ghost" data-act="goto" data-view="token">${t('tokenBoard')}</button>
    </div>
  </section>`;
}

