// Financial & Operational Ledger Reports View
import { state, RANGES } from '../state.js';
import { inr, qtyFmt, unitOf, rangeLabel, emptyBlock, esc } from '../utils/formatters.js';
import { entryRow } from '../components/rows.js';
import { t } from '../i18n.js';

export function viewReports() {
  const data = state.data || {};
  const stats = data.stats || { range: 'today', jobs: 0, sales: 0, purchases: 0, salePaise: 0, purchasePaise: 0, cashPaise: 0, outstandingPaise: 0, outstandingCount: 0, byService: [] };
  const tokens = data.tokens || { total: 0, waiting: [], done: 0, doneList: [] };
  const doneList = tokens.doneList || [];
  const entries = data.entries || [];

  return `
  <div class="page-head">
    <div>
      <h1 class="page-title">${t('reportsTitle')}</h1>
      <p class="page-sub">${rangeLabel(stats.range)} · ${stats.jobs || 0} ऑर्डर / बिल</p>
    </div>
    <div style="display:flex;gap:6px;align-items:center;">
      <button type="button" class="btn btn-primary btn-sm" data-act="switch-job-tab" data-tab="grind" data-goto="job">+ नया बिल</button>
      <a class="btn btn-ghost btn-sm" href="/api/export" download>${t('downloadBackup')}</a>
    </div>
  </div>

  <div class="chips">
    ${RANGES.map((r) => `<button type="button" class="chip${stats.range === r.id ? ' is-on' : ''}" data-act="range" data-range="${r.id}">${t(r.labelKey) || r.id}</button>`).join('')}
  </div>

  <div class="kpis">
    <div class="kpi accent">
      <div class="kpi-label">${t('totalSale')}</div>
      <div class="kpi-value">${inr(stats.salePaise || 0)}</div>
      <div class="kpi-sub">${stats.jobs || 0} सेवा कार्य · ${stats.sales || 0} बिक्री</div>
    </div>
    <div class="kpi" style="${(stats.purchasePaise || 0) > 0 ? 'background:#fffbeb;border-color:#fde68a;' : ''}">
      <div class="kpi-label" style="${(stats.purchasePaise || 0) > 0 ? 'color:#b45309;' : ''}">कच्चा माल खरीद</div>
      <div class="kpi-value" style="${(stats.purchasePaise || 0) > 0 ? 'color:#d97706;' : ''}">${inr(stats.purchasePaise || 0)}</div>
      <div class="kpi-sub">${stats.purchases || 0} फसल खरीद</div>
    </div>
    <div class="kpi green">
      <div class="kpi-label">${t('cashRecovered')}</div>
      <div class="kpi-value">${inr(stats.cashPaise || 0)}</div>
      <div class="kpi-sub">${t('cashInHand')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${t('totalOutstanding')}</div>
      <div class="kpi-value">${inr(stats.outstandingPaise || 0)}</div>
      <div class="kpi-sub">${stats.outstandingCount || 0} ग्राहक से बाकी</div>
    </div>
  </div>

  <!-- Operational Token & Completed Work Summary -->
  ${(tokens.total > 0 || doneList.length > 0) ? `
  <section class="card mt-14" style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:16px;padding:16px;">
    <div class="section-head" style="margin-bottom:10px;">
      <h2 class="section-title" style="display:flex;align-items:center;gap:6px;font-size:14.5px;color:#0f172a;">
        <span>📋</span> <span>आज के टोकन व कार्य सारांश</span>
      </h2>
      <span class="tiny-chip" style="background:#e0e7ff;color:#3730a3;font-weight:700;">कुल ${tokens.total} पर्ची</span>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px;font-weight:650;color:#475569;margin-bottom:12px;">
      <span>⏳ कतार में: <b style="color:#0f172a;">${(tokens.waiting || []).length}</b></span>
      <span>✅ काम पूरा हुआ: <b style="color:#15803d;">${tokens.done || 0}</b></span>
      <span>🧾 पक्का बिल बना: <b style="color:#4f46e5;">${stats.jobs || 0}</b></span>
    </div>

    ${doneList.length ? `
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
      <div style="font-size:12px;font-weight:750;color:#15803d;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
        <span>✅ आज पूरे हुए काम (जिनका बिल सुरक्षित करना बाकी है):</span>
        <span class="tiny muted">${doneList.length} काम</span>
      </div>
      <div class="row-list">
        ${doneList.map((tok) => `
          <div class="row-item" style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;">
            <span class="token-badge" style="width:34px;height:34px;border-radius:8px;background:#e0e7ff;color:#3730a3;font-weight:800;font-size:13px;display:grid;place-items:center;flex-shrink:0;">#${tok.no}</span>
            <div class="grow" style="min-width:0;">
              <div style="font-weight:750;font-size:13px;color:#0f172a;">
                <span>${esc(tok.name)}</span>
                ${tok.village ? `<span class="tiny-chip">${esc(tok.village)}</span>` : ''}
              </div>
              <div class="tiny" style="color:#64748b;margin-top:2px;">
                ${tok.serviceName || 'सुविधा / सेवा'} ${tok.grossWeight ? `· ${tok.grossWeight}kg (शुद्ध: ${tok.netWeight || tok.grossWeight}kg)` : ''}
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-primary" data-act="token-to-job" data-id="${tok.id}" style="padding:6px 12px;font-size:12px;font-weight:750;">
              🧾 बिल बनाएं
            </button>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
  </section>` : ''}

  <section class="card mt-14">
    <div class="section-head"><h2 class="section-title">${t('byServiceTitle')}</h2></div>
    ${stats.byService && stats.byService.length ? `
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
      </div>` : emptyBlock('इस अवधि में कोई सेवा कार्य या बिक्री नहीं हुई', 'ऊपर तारीख बदलें या नया बिल दर्ज करें।')}
  </section>

  <section class="card mt-14">
    <div class="section-head">
      <h2 class="section-title">${t('entriesTitle')}</h2>
      <span class="muted">${entries.length}${entries.length >= 400 ? '+' : ''}</span>
    </div>
    ${entries.length
      ? `<div class="row-list">${entries.slice(0, 120).map((e) => entryRow(e, { del: true })).join('')}</div>`
      : `<div style="text-align:center;padding:26px 16px;">
          <div style="font-size:32px;margin-bottom:8px;">🧾</div>
          <div style="font-weight:750;font-size:15px;color:#0f172a;margin-bottom:4px;">इस अवधि में कोई पक्का बिल या लेन-देन दर्ज नहीं है</div>
          <div style="font-size:12.5px;color:#64748b;max-width:380px;margin:0 auto 16px;">
            जब आप सुविधाएं/सेवा, सामान बिक्री या फसल खरीद का बिल बनाकर "हिसाब में जोड़ें" दबाएंगे, वह सीधे यहाँ और ग्राहक के खाते में जुड़ जाएगा।
          </div>
          <button type="button" class="btn btn-primary" data-act="switch-job-tab" data-tab="grind" data-goto="job" style="padding:10px 18px;font-weight:750;">
            + नया सेवा या बिक्री बिल दर्ज करें
          </button>
        </div>`}
    ${entries.length > 120 ? '<p class="tiny mt-8">पुराने लेन-देन बैकअप फ़ाइल में देखे जा सकते हैं।</p>' : ''}
  </section>`;
}
