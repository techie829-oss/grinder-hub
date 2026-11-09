import { state } from '../state.js';
import { inr, qtyFmt, rangeLabel, emptyBlock, esc, relTxt } from '../utils/formatters.js';
import { tokenCard } from '../components/tokenCard.js';
import { entryRow } from '../components/rows.js';
import { t } from '../i18n.js';

export function viewDashboard() {
  const d = state.data;
  const s = d.stats;
  const label = rangeLabel(s.range);
  const recent = d.entries.slice(0, 6);
  const dues = d.customers.filter((c) => c.balancePaise > 0).slice(0, 6);

  return `
  ${tokenCard()}

  <div class="kpis mt-14">
    <div class="kpi accent">
      <div class="kpi-label">${label} ${t('totalSale')}</div>
      <div class="kpi-value">${inr(s.salePaise)}</div>
      <div class="kpi-sub">${s.jobs} काम · ${qtyFmt(s.qty)} इकाई</div>
    </div>
    <div class="kpi green">
      <div class="kpi-label">${t('cashRecovered')}</div>
      <div class="kpi-value">${inr(s.cashPaise)}</div>
      <div class="kpi-sub">${t('cashInHand')}</div>
    </div>
    <div class="kpi amber">
      <div class="kpi-label">${t('newCredit')}</div>
      <div class="kpi-value">${inr(s.creditPaise)}</div>
      <div class="kpi-sub">बाकी रखा</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${t('totalOutstanding')}</div>
      <div class="kpi-value">${inr(s.outstandingPaise)}</div>
      <div class="kpi-sub">${s.outstandingCount} ग्राहक से</div>
    </div>
  </div>

  <div class="grid-2 mt-14">
    <section class="card">
      <div class="section-head">
        <h2 class="section-title">हाल के काम</h2>
        <button class="section-link" data-act="goto" data-view="reports">${t('navReports')}</button>
      </div>
      ${recent.length
        ? `<div class="row-list">${recent.map((e) => entryRow(e)).join('')}</div>`
        : emptyBlock('अभी कोई काम दर्ज नहीं', 'पहला काम जोड़ते ही यहाँ दिखेगा।')}
    </section>

    <section class="card">
      <div class="section-head">
        <h2 class="section-title">जिनसे लेना है</h2>
        <button class="section-link" data-act="goto" data-view="customers">${t('navCustomers')}</button>
      </div>
      ${dues.length
        ? `<div class="row-list">
            ${dues.map((c) => `
              <button type="button" class="row-item" data-act="open-cust" data-id="${c.id}">
                <span class="avatar small">${esc(c.name.trim().charAt(0) || '?')}</span>
                <span class="grow">
                  <span class="row-title ellipsis">${esc(c.name)}${c.village ? ` <span class="tiny-chip">${esc(c.village)}</span>` : ''}</span>
                  <span class="row-sub">${c.phone ? c.phone : 'फोन नहीं'}${c.lastAt ? ' · ' + relTxt(c.lastAt) : ''}</span>
                </span>
                <span class="bal due">${inr(c.balancePaise)}</span>
              </button>`).join('')}
          </div>`
        : emptyBlock('किसी का उधार नहीं', 'सबका हिसाब बराबर है।')}
    </section>
  </div>`;
}

