// Financial & Operational Ledger Reports View
import { state, RANGES } from '../state.js';
import { inr, qtyFmt, unitOf, rangeLabel, emptyBlock, esc } from '../utils/formatters.js';
import { entryRow } from '../components/rows.js';
import { t } from '../i18n.js';

export function viewReports() {
  const data = state.data;
  const stats = data.stats;

  return `
  <div class="page-head">
    <div>
      <h1 class="page-title">${t('reportsTitle')}</h1>
      <p class="page-sub">${rangeLabel(stats.range)} · ${stats.jobs} orders</p>
    </div>
    <a class="btn btn-ghost btn-sm" href="/api/export" download>${t('downloadBackup')}</a>
  </div>

  <div class="chips">
    ${RANGES.map((r) => `<button type="button" class="chip${stats.range === r.id ? ' is-on' : ''}" data-act="range" data-range="${r.id}">${t(r.labelKey) || r.id}</button>`).join('')}
  </div>

  <div class="kpis">
    <div class="kpi accent">
      <div class="kpi-label">${t('totalSale')}</div>
      <div class="kpi-value">${inr(stats.salePaise)}</div>
      <div class="kpi-sub">${stats.jobs} orders</div>
    </div>
    <div class="kpi green">
      <div class="kpi-label">${t('cashRecovered')}</div>
      <div class="kpi-value">${inr(stats.cashPaise)}</div>
      <div class="kpi-sub">${t('cashInHand')}</div>
    </div>
    <div class="kpi amber">
      <div class="kpi-label">${t('newCredit')}</div>
      <div class="kpi-value">${inr(stats.creditPaise)}</div>
      <div class="kpi-sub">Receivable Credit</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${t('totalOutstanding')}</div>
      <div class="kpi-value">${inr(stats.outstandingPaise)}</div>
      <div class="kpi-sub">${stats.outstandingCount} customers</div>
    </div>
  </div>

  <section class="card mt-14">
    <div class="section-head"><h2 class="section-title">${t('byServiceTitle')}</h2></div>
    ${stats.byService.length ? `
      <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>${t('serviceCol')}</th>
            <th>${t('jobsCol')}</th>
            <th>${t('qtyCol')}</th>
            <th>${t('lossCol')}</th>
            <th>${t('netWeightCol')}</th>
            <th class="ta-r">${t('amountCol')}</th>
          </tr>
        </thead>
        <tbody>
          ${stats.byService.map((row) => {
            const lossG = row.lossG || 0;
            const netWeight = row.netWeight;
            return `
            <tr>
              <td>${esc(row.name)}</td>
              <td>${row.count}</td>
              <td>${qtyFmt(row.qty)} ${unitOf(row.unit)}</td>
              <td style="color:#ea580c">${lossG ? '-' + lossG + ' g' : '—'}</td>
              <td style="color:#16a34a;font-weight:600">${netWeight ? qtyFmt(netWeight) + ' ' + unitOf(row.unit) : '—'}</td>
              <td class="ta-r" style="font-weight:700">${inr(row.amountPaise)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>` : emptyBlock('No orders in this period', 'Select another range or create a new order.')}
  </section>

  <section class="card">
    <div class="section-head">
      <h2 class="section-title">${t('entriesTitle')}</h2>
      <span class="muted">${data.entries.length}${data.entries.length >= 400 ? '+' : ''}</span>
    </div>
    ${data.entries.length
      ? `<div class="row-list">${data.entries.slice(0, 120).map((e) => entryRow(e, { del: true })).join('')}</div>`
      : emptyBlock(t('noEntries'), 'No order or payment entries recorded in this period.')}
    ${data.entries.length > 120 ? '<p class="tiny mt-8">Older entries can be accessed in the backup file.</p>' : ''}
  </section>`;
}
