import { state, NAV, TITLES, ICONS } from '../state.js';
import { esc, logoMark, todayTxt } from '../utils/formatters.js';
import { LANGUAGES, getLanguage, t } from '../i18n.js';

export function langSelector() {
  const cur = getLanguage();
  return `
    <select class="input lang-select" data-act="change-lang" aria-label="${t('languageSelect')}" style="width:auto;padding:5px 10px;font-size:12px;font-weight:600;border-radius:10px;background:#fff">
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
    <span class="pill-date">${todayTxt()}</span>
    ${langSelector()}
    <div class="topbar-cta">
      <button class="btn btn-primary btn-sm" data-act="goto" data-view="job">+ ${t('navJob')}</button>
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
      </nav>
      <div class="side-foot">
        <div class="who">
          <div class="avatar small">${esc(d.business.name.trim().charAt(0) || 'द')}</div>
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

