// Settings, Shop Details, Product Rates & Wastage Configuration View
import { state, UNITS } from '../state.js';
import { inr, unitOf, esc, phoneFmt } from '../utils/formatters.js';
import { langSelector } from '../components/shell.js';
import { t } from '../i18n.js';

export function viewSettings() {
  const data = state.data;
  const biz = data.business;

  return `
  <div class="page-head">
    <div>
      <h1 class="page-title">${t('settingsTitle')}</h1>
      <p class="page-sub">Shop profile, language, products, rates & loss/wastage rules</p>
    </div>
  </div>

  <section class="card">
    <div class="section-head"><h2 class="section-title">${t('languageSelect')}</h2></div>
    <div class="mt-8">${langSelector()}</div>
  </section>

  <form class="card" data-form="settings">
    <div class="section-head"><h2 class="section-title">${t('shopDetails')}</h2></div>
    <div class="field">
      <label for="s-name">${t('shopNameLabel')}</label>
      <input id="s-name" name="name" maxlength="60" value="${esc(biz.name)}">
    </div>
    <div class="two-col">
      <div class="field">
        <label for="s-address">${t('addressLabel')}</label>
        <input id="s-address" name="address" maxlength="160" value="${esc(biz.address)}" placeholder="${t('addressPlaceholder')}">
      </div>
      <div class="field">
        <label for="s-upi">${t('upiLabel')}</label>
        <input id="s-upi" name="upi" maxlength="60" value="${esc(biz.upi)}" placeholder="name@bank">
      </div>
    </div>
    <div class="field">
      <label for="s-note">${t('receiptNoteLabel')}</label>
      <input id="s-note" name="note" maxlength="120" value="${esc(biz.note)}" placeholder="${t('receiptNotePlaceholder')}">
    </div>
    <button class="btn btn-primary" type="submit">${t('saveSettingsBtn')}</button>
  </form>

  <section class="card">
    <div class="section-head">
      <h2 class="section-title">${t('servicesAndRates')}</h2>
      <span class="muted">${data.services.length} active</span>
    </div>
    <p class="tiny muted" style="margin-bottom:12px">Configure product name, grinding rate (₹/unit) and wastage loss deduction (g/unit).</p>
    <div class="row-list">
      ${data.services.map((s) => {
        const lossRateG = s.lossRateG || 0;
        return `
        <form class="row-item" data-form="service" style="align-items:flex-start;gap:8px;flex-wrap:wrap">
          <input type="hidden" name="id" value="${s.id}">
          <div style="flex:1 1 140px;min-width:130px">
            <input class="input" name="name" maxlength="40" value="${esc(s.name)}" aria-label="Product Name" style="padding:9px 10px;font-weight:600">
            <div class="tiny" style="margin-top:4px;color:#64748b">${inr(s.ratePaise, true)} / ${unitOf(s.unit)}${lossRateG > 0 ? ' · loss: ' + lossRateG + 'g' : ''}</div>
          </div>
          <select class="input" name="unit" aria-label="Unit" style="width:84px;padding:9px 6px;flex:0 0 auto">
            ${UNITS.map((u) => `<option value="${u.id}"${s.unit === u.id ? ' selected' : ''}>${u.label}</option>`).join('')}
          </select>
          <div style="flex:0 0 auto;display:flex;flex-direction:column;gap:2px">
            <input class="input" name="rate" type="number" step="0.5" min="0" inputmode="decimal"
              value="${(s.ratePaise / 100).toFixed(s.ratePaise % 100 ? 2 : 0)}" title="Rate ₹ per unit" placeholder="Rate ₹"
              style="width:78px;padding:9px 8px">
            <span class="tiny muted" style="font-size:10px">Rate ₹</span>
          </div>
          <div style="flex:0 0 auto;display:flex;flex-direction:column;gap:2px">
            <input class="input" name="lossRateG" type="number" step="1" min="0" inputmode="numeric"
              value="${lossRateG}" title="Loss Deduction g per unit" placeholder="Loss g"
              style="width:78px;padding:9px 8px">
            <span class="tiny muted" style="font-size:10px">Loss g</span>
          </div>
          <div style="display:flex;gap:4px;align-items:center;margin-top:2px">
            <button class="btn btn-sm btn-soft" type="submit">Save</button>
            <button class="btn btn-sm btn-ghost" type="button" data-act="del-service" data-id="${s.id}" aria-label="Delete">✕</button>
          </div>
        </form>`;
      }).join('')}
    </div>

    <form data-form="service" class="mt-14" style="border-top:1px solid var(--line);padding-top:14px">
      <div class="section-head"><h3 class="section-title" style="font-size:13.5px">${t('addServiceTitle')}</h3></div>
      <div class="grid-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">
        <div class="field">
          <label for="ns-name">${t('serviceNameLabel')}</label>
          <input id="ns-name" name="name" maxlength="40" placeholder="e.g. Wheat, Gram, Maize" required>
        </div>
        <div class="field">
          <label for="ns-rate">${t('ratePerUnit')}</label>
          <input id="ns-rate" name="rate" type="number" step="0.5" min="0" inputmode="decimal" placeholder="e.g. 3.0" required>
        </div>
        <div class="field">
          <label for="ns-loss-rate">${t('lossRatePerUnit')}</label>
          <input id="ns-loss-rate" name="lossRateG" type="number" step="1" min="0" inputmode="numeric" placeholder="e.g. 15 (15g/kg)" value="0">
        </div>
      </div>
      <div class="field">
        <label for="ns-unit">${t('unitLabel')}</label>
        <select id="ns-unit" name="unit">
          ${UNITS.map((u) => `<option value="${u.id}">${u.label}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-soft" type="submit">${t('addServiceBtn')}</button>
    </form>
  </section>

  <form class="card" data-form="password">
    <div class="section-head"><h2 class="section-title">${t('changePasswordTitle')}</h2></div>
    <div class="two-col">
      <div class="field">
        <label for="pwd-cur">${t('currentPassword')}</label>
        <input id="pwd-cur" name="currentPassword" type="password" placeholder="${t('currentPassword')}" required>
      </div>
      <div class="field">
        <label for="pwd-new">${t('newPassword')}</label>
        <input id="pwd-new" name="newPassword" type="password" minlength="6" placeholder="Min 6 characters" required>
      </div>
    </div>
    <button class="btn btn-soft" type="submit">${t('changePasswordBtn')}</button>
  </form>

  <section class="card">
    <div class="section-head"><h2 class="section-title">${t('backupTitle')}</h2></div>
    <p class="muted">All your business ledger entries are stored securely in your private tenant account.</p>
    <div class="btn-row mt-8">
      <a class="btn btn-ghost" href="/api/export" download>${t('downloadBackup')}</a>
    </div>
  </section>

  <section class="card">
    <div class="section-head"><h2 class="section-title">Account</h2></div>
    <div class="row-list">
      <div class="row-item">
        <span class="grow"><span class="row-title">${esc(biz.name)}</span><span class="row-sub">Mobile · ${phoneFmt(biz.phone)}</span></span>
        <span class="badge green">Active</span>
      </div>
    </div>
    <div class="btn-row mt-14">
      <button class="btn btn-ghost" data-act="logout">${t('logoutBtn')}</button>
    </div>
  </section>`;
}
