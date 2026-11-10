import { state } from '../state.js';
import { inr, qtyFmt, rangeLabel, emptyBlock, esc, relTxt } from '../utils/formatters.js';
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
  ${tokenCard()}

  <!-- Quick Action Launcher Bar -->
  <div class="dash-quick-actions" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(100px, 1fr));gap:8px;margin-top:14px;">
    <button type="button" class="btn btn-soft" data-act="switch-job-tab" data-tab="grind" data-goto="job"
      style="padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:14px;background:#fff;border:1.5px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;">
      <span style="font-size:20px;">⚙️</span>
      <span style="font-weight:800;font-size:12.5px;color:#0f172a;">सुविधाएं / सेवा</span>
      <span class="tiny muted" style="font-size:10.5px;">प्रोसेसिंग व टोकन</span>
    </button>
    <button type="button" class="btn btn-soft" data-act="switch-job-tab" data-tab="sale" data-goto="job"
      style="padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:14px;background:#fff;border:1.5px solid #a7f3d0;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;">
      <span style="font-size:20px;">🛒</span>
      <span style="font-weight:800;font-size:12.5px;color:#059669;">सामान बिक्री</span>
      <span class="tiny muted" style="font-size:10.5px;">तेल, आटा, खली</span>
    </button>
    <button type="button" class="btn btn-soft" data-act="switch-job-tab" data-tab="purchase" data-goto="job"
      style="padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:14px;background:#fff;border:1.5px solid #fde68a;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;">
      <span style="font-size:20px;">📥</span>
      <span style="font-weight:800;font-size:12.5px;color:#d97706;">कच्चा माल खरीद</span>
      <span class="tiny muted" style="font-size:10.5px;">सरसों, गेहूँ, फसल</span>
    </button>
    <button type="button" class="btn btn-soft" data-act="goto" data-view="reports"
      style="padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:14px;background:#fff;border:1.5px solid #cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;">
      <span style="font-size:20px;">📊</span>
      <span style="font-weight:800;font-size:12.5px;color:#334155;">दैनिक रिपोर्ट</span>
      <span class="tiny muted" style="font-size:10.5px;">हिसाब व बहीखाता</span>
    </button>
  </div>

  <div class="kpis mt-14">
    <div class="kpi accent">
      <div class="kpi-label">${label} कुल बिक्री</div>
      <div class="kpi-value">${inr(s.salePaise)}</div>
      <div class="kpi-sub">${s.jobs || 0} सेवा कार्य · ${s.sales || 0} माल बिक्री</div>
    </div>
    <div class="kpi green">
      <div class="kpi-label">शुद्ध नकद गल्ला (Cash)</div>
      <div class="kpi-value">${inr(s.cashPaise)}</div>
      <div class="kpi-sub">गल्ले में शुद्ध रोकड़</div>
    </div>
    <div class="kpi amber">
      <div class="kpi-label">नया उधार (Credit)</div>
      <div class="kpi-value">${inr(s.creditPaise)}</div>
      <div class="kpi-sub">आज बाकी रखा</div>
    </div>
    <div class="kpi" style="${s.purchasePaise > 0 ? 'background:#fffbeb;border-color:#fde68a;' : ''}">
      <div class="kpi-label" style="${s.purchasePaise > 0 ? 'color:#b45309;' : ''}">${s.purchasePaise > 0 ? 'कुल फसल खरीद' : t('totalOutstanding')}</div>
      <div class="kpi-value" style="${s.purchasePaise > 0 ? 'color:#d97706;' : ''}">${s.purchasePaise > 0 ? inr(s.purchasePaise) : inr(s.outstandingPaise)}</div>
      <div class="kpi-sub">${s.purchasePaise > 0 ? (s.purchases || 0) + ' खरीद एंट्री' : s.outstandingCount + ' ग्राहक से लेना'}</div>
    </div>
  </div>

  <div class="grid-2 mt-14">
    <section class="card">
      <div class="section-head">
        <h2 class="section-title">हाल का लेनदेन</h2>
        <button class="section-link" data-act="goto" data-view="reports">${t('navReports')}</button>
      </div>
      ${recent.length
        ? `<div class="row-list">${recent.map((e) => entryRow(e)).join('')}</div>`
        : (d.tokens && d.tokens.doneList && d.tokens.doneList.length
          ? `<div class="row-list">
              <div style="font-size:11.5px;font-weight:750;color:#15803d;margin-bottom:8px;">✅ आज पूरे हुए काम (बिल बनाना बाकी):</div>
              ${d.tokens.doneList.map((tok) => `
                <div class="row-item" style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;">
                  <span class="token-badge" style="width:32px;height:32px;border-radius:8px;background:#e0e7ff;color:#3730a3;font-weight:800;font-size:13px;display:grid;place-items:center;flex-shrink:0;">#${tok.no}</span>
                  <span class="grow" style="min-width:0;">
                    <span class="row-title ellipsis">${esc(tok.name)}${tok.village ? ` <span class="tiny-chip">${esc(tok.village)}</span>` : ''}</span>
                    <span class="row-sub">${tok.serviceName || 'पिसाई'} ${tok.grossWeight ? '· ' + tok.grossWeight + 'kg' : ''}</span>
                  </span>
                  <button type="button" class="btn btn-sm btn-primary" data-act="token-to-job" data-id="${tok.id}" style="padding:5px 10px;font-size:11.5px;font-weight:700;">
                    🧾 बिल बनाएं
                  </button>
                </div>
              `).join('')}
            </div>`
          : emptyBlock('अभी कोई लेनदेन दर्ज नहीं', 'पहला बिल या खरीद जोड़ते ही यहाँ दिखेगा।'))}
    </section>

    <section class="card">
      <div class="section-head">
        <h2 class="section-title">${dues.length ? 'बाकी उधार (जिनसे लेना है)' : 'ग्राहक फोन बुक'}</h2>
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
