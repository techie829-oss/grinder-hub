import { state } from '../state.js';
import { inr, esc } from '../utils/formatters.js';
import { customerRows } from '../components/rows.js';
import { t } from '../i18n.js';

export function filteredCustomers() {
  const q = state.q.trim().toLowerCase();
  const filter = state.custFilter || 'all';
  return state.data.customers.filter((c) => {
    if (filter === 'due' && c.balancePaise <= 0) return false;
    if (filter === 'adv' && c.balancePaise >= 0) return false;
    if (filter === 'zero' && c.balancePaise !== 0) return false;
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.village && c.village.toLowerCase().includes(q)) || String(c.phone || '').includes(q);
  });
}

export function viewCustomers() {
  const d = state.data;
  const cf = state.custFilter || 'all';
  return `
  <div class="page-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
    <div>
      <h1 class="page-title" style="display:flex;align-items:center;gap:8px;">
        <span>📖</span> <span>${t('customerPhonebookTitle')}</span>
      </h1>
      <p class="page-sub">${d.customers.length} · <strong>${inr(d.stats.outstandingPaise)}</strong></p>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary btn-sm" data-act="new-cust" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;font-weight:700;">
        <span>👤+</span> <span>${t('addNewCustomerBtn')}</span>
      </button>
      <button class="btn btn-ghost btn-sm hide-mobile" data-act="goto" data-view="job">+ ${t('navJob')}</button>
    </div>
  </div>

  <div class="card" style="padding:16px;">
    <div style="position:relative;margin-bottom:8px;">
      <input id="cust-search" class="input" placeholder="${t('searchCustomerPlaceholder')}" value="${esc(state.q)}"
        autocomplete="off" aria-label="ग्राहक खोजें" style="padding:12px 46px 12px 14px;border-radius:12px;font-size:14px;border:1.5px solid #cbd5e1;width:100%;box-sizing:border-box;">
      <button type="button" class="btn-voice-search" data-act="cust-voice-search" title="${t('voiceSearchBtn')}" style="position:absolute;right:6px;top:6px;bottom:6px;width:34px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;">🎙️</button>
    </div>
    <div class="filter-chips">
      <button type="button" class="chip${cf === 'all' ? ' is-on' : ''}" data-act="cust-filter" data-val="all">${t('filterAll')} (${d.customers.length})</button>
      <button type="button" class="chip${cf === 'due' ? ' is-on' : ''}" data-act="cust-filter" data-val="due">${t('dueKhataFilter')}</button>
      <button type="button" class="chip${cf === 'adv' ? ' is-on' : ''}" data-act="cust-filter" data-val="adv">${t('advKhataFilter')}</button>
      <button type="button" class="chip${cf === 'zero' ? ' is-on' : ''}" data-act="cust-filter" data-val="zero">${t('zeroKhataFilter')}</button>
    </div>
    <div id="cust-list" class="row-list mt-8">${customerRows(filteredCustomers())}</div>
  </div>
  <p class="tiny mt-8" style="color:#64748b;font-size:12px;display:flex;align-items:center;gap:6px;">
    <span>💡</span> <span>${t('customerTipNote')}</span>
  </p>`;
}

