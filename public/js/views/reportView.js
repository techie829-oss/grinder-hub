// Financial & Operational Ledger Reports View (Date-Wise Order Book)
import { state, RANGES } from '../state.js';
import { inr, qtyFmt, unitOf, rangeLabel, emptyBlock, esc, timeTxt, getISTDayKey, formatDayHindi, formatDayLongHindi } from '../utils/formatters.js';
import { entryRow } from '../components/rows.js';
import { loadDaySummary } from '../api.js';
import { t } from '../i18n.js';

export function viewReports() {
  const data = state.data || {};
  const stats = data.stats || { range: 'today', jobs: 0, sales: 0, purchases: 0, salePaise: 0, purchasePaise: 0, cashPaise: 0, outstandingPaise: 0, outstandingCount: 0, byService: [] };
  const entries = data.entries || [];

  const dayReport = state.dayReport;
  const todayKey = getISTDayKey();
  const selectedDay = dayReport.selectedDay || todayKey;
  if (!dayReport.selectedDay) {
    dayReport.selectedDay = selectedDay;
  }

  // Trigger day summary fetch if not yet loaded or day changed
  if (dayReport.tab !== 'range' && !dayReport.summary && !dayReport.loading && !dayReport.error) {
    loadDaySummary(selectedDay);
  }

  const yesterdayKey = getISTDayKey(Date.now() - 24 * 60 * 60 * 1000);
  const twoDaysAgoKey = getISTDayKey(Date.now() - 48 * 60 * 60 * 1000);

  const summary = dayReport.summary || {
    totalOrders: 0,
    totalTokens: 0,
    totalGrossWeightKg: 0,
    paidCashCount: 0,
    paidCashAmountPaise: 0,
    unpaidUdhaarCount: 0,
    unpaidUdhaarAmountPaise: 0,
    unbilledCount: 0,
    deliveredCount: 0,
    deliveredWeightKg: 0,
    pendingCount: 0,
    pendingWeightKg: 0,
  };

  const rawOrders = dayReport.orders || [];

  // Filter orders by active filter tab
  const activeFilter = dayReport.filter || 'all';
  const unpaidOrders = rawOrders.filter((o) => o.isPaid === false || !o.isBilled);
  const paidOrders = rawOrders.filter((o) => o.isPaid === true);
  const pendingOrders = rawOrders.filter((o) => !o.isDelivered);
  const deliveredOrders = rawOrders.filter((o) => o.isDelivered);

  let displayedOrders = rawOrders;
  if (activeFilter === 'unpaid') displayedOrders = unpaidOrders;
  else if (activeFilter === 'paid') displayedOrders = paidOrders;
  else if (activeFilter === 'pending') displayedOrders = pendingOrders;
  else if (activeFilter === 'delivered') displayedOrders = deliveredOrders;

  return `
  <div class="page-head" style="margin-bottom:12px;">
    <div>
      <h1 class="page-title" style="display:flex;align-items:center;gap:8px;">
        <span>📅</span> <span>दैनिक बहीखाता व रिपोर्ट</span>
      </h1>
      <p class="page-sub">किसी भी तारीख का ऑर्डर, नकद, उधार व डिलीवरी हिसाब</p>
    </div>
    <div style="display:flex;gap:6px;align-items:center;">
      <button type="button" class="btn btn-primary btn-sm" data-act="switch-job-tab" data-tab="grind" data-goto="job">+ नया बिल</button>
      <a class="btn btn-ghost btn-sm" href="/api/export" download>${t('downloadBackup')}</a>
    </div>
  </div>

  <!-- Sub-Tabs Switcher: Day Orders vs Range Aggregate -->
  <div class="report-subtabs">
    <button type="button" class="report-subtab${dayReport.tab !== 'range' ? ' is-on' : ''}" data-act="switch-report-tab" data-tab="orders">
      📅 तारीख अनुसार हिसाब (Day Orders)
    </button>
    <button type="button" class="report-subtab${dayReport.tab === 'range' ? ' is-on' : ''}" data-act="switch-report-tab" data-tab="range">
      📊 कुल अवधि रिपोर्ट (Weekly/Monthly)
    </button>
  </div>

  ${dayReport.tab === 'range' ? renderRangeReport(stats, entries) : renderDateWiseReport(dayReport, selectedDay, todayKey, yesterdayKey, twoDaysAgoKey, summary, rawOrders, displayedOrders, unpaidOrders, paidOrders, pendingOrders, deliveredOrders)}
  `;
}

function renderDateWiseReport(dayReport, selectedDay, todayKey, yesterdayKey, twoDaysAgoKey, summary, rawOrders, displayedOrders, unpaidOrders, paidOrders, pendingOrders, deliveredOrders) {
  const activeFilter = dayReport.filter || 'all';
  const availableDays = dayReport.availableDays || [];

  return `
  <!-- Date Selector Card -->
  <div class="day-report-datebar">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
      <div class="day-quick-pills">
        <button type="button" class="day-quick-pill${selectedDay === todayKey ? ' is-active' : ''}" data-act="set-report-day" data-day="${todayKey}">
          आज
        </button>
        <button type="button" class="day-quick-pill${selectedDay === yesterdayKey ? ' is-active' : ''}" data-act="set-report-day" data-day="${yesterdayKey}">
          कल
        </button>
        <button type="button" class="day-quick-pill${selectedDay === twoDaysAgoKey ? ' is-active' : ''}" data-act="set-report-day" data-day="${twoDaysAgoKey}">
          2 दिन पहले
        </button>
      </div>

      <div style="display:flex;align-items:center;gap:6px;">
        <label for="report-date-picker" style="font-size:12px;font-weight:700;color:#64748b;">तारीख:</label>
        <input type="date" id="report-date-picker" data-act="change-report-day" value="${selectedDay}"
          style="padding:6px 10px;font-size:12.5px;font-weight:750;border-radius:10px;border:1.5px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer;">
      </div>
    </div>

    <!-- Active Day Banner -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
      <div style="font-size:13.5px;font-weight:800;color:#0f172a;">
        📌 ${formatDayLongHindi(selectedDay)}
      </div>
      <div style="font-size:11.5px;font-weight:750;color:#475569;">
        कुल ${summary.totalOrders} ऑर्डर / गतिविधियाँ · आवक: <b style="color:#0f172a;">${qtyFmt(summary.totalGrossWeightKg)} kg</b>
      </div>
    </div>

    <!-- Quick Past Days Strip (if available) -->
    ${availableDays.length > 1 ? `
    <div style="display:flex;gap:6px;overflow-x:auto;padding-top:10px;margin-top:8px;border-top:1px dashed #e2e8f0;scrollbar-width:none;-webkit-overflow-scrolling:touch;">
      <span style="font-size:11px;font-weight:700;color:#94a3b8;align-self:center;white-space:nowrap;">हाल की तारीखें:</span>
      ${availableDays.slice(0, 7).map((dStr) => `
        <button type="button" data-act="set-report-day" data-day="${dStr}"
          style="padding:4px 8px;border-radius:7px;border:1px solid ${selectedDay === dStr ? '#4f46e5' : '#e2e8f0'};background:${selectedDay === dStr ? '#e0e7ff' : '#ffffff'};color:${selectedDay === dStr ? '#3730a3' : '#475569'};font-size:11px;font-weight:750;white-space:nowrap;cursor:pointer;">
          ${formatDayHindi(dStr)}
        </button>
      `).join('')}
    </div>` : ''}
  </div>

  ${dayReport.loading ? `
    <div class="card mt-14" style="padding:40px 20px;text-align:center;">
      <div style="font-size:28px;margin-bottom:8px;animation:pulse 1s infinite;">⏳</div>
      <div style="font-weight:800;font-size:15px;color:#0f172a;">${formatDayHindi(selectedDay)} का हिसाब लोड हो रहा है…</div>
      <div class="tiny muted" style="margin-top:4px;">कृपया प्रतीक्षा करें</div>
    </div>
  ` : `
    <!-- 4 Day Summary KPI Cards -->
    <div class="kpis mt-14">
      <!-- Card 1: Paid Cash -->
      <div class="kpi green" style="background:#f0fdf4;border-color:#bbf7d0;">
        <div class="kpi-label" style="color:#15803d;">
          <span>🟢</span> <span>नकद भुगतान (Cash)</span>
        </div>
        <div class="kpi-value" style="color:#16a34a;">${inr(summary.paidCashAmountPaise)}</div>
        <div class="kpi-sub" style="color:#166534;"><b>${summary.paidCashCount}</b> ग्राहक नकद प्राप्त</div>
      </div>

      <!-- Card 2: Unpaid / Udhaar -->
      <div class="kpi amber" style="background:#fffbeb;border-color:#fde68a;">
        <div class="kpi-label" style="color:#b45309;">
          <span>🔴</span> <span>बाकी / उधार (Udhaar)</span>
        </div>
        <div class="kpi-value" style="color:#d97706;">${inr(summary.unpaidUdhaarAmountPaise)}</div>
        <div class="kpi-sub" style="color:#92400e;">
          <b>${summary.unpaidUdhaarCount}</b> ग्राहक का बाकी ${summary.unbilledCount > 0 ? `(${summary.unbilledCount} बिना बिल)` : ''}
        </div>
      </div>

      <!-- Card 3: Delivered -->
      <div class="kpi" style="background:#eff6ff;border-color:#bfdbfe;">
        <div class="kpi-label" style="color:#1d4ed8;">
          <span>📦</span> <span>माल ले गए (Delivered)</span>
        </div>
        <div class="kpi-value" style="color:#2563eb;">${qtyFmt(summary.deliveredWeightKg)} <span style="font-size:15px;font-weight:700;">kg</span></div>
        <div class="kpi-sub" style="color:#1e40af;"><b>${summary.deliveredCount}</b> ग्राहक माल ले गए</div>
      </div>

      <!-- Card 4: Pending / In-Queue -->
      <div class="kpi" style="background:#faf5ff;border-color:#e9d5ff;">
        <div class="kpi-label" style="color:#7e22ce;">
          <span>⏳</span> <span>पेंडिंग / कतार (Pending)</span>
        </div>
        <div class="kpi-value" style="color:#9333ea;">${qtyFmt(summary.pendingWeightKg)} <span style="font-size:15px;font-weight:700;">kg</span></div>
        <div class="kpi-sub" style="color:#6b21a8;"><b>${summary.pendingCount}</b> ग्राहक दुकान/कतार में</div>
      </div>
    </div>

    <!-- Order-Wise Itemized List Section -->
    <div class="card mt-14" style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:18px;padding:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        <h2 style="font-size:15px;font-weight:850;color:#0f172a;display:flex;align-items:center;gap:6px;">
          <span>📋</span> <span>ऑर्डर व कार्य सूची</span>
          <span style="font-size:12px;font-weight:700;color:#64748b;margin-left:4px;">(${displayedOrders.length})</span>
        </h2>
        <span class="tiny muted">${formatDayHindi(selectedDay)}</span>
      </div>

      <!-- Filter Tabs -->
      <div class="cust-filter-tabs" style="display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));gap:6px;margin-bottom:14px;">
        <button type="button" class="cust-filter-tab${activeFilter === 'all' ? ' is-active' : ''}" data-act="filter-report-orders" data-filter="all">
          सभी (${rawOrders.length})
        </button>
        <button type="button" class="cust-filter-tab${activeFilter === 'unpaid' ? ' is-active' : ''}" data-act="filter-report-orders" data-filter="unpaid" style="${activeFilter === 'unpaid' ? 'background:#ef4444;border-color:#dc2626;' : ''}">
          🔴 बाकी (${unpaidOrders.length})
        </button>
        <button type="button" class="cust-filter-tab${activeFilter === 'paid' ? ' is-active' : ''}" data-act="filter-report-orders" data-filter="paid" style="${activeFilter === 'paid' ? 'background:#10b981;border-color:#059669;' : ''}">
          🟢 नकद (${paidOrders.length})
        </button>
        <button type="button" class="cust-filter-tab${activeFilter === 'pending' ? ' is-active' : ''}" data-act="filter-report-orders" data-filter="pending" style="${activeFilter === 'pending' ? 'background:#8b5cf6;border-color:#7c3aed;' : ''}">
          ⏳ पेंडिंग (${pendingOrders.length})
        </button>
        <button type="button" class="cust-filter-tab${activeFilter === 'delivered' ? ' is-active' : ''}" data-act="filter-report-orders" data-filter="delivered" style="${activeFilter === 'delivered' ? 'background:#3b82f6;border-color:#2563eb;' : ''}">
          ✓ दिया (${deliveredOrders.length})
        </button>
      </div>

      <!-- Orders List -->
      ${displayedOrders.length ? `
        <div class="row-list">
          ${displayedOrders.map((ord) => renderDayOrderItem(ord)).join('')}
        </div>
      ` : emptyBlock('कोई ऑर्डर नहीं मिला', 'इस फ़िल्टर या तारीख में कोई कार्य दर्ज नहीं है।')}
    </div>
  `}
  `;
}

function renderDayOrderItem(order) {
  const isToken = order.itemType === 'token';
  const hasLoss = Number(order.lossG) > 0;
  const isZeroLoss = Number(order.lossG) === 0;

  // Resolve customer ID if available for Khata button
  const cust = (order.customerId && state.data?.customers?.find((c) => c.id === order.customerId)) ||
    state.data?.customers?.find((c) => c.name === order.name && (!order.village || c.village === order.village)) ||
    state.data?.customers?.find((c) => c.name === order.name);
  const custId = cust ? cust.id : (order.customerId || '');

  return `
  <div class="day-order-card" style="border:1.5px solid ${order.isPaid === false ? '#fecaca' : '#e2e8f0'};background:#ffffff;border-radius:14px;padding:12px;margin-bottom:10px;">
    <!-- Top Row: Token Badge, Name, Village & Time -->
    <div class="day-order-head">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 auto;">
        <span class="token-badge" style="width:34px;height:34px;border-radius:10px;background:${isToken ? '#e0e7ff' : '#f1f5f9'};color:${isToken ? '#3730a3' : '#475569'};font-weight:850;font-size:13px;display:grid;place-items:center;flex-shrink:0;">
          ${order.tokenNo ? '#' + order.tokenNo : '🛒'}
        </span>
        <div style="min-width:0;">
          <div style="font-weight:850;font-size:14px;color:#0f172a;line-height:1.2;" class="ellipsis">
            ${esc(order.name || 'दुकान ग्राहक')}
          </div>
          <div style="font-size:11px;color:#64748b;font-weight:650;margin-top:2px;">
            ${order.village ? `<span class="tiny-chip" style="font-size:10.5px;padding:1px 6px;">📍 ${esc(order.village)}</span>` : ''}
            ${order.phone ? `<span>📞 ${order.phone}</span>` : ''}
          </div>
        </div>
      </div>
      <div style="flex:0 0 auto;text-align:right;">
        <span style="font-size:11px;color:#64748b;font-weight:650;">
          ${order.createdAt ? timeTxt(order.createdAt) : ''}
        </span>
      </div>
    </div>

    <!-- Middle Row: Service, Item & Weight Breakdown -->
    <div class="day-order-body">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:750;color:#0f172a;">
        <span>🌾 ${esc(order.serviceName || 'सेवा / माल')}</span>
        ${order.ratePaise ? `<span class="tiny muted">दर: ${inr(order.ratePaise)}/${order.unit || 'kg'}</span>` : ''}
      </div>

      ${isToken || order.grossWeight ? `
        <div style="font-size:12px;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          ${isZeroLoss ? `
            <span>तैयार माल: <b style="color:#15803d;font-size:13px;">${qtyFmt(order.netWeight || order.grossWeight)} kg</b></span>
            <span class="tiny-chip" style="background:#ecfdf5;color:#047857;font-weight:750;font-size:10.5px;">✓ सीधा Output</span>
          ` : `
            <span>आवक: <b>${qtyFmt(order.grossWeight)} kg</b></span>
            <span style="color:#cbd5e1;">·</span>
            <span style="color:#dc2626;">काट: -${order.lossG}g</span>
            <span style="color:#cbd5e1;">·</span>
            <span>तैयार: <b style="color:#15803d;font-size:13px;">${qtyFmt(order.netWeight)} kg</b></span>
          `}
        </div>
      ` : ''}
    </div>

    <!-- Status Badges & Action Buttons -->
    <div class="day-order-foot">
      <!-- Status Badges -->
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <!-- Delivery Status Pill -->
        ${order.isDelivered ? `
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:750;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:3px 8px;border-radius:20px;">
            ✓ माल ले गए
          </span>
        ` : (order.status === 'serving' ? `
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:750;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:3px 8px;border-radius:20px;">
            ⚙️ चालू है
          </span>
        ` : (order.status === 'done' ? `
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:750;background:#f0fdf4;color:#15803d;border:1px solid #86efac;padding:3px 8px;border-radius:20px;">
            ✅ तैयार है
          </span>
        ` : `
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:750;background:#fffbeb;color:#b45309;border:1px solid #fde68a;padding:3px 8px;border-radius:20px;">
            ⏳ कतार में
          </span>
        `))}

        <!-- Payment Status Pill -->
        ${order.isBilled ? (order.isPaid ? `
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:3px 8px;border-radius:20px;">
            🟢 नकद चुकाया (${inr(order.amountPaise)})
          </span>
        ` : `
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:3px 8px;border-radius:20px;">
            🔴 बाकी / उधार (${inr(order.amountPaise)})
          </span>
        `) : `
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:750;background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;padding:3px 8px;border-radius:20px;">
            ⚪ बिल बाकी
          </span>
        `}
      </div>

      <!-- 1-Click Action Buttons -->
      <div style="display:flex;align-items:center;gap:6px;">
        ${!order.isBilled ? `
          <button type="button" class="btn btn-sm btn-primary" data-act="token-to-job" data-id="${order.id}"
            style="padding:5px 10px;font-size:11.5px;font-weight:750;border-radius:8px;">
            🧾 बिल बनाएं
          </button>
        ` : ''}

        ${!order.isDelivered ? `
          <button type="button" class="btn btn-sm" data-act="token-deliver" data-id="${order.id}"
            style="padding:5px 10px;font-size:11.5px;font-weight:750;border-radius:8px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;">
            ✓ दिया
          </button>
        ` : ''}

        ${custId ? `
          <button type="button" class="btn btn-sm btn-subtle" data-act="open-cust" data-id="${custId}"
            style="padding:5px 10px;font-size:11.5px;font-weight:700;border-radius:8px;border:1px solid #cbd5e1;background:#fff;">
            📖 खाता
          </button>
        ` : (order.name ? `
          <button type="button" class="btn btn-sm btn-subtle" data-act="goto-cust-search" data-q="${esc(order.name)}"
            style="padding:5px 10px;font-size:11.5px;font-weight:700;border-radius:8px;border:1px solid #cbd5e1;background:#fff;">
            📖 खाता
          </button>
        ` : '')}
      </div>
    </div>
  </div>`;
}

function renderRangeReport(stats, entries) {
  return `
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
    <div class="kpi ${(stats.cashPaise || 0) >= 0 ? 'green' : 'amber'}" style="${(stats.cashPaise || 0) < 0 ? 'background:#fff7ed;border-color:#fed7aa;' : ''}">
      <div class="kpi-label" style="${(stats.cashPaise || 0) < 0 ? 'color:#c2410c;' : ''}">${t('cashRecovered')}</div>
      <div class="kpi-value" style="${(stats.cashPaise || 0) < 0 ? 'color:#ea580c;' : ''}">${inr(stats.cashPaise || 0)}</div>
      <div class="kpi-sub">${(stats.cashPaise || 0) < 0 ? 'खरीद भुगतान बिक्री आवक से अधिक' : t('cashInHand')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">${t('totalOutstanding')}</div>
      <div class="kpi-value">${inr(stats.outstandingPaise || 0)}</div>
      <div class="kpi-sub">${stats.outstandingCount || 0} ग्राहक से बाकी</div>
    </div>
  </div>

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
