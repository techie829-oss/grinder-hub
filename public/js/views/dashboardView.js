import { state } from '../state.js';
import { inr, qtyFmt, rangeLabel, emptyBlock, esc, relTxt, todayTxt, phoneFmt } from '../utils/formatters.js';
import { tokenCard } from '../components/tokenCard.js';
import { entryRow } from '../components/rows.js';
import { t } from '../i18n.js';

export function viewDashboard() {
  const d = state.data;
  const s = d.stats;
  const label = rangeLabel(s.range);
  const recent = d.entries.slice(0, 8);
  const dues = d.customers.filter((c) => c.balancePaise > 0).slice(0, 6);

  return `
  <!-- Business Info Header Banner -->
  <div class="dash-biz-banner card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(15,23,42,0.04);">
    <div style="min-width:0;flex:1 1 auto;">
      <div style="font-size:17px;font-weight:850;color:#0f172a;line-height:1.25;letter-spacing:-0.2px;word-break:break-word;">
        ${esc(d.business.name)}
      </div>
      <div style="font-size:11.5px;color:#64748b;font-weight:600;margin-top:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        ${d.business.village ? `<span style="color:#475569;">📍 ${esc(d.business.village)}</span>` : ''}
        ${d.business.phone ? `<span>📞 ${phoneFmt(d.business.phone)}</span>` : ''}
      </div>
    </div>
    <div style="flex:0 0 auto;text-align:right;">
      <span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:750;background:#f8fafc;color:#475569;border:1px solid #cbd5e1;padding:4px 8px;border-radius:8px;">
        📅 ${todayTxt()}
      </span>
    </div>
  </div>

  ${tokenCard()}

  <!-- Quick Action Launcher Bar -->
  <div class="dash-quick-actions" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(100px, 1fr));gap:8px;margin-top:14px;">
    <button type="button" class="btn btn-soft" data-act="switch-job-tab" data-tab="grind" data-goto="job"
      style="padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:14px;background:#fff;border:1.5px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;">
      <span style="font-size:20px;">⚙️</span>
      <span style="font-weight:800;font-size:12.5px;color:#0f172a;">${t('servicesAndProcessing')}</span>
      <span class="tiny muted" style="font-size:10.5px;">${t('servicesSub')}</span>
    </button>
    <button type="button" class="btn btn-soft" data-act="switch-job-tab" data-tab="sale" data-goto="job"
      style="padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:14px;background:#fff;border:1.5px solid #a7f3d0;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;">
      <span style="font-size:20px;">🛒</span>
      <span style="font-weight:800;font-size:12.5px;color:#059669;">${t('goodsSale')}</span>
      <span class="tiny muted" style="font-size:10.5px;">${t('goodsSaleSub')}</span>
    </button>
    <button type="button" class="btn btn-soft" data-act="switch-job-tab" data-tab="purchase" data-goto="job"
      style="padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:14px;background:#fff;border:1.5px solid #fde68a;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;">
      <span style="font-size:20px;">📥</span>
      <span style="font-weight:800;font-size:12.5px;color:#d97706;">${t('rawMaterialPurchase')}</span>
      <span class="tiny muted" style="font-size:10.5px;">${t('purchaseSub')}</span>
    </button>
    <button type="button" class="btn btn-soft" data-act="goto" data-view="reports"
      style="padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:14px;background:#fff;border:1.5px solid #cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;">
      <span style="font-size:20px;">📊</span>
      <span style="font-weight:800;font-size:12.5px;color:#334155;">${t('dailyReports')}</span>
      <span class="tiny muted" style="font-size:10.5px;">${t('reportsSub')}</span>
    </button>
  </div>

  <div class="kpis mt-14">
    <div class="kpi accent">
      <div class="kpi-label">${t('totalSalesLabel', { range: label })}</div>
      <div class="kpi-value">${inr(s.salePaise)}</div>
      <div class="kpi-sub">${t('serviceJobsCount', { n: s.jobs || 0 })} · ${t('goodsSalesCount', { n: s.sales || 0 })}</div>
    </div>
    <div class="kpi ${s.cashPaise >= 0 ? 'green' : 'amber'}" style="${s.cashPaise < 0 ? 'background:#fff7ed;border-color:#fed7aa;' : ''}">
      <div class="kpi-label" style="${s.cashPaise < 0 ? 'color:#c2410c;' : ''}">${t('netCashGalla')}</div>
      <div class="kpi-value" style="${s.cashPaise < 0 ? 'color:#ea580c;' : ''}">${inr(s.cashPaise)}</div>
      <div class="kpi-sub">${s.cashPaise < 0 ? t('outflowWarning') : t('cashInGalla')}</div>
    </div>
    <div class="kpi amber">
      <div class="kpi-label">${t('newCreditCard')}</div>
      <div class="kpi-value">${inr(s.creditPaise)}</div>
      <div class="kpi-sub">${t('creditGivenToday')}</div>
    </div>
    <div class="kpi" style="${s.purchasePaise > 0 ? 'background:#fffbeb;border-color:#fde68a;' : ''}">
      <div class="kpi-label" style="${s.purchasePaise > 0 ? 'color:#b45309;' : ''}">${s.purchasePaise > 0 ? t('totalCropPurchase') : t('totalOutstanding')}</div>
      <div class="kpi-value" style="${s.purchasePaise > 0 ? 'color:#d97706;' : ''}">${s.purchasePaise > 0 ? inr(s.purchasePaise) : inr(s.outstandingPaise)}</div>
      <div class="kpi-sub">${s.purchasePaise > 0 ? t('purchasesCount', { n: s.purchases || 0 }) : t('receivableFromCustomers', { n: s.outstandingCount || 0 })}</div>
    </div>
  </div>

  <div class="grid-2 mt-14">
    <section class="card">
      <div class="section-head">
        <h2 class="section-title">${t('recentTransactions')}</h2>
        <button class="section-link" data-act="goto" data-view="reports">${t('navReports')}</button>
      </div>
      ${recent.length
        ? `<div class="row-list">${recent.map((e) => entryRow(e)).join('')}</div>`
        : (d.tokens && d.tokens.doneList && d.tokens.doneList.length
          ? `<div class="row-list">
              <div style="font-size:11.5px;font-weight:750;color:#15803d;margin-bottom:8px;">${t('pendingBillsFromDoneTokens')}</div>
              ${d.tokens.doneList.map((tok) => `
                <div class="row-item" style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;">
                  <span class="token-badge" style="width:32px;height:32px;border-radius:8px;background:#e0e7ff;color:#3730a3;font-weight:800;font-size:13px;display:grid;place-items:center;flex-shrink:0;">#${tok.no}</span>
                  <span class="grow" style="min-width:0;">
                    <span class="row-title ellipsis">${esc(tok.name)}${tok.village ? ` <span class="tiny-chip">${esc(tok.village)}</span>` : ''}</span>
                    <span class="row-sub">${tok.serviceName || t('servicesAndProcessing')} ${tok.grossWeight ? '· ' + tok.grossWeight + 'kg' : ''}</span>
                  </span>
                  <button type="button" class="btn btn-sm btn-primary" data-act="token-to-job" data-id="${tok.id}" style="padding:5px 10px;font-size:11.5px;font-weight:700;">
                    ${t('createBillAction')}
                  </button>
                </div>
              `).join('')}
            </div>`
          : emptyBlock(t('noTransactionsYet'), t('noTransactionsSub')))}
    </section>

    <section class="card">
      <div class="section-head">
        <h2 class="section-title">${dues.length ? t('duesTitle') : t('customerPhonebook')}</h2>
        <button class="section-link" data-act="goto" data-view="customers">${t('navCustomers')}</button>
      </div>
      ${(dues.length ? dues : d.customers.slice(0, 6)).length
        ? `<div class="row-list">
            ${(dues.length ? dues : d.customers.slice(0, 6)).map((c) => `
              <button type="button" class="row-item" data-act="open-cust" data-id="${c.id}">
                ${c.photo
                  ? `<img src="${c.photo}" class="avatar small" alt="${esc(c.name)}" style="object-fit:cover;border:1px solid #cbd5e1;">`
                  : `<span class="avatar small">${esc(c.name.trim().charAt(0) || '?')}</span>`}
                <span class="grow">
                  <span class="row-title ellipsis">${esc(c.name)}${c.village ? ` <span class="tiny-chip">${esc(c.village)}</span>` : ''}</span>
                  <span class="row-sub">${c.phone ? c.phone : 'फोन नहीं'}${c.lastAt ? ' · ' + relTxt(c.lastAt) : ''}</span>
                </span>
                <span class="bal ${c.balancePaise > 0 ? 'due' : (c.balancePaise < 0 ? 'adv' : 'zero')}">${c.balancePaise !== 0 ? inr(c.balancePaise) : 'बराबर ✓'}</span>
              </button>`).join('')}
          </div>`
        : emptyBlock('अभी कोई ग्राहक दर्ज नहीं', 'टोकन या नया बिल बनाते ही ग्राहक यहाँ दिखेगा।')}
    </section>
  </div>`;
}
