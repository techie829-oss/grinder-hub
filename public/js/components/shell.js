import { state, NAV, TITLES, ICONS } from '../state.js';
import { esc, logoMark, todayTxt } from '../utils/formatters.js';
import { LANGUAGES, getLanguage, t } from '../i18n.js';

export function langSelector() {
  const cur = getLanguage();
  return `
    <select class="input lang-select" data-act="change-lang" aria-label="${t('languageSelect')}" style="width:auto;padding:6px 12px;font-size:12.5px;font-weight:650;border-radius:10px;background:#fff;border:1px solid #d5d8e4;box-shadow:0 1px 3px rgba(17,18,37,0.08);cursor:pointer;color:#1e1e2f">
      ${LANGUAGES.map((l) => `<option value="${l.code}"${l.code === cur ? ' selected' : ''}>${l.label}</option>`).join('')}
    </select>`;
}

export function tabbar() {
  const d = state.data;
  const waiting = (d && d.tokens && d.tokens.waiting) ? d.tokens.waiting.length : 0;

  const mobileNav = [
    { id: 'dashboard', labelKey: 'navHome', icon: 'home' },
    { id: 'token', labelKey: 'navToken', icon: 'ticket', badge: waiting },
    { id: 'job', labelKey: 'navJob', icon: 'plus', isHero: true },
    { id: 'customers', labelKey: 'navCustomers', icon: 'users' },
    { id: 'settings', labelKey: 'navSettings', icon: 'sliders' },
  ];

  return `
  <nav class="tabbar" role="navigation" aria-label="मुख्य नेविगेशन">
    ${mobileNav.map((n) => {
      const isOn = state.view === n.id;
      if (n.isHero) {
        return `
        <button type="button" data-act="goto" data-view="${n.id}" class="tab-btn tab-hero${isOn ? ' is-on' : ''}" aria-label="${t(n.labelKey)}">
          <div class="hero-circle">${ICONS[n.icon]}</div>
          <span class="tab-label">${t(n.labelKey)}</span>
        </button>`;
      }
      return `
      <button type="button" data-act="goto" data-view="${n.id}" class="tab-btn${isOn ? ' is-on' : ''}" aria-label="${t(n.labelKey)}">
        <div class="tab-icon-wrap">
          ${ICONS[n.icon]}
          ${n.badge ? `<span class="tab-badge">${n.badge}</span>` : ''}
        </div>
        <span class="tab-label">${t(n.labelKey)}</span>
      </button>`;
    }).join('')}
  </nav>`;
}

export function topbar() {
  const d = state.data;
  const titleKey = TITLES[state.view] || 'navHome';
  return `
  <header class="topbar">
    <div class="mobile-brand" style="flex:0 0 auto;">${logoMark(34)}</div>
    <div class="topbar-info" style="min-width:0;flex:1 1 auto;">
      <div class="topbar-title ellipsis" style="font-size:15px;font-weight:800;color:#0f172a;line-height:1.2;">${esc(d.business.name)}</div>
      <div class="topbar-sub ellipsis" style="font-size:11px;color:#64748b;line-height:1.2;">${t('appName')} · ${t(titleKey)}</div>
    </div>
    <div class="topbar-spacer"></div>
    <button type="button" id="sync-indicator" class="sync-badge" data-act="trigger-sync" title="Sync Status" style="margin-right:2px;border:none;background:none;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:4px"></button>
    <button type="button" class="btn btn-sm btn-subtle" data-act="goto" data-view="reports" title="दैनिक रिपोर्ट" style="border:1.5px solid #cbd5e1;padding:5px 9px;border-radius:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;font-size:12px;margin-right:4px;background:#fff;flex:0 0 auto;">
      <span>📊</span> <span>रिपोर्ट</span>
    </button>
    <button type="button" class="btn btn-sm btn-subtle btn-topbar-status" data-act="open-status-modal" title="टोकन व पिसाई स्टेटस देखें" style="border:1.5px solid #cbd5e1;padding:5px 9px;border-radius:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;font-size:12px;margin-right:4px;background:#fff;flex:0 0 auto;">
      <span>🔍</span> <span class="hide-mobile">स्टेटस</span>
    </button>
    <a href="/tolmaal.apk" download="tolmaal.apk" class="btn btn-sm btn-apk-dl hide-mobile" title="TolMaal Android ऐप डाउनलोड करें" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:10px;text-decoration:none;box-shadow:0 2px 8px rgba(16,185,129,0.25);font-size:12px;white-space:nowrap;margin-right:6px;">
      <span>📱</span> <span>TolMaal App (.apk)</span>
    </a>
    <span class="pill-date hide-mobile">${todayTxt()}</span>
    <div class="topbar-lang" style="flex:0 0 auto;">${langSelector()}</div>
    <div class="topbar-cta hide-mobile">
      <button class="btn btn-primary btn-sm" data-act="goto" data-view="job">+ ${t('navJob')}</button>
      <button class="icon-btn" data-act="goto" data-view="settings" aria-label="${t('navSettings')}">${ICONS.sliders}</button>
    </div>
  </header>`;
}

export function viewShell(content) {
  const d = state.data || {};
  const waiting = (d.tokens && d.tokens.waiting) ? d.tokens.waiting.length : 0;
  return `
  <div class="shell">
    <aside class="side">
      <div class="brand-lock">
        ${logoMark(40)}
        <div>
          <div class="brand-name ellipsis" style="max-width:150px">${esc(d.business.name)}</div>
          <div class="brand-tag">${t('appName')}</div>
        </div>
      </div>
      <nav class="nav">
        ${NAV.map((n) => `
          <button type="button" class="nav-item${state.view === n.id ? ' is-on' : ''}" data-act="goto" data-view="${n.id}">
            ${ICONS[n.icon]}<span>${t(n.labelKey)}</span>
            ${n.id === 'token' && waiting ? `<span class="nav-badge">${waiting}</span>` : ''}
          </button>`).join('')}
      </nav>
      <div class="side-foot">
        <div class="who">
          <div class="avatar small">${esc(d.business.name.trim().charAt(0) || 'D')}</div>
          <div class="grow">
            <div class="who-name ellipsis">${esc(d.business.name)}</div>
            <div class="who-sub">${d.business.phone}</div>
          </div>
        </div>
        <button type="button" class="side-logout" data-act="logout">${t('logoutBtn')}</button>
      </div>
    </aside>

    <div class="main">
      ${topbar()}
      <main class="page">${content}</main>
    </div>

    ${tabbar()}
  </div>`;
}
