/* ============================================================
   चक्की बुक — client app
   हर बिज़नेस का डेटा सर्वर पर उसके खाते से बँधा है; यहाँ सिर्फ़
   उसी खाते का state आता है जो लॉगिन कुकी से मिलता है।
   ============================================================ */

'use strict';

const UNIT_LABEL = { kg: 'किलो', ltr: 'लीटर', pc: 'नग', plate: 'प्लेट' };
const UNITS = [
  { id: 'kg', label: 'किलो' },
  { id: 'ltr', label: 'लीटर' },
  { id: 'pc', label: 'नग' },
  { id: 'plate', label: 'प्लेट' },
];
const RANGES = [
  { id: 'today', label: 'आज' },
  { id: 'week', label: '7 दिन' },
  { id: 'month', label: '30 दिन' },
  { id: 'all', label: 'अब तक' },
];

const NAV = [
  { id: 'dashboard', label: 'होम', icon: 'home' },
  { id: 'token', label: 'टोकन', icon: 'ticket' },
  { id: 'job', label: 'नया काम', icon: 'plus' },
  { id: 'customers', label: 'ग्राहक', icon: 'users' },
  { id: 'reports', label: 'रिपोर्ट', icon: 'chart' },
  { id: 'settings', label: 'सेटिंग', icon: 'sliders' },
];

const TITLES = {
  dashboard: 'होम',
  token: 'टोकन बोर्ड',
  job: 'नया काम',
  customers: 'ग्राहक',
  reports: 'रिपोर्ट',
  settings: 'सेटिंग',
};

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.6 12 3l9 7.6"/><path d="M5.5 9.8V21h13V9.8"/><path d="M9.5 21v-6h5v6"/></svg>',
  ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.2A2 2 0 0 1 5.5 6h13a2 2 0 0 1 2 2.2 2.4 2.4 0 0 0 0 7.6A2 2 0 0 1 18.5 20h-13a2 2 0 0 1-2-2.2 2.4 2.4 0 0 0 0-7.6Z"/><path d="M9.5 9.5v5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.2"/><path d="M12 8.4v7.2M8.4 12h7.2"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.4 20a5.6 5.6 0 0 1 11.2 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.4 14.4A5.6 5.6 0 0 1 20.6 20"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16.5v-4M12.7 16.5V8M17.3 16.5v-6"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2.1" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="2.1" fill="currentColor" stroke="none"/></svg>',
};

const state = {
  view: 'dashboard',
  range: 'today',
  q: '',
  data: null,
  customer: null,
  busy: false,
  job: { serviceId: null, qty: '', rate: '', paid: true, name: '', phone: '', note: '', withToken: false },
  tokenForm: { serviceId: null },
  auth: { mode: 'login', error: '' },
};

const root = document.getElementById('root');
const modalRoot = document.getElementById('modal');
const toastEl = document.getElementById('toast');
const printEl = document.getElementById('print');

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (m) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
));

const amountFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

const inr = (paise, decimals) => '₹' + (decimals ? decFmt : amountFmt).format((Number(paise) || 0) / 100);
const qtyFmt = (q) => decFmt.format(Number(q) || 0);
const unitOf = (unit) => UNIT_LABEL[unit] || 'किलो';
const phoneFmt = (p) => (p && p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p || '');

function dateTxt(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
}
function timeTxt(ts) {
  return new Date(ts).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
}
function relTxt(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'अभी';
  if (min < 60) return min + ' मिनट पहले';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' घंटे पहले';
  const days = Math.floor(hr / 24);
  return days === 1 ? 'कल' : days + ' दिन पहले';
}
function rangeLabel(range) {
  return (RANGES.find((r) => r.id === range) || RANGES[0]).label;
}
function todayTxt() {
  return new Date().toLocaleDateString('hi-IN', { weekday: 'short', day: 'numeric', month: 'long' });
}

/* --------------------------- network + state -------------------------- */

let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

async function api(path, body) {
  let res;
  try {
    res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch (err) {
    toast('इंटरनेट नहीं चल रहा — फिर कोशिश करें');
    return null;
  }

  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    data = {};
  }

  if (res.status === 401) {
    state.data = null;
    closeModal();
    render();
    toast('सत्र खत्म हो गया — फिर लॉगिन करें');
    return null;
  }
  if (!res.ok) {
    toast(data.error || 'कुछ गड़बड़ हुई');
    return null;
  }
  return data;
}

function applyState(snapshot) {
  if (snapshot) {
    state.data = snapshot;
    render();
  }
}

async function loadState(range) {
  const data = await api('/api/state?range=' + encodeURIComponent(range || state.range));
  if (data && data.state) applyState(data.state);
  return data;
}

async function withBusy(el, fn) {
  if (state.busy) return null;
  state.busy = true;
  if (el) el.disabled = true;
  try {
    return await fn();
  } finally {
    state.busy = false;
    if (el && el.isConnected) el.disabled = false;
  }
}

/* ------------------------------- icons -------------------------------- */

function logoMark(size) {
  const s = size || 44;
  return `<div class="logo-mark" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.48)}px;border-radius:${Math.round(s * 0.3)}px">च</div>`;
}

function serviceCards(target) {
  const d = state.data;
  const chosen = target === 'job' ? state.job.serviceId : state.tokenForm.serviceId;
  return d.services.map((s) => `
    <button type="button" class="svc-card${chosen === s.id ? ' is-on' : ''}"
      data-act="pick-svc" data-target="${target}" data-id="${s.id}">
      <strong>${esc(s.name)}</strong>
      <span>${inr(s.ratePaise, true)} / ${unitOf(s.unit)}</span>
    </button>`).join('');
}

function emptyBlock(title, sub) {
  return `<div class="empty"><div class="empty-mark">◌</div><div class="strong">${esc(title)}</div><div>${esc(sub)}</div></div>`;
}

/* -------------------------------- auth -------------------------------- */

function viewAuth() {
  const isLogin = state.auth.mode === 'login';
  return `
  <div class="auth">
    <aside class="auth-brand">
      <div class="brand-lock">
        ${logoMark(44)}
        <div>
          <div class="brand-name">चक्की बुक</div>
          <div class="brand-tag">हर दुकान का अपना हिसाब</div>
        </div>
      </div>

      <div class="auth-hero">
        <span class="auth-kicker">● टोकन · हिसाब · उधार</span>
        <h1 class="auth-hero-title">चक्की, मसाला और तेल — सबका हिसाब एक जगह।</h1>
        <p class="auth-hero-sub">लाइन में किसका नंबर है, किसने कितना दिया और किसका कितना बाकी — सब मोबाइल पर, बिना कॉपी-पेंसिल।</p>
        <ul class="feature-list">
          <li><span class="fi">✓</span><span>टोकन बोर्ड — बड़ा नंबर, साफ़ लाइन</span></li>
          <li><span class="fi">✓</span><span>प्रति किलो, लीटर या नग — अपनी दरें खुद तय करें</span></li>
          <li><span class="fi">✓</span><span>हर ग्राहक का उधार और भुगतान का पूरा रिकॉर्ड</span></li>
          <li><span class="fi">✓</span><span>रसीद प्रिंट करें या WhatsApp पर भेजें</span></li>
        </ul>
      </div>

      <div class="auth-proof">
        <div><b>हर दुकान अलग</b>अपना खाता, अपना डेटा</div>
        <div><b>सुरक्षित</b>पासवर्ड हैश में सेव</div>
        <div><b>कहीं भी</b>मोबाइल या कंप्यूटर</div>
      </div>
    </aside>

    <main class="auth-panel">
      <div class="auth-card">
        <h1>${isLogin ? 'वापसी पर स्वागत है' : 'अपनी दुकान जोड़ें'}</h1>
        <p class="muted">${isLogin ? 'मोबाइल नंबर और पासवर्ड से लॉगिन करें।' : 'एक मिनट में खाता बनाएँ और हिसाब शुरू करें।'}</p>

        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tab${isLogin ? ' is-on' : ''}" data-act="auth-mode" data-mode="login" role="tab">लॉगिन</button>
          <button type="button" class="auth-tab${isLogin ? '' : ' is-on'}" data-act="auth-mode" data-mode="signup" role="tab">नया खाता</button>
        </div>

        <div id="auth-error" class="auth-error"${state.auth.error ? '' : ' hidden'}>${esc(state.auth.error)}</div>

        <form data-form="auth" novalidate>
          ${isLogin ? '' : `
          <div class="field">
            <label for="a-shop">दुकान का नाम</label>
            <input id="a-shop" name="shopName" maxlength="60" placeholder="जैसे: शर्मा आटा चक्की" autocomplete="organization">
          </div>`}
          <div class="field">
            <label for="a-phone">मोबाइल नंबर</label>
            <input id="a-phone" name="phone" type="tel" inputmode="numeric" maxlength="10" placeholder="10 अंकों का नंबर" autocomplete="tel">
          </div>
          <div class="field">
            <label for="a-pass">पासवर्ड</label>
            <input id="a-pass" name="password" type="password" minlength="6" placeholder="${isLogin ? 'अपना पासवर्ड' : 'कम से कम 6 अक्षर'}" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
          </div>
          <button class="btn btn-primary btn-block" type="submit">${isLogin ? 'लॉगिन करें' : 'खाता बनाएँ'}</button>
        </form>

        <p class="auth-alt">${isLogin ? 'पहली बार आ रहे हैं?' : 'पहले से खाता है?'}
          <button class="link-btn" data-act="auth-mode" data-mode="${isLogin ? 'signup' : 'login'}">${isLogin ? 'नया खाता बनाएँ' : 'लॉगिन करें'}</button>
        </p>
        <p class="auth-note">🔒 हर दुकान का हिसाब अलग रहता है। पासवर्ड हैश करके सेव होता है, किसी को दिखता नहीं। पासवर्ड भूल जाएँ तो नया खाता बनाकर शुरू करना होगा।</p>
      </div>
    </main>
  </div>`;
}

function showAuthError(msg) {
  state.auth.error = msg;
  const box = document.getElementById('auth-error');
  if (box) {
    box.textContent = msg;
    box.hidden = false;
  }
}

/* ------------------------------ app shell ----------------------------- */

function tabbar() {
  const items = NAV.filter((n) => n.id !== 'settings');
  return `
  <nav class="tabbar">
    ${items.map((n) => `
      <button type="button" data-act="goto" data-view="${n.id}" class="${state.view === n.id ? 'is-on' : ''}">
        ${ICONS[n.icon]}<span>${n.label}</span>
      </button>`).join('')}
  </nav>`;
}

function topbar() {
  const d = state.data;
  return `
  <header class="topbar">
    <div class="mobile-brand">${logoMark(34)}</div>
    <div>
      <div class="topbar-title">${TITLES[state.view] || 'होम'}</div>
      <div class="topbar-sub">${esc(d.business.name)}</div>
    </div>
    <div class="topbar-spacer"></div>
    <span class="pill-date">${todayTxt()}</span>
    <div class="topbar-cta">
      <button class="btn btn-primary btn-sm" data-act="goto" data-view="job">+ नया काम</button>
      <button class="icon-btn" data-act="goto" data-view="settings" aria-label="सेटिंग">${ICONS.sliders}</button>
    </div>
  </header>`;
}

function viewShell(content) {
  const d = state.data;
  const waiting = d.tokens.waiting.length;
  return `
  <div class="shell">
    <aside class="side">
      <div class="brand-lock">
        ${logoMark(40)}
        <div>
          <div class="brand-name ellipsis" style="max-width:150px">${esc(d.business.name)}</div>
          <div class="brand-tag">चक्की बुक</div>
        </div>
      </div>
      <nav class="nav">
        ${NAV.map((n) => `
          <button type="button" class="nav-item${state.view === n.id ? ' is-on' : ''}" data-act="goto" data-view="${n.id}">
            ${ICONS[n.icon]}<span>${n.label}</span>
            ${n.id === 'token' && waiting ? `<span class="nav-badge">${waiting}</span>` : ''}
          </button>`).join('')}
      </nav>
      <div class="side-foot">
        <div class="who">
          <div class="avatar small">${esc(d.business.name.trim().charAt(0) || 'द')}</div>
          <div class="grow">
            <div class="who-name ellipsis">${esc(d.business.name)}</div>
            <div class="who-sub">${phoneFmt(d.business.phone)}</div>
          </div>
        </div>
        <button type="button" class="side-logout" data-act="logout">लॉगआउट</button>
      </div>
    </aside>

    <div class="main">
      ${topbar()}
      <main class="page">${content}</main>
    </div>

    ${tabbar()}
  </div>`;
}

/* ------------------------------- pieces ------------------------------- */

function tokenCard() {
  const t = state.data.tokens;
  const serving = t.serving;
  return `
  <section class="token-card${serving ? '' : ' is-idle'}">
    <div>
      <div class="token-eyebrow">${serving ? 'अभी चल रहा टोकन' : 'टोकन बोर्ड'}</div>
      <div class="token-no${serving ? '' : ' is-empty'}">${serving ? serving.no : '—'}</div>
      <div class="token-who">${serving ? esc(serving.name) : 'अभी कोई टोकन नहीं चल रहा'}</div>
      <div class="token-stats">
        <div><b>${t.waiting.length}</b>लाइन में</div>
        <div><b>${t.done}</b>पूरे हुए</div>
        <div><b>${t.nextNo}</b>अगला नंबर</div>
      </div>
    </div>
    <div class="token-actions">
      ${serving ? `<button class="btn btn-gold" data-act="token-done" data-id="${serving.id}">पूरा हुआ ✓</button>` : ''}
      ${t.waiting.length ? `<button class="btn btn-soft" data-act="token-next">अगला बुलाएँ →</button>` : ''}
      <button class="btn btn-ghost" data-act="goto" data-view="token">टोकन बोर्ड</button>
    </div>
  </section>`;
}

function entryRow(e, opts) {
  const options = opts || {};
  const del = options.del
    ? `<button type="button" class="icon-btn" data-act="del-entry" data-id="${e.id}" aria-label="एंट्री हटाएँ">✕</button>`
    : '';

  if (e.kind === 'payment') {
    return `
    <div class="row-item">
      <span class="avatar small pay">₹</span>
      <span class="grow">
        <span class="row-title">भुगतान मिला</span>
        <span class="row-sub">${esc(e.name || 'ग्राहक')} · ${dateTxt(e.at)} · ${timeTxt(e.at)}</span>
      </span>
      <span class="row-amt amt-plus">+${inr(e.amountPaise)}</span>
      ${del}
    </div>`;
  }

  return `
  <div class="row-item">
    <span class="avatar small">${esc((e.name || e.serviceName || 'क').trim().charAt(0))}</span>
    <span class="grow">
      <span class="row-title ellipsis">${e.serviceName ? esc(e.serviceName) : 'काम'} · ${qtyFmt(e.qty)} ${unitOf(e.unit)}</span>
      <span class="row-sub">${esc(e.name || 'बिना नाम')} · ${dateTxt(e.at)}${e.tokenNo ? ' · टोकन #' + e.tokenNo : ''}</span>
    </span>
    <span class="badge ${e.paid ? 'green' : 'amber'}">${e.paid ? 'नगद' : 'उधार'}</span>
    <span class="row-amt">${inr(e.amountPaise)}</span>
    ${del}
  </div>`;
}

function queueRow(t, isServing) {
  return `
  <div class="row-item">
    <span class="queue-no${isServing ? ' serving' : ''}">${t.no}</span>
    <span class="grow">
      <span class="row-title ellipsis">${esc(t.name)}</span>
      <span class="row-sub">${isServing ? 'चल रहा है' : relTxt(t.at)}</span>
    </span>
    ${isServing
      ? `<button class="btn btn-sm btn-soft" data-act="token-done" data-id="${t.id}">पूरा</button>`
      : `<button class="btn btn-sm btn-soft" data-act="token-start" data-id="${t.id}">बुलाएँ</button>`}
    <button type="button" class="icon-btn" data-act="token-cancel" data-id="${t.id}" aria-label="टोकन रद्द करें">✕</button>
  </div>`;
}

/* ------------------------------ dashboard ----------------------------- */

function viewDashboard() {
  const d = state.data;
  const s = d.stats;
  const label = rangeLabel(s.range);
  const recent = d.entries.slice(0, 6);
  const dues = d.customers.filter((c) => c.balancePaise > 0).slice(0, 6);

  return `
  ${tokenCard()}

  <div class="kpis mt-14">
    <div class="kpi accent">
      <div class="kpi-label">${label} की बिक्री</div>
      <div class="kpi-value">${inr(s.salePaise)}</div>
      <div class="kpi-sub">${s.jobs} काम · ${qtyFmt(s.qty)} इकाई</div>
    </div>
    <div class="kpi green">
      <div class="kpi-label">नगद + वसूली</div>
      <div class="kpi-value">${inr(s.cashPaise)}</div>
      <div class="kpi-sub">हाथ में आया</div>
    </div>
    <div class="kpi amber">
      <div class="kpi-label">नया उधार</div>
      <div class="kpi-value">${inr(s.creditPaise)}</div>
      <div class="kpi-sub">${label} में बाकी रखा</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">कुल लेना है</div>
      <div class="kpi-value">${inr(s.outstandingPaise)}</div>
      <div class="kpi-sub">${s.outstandingCount} ग्राहक से</div>
    </div>
  </div>

  <div class="grid-2 mt-14">
    <section class="card">
      <div class="section-head">
        <h2 class="section-title">हाल के काम</h2>
        <button class="section-link" data-act="goto" data-view="reports">पूरी रिपोर्ट</button>
      </div>
      ${recent.length
        ? `<div class="row-list">${recent.map((e) => entryRow(e)).join('')}</div>`
        : emptyBlock('अभी कोई काम दर्ज नहीं', 'पहला काम जोड़ते ही यहाँ दिखेगा।')}
    </section>

    <section class="card">
      <div class="section-head">
        <h2 class="section-title">जिनसे लेना है</h2>
        <button class="section-link" data-act="goto" data-view="customers">सब ग्राहक</button>
      </div>
      ${dues.length
        ? `<div class="row-list">
            ${dues.map((c) => `
              <button type="button" class="row-item" data-act="open-cust" data-id="${c.id}">
                <span class="avatar small">${esc(c.name.trim().charAt(0) || '?')}</span>
                <span class="grow">
                  <span class="row-title ellipsis">${esc(c.name)}</span>
                  <span class="row-sub">${c.phone ? phoneFmt(c.phone) : 'फोन नहीं'}${c.lastAt ? ' · ' + relTxt(c.lastAt) : ''}</span>
                </span>
                <span class="bal due">${inr(c.balancePaise)}</span>
              </button>`).join('')}
          </div>`
        : emptyBlock('किसी का उधार नहीं', 'सबका हिसाब बराबर है।')}
    </section>
  </div>`;
}

/* -------------------------------- tokens ------------------------------ */

function viewTokens() {
  const t = state.data.tokens;
  return `
  ${tokenCard()}

  <div class="page-head mt-20">
    <div>
      <h1 class="page-title">टोकन</h1>
      <p class="page-sub">नंबर हर दिन 1 से शुरू होता है · आज कुल ${t.total} टोकन</p>
    </div>
  </div>

  <div class="grid-2">
    <section class="card">
      <div class="section-head"><h2 class="section-title">नया टोकन दें</h2></div>
      <div class="service-grid">${serviceCards('token')}</div>
      <form data-form="token">
        <div class="field">
          <label for="t-name">ग्राहक का नाम (वैकल्पिक)</label>
          <input id="t-name" name="name" maxlength="60" placeholder="जैसे: रमेश" autocomplete="off">
        </div>
        <button class="btn btn-primary btn-block" type="submit">टोकन #${t.nextNo} जारी करें</button>
      </form>
    </section>

    <section class="card">
      <div class="section-head">
        <h2 class="section-title">आज की लाइन</h2>
        <span class="muted">${t.waiting.length} बाकी</span>
      </div>
      <div class="row-list">
        ${t.serving ? queueRow(t.serving, true) : ''}
        ${t.waiting.map((x) => queueRow(x, false)).join('')}
        ${t.serving || t.waiting.length ? '' : emptyBlock('लाइन खाली है', 'नया टोकन देते ही यहाँ दिखेगा।')}
      </div>
      ${t.done ? `<p class="tiny mt-8">आज ${t.done} टोकन पूरे हुए।</p>` : ''}
    </section>
  </div>`;
}

/* --------------------------------- job -------------------------------- */

function currentService() {
  const d = state.data;
  if (!d) return null;
  return d.services.find((s) => s.id === state.job.serviceId) || d.services[0] || null;
}

function viewJob() {
  const d = state.data;
  const job = state.job;
  const svc = currentService();
  const amountPaise = Math.round((Number(job.qty) || 0) * (Number(job.rate) || 0) * 100);
  const unit = svc ? unitOf(svc.unit) : 'इकाई';

  return `
  <div class="page-head">
    <div>
      <h1 class="page-title">नया काम</h1>
      <p class="page-sub">मात्रा × दर — रकम अपने आप जुड़ जाएगी।</p>
    </div>
  </div>

  <form class="card" data-form="job">
    <div class="section-head"><h2 class="section-title">सेवा चुनें</h2></div>
    <div class="service-grid">${serviceCards('job')}</div>

    <div class="two-col">
      <div class="field">
        <label for="j-name">ग्राहक का नाम</label>
        <input id="j-name" name="name" list="cust-names" maxlength="60" value="${esc(job.name)}"
          placeholder="उधार के लिए ज़रूरी" autocomplete="off">
        <datalist id="cust-names">${d.customers.map((c) => `<option value="${esc(c.name)}"></option>`).join('')}</datalist>
      </div>
      <div class="field">
        <label for="j-phone">फोन (वैकल्पिक)</label>
        <input id="j-phone" name="phone" type="tel" inputmode="numeric" maxlength="10"
          value="${esc(job.phone)}" placeholder="10 अंक">
      </div>
    </div>

    <div class="two-col">
      <div class="field">
        <label for="j-qty" id="j-qty-label">मात्रा (${unit})</label>
        <input id="j-qty" name="qty" type="number" inputmode="decimal" step="0.01" min="0"
          value="${esc(job.qty)}" placeholder="0">
      </div>
      <div class="field">
        <label for="j-rate" id="j-rate-label">दर (₹ प्रति ${unit})</label>
        <input id="j-rate" name="rate" type="number" inputmode="decimal" step="0.5" min="0"
          value="${esc(job.rate)}">
      </div>
    </div>

    <div class="amount-box">
      <span class="amt-label">कुल रकम</span>
      <span class="amt-value" id="amount-preview">${inr(amountPaise)}</span>
    </div>

    <div class="field">
      <label>भुगतान</label>
      <div class="seg">
        <label><input type="radio" name="paid" value="yes"${job.paid ? ' checked' : ''}><span>नगद मिला ✓</span></label>
        <label><input type="radio" name="paid" value="no"${job.paid ? '' : ' checked'}><span>उधार</span></label>
      </div>
    </div>

    <div class="field">
      <label for="j-note">नोट (वैकल्पिक)</label>
      <input id="j-note" name="note" maxlength="120" value="${esc(job.note)}" placeholder="जैसे: बारीक पिसाई">
    </div>

    <label class="check">
      <input type="checkbox" name="withToken"${job.withToken ? ' checked' : ''}> इस काम का टोकन भी जारी करें
    </label>

    <button class="btn btn-primary btn-block" type="submit">हिसाब में जोड़ें</button>
  </form>`;
}

/* ------------------------------ customers ----------------------------- */

function filteredCustomers() {
  const q = state.q.trim().toLowerCase();
  return state.data.customers.filter((c) => {
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || String(c.phone || '').includes(q);
  });
}

function customerRows(list) {
  if (!list.length) {
    return state.data.customers.length
      ? emptyBlock('कोई ग्राहक नहीं मिला', 'नाम या फोन के कुछ अंक लिखकर देखें।')
      : emptyBlock('अभी कोई ग्राहक नहीं', 'नया काम जोड़ते समय नाम लिखें — ग्राहक अपने आप बन जाएगा।');
  }
  return list.map((c) => {
    const cls = c.balancePaise > 0 ? 'due' : (c.balancePaise < 0 ? 'adv' : 'zero');
    const text = c.balancePaise > 0
      ? inr(c.balancePaise) + ' बाकी'
      : (c.balancePaise < 0 ? inr(-c.balancePaise) + ' जमा' : 'बराबर');
    return `
    <button type="button" class="row-item" data-act="open-cust" data-id="${c.id}">
      <span class="avatar">${esc(c.name.trim().charAt(0) || '?')}</span>
      <span class="grow">
        <span class="row-title ellipsis">${esc(c.name)}</span>
        <span class="row-sub">${c.phone ? phoneFmt(c.phone) : 'फोन नहीं'}${c.lastAt ? ' · ' + relTxt(c.lastAt) : ''}</span>
      </span>
      <span class="bal ${cls}">${text}</span>
    </button>`;
  }).join('');
}

function viewCustomers() {
  const d = state.data;
  return `
  <div class="page-head">
    <div>
      <h1 class="page-title">ग्राहक</h1>
      <p class="page-sub">${d.customers.length} ग्राहक · कुल ${inr(d.stats.outstandingPaise)} लेना है</p>
    </div>
    <button class="btn btn-ghost btn-sm" data-act="goto" data-view="job">+ नया काम</button>
  </div>

  <div class="card">
    <input id="cust-search" class="input" placeholder="नाम या फोन से खोजें" value="${esc(state.q)}"
      autocomplete="off" aria-label="ग्राहक खोजें">
    <div id="cust-list" class="row-list mt-8">${customerRows(filteredCustomers())}</div>
  </div>
  <p class="tiny mt-8">किसी ग्राहक पर टैप करें — उधार, भुगतान और रसीद वहीं मिलेगी।</p>`;
}

/* ------------------------------- reports ------------------------------ */

function viewReports() {
  const d = state.data;
  const s = d.stats;
  return `
  <div class="page-head">
    <div>
      <h1 class="page-title">रिपोर्ट</h1>
      <p class="page-sub">${rangeLabel(s.range)} का पूरा हिसाब · ${s.jobs} काम</p>
    </div>
    <a class="btn btn-ghost btn-sm" href="/api/export" download>बैकअप डाउनलोड</a>
  </div>

  <div class="chips">
    ${RANGES.map((r) => `<button type="button" class="chip${s.range === r.id ? ' is-on' : ''}" data-act="range" data-range="${r.id}">${r.label}</button>`).join('')}
  </div>

  <div class="kpis">
    <div class="kpi accent">
      <div class="kpi-label">कुल बिक्री</div>
      <div class="kpi-value">${inr(s.salePaise)}</div>
      <div class="kpi-sub">${s.jobs} काम</div>
    </div>
    <div class="kpi green">
      <div class="kpi-label">नगद + वसूली</div>
      <div class="kpi-value">${inr(s.cashPaise)}</div>
      <div class="kpi-sub">हाथ में आया</div>
    </div>
    <div class="kpi amber">
      <div class="kpi-label">नया उधार</div>
      <div class="kpi-value">${inr(s.creditPaise)}</div>
      <div class="kpi-sub">बाकी रखा</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">कुल लेना है</div>
      <div class="kpi-value">${inr(s.outstandingPaise)}</div>
      <div class="kpi-sub">${s.outstandingCount} ग्राहक से</div>
    </div>
  </div>

  <section class="card mt-14">
    <div class="section-head"><h2 class="section-title">सेवा के हिसाब से</h2></div>
    ${s.byService.length ? `
      <table class="table">
        <thead><tr><th>सेवा</th><th>काम</th><th>मात्रा</th><th class="ta-r">रकम</th></tr></thead>
        <tbody>
          ${s.byService.map((row) => `
            <tr>
              <td>${esc(row.name)}<span class="sub">${inr(row.amountPaise)}</span></td>
              <td>${row.count}</td>
              <td>${qtyFmt(row.qty)} ${unitOf(row.unit)}</td>
              <td class="ta-r">${inr(row.amountPaise)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : emptyBlock('इस अवधि में काम नहीं', 'अवधि बदलकर देखें या नया काम जोड़ें।')}
  </section>

  <section class="card">
    <div class="section-head">
      <h2 class="section-title">एंट्री</h2>
      <span class="muted">${d.entries.length}${d.entries.length >= 400 ? '+' : ''}</span>
    </div>
    ${d.entries.length
      ? `<div class="row-list">${d.entries.slice(0, 120).map((e) => entryRow(e, { del: true })).join('')}</div>`
      : emptyBlock('कोई एंट्री नहीं', 'इस अवधि में कोई काम या भुगतान दर्ज नहीं हुआ।')}
    ${d.entries.length > 120 ? '<p class="tiny mt-8">पुरानी एंट्री बैकअप फ़ाइल में पूरी मिलेंगी।</p>' : ''}
  </section>`;
}

/* ------------------------------- settings ----------------------------- */

function viewSettings() {
  const d = state.data;
  const b = d.business;
  return `
  <div class="page-head">
    <div>
      <h1 class="page-title">सेटिंग</h1>
      <p class="page-sub">दुकान की जानकारी, सेवाएँ और दरें</p>
    </div>
  </div>

  <form class="card" data-form="settings">
    <div class="section-head"><h2 class="section-title">दुकान</h2></div>
    <div class="field">
      <label for="s-name">दुकान का नाम</label>
      <input id="s-name" name="name" maxlength="60" value="${esc(b.name)}">
    </div>
    <div class="two-col">
      <div class="field">
        <label for="s-address">पता (वैकल्पिक)</label>
        <input id="s-address" name="address" maxlength="160" value="${esc(b.address)}" placeholder="गाँव / मोहल्ला">
      </div>
      <div class="field">
        <label for="s-upi">UPI आईडी (वैकल्पिक)</label>
        <input id="s-upi" name="upi" maxlength="60" value="${esc(b.upi)}" placeholder="name@bank">
      </div>
    </div>
    <div class="field">
      <label for="s-note">रसीद पर संदेश (वैकल्पिक)</label>
      <input id="s-note" name="note" maxlength="120" value="${esc(b.note)}" placeholder="जैसे: धन्यवाद — दोबारा आइए">
    </div>
    <button class="btn btn-primary" type="submit">सेव करें</button>
  </form>

  <section class="card">
    <div class="section-head">
      <h2 class="section-title">सेवाएँ और दरें</h2>
      <span class="muted">${d.services.length} चालू</span>
    </div>
    <div class="row-list">
      ${d.services.map((s) => `
        <form class="row-item" data-form="service" style="align-items:flex-start;gap:10px;flex-wrap:wrap">
          <input type="hidden" name="id" value="${s.id}">
          <div style="flex:1 1 160px;min-width:140px">
            <input class="input" name="name" maxlength="40" value="${esc(s.name)}" aria-label="सेवा का नाम" style="padding:9px 11px">
            <div class="tiny" style="margin-top:4px">${inr(s.ratePaise, true)} / ${unitOf(s.unit)}</div>
          </div>
          <select class="input" name="unit" aria-label="इकाई" style="width:92px;padding:9px 8px;flex:0 0 auto">
            ${UNITS.map((u) => `<option value="${u.id}"${s.unit === u.id ? ' selected' : ''}>${u.label}</option>`).join('')}
          </select>
          <input class="input" name="rate" type="number" step="0.5" min="0" inputmode="decimal"
            value="${(s.ratePaise / 100).toFixed(s.ratePaise % 100 ? 2 : 0)}" aria-label="दर प्रति इकाई"
            style="width:92px;padding:9px 10px;flex:0 0 auto">
          <button class="btn btn-sm btn-soft" type="submit">सेव</button>
          <button class="btn btn-sm btn-ghost" type="button" data-act="del-service" data-id="${s.id}" aria-label="सेवा हटाएँ">हटाएँ</button>
        </form>`).join('')}
    </div>

    <form data-form="service" class="mt-14" style="border-top:1px solid var(--line);padding-top:14px">
      <div class="section-head"><h3 class="section-title" style="font-size:13.5px">नई सेवा जोड़ें</h3></div>
      <div class="two-col">
        <div class="field">
          <label for="ns-name">सेवा का नाम</label>
          <input id="ns-name" name="name" maxlength="40" placeholder="जैसे: दाल पिसाई">
        </div>
        <div class="field">
          <label for="ns-rate">दर (₹ प्रति इकाई)</label>
          <input id="ns-rate" name="rate" type="number" step="0.5" min="0" inputmode="decimal" placeholder="0">
        </div>
      </div>
      <div class="field">
        <label for="ns-unit">इकाई</label>
        <select id="ns-unit" name="unit">
          ${UNITS.map((u) => `<option value="${u.id}">${u.label}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-soft" type="submit">सेवा जोड़ें</button>
    </form>
  </section>

  <section class="card">
    <div class="section-head"><h2 class="section-title">बैकअप</h2></div>
    <p class="muted">आपका पूरा हिसाब सर्वर पर आपके खाते से बँधा है। सुरक्षा के लिए महीने में एक बार फ़ाइल डाउनलोड कर लें।</p>
    <div class="btn-row mt-8">
      <a class="btn btn-ghost" href="/api/export" download>बैकअप डाउनलोड</a>
    </div>
  </section>

  <section class="card">
    <div class="section-head"><h2 class="section-title">खाता</h2></div>
    <div class="row-list">
      <div class="row-item">
        <span class="grow"><span class="row-title">${esc(b.name)}</span><span class="row-sub">मोबाइल · ${phoneFmt(b.phone)}</span></span>
        <span class="badge green">सक्रिय</span>
      </div>
    </div>
    <div class="btn-row mt-14">
      <button class="btn btn-ghost" data-act="logout">लॉगआउट</button>
    </div>
    <p class="tiny mt-14">आपका हिसाब सिर्फ़ आपके मोबाइल नंबर और पासवर्ड वाले खाते से खुलता है। किसी दूसरी दुकान का डेटा आपको नहीं दिखता, और आपका किसी को नहीं।</p>
  </section>`;
}

/* -------------------------------- modal ------------------------------- */

function showModal(html) {
  modalRoot.innerHTML = `<div class="sheet-backdrop"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.classList.add('no-scroll');
}

function closeModal() {
  modalRoot.innerHTML = '';
  document.body.classList.remove('no-scroll');
  state.customer = null;
}

async function openCustomer(id) {
  const data = await api('/api/customer?id=' + encodeURIComponent(id));
  if (!data) return;
  state.customer = data;
  renderCustomerModal();
}

function customerBalance(id) {
  const c = state.data.customers.find((x) => x.id === id);
  return c ? c.balancePaise : 0;
}

function renderCustomerModal() {
  const c = state.customer;
  if (!c) return;
  const balance = customerBalance(c.customer.id);
  const cls = balance > 0 ? 'due' : (balance < 0 ? 'adv' : '');
  const label = balance > 0 ? 'बाकी — लेना है' : (balance < 0 ? 'जमा — एडवांस' : 'हिसाब बराबर');

  showModal(`
    <div class="sheet-head">
      <div>
        <h3>${esc(c.customer.name)}</h3>
        <div class="muted">${c.customer.phone ? phoneFmt(c.customer.phone) : 'फोन नहीं'} · ${c.entries.length} एंट्री</div>
      </div>
      <button class="icon-btn" data-act="close-modal" aria-label="बंद करें">✕</button>
    </div>

    <div class="bal-panel ${cls}">
      <span class="bal-label">${label}</span>
      <span class="bal-val">${inr(Math.abs(balance))}</span>
    </div>

    <form data-form="payment">
      <input type="hidden" name="customerId" value="${c.customer.id}">
      <div class="two-col">
        <div class="field">
          <label for="p-amount">रकम (₹)</label>
          <input id="p-amount" name="amount" type="number" step="0.5" min="0" inputmode="decimal"
            value="${balance > 0 ? (balance / 100) : ''}" placeholder="0">
        </div>
        <div class="field">
          <label for="p-note">नोट (वैकल्पिक)</label>
          <input id="p-note" name="note" maxlength="120" placeholder="जैसे: नगद">
        </div>
      </div>
      <button class="btn btn-primary btn-block" type="submit">भुगतान दर्ज करें</button>
    </form>

    <div class="btn-row mt-14">
      ${balance > 0 ? `<button class="btn btn-ghost btn-sm" data-act="wa-remind" data-id="${c.customer.id}">WhatsApp याद दिलाएँ</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-act="job-for" data-id="${c.customer.id}">नया काम</button>
    </div>

    <div class="section-head mt-20"><h4 class="section-title">पुराना हिसाब</h4></div>
    <div class="row-list">
      ${c.entries.length
        ? c.entries.map((e) => `
          <div class="row-item">
            <span class="avatar small${e.kind === 'payment' ? ' pay' : ''}">${e.kind === 'payment' ? '₹' : esc((e.serviceName || 'क').charAt(0))}</span>
            <span class="grow">
              <span class="row-title ellipsis">${e.kind === 'payment' ? 'भुगतान' : esc(e.serviceName || 'काम') + ' · ' + qtyFmt(e.qty) + ' ' + unitOf(e.unit)}</span>
              <span class="row-sub">${dateTxt(e.at)} · ${timeTxt(e.at)}${e.tokenNo ? ' · #' + e.tokenNo : ''}</span>
            </span>
            <span class="row-amt${e.kind === 'payment' ? ' amt-plus' : ''}">${e.kind === 'payment' ? '+' : ''}${inr(e.amountPaise)}</span>
            <button type="button" class="icon-btn" data-act="print-entry" data-id="${e.id}" aria-label="रसीद">🧾</button>
          </div>`).join('')
        : emptyBlock('कोई एंट्री नहीं', 'इस ग्राहक का पहला काम जोड़ें।')}
    </div>
  `);
}

function showJobDone(data) {
  const { entryId, token, state: snapshot } = data;
  const entry = snapshot.entries.find((e) => e.id === entryId);
  const customer = entry && entry.customerId ? snapshot.customers.find((c) => c.id === entry.customerId) : null;

  showModal(`
    <div class="done-mark">✓</div>
    <h3 style="text-align:center;font-size:18px">हिसाब में जुड़ गया</h3>
    <div class="done-card">
      <div class="done-amount">${inr(entry ? entry.amountPaise : 0)}</div>
      <div class="muted">${entry ? esc(entry.serviceName) + ' · ' + qtyFmt(entry.qty) + ' ' + unitOf(entry.unit) : ''}</div>
      <div class="muted">${entry ? (entry.paid ? 'नगद मिला' : 'उधार') : ''}${customer ? ' · ' + esc(customer.name) : ''}</div>
      ${token ? `<div class="mt-8"><span class="token-chip">टोकन #${token.no}</span></div>` : ''}
      ${customer && customer.balancePaise > 0 ? `<div class="mt-8"><span class="badge amber">बाकी ${inr(customer.balancePaise)}</span></div>` : ''}
    </div>
    <div class="sheet-actions">
      <button type="button" class="btn btn-ghost" data-act="print-entry" data-id="${entryId}">रसीद प्रिंट</button>
      <button type="button" class="btn btn-ghost" data-act="wa-entry" data-id="${entryId}">WhatsApp</button>
    </div>
    <button type="button" class="btn btn-primary btn-block" data-act="close-modal">ठीक है</button>
  `);
}

/* ------------------------------- receipt ------------------------------ */

function findEntry(id) {
  const inState = state.data.entries.find((e) => e.id === id);
  if (inState) return inState;
  if (state.customer) {
    const c = state.customer.entries.find((e) => e.id === id);
    if (c) {
      return {
        ...c,
        name: state.customer.customer.name,
        customerId: state.customer.customer.id,
      };
    }
  }
  return null;
}

function printReceipt(entry) {
  if (!entry) return;
  const b = state.data.business;
  const cust = entry.customerId ? state.data.customers.find((c) => c.id === entry.customerId) : null;
  const balance = cust ? cust.balancePaise : null;
  const isPayment = entry.kind === 'payment';
  const note = b.note || 'धन्यवाद — दोबारा आइए 🙏';

  printEl.innerHTML = `
    <div class="receipt">
      <div class="r-shop">${esc(b.name)}</div>
      ${b.address ? `<div class="r-sub">${esc(b.address)}</div>` : ''}
      <div class="r-sub">${esc(b.phone)}</div>
      <div class="r-line"></div>
      <div class="r-row"><span>दिनांक</span><span>${dateTxt(entry.at)} ${timeTxt(entry.at)}</span></div>
      ${entry.tokenNo ? `<div class="r-row"><span>टोकन</span><span>#${entry.tokenNo}</span></div>` : ''}
      ${cust ? `<div class="r-row"><span>ग्राहक</span><span>${esc(cust.name)}</span></div>` : (entry.name ? `<div class="r-row"><span>ग्राहक</span><span>${esc(entry.name)}</span></div>` : '')}
      <div class="r-line"></div>
      ${isPayment
        ? `<div class="r-row"><span>भुगतान मिला</span><span>${inr(entry.amountPaise)}</span></div>`
        : `<div class="r-row"><span>${esc(entry.serviceName)}</span><span>${qtyFmt(entry.qty)} ${unitOf(entry.unit)} × ${inr(entry.ratePaise, true)}</span></div>
           <div class="r-total r-row"><span>कुल</span><span>${inr(entry.amountPaise)}</span></div>
           <div class="r-row"><span>भुगतान</span><span>${entry.paid ? 'नगद मिला' : 'उधार'}</span></div>`}
      ${balance != null ? `<div class="r-row"><span>अब तक बाकी</span><span>${inr(balance)}</span></div>` : ''}
      ${entry.note ? `<div class="r-row"><span>नोट</span><span>${esc(entry.note)}</span></div>` : ''}
      <div class="r-line"></div>
      ${b.upi ? `<div class="r-sub">UPI: ${esc(b.upi)}</div>` : ''}
      <div class="r-thanks">${esc(note)}</div>
    </div>`;
  window.print();
}

function entryWaText(entry) {
  const b = state.data.business;
  const cust = entry.customerId ? state.data.customers.find((c) => c.id === entry.customerId) : null;
  const lines = [`*${b.name}*`, `${dateTxt(entry.at)} ${timeTxt(entry.at)}`, ''];
  if (cust) lines.push(`ग्राहक: ${cust.name}`);
  if (entry.kind === 'payment') {
    lines.push(`भुगतान मिला: ${inr(entry.amountPaise)}`);
  } else {
    lines.push(`${entry.serviceName}: ${qtyFmt(entry.qty)} ${unitOf(entry.unit)} × ${inr(entry.ratePaise, true)}`);
    lines.push(`कुल: ${inr(entry.amountPaise)}`);
    lines.push(`भुगतान: ${entry.paid ? 'नगद मिला' : 'उधार'}`);
  }
  if (entry.tokenNo) lines.push(`टोकन: #${entry.tokenNo}`);
  if (cust) lines.push(`अब तक बाकी: ${inr(cust.balancePaise)}`);
  if (b.upi) lines.push(`UPI: ${b.upi}`);
  lines.push('', 'धन्यवाद 🙏');
  return lines.join('\n');
}

function openWhatsApp(text, phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const to = digits.length >= 10 ? '91' + digits.slice(-10) : '';
  window.open('https://wa.me/' + to + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
}

/* ----------------------------- interaction ---------------------------- */

function recalcJob() {
  const qty = document.getElementById('j-qty');
  const rate = document.getElementById('j-rate');
  const preview = document.getElementById('amount-preview');
  if (!qty || !rate || !preview) return;
  state.job.qty = qty.value;
  state.job.rate = rate.value;
  const amount = Math.round((Number(qty.value) || 0) * (Number(rate.value) || 0) * 100);
  preview.textContent = inr(amount);
}

function pickService(target, id) {
  const svc = state.data.services.find((s) => s.id === id);
  if (!svc) return;
  if (target === 'job') {
    state.job.serviceId = id;
    state.job.rate = String(svc.ratePaise / 100);
    document.querySelectorAll('[data-act="pick-svc"][data-target="job"]').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.id === id);
    });
    const qtyLabel = document.getElementById('j-qty-label');
    const rateLabel = document.getElementById('j-rate-label');
    const rateInput = document.getElementById('j-rate');
    if (qtyLabel) qtyLabel.textContent = 'मात्रा (' + unitOf(svc.unit) + ')';
    if (rateLabel) rateLabel.textContent = 'दर (₹ प्रति ' + unitOf(svc.unit) + ')';
    if (rateInput) rateInput.value = state.job.rate;
    recalcJob();
  } else {
    state.tokenForm.serviceId = id;
    document.querySelectorAll('[data-act="pick-svc"][data-target="token"]').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.id === id);
    });
  }
}

function goTo(view) {
  state.view = view;
  state.q = '';
  closeModal();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (!state.data) {
    render();
    return;
  }
  if (view === 'reports') {
    loadState(state.range);
    return;
  }
  if (state.data.stats.range !== 'today') {
    loadState('today');
    return;
  }
  render();
}

document.addEventListener('click', async (ev) => {
  const backdrop = ev.target.closest('.sheet-backdrop');
  if (backdrop && ev.target === backdrop) {
    closeModal();
    return;
  }

  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id;

  switch (act) {
    case 'goto':
      goTo(el.dataset.view);
      break;

    case 'auth-mode':
      state.auth.mode = el.dataset.mode === 'signup' ? 'signup' : 'login';
      state.auth.error = '';
      render();
      break;

    case 'pick-svc':
      pickService(el.dataset.target, id);
      break;

    case 'range':
      state.range = el.dataset.range;
      loadState(state.range);
      break;

    case 'token-done':
      await withBusy(el, async () => {
        const data = await api('/api/tokens/status', { id, status: 'done' });
        if (data) {
          applyState(data.state);
          toast('टोकन पूरा हुआ');
        }
      });
      break;

    case 'token-start':
      await withBusy(el, async () => {
        const data = await api('/api/tokens/status', { id, status: 'serving' });
        if (data) {
          applyState(data.state);
          toast('टोकन बुलाया');
        }
      });
      break;

    case 'token-next': {
      const next = state.data.tokens.waiting[0];
      if (!next) return;
      await withBusy(el, async () => {
        const data = await api('/api/tokens/status', { id: next.id, status: 'serving' });
        if (data) {
          applyState(data.state);
          toast('टोकन #' + next.no + ' बुलाया');
        }
      });
      break;
    }

    case 'token-cancel':
      if (!window.confirm('यह टोकन रद्द करें?')) return;
      await withBusy(el, async () => {
        const data = await api('/api/tokens/delete', { id });
        if (data) {
          applyState(data.state);
          toast('टोकन रद्द हुआ');
        }
      });
      break;

    case 'open-cust':
      await openCustomer(id);
      break;

    case 'close-modal':
      closeModal();
      break;

    case 'job-for': {
      const c = state.data.customers.find((x) => x.id === id);
      if (!c) return;
      state.job.name = c.name;
      state.job.phone = c.phone || '';
      state.view = 'job';
      closeModal();
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    }

    case 'print-entry':
      printReceipt(findEntry(id));
      break;

    case 'wa-entry': {
      const entry = findEntry(id);
      if (!entry) return;
      const cust = entry.customerId ? state.data.customers.find((c) => c.id === entry.customerId) : null;
      openWhatsApp(entryWaText(entry), cust ? cust.phone : '');
      break;
    }

    case 'wa-remind': {
      const c = state.data.customers.find((x) => x.id === id);
      if (!c) return;
      const text = `नमस्ते ${c.name} 🙏\n${state.data.business.name} से याद दिला रहे हैं — आपका ${inr(c.balancePaise)} बाकी है। सुविधा हो तो जल्द जमा कर दें। धन्यवाद।`;
      openWhatsApp(text, c.phone);
      break;
    }

    case 'del-entry':
      if (!window.confirm('यह एंट्री हटाएँ? हिसाब बदल जाएगा।')) return;
      await withBusy(el, async () => {
        const data = await api('/api/entries/delete', { id });
        if (data) {
          applyState(data.state);
          toast('एंट्री हट गई');
        }
      });
      break;

    case 'del-service':
      if (!window.confirm('यह सेवा हटाएँ? पुरानी एंट्री सुरक्षित रहेंगी।')) return;
      await withBusy(el, async () => {
        const data = await api('/api/services/delete', { id });
        if (data) {
          applyState(data.state);
          toast('सेवा हट गई');
        }
      });
      break;

    case 'logout':
      await api('/api/logout', {});
      state.data = null;
      state.customer = null;
      state.view = 'dashboard';
      state.auth.mode = 'login';
      state.auth.error = '';
      render();
      toast('लॉगआउट हो गया');
      break;

    default:
      break;
  }
});

document.addEventListener('input', (ev) => {
  const t = ev.target;

  if (t.id === 'cust-search') {
    state.q = t.value;
    const box = document.getElementById('cust-list');
    if (box) box.innerHTML = customerRows(filteredCustomers());
    return;
  }

  if (t.id === 'j-qty' || t.id === 'j-rate') {
    recalcJob();
  }
});

document.addEventListener('submit', async (ev) => {
  const form = ev.target.closest('form[data-form]');
  if (!form) return;
  ev.preventDefault();
  const kind = form.dataset.form;
  const fd = new FormData(form);

  if (kind === 'auth') {
    const mode = state.auth.mode;
    const payload = mode === 'signup'
      ? { shopName: fd.get('shopName'), phone: fd.get('phone'), password: fd.get('password') }
      : { phone: fd.get('phone'), password: fd.get('password') };
    const btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'रुकिए…'; }
    try {
      const res = await fetch(mode === 'signup' ? '/api/signup' : '/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showAuthError(data.error || 'कुछ गड़बड़ हुई');
      } else {
        state.auth.error = '';
        state.view = 'dashboard';
        state.data = data.state;
        render();
        toast(mode === 'signup' ? 'आपकी दुकान जुड़ गई — शुरू करें' : 'स्वागत है');
      }
    } catch (err) {
      showAuthError('इंटरनेट नहीं चल रहा — फिर कोशिश करें');
    } finally {
      if (btn && btn.isConnected) {
        btn.disabled = false;
        btn.textContent = state.auth.mode === 'signup' ? 'खाता बनाएँ' : 'लॉगिन करें';
      }
    }
    return;
  }

  if (kind === 'job') {
    const submitBtn = form.querySelector('[type="submit"]');
    if (state.busy) return;
    state.busy = true;
    if (submitBtn) submitBtn.disabled = true;

    state.job.name = String(fd.get('name') || '').trim();
    state.job.phone = String(fd.get('phone') || '').trim();
    state.job.note = String(fd.get('note') || '').trim();
    state.job.paid = fd.get('paid') !== 'no';
    state.job.withToken = fd.get('withToken') === 'on';

    const data = await api('/api/jobs', {
      serviceId: state.job.serviceId,
      qty: Number(fd.get('qty')),
      rate: Number(fd.get('rate')),
      paid: state.job.paid,
      name: state.job.name,
      phone: state.job.phone,
      note: state.job.note,
      withToken: state.job.withToken,
    });

    state.busy = false;
    if (submitBtn && submitBtn.isConnected) submitBtn.disabled = false;

    if (data && data.state) {
      state.data = data.state;
      state.job.qty = '';
      state.job.name = '';
      state.job.phone = '';
      state.job.note = '';
      state.job.paid = true;
      state.job.withToken = false;
      const svc = currentService();
      state.job.rate = svc ? String(svc.ratePaise / 100) : '';
      render();
      showJobDone(data);
    }
    return;
  }

  if (kind === 'token') {
    await withBusy(form.querySelector('[type="submit"]'), async () => {
      const data = await api('/api/tokens', {
        name: fd.get('name'),
        serviceId: state.tokenForm.serviceId,
      });
      if (data) {
        applyState(data.state);
        toast('टोकन #' + data.token.no + ' जारी हुआ');
      }
    });
    return;
  }

  if (kind === 'payment') {
    const customerId = fd.get('customerId');
    await withBusy(form.querySelector('[type="submit"]'), async () => {
      const data = await api('/api/payments', {
        customerId,
        amount: Number(fd.get('amount')),
        note: fd.get('note'),
      });
      if (data) {
        state.data = data.state;
        render();
        await openCustomer(customerId);
        toast('भुगतान दर्ज हुआ');
      }
    });
    return;
  }

  if (kind === 'settings') {
    await withBusy(form.querySelector('[type="submit"]'), async () => {
      const data = await api('/api/settings', {
        name: fd.get('name'),
        address: fd.get('address'),
        upi: fd.get('upi'),
        note: fd.get('note'),
      });
      if (data) {
        applyState(data.state);
        toast('दुकान की जानकारी सेव हो गई');
      }
    });
    return;
  }

  if (kind === 'service') {
    const body = {
      name: fd.get('name'),
      unit: fd.get('unit'),
      rate: Number(fd.get('rate')),
    };
    if (fd.get('id')) body.id = fd.get('id');
    await withBusy(form.querySelector('[type="submit"]'), async () => {
      const data = await api('/api/services', body);
      if (data) {
        applyState(data.state);
        toast('सेवा सेव हो गई');
      }
    });
  }
});

/* -------------------------------- boot -------------------------------- */

function prepare() {
  const d = state.data;
  if (!d) return;

  if (!d.services.some((s) => s.id === state.job.serviceId)) {
    state.job.serviceId = d.services[0] ? d.services[0].id : null;
    state.job.rate = '';
  }
  if (state.job.rate === '') {
    const svc = d.services.find((s) => s.id === state.job.serviceId);
    if (svc) state.job.rate = String(svc.ratePaise / 100);
  }
  if (!d.services.some((s) => s.id === state.tokenForm.serviceId)) {
    state.tokenForm.serviceId = d.services[0] ? d.services[0].id : null;
  }
}

function render() {
  if (!state.data) {
    root.innerHTML = viewAuth();
    return;
  }
  prepare();
  const views = {
    dashboard: viewDashboard,
    token: viewTokens,
    job: viewJob,
    customers: viewCustomers,
    reports: viewReports,
    settings: viewSettings,
  };
  const body = (views[state.view] || viewDashboard)();
  root.innerHTML = viewShell(body);
}

async function boot() {
  try {
    const res = await fetch('/api/state?range=today', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.state) {
        state.data = data.state;
        render();
        return;
      }
    }
  } catch (err) {
    /* ऑफ़लाइन या सर्वर बंद */
  }
  state.data = null;
  render();
}

boot();
