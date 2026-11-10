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
  const items = NAV.filter((n) => n.id !== 'settings');
  return `
  <nav class="tabbar">
    ${items.map((n) => `
      <button type="button" data-act="goto" data-view="${n.id}" class="${state.view === n.id ? 'is-on' : ''}">
        ${ICONS[n.icon]}<span>${t(n.labelKey)}</span>
      </button>`).join('')}
  </nav>`;
}

export function topbar() {
  const d = state.data;
  const titleKey = TITLES[state.view] || 'navHome';
  return `
  <header class="topbar">
    <div class="mobile-brand">${logoMark(34)}</div>
    <div>
      <div class="topbar-title">${t(titleKey)}</div>
      <div class="topbar-sub">${esc(d.business.name)}</div>
    </div>
    <div class="topbar-spacer"></div>
    <button type="button" id="sync-indicator" class="sync-badge" data-act="trigger-sync" title="Sync Status" style="margin-right:6px;border:none;background:none;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:4px"></button>
    <a href="/chakkibook.apk" download="chakkibook.apk" class="btn btn-sm btn-apk-dl" title="Android ऐप डाउनलोड करें" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:10px;text-decoration:none;box-shadow:0 2px 8px rgba(16,185,129,0.25);font-size:12px;white-space:nowrap;margin-right:6px;">
      <span>📥</span> <span>APK डाउनलोड</span>
    </a>
    <span class="pill-date">${todayTxt()}</span>
    ${langSelector()}
    <div class="topbar-cta">
      <button class="btn btn-primary btn-sm" data-act="goto" data-view="job">+ ${t('navJob')}</button>
      ${d.business.isSuperAdmin || state.admin.authenticated ? `
        <button class="btn btn-subtle btn-sm" data-act="goto" data-view="admin" title="${t('navSuperAdmin')}" style="color:#b45309;font-weight:700;border:1px solid #fde68a;background:#fffbeb;padding:6px 10px;border-radius:8px;">🛡️ एडमिन</button>
      ` : ''}
      <button class="icon-btn" data-act="goto" data-view="settings" aria-label="${t('navSettings')}">${ICONS.sliders}</button>
    </div>
  </header>`;
}

export function viewShell(content) {
  const d = state.data;
  const waiting = d.tokens.waiting.length;
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
        ${d.business.isSuperAdmin || state.admin.authenticated ? `
          <button type="button" class="nav-item${state.view === 'admin' ? ' is-on' : ''}" data-act="goto" data-view="admin" style="color:#d97706;font-weight:700;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>${t('navSuperAdmin')}</span>
          </button>
        ` : ''}
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
