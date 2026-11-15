import { state } from '../state.js';
import { inr, esc } from '../utils/formatters.js';
import { customerRows } from '../components/rows.js';
import { isPhoneticMatch } from '../utils/phonetic.js';
import { t } from '../i18n.js';

export function filteredCustomers() {
  const q = state.q.trim();
  const filter = state.custFilter || 'all';
  const vf = state.custVillageFilter || 'all';
  return (state.data?.customers || []).filter((c) => {
    if (filter === 'due' && c.balancePaise <= 0) return false;
    if (filter === 'adv' && c.balancePaise >= 0) return false;
    if (filter === 'zero' && c.balancePaise !== 0) return false;
    if (vf !== 'all' && (c.village || '').trim() !== vf) return false;
    if (!q) return true;
    return isPhoneticMatch(c.name, q) ||
           (c.village && isPhoneticMatch(c.village, q)) ||
           String(c.phone || '').includes(q);
  });
}

export function viewCustomers() {
  const d = state.data || { customers: [], stats: { outstandingPaise: 0 } };
  const cf = state.custFilter || 'all';
  const vf = state.custVillageFilter || 'all';

  const totalCount = d.customers.length;
  const dueCount = d.customers.filter((c) => c.balancePaise > 0).length;
  const advCount = d.customers.filter((c) => c.balancePaise < 0).length;
  const zeroCount = d.customers.filter((c) => c.balancePaise === 0).length;

  const villages = Array.from(
    new Set(d.customers.map((c) => (c.village || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'hi'));

  return `
  <div class="page-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
    <div>
      <h1 class="page-title" style="display:flex;align-items:center;gap:8px;">
        <span>📖</span> <span>${t('customerPhonebookTitle')}</span>
      </h1>
      <p class="page-sub">${totalCount} ग्राहक · कुल बकाया: <strong>${inr(d.stats?.outstandingPaise || 0)}</strong></p>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary btn-sm" data-act="new-cust" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;font-weight:700;">
        <span>👤+</span> <span>${t('addNewCustomerBtn')}</span>
      </button>
      <button class="btn btn-ghost btn-sm hide-mobile" data-act="goto" data-view="job">+ ${t('navJob')}</button>
    </div>
  </div>

  <div class="card" style="padding:16px;">
    <div style="position:relative;margin-bottom:12px;">
      <input id="cust-search" class="input" placeholder="${t('searchCustomerPlaceholder')}" value="${esc(state.q)}"
        autocomplete="off" aria-label="ग्राहक खोजें" style="padding:12px 46px 12px 14px;border-radius:12px;font-size:14px;border:1.5px solid #cbd5e1;width:100%;box-sizing:border-box;">
      <button type="button" class="btn-voice-search" data-act="cust-voice-search" title="${t('voiceSearchBtn')}" style="position:absolute;right:6px;top:6px;bottom:6px;width:34px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;">🎙️</button>
    </div>

    <!-- Khata Balance Filter Tabs (4-Column Responsive Grid) -->
    <div class="cust-filter-tabs">
      <button type="button" class="cust-tab-btn${cf === 'all' ? ' is-on' : ''}" data-act="cust-filter" data-val="all">
        <span>सभी</span> <span class="tab-badge">${totalCount}</span>
      </button>
      <button type="button" class="cust-tab-btn due${cf === 'due' ? ' is-on' : ''}" data-act="cust-filter" data-val="due">
        <span>🔴 बाकी</span> <span class="tab-badge">${dueCount}</span>
      </button>
      <button type="button" class="cust-tab-btn adv${cf === 'adv' ? ' is-on' : ''}" data-act="cust-filter" data-val="adv">
        <span>🟢 जमा</span> <span class="tab-badge">${advCount}</span>
      </button>
      <button type="button" class="cust-tab-btn zero${cf === 'zero' ? ' is-on' : ''}" data-act="cust-filter" data-val="zero">
        <span>✓ चुकता</span> <span class="tab-badge">${zeroCount}</span>
      </button>
    </div>

    <!-- Village Filter Chips (if villages exist) -->
    ${villages.length ? `
    <div class="cust-village-bar">
      <span class="cust-village-label">📍 गाँव:</span>
      <div class="cust-village-scroll">
        <button type="button" class="cust-vchip${vf === 'all' ? ' is-on' : ''}" data-act="cust-vfilter" data-val="all">
          सभी (${totalCount})
        </button>
        ${villages.map((v) => {
          const vCount = d.customers.filter((c) => (c.village || '').trim() === v).length;
          return `
          <button type="button" class="cust-vchip${vf === v ? ' is-on' : ''}" data-act="cust-vfilter" data-val="${esc(v)}">
            ${esc(v)} (${vCount})
          </button>`;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <div id="cust-list" class="cust-cards-wrap mt-12">${customerRows(filteredCustomers())}</div>
  </div>

  <p class="tiny mt-8" style="color:#64748b;font-size:12px;display:flex;align-items:center;gap:6px;">
    <span>💡</span> <span>${t('customerTipNote')}</span>
  </p>`;
}
