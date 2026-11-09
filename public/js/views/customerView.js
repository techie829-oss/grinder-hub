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
  <div class="page-head">
    <div>
      <h1 class="page-title">${t('customersTitle')}</h1>
      <p class="page-sub">${t('customerTotalSub', { count: d.customers.length, amount: inr(d.stats.outstandingPaise) })}</p>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary btn-sm" data-act="new-cust">${t('newCustomerBtn')}</button>
      <button class="btn btn-ghost btn-sm" data-act="goto" data-view="job">+ ${t('navJob')}</button>
    </div>
  </div>

  <div class="card">
    <input id="cust-search" class="input" placeholder="${t('searchCustomerPlaceholder')}" value="${esc(state.q)}"
      autocomplete="off" aria-label="ग्राहक खोजें">
    <div class="filter-chips">
      <button type="button" class="chip${cf === 'all' ? ' is-on' : ''}" data-act="cust-filter" data-val="all">${t('filterAll')}</button>
      <button type="button" class="chip${cf === 'due' ? ' is-on' : ''}" data-act="cust-filter" data-val="due">${t('filterDue')}</button>
      <button type="button" class="chip${cf === 'adv' ? ' is-on' : ''}" data-act="cust-filter" data-val="adv">${t('filterAdv')}</button>
      <button type="button" class="chip${cf === 'zero' ? ' is-on' : ''}" data-act="cust-filter" data-val="zero">${t('filterZero')}</button>
    </div>
    <div id="cust-list" class="row-list mt-8">${customerRows(filteredCustomers())}</div>
  </div>
  <p class="tiny mt-8">${t('customerTapTip')}</p>`;
}

