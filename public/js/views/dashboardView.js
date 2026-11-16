import { state } from '../state.js';
import { inr, qtyFmt, rangeLabel, emptyBlock, esc, todayTxt, phoneFmt } from '../utils/formatters.js';
import { tokenCard } from '../components/tokenCard.js';
import { entryRow } from '../components/rows.js';
import { t } from '../i18n.js';

export function viewDashboard() {
  const d = state.data;
  const s = d.stats;
  const label = rangeLabel(s.range);
  const recent = d.entries.slice(0, 8);
  const dues = d.customers.filter((c) => c.balancePaise > 0).slice(0, 6);
  const tObj = d.tokens || { waiting: [], done: 0, nextNo: 1, serving: null, doneList: [] };
  const doneList = tObj.doneList || [];
  const tokenCountToday = tObj.nextNo ? Math.max(0, tObj.nextNo - 1) : (tObj.total || 0);

  return `
  <!-- Business Info Header Banner (Modern Shop Hero Card) -->
  <div class="dash-biz-banner card" style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:18px;padding:16px;margin-bottom:14px;box-shadow:0 2px 8px rgba(15,23,42,0.04);">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="min-width:0;flex:1 1 240px;">
        <div style="font-size:19px;font-weight:900;color:#0f172a;line-height:1.25;letter-spacing:-0.3px;word-break:break-word;">
          ${esc(d.business.name)}
        </div>
        <div style="font-size:12px;color:#64748b;font-weight:650;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${d.business.village ? `<span style="color:#334155;">📍 ${esc(d.business.village)}</span>` : ''}
          ${d.business.phone ? `<span>📞 ${phoneFmt(d.business.phone)}</span>` : ''}
        </div>
      </div>
      <div style="flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:5px;">
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:750;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:4px 9px;border-radius:20px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#10b981;display:inline-block;"></span> दुकान चालू है
        </span>
        <span style="font-size:11px;color:#64748b;font-weight:650;">
          📅 ${todayTxt()}
        </span>
      </div>
    </div>
    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11.5px;">
      <span style="color:#475569;font-weight:700;">
        🔄 टोकन मोड: <b style="color:#0f172a;">${d.business.tokenMode === 'loop100' ? 'चक्र 1-100' : 'दैनिक 1 से'}</b>
      </span>
      <span style="background:#f1f5f9;color:#334155;font-weight:750;padding:3px 8px;border-radius:8px;">
        आज कुल: <b>${tokenCountToday}</b> टोकन
      </span>
    </div>
  </div>

  ${tokenCard()}

  <!-- 4 Action Launcher Tiles -->
  <div class="dash-launcher-grid">
    <button type="button" class="dash-launcher-tile tile-purple" data-act="goto" data-view="token">
      <span class="dash-tile-icon">🌾</span>
      <span class="dash-tile-title">नया टोकन / काम</span>
      <span class="dash-tile-sub">कतार पर्ची व पिसाई</span>
    </button>
    <button type="button" class="dash-launcher-tile tile-green" data-act="switch-job-tab" data-tab="sale" data-goto="job">
      <span class="dash-tile-icon">🛒</span>
      <span class="dash-tile-title">माल बिक्री</span>
      <span class="dash-tile-sub">आटा, तेल, चोकर आदि</span>
    </button>
    <button type="button" class="dash-launcher-tile tile-amber" data-act="switch-job-tab" data-tab="purchase" data-goto="job">
      <span class="dash-tile-icon">📥</span>
      <span class="dash-tile-title">फसल खरीद</span>
      <span class="dash-tile-sub">किसान से अनाज खरीद</span>
    </button>
    <button type="button" class="dash-launcher-tile tile-blue" data-act="goto" data-view="reports">
      <span class="dash-tile-icon">📅</span>
      <span class="dash-tile-title">तारीख अनुसार हिसाब</span>
      <span class="dash-tile-sub">दिनवार ऑर्डर व बहीखाता</span>
    </button>
  </div>

  <!-- Modern Financial & Operational KPI Cards -->
  <div class="kpis mt-14">
    <div class="kpi ${s.cashPaise >= 0 ? 'green' : 'amber'}" style="${s.cashPaise < 0 ? 'background:#fff7ed;border-color:#fed7aa;' : 'background:#f0fdf4;border-color:#bbf7d0;'}">
      <div class="kpi-label" style="${s.cashPaise < 0 ? 'color:#c2410c;' : 'color:#15803d;'}">
        <span>💵</span> <span>गल्ले में नकद रोकड़</span>
      </div>
      <div class="kpi-value" style="${s.cashPaise < 0 ? 'color:#ea580c;' : 'color:#16a34a;'}">${inr(s.cashPaise)}</div>
      <div class="kpi-sub">${s.cashPaise < 0 ? 'खर्च बिक्री से अधिक' : 'काउंटर में शुद्ध नकद'}</div>
    </div>

    <div class="kpi accent">
      <div class="kpi-label">
        <span>🌾</span> <span>कुल काम व बिक्री</span>
      </div>
      <div class="kpi-value">${inr(s.salePaise)}</div>
      <div class="kpi-sub">${s.jobs || 0} पिसाई · ${s.sales || 0} बिक्री</div>
    </div>

    <div class="kpi amber" style="background:#fffbeb;border-color:#fde68a;">
      <div class="kpi-label" style="color:#b45309;">
        <span>🔴</span> <span>आज का नया उधार</span>
      </div>
      <div class="kpi-value" style="color:#d97706;">${inr(s.creditPaise)}</div>
      <div class="kpi-sub">${s.creditPaise > 0 ? 'आज ग्राहकों को दिया उधार' : 'आज कोई नया उधार नहीं ✓'}</div>
    </div>

    <div class="kpi" style="background:#fef2f2;border-color:#fecaca;">
      <div class="kpi-label" style="color:#b91c1c;">
        <span>⚠️</span> <span>दुकान का कुल बकाया</span>
      </div>
      <div class="kpi-value" style="color:#dc2626;">${inr(s.outstandingPaise)}</div>
      <div class="kpi-sub">${s.outstandingCount || 0} ग्राहकों से कुल बाकी</div>
    </div>
  </div>

  <!-- Ready to Bill Tokens Widget -->
  ${doneList.length ? `
  <section class="card mt-14" style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:16px;padding:14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="font-size:13.5px;font-weight:800;color:#166534;display:flex;align-items:center;gap:6px;">
        <span>✅</span> <span>तैयार माल (1-क्लिक में बिल बनाएं)</span>
      </div>
      <span class="tiny-chip" style="background:#dcfce7;color:#15803d;font-weight:800;">${doneList.length} तैयार</span>
    </div>
    <div class="row-list">
      ${doneList.slice(0, 5).map((tok) => `
        <div class="row-item" style="padding:8px 0;border-bottom:1px solid #dcfce7;display:flex;align-items:center;gap:8px;">
          <span class="token-badge" style="width:34px;height:34px;border-radius:9px;background:#e0e7ff;color:#3730a3;font-weight:800;font-size:13px;display:grid;place-items:center;flex-shrink:0;">#${tok.no}</span>
          <div class="grow" style="min-width:0;">
            <div style="font-weight:800;font-size:13.5px;color:#0f172a;">
              <span>${esc(tok.name)}</span>
              ${tok.village ? `<span class="tiny-chip" style="font-size:11px;">${esc(tok.village)}</span>` : ''}
            </div>
            <div class="tiny" style="color:#475569;margin-top:2px;">
              ${tok.serviceName || 'पिसाई'} · तैयार माल: <b style="color:#15803d;">${qtyFmt(tok.netWeight || tok.grossWeight)} kg</b>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-primary" data-act="token-to-job" data-id="${tok.id}" style="padding:6px 12px;font-size:12px;font-weight:750;white-space:nowrap;">
            🧾 बिल बनाएं
          </button>
        </div>
      `).join('')}
    </div>
  </section>
  ` : ''}

  <div class="grid-2 mt-14">
    <section class="card">
      <div class="section-head">
        <h2 class="section-title">${t('recentTransactions')}</h2>
        <button class="section-link" data-act="goto" data-view="reports">${t('navReports')}</button>
      </div>
      ${recent.length
        ? `<div class="row-list">${recent.map((e) => entryRow(e)).join('')}</div>`
        : `<div style="text-align:center;padding:18px 12px;color:#64748b;">
             <span style="font-size:26px;display:block;margin-bottom:6px;">📋</span>
             <div style="font-weight:750;font-size:13.5px;color:#0f172a;">${t('noTransactionsYet')}</div>
             <div style="font-size:11.5px;margin-top:2px;color:#64748b;">${t('noTransactionsSub')}</div>
           </div>`}
    </section>

    <section class="card">
      <div class="section-head">
        <h2 class="section-title">${dues.length ? t('duesTitle') : t('customerPhonebook')}</h2>
        <button class="section-link" data-act="goto" data-view="customers">${t('navCustomers')}</button>
      </div>
      ${(dues.length ? dues : d.customers.slice(0, 6)).length
        ? `<div class="row-list">
            ${(dues.length ? dues : d.customers.slice(0, 6)).map((c) => {
              const cls = c.balancePaise > 0 ? 'due' : (c.balancePaise < 0 ? 'adv' : 'zero');
              const text = c.balancePaise > 0
                ? `बाकी: ${inr(c.balancePaise)}`
                : (c.balancePaise < 0 ? `अग्रिम: ${inr(-c.balancePaise)}` : '✓ चुकता');
              return `
              <div class="dash-cust-row" data-act="open-cust" data-id="${c.id}" role="button" tabindex="0">
                <span class="avatar" style="width:34px;height:34px;border-radius:10px;background:#eef2ff;color:#4338ca;font-weight:850;font-size:13px;display:grid;place-items:center;flex-shrink:0;">
                  ${esc((c.name || 'G').trim().charAt(0))}
                </span>
                <div style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;">
                  <div style="font-weight:800;font-size:13.5px;color:#0f172a;line-height:1.25;" class="ellipsis">
                    ${esc(c.name)}
                  </div>
                  <div style="font-size:11px;color:#64748b;font-weight:600;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    ${c.village ? `<span class="tiny-chip" style="font-size:10.5px;padding:1px 6px;">📍 ${esc(c.village)}</span>` : ''}
                    ${c.phone ? `<span>📞 ${phoneFmt(c.phone)}</span>` : ''}
                  </div>
                </div>
                <div style="flex:0 0 auto;text-align:right;">
                  <span class="cust-bal-pill ${cls}">
                    ${text}
                  </span>
                </div>
              </div>`;
            }).join('')}
          </div>`
        : `<div style="text-align:center;padding:18px 12px;color:#64748b;">
             <span style="font-size:26px;display:block;margin-bottom:6px;">👥</span>
             <div style="font-weight:750;font-size:13.5px;color:#0f172a;">${t('noCustomersYet')}</div>
             <div style="font-size:11.5px;margin-top:2px;color:#64748b;">${t('noCustomersSub')}</div>
           </div>`}
    </section>
  </div>`;
}
