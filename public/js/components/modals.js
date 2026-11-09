// Modal Dialog Components
import { state, modalRoot } from '../state.js';
import { esc, inr, qtyFmt, unitOf, dateTxt, timeTxt, emptyBlock, phoneFmt } from '../utils/formatters.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

export function showModal(html) {
  modalRoot.innerHTML = `<div class="sheet-backdrop"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.classList.add('no-scroll');
}

export function closeModal() {
  modalRoot.innerHTML = '';
  document.body.classList.remove('no-scroll');
  state.customer = null;
}

export function customerBalance(id) {
  const customer = state.data.customers.find((c) => c.id === id);
  return customer ? customer.balancePaise : 0;
}

export async function openCustomer(id) {
  const data = await api('/api/customer?id=' + encodeURIComponent(id));
  if (!data) return;
  state.customer = data;
  renderCustomerModal();
}

export function renderCustomerModal() {
  const current = state.customer;
  if (!current) return;
  const balance = customerBalance(current.customer.id);
  const cls = balance > 0 ? 'due' : (balance < 0 ? 'adv' : '');
  const label = balance > 0 ? t('dueTitle') : (balance < 0 ? t('advTitle') : t('settledTitle'));

  showModal(`
    <div class="sheet-head">
      <div>
        <h3>${esc(current.customer.name)}${current.customer.village ? ` <span class="tiny-chip">${esc(current.customer.village)}</span>` : ''}</h3>
        <div class="muted">${current.customer.phone ? phoneFmt(current.customer.phone) : '—'} · ${current.entries.length} entries</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="btn btn-sm btn-ghost" data-act="edit-cust" data-id="${current.customer.id}">${t('editCustomer')}</button>
        ${balance === 0 ? `<button class="btn btn-sm btn-ghost" data-act="del-cust" data-id="${current.customer.id}" style="color:var(--red)">${t('deleteCustomer')}</button>` : ''}
        <button class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
      </div>
    </div>

    <div class="bal-panel ${cls}">
      <span class="bal-label">${label}</span>
      <span class="bal-val">${inr(Math.abs(balance))}</span>
    </div>

    <form data-form="payment">
      <input type="hidden" name="customerId" value="${current.customer.id}">
      <div class="two-col">
        <div class="field">
          <label for="p-amount">${t('amountRs')}</label>
          <input id="p-amount" name="amount" type="number" step="0.5" min="0" inputmode="decimal"
            value="${balance > 0 ? (balance / 100) : ''}" placeholder="0.00">
        </div>
        <div class="field">
          <label for="p-note">${t('noteLabel')}</label>
          <input id="p-note" name="note" maxlength="120" placeholder="e.g. Cash / UPI">
        </div>
      </div>
      <button class="btn btn-primary btn-block" type="submit">${t('recordPaymentBtn')}</button>
    </form>

    <div class="btn-row mt-14">
      ${balance > 0 ? `<button class="btn btn-ghost btn-sm" data-act="wa-remind" data-id="${current.customer.id}">${t('remindWhatsApp')}</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-act="job-for-cust" data-id="${current.customer.id}">${t('jobForCustomer')}</button>
    </div>

    <div class="section-head mt-20"><h4 class="section-title">${t('oldLedger')}</h4></div>
    <div class="row-list">
      ${current.entries.length
        ? current.entries.map((e) => {
            const lossG = e.lossG || e.katotiG || 0;
            const netWeight = e.netWeight != null ? e.netWeight : e.netQty;
            const hasLoss = e.kind !== 'payment' && (lossG > 0 || netWeight != null);
            return `
            <div class="row-item">
              <span class="avatar small${e.kind === 'payment' ? ' pay' : ''}">${e.kind === 'payment' ? '₹' : esc((e.serviceName || 'C').charAt(0))}</span>
              <span class="grow">
                <span class="row-title ellipsis">${e.kind === 'payment' ? 'Payment' : esc(e.serviceName || 'Order') + ' · ' + qtyFmt(e.qty) + ' ' + unitOf(e.unit)}</span>
                <span class="row-sub">
                  ${dateTxt(e.at)} · ${timeTxt(e.at)}${e.tokenNo ? ' · #' + e.tokenNo : ''}
                  ${hasLoss ? ` · <span style="color:#ea580c">-${lossG}g</span> · <span style="color:#16a34a">${qtyFmt(netWeight)} ${unitOf(e.unit)}</span>` : ''}
                </span>
              </span>
              <span class="row-amt${e.kind === 'payment' ? ' amt-plus' : ''}">${e.kind === 'payment' ? '+' : ''}${inr(e.amountPaise)}</span>
              <button type="button" class="icon-btn" data-act="print-entry" data-id="${e.id}" aria-label="Print Receipt">🧾</button>
              <button type="button" class="icon-btn" data-act="wa-entry" data-id="${e.id}" aria-label="WhatsApp">📱</button>
              <button type="button" class="icon-btn" data-act="del-entry" data-id="${e.id}" aria-label="Delete">✕</button>
            </div>`;
          }).join('')
        : emptyBlock('No entries', 'No previous ledger history found.')}
    </div>
  `);
}

export function openCustomerEditModal(id) {
  const cust = id ? state.data.customers.find((c) => c.id === id) : null;
  const isNew = !cust;
  showModal(`
    <div class="sheet-head">
      <h3>${isNew ? t('addCustomerModalTitle') : t('editCustomerModalTitle')}</h3>
      <button class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
    </div>
    <form data-form="customer">
      <input type="hidden" name="id" value="${cust ? cust.id : ''}">
      <div class="field">
        <label for="ec-name">${t('customerName')} <span class="req">*</span></label>
        <input id="ec-name" name="name" maxlength="60" value="${esc(cust ? cust.name : '')}" placeholder="Customer name" required autocomplete="off">
      </div>
      <div class="field">
        <label for="ec-village">${t('villageLabel')}</label>
        <input id="ec-village" name="village" maxlength="60" value="${esc(cust ? (cust.village || '') : '')}" placeholder="Village / Area" autocomplete="off">
      </div>
      <div class="field">
        <label for="ec-phone">${t('phoneLabel')}</label>
        <input id="ec-phone" name="phone" type="tel" inputmode="numeric" maxlength="10" value="${esc(cust ? (cust.phone || '') : '')}" placeholder="${t('phonePlaceholder')}">
      </div>
      <button class="btn btn-primary btn-block mt-14" type="submit">${isNew ? t('newCustomerBtn') : t('saveCustomerBtn')}</button>
    </form>
  `);
}

export function showJobDone(payload) {
  const { entryId, token, state: snapshot } = payload;
  const entry = snapshot.entries.find((e) => e.id === entryId);
  const customer = entry && entry.customerId ? snapshot.customers.find((c) => c.id === entry.customerId) : null;
  const nameDisplay = (customer ? customer.name : entry?.name) || 'Customer';
  const villageDisplay = (customer ? customer.village : entry?.village) || '';

  const lossG = entry ? (entry.lossG || entry.katotiG || 0) : 0;
  const netWeight = entry ? (entry.netWeight != null ? entry.netWeight : entry.netQty) : null;
  const hasLoss = entry && (lossG > 0 || netWeight != null);

  showModal(`
    <div class="done-mark">✓</div>
    <h3 style="text-align:center;font-size:18px">${t('jobDoneTitle')}</h3>
    <div class="done-card">
      <div class="done-amount">${inr(entry ? entry.amountPaise : 0)}</div>
      <div class="muted" style="font-weight:600">${entry ? esc(entry.serviceName) + ' · ' + qtyFmt(entry.qty) + ' ' + unitOf(entry.unit) : ''}</div>
      ${hasLoss ? `
      <div style="margin:8px 0;padding:6px 10px;background:#f8fafc;border-radius:8px;font-size:12px;display:flex;justify-content:space-around">
        <span style="color:#ea580c">Loss: -${lossG}g</span>
        <span style="color:#16a34a;font-weight:700">Output: ${qtyFmt(netWeight)} ${unitOf(entry.unit)}</span>
      </div>` : ''}
      <div class="muted">${entry ? (entry.paid ? t('cashPaid') : t('creditDue')) : ''} · ${esc(nameDisplay)}${villageDisplay ? ' (' + esc(villageDisplay) + ')' : ''}</div>
      ${token ? `<div class="mt-8"><span class="token-chip">Token #${token.no}</span></div>` : ''}
      ${customer && customer.balancePaise > 0 ? `<div class="mt-8"><span class="badge amber">Total Due ${inr(customer.balancePaise)}</span></div>` : ''}
    </div>
    <div class="sheet-actions">
      <button type="button" class="btn btn-ghost" data-act="print-entry" data-id="${entryId}">${t('printSlip')}</button>
      <button type="button" class="btn btn-ghost" data-act="wa-entry" data-id="${entryId}">${t('shareWhatsApp')}</button>
    </div>
    <button type="button" class="btn btn-primary btn-block" data-act="close-modal">${t('okBtn')}</button>
  `);
}

export function findEntry(id) {
  const inState = state.data.entries.find((e) => e.id === id);
  if (inState) return inState;
  if (state.customer) {
    const found = state.customer.entries.find((e) => e.id === id);
    if (found) {
      return {
        ...found,
        name: state.customer.customer.name,
        village: state.customer.customer.village,
        customerId: state.customer.customer.id,
      };
    }
  }
  return null;
}
