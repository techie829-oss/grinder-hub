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
    <div class="topbar-brand-wrap" style="display:flex;align-items:center;gap:8px;min-width:0;flex:0 1 auto;">
      <div class="mobile-brand" style="flex:0 0 auto;">${logoMark(28)}</div>
      <div class="topbar-info" style="min-width:0;line-height:1.15;">
        <div class="topbar-title" style="font-size:14px;font-weight:800;color:#0f172a;letter-spacing:-0.2px;white-space:nowrap;">${t('appName')}</div>
        <div class="topbar-sub" style="font-size:10.5px;color:#64748b;font-weight:600;white-space:nowrap;">${t(titleKey)}</div>
      </div>
    </div>
    <div class="topbar-spacer"></div>
    <div class="topbar-actions" style="display:flex;align-items:center;gap:4px;flex:0 0 auto;">
      <button type="button" id="sync-indicator" class="sync-badge" data-act="trigger-sync" title="Sync Status" style="border:none;background:none;cursor:pointer;font-size:11.5px;padding:0 2px;margin:0;"></button>
      <button type="button" class="btn btn-sm btn-subtle btn-topbar-refresh" data-act="hard-refresh" title="डेटा ताज़ा करें व फॉर्म रीसेट करें (Hard Refresh)" style="border:1.5px solid #cbd5e1;border-radius:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;background:#fff;width:32px;height:32px;padding:0;flex:0 0 32px;">
        <span class="refresh-icon" style="font-size:13px;display:inline-block;">🔄</span>
      </button>
      <button type="button" class="btn btn-sm btn-subtle btn-topbar-status" data-act="open-status-modal" title="टोकन व ऑर्डर स्टेटस खोजें" style="border:1.5px solid #cbd5e1;border-radius:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;font-size:12px;background:#fff;width:32px;height:32px;padding:0;flex:0 0 32px;">
        <span>🔍</span>
      </button>
      <a href="/tolmaal.apk" download="tolmaal.apk" class="btn btn-sm btn-apk-dl hide-mobile" title="TolMaal Android App (.apk) डाउनलोड करें" style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;font-weight:700;display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:8px;text-decoration:none;font-size:11.5px;white-space:nowrap;margin-right:2px;">
        <span>📲</span> <span>App</span>
      </a>
      <span class="pill-date hide-mobile">${todayTxt()}</span>
      <div class="topbar-lang" style="flex:0 0 auto;">${langSelector()}</div>
      <div class="topbar-cta hide-mobile">
        <button class="btn btn-primary btn-sm" data-act="goto" data-view="job">+ ${t('navJob')}</button>
        <button class="icon-btn" data-act="goto" data-view="settings" aria-label="${t('navSettings')}">${ICONS.sliders}</button>
      </div>
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
