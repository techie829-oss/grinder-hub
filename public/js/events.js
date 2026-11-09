// Centralized DOM Event Listeners & Dispatcher
import { state } from './state.js';
import { api, withBusy, loadState, applyState, toast } from './api.js';
import { inr, unitOf } from './utils/formatters.js';
import { printReceipt } from './utils/print.js';
import { entryWaText, openWhatsApp } from './utils/whatsapp.js';
import { closeModal, openCustomer, openCustomerEditModal, showJobDone, findEntry } from './components/modals.js';
import { customerRows } from './components/rows.js';
import { filteredCustomers } from './views/customerView.js';
import { currentService } from './views/jobView.js';
import { showAuthError } from './views/authView.js';
import { setLanguage, t } from './i18n.js';

export function recalcJob() {
  const qtyEl = document.getElementById('j-qty');
  const rateEl = document.getElementById('j-rate');
  const lossRateEl = document.getElementById('j-loss-rate');
  const amtPreview = document.getElementById('amount-preview');
  const grossPreview = document.getElementById('gross-qty-preview');
  const lossPreview = document.getElementById('loss-total-preview');
  const netPreview = document.getElementById('net-qty-preview');

  if (!qtyEl || !rateEl) return;
  const svc = currentService();
  const unit = svc ? unitOf(svc.unit) : 'kg';

  const grossWeight = Number(qtyEl.value) || 0;
  const rateVal = Number(rateEl.value) || 0;
  const lossRateVal = lossRateEl ? (Number(lossRateEl.value) || 0) : (svc ? Number(svc.lossRateG || svc.katotiG || 0) : 0);

  state.job.qty = qtyEl.value;
  state.job.rate = rateEl.value;
  state.job.lossRateG = lossRateEl ? lossRateEl.value : String(lossRateVal);

  const totalLossG = svc && svc.unit === 'kg' ? Math.round(grossWeight * lossRateVal) : 0;
  const netWeight = svc && svc.unit === 'kg' ? Math.max(0, grossWeight - (totalLossG / 1000)) : grossWeight;
  const amountPaise = Math.round(grossWeight * rateVal * 100);

  state.job.totalLossG = totalLossG;
  state.job.netWeight = netWeight;

  if (amtPreview) amtPreview.textContent = inr(amountPaise);
  if (grossPreview) grossPreview.textContent = grossWeight ? `${grossWeight.toFixed(2)} ${unit}` : `0 ${unit}`;
  if (lossPreview) lossPreview.textContent = totalLossG ? `-${totalLossG} g` : '0 g';
  if (netPreview) netPreview.textContent = netWeight ? `${netWeight.toFixed(3)} ${unit}` : `0 ${unit}`;
}

export function pickService(target, id) {
  const svc = state.data.services.find((s) => s.id === id);
  if (!svc) return;

  if (target === 'job') {
    state.job.serviceId = id;
    state.job.rate = String(svc.ratePaise / 100);
    state.job.lossRateG = String(svc.lossRateG || svc.katotiG || 0);

    document.querySelectorAll('[data-act="pick-svc"][data-target="job"]').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.id === id);
    });

    const qtyLabel = document.getElementById('j-qty-label');
    const rateLabel = document.getElementById('j-rate-label');
    const lossLabel = document.getElementById('j-loss-rate-label');
    const rateInput = document.getElementById('j-rate');
    const lossInput = document.getElementById('j-loss-rate');

    if (qtyLabel) qtyLabel.textContent = t('qtyLabel', { unit: unitOf(svc.unit) });
    if (rateLabel) rateLabel.textContent = t('rateLabel', { unit: unitOf(svc.unit) });
    if (lossLabel) lossLabel.textContent = t('lossRateLabel', { unit: unitOf(svc.unit) });
    if (rateInput) rateInput.value = state.job.rate;
    if (lossInput) lossInput.value = state.job.lossRateG;

    recalcJob();
  } else {
    state.tokenForm.serviceId = id;
    document.querySelectorAll('[data-act="pick-svc"][data-target="token"]').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.id === id);
    });
  }
}

export function goTo(view) {
  state.view = view;
  state.q = '';
  closeModal();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (!state.data) {
    window.__appRender?.();
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
  window.__appRender?.();
}

export function setupEventListeners() {
  // Global click handler
  document.addEventListener('click', async (ev) => {
    const backdrop = ev.target.closest('.sheet-backdrop');
    if (backdrop && ev.target === backdrop) {
      closeModal();
      return;
    }

    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;

    switch (act) {
      case 'goto':
        goTo(el.dataset.view);
        break;

      case 'auth-mode':
        state.auth.mode = el.dataset.mode === 'signup' ? 'signup' : 'login';
        state.auth.error = '';
        window.__appRender?.();
        break;

      case 'range':
        state.range = el.dataset.range;
        await loadState(state.range);
        break;

      case 'pick-svc':
        pickService(el.dataset.target, el.dataset.id);
        break;

      case 'clear-job-token':
        state.job.tokenId = null;
        state.job.tokenNo = null;
        window.__appRender?.();
        break;

      case 'token-done':
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { id: el.dataset.id, status: 'done' });
          if (data) {
            applyState(data.state);
            toast('Token completed ✓');
          }
        });
        break;

      case 'token-start':
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { id: el.dataset.id, status: 'serving' });
          if (data) {
            applyState(data.state);
            toast('Calling token');
          }
        });
        break;

      case 'token-call-next': {
        const next = state.data.tokens.waiting[0];
        if (!next) {
          toast('Queue is empty');
          return;
        }
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { id: next.id, status: 'serving' });
          if (data) {
            applyState(data.state);
            toast(`Calling token #${next.no}`);
          }
        });
        break;
      }

      case 'token-cancel':
        if (!confirm('Cancel this token?')) return;
        await withBusy(el, async () => {
          const data = await api('/api/tokens/delete', { id: el.dataset.id });
          if (data) {
            applyState(data.state);
            toast(t('tokenCancelled'));
          }
        });
        break;

      case 'token-to-job': {
        const tok = state.data.tokens.serving?.id === el.dataset.id
          ? state.data.tokens.serving
          : state.data.tokens.waiting.find((x) => x.id === el.dataset.id);
        if (!tok) return;
        state.job.name = tok.name === 'Customer' || tok.name === 'ग्राहक' ? '' : tok.name;
        state.job.village = tok.village || '';
        state.job.tokenId = tok.id;
        state.job.tokenNo = tok.no;
        if (tok.serviceId) {
          state.job.serviceId = tok.serviceId;
          const svc = state.data.services.find((s) => s.id === tok.serviceId);
          if (svc) {
            state.job.rate = String(svc.ratePaise / 100);
            state.job.lossRateG = String(svc.lossRateG || svc.katotiG || 0);
          }
        }
        if (tok.qty) state.job.qty = String(tok.qty);
        goTo('job');
        break;
      }

      case 'open-cust':
        await openCustomer(el.dataset.id);
        break;

      case 'add-cust-modal':
        openCustomerEditModal();
        break;

      case 'edit-cust-modal':
        openCustomerEditModal(el.dataset.id);
        break;

      case 'del-cust': {
        const id = el.dataset.id;
        const customer = state.data.customers.find((c) => c.id === id);
        if (!customer) return;
        if (customer.balancePaise !== 0) {
          alert('Customer has unsettled due balance. Settle ledger before deleting.');
          return;
        }
        if (!confirm(`Delete customer "${customer.name}${customer.village ? ' (' + customer.village + ')' : ''}"?`)) return;
        await withBusy(el, async () => {
          const data = await api('/api/customers/delete', { id });
          if (data) {
            applyState(data.state);
            closeModal();
            toast('Customer deleted');
          }
        });
        break;
      }

      case 'close-modal':
        closeModal();
        break;

      case 'print-entry': {
        const e = findEntry(el.dataset.id);
        if (e) printReceipt(e);
        break;
      }

      case 'wa-entry': {
        const e = findEntry(el.dataset.id);
        if (e) {
          const customer = e.customerId ? state.data.customers.find((c) => c.id === e.customerId) : null;
          openWhatsApp(entryWaText(e), customer ? customer.phone : '');
        }
        break;
      }

      case 'wa-remind': {
        const c = state.customer;
        if (!c) return;
        const biz = state.data.business;
        const msg = `*${biz.name}*\nHello ${c.name}${c.village ? ' (' + c.village + ')' : ''},\nYour pending due balance is *${inr(c.balancePaise)}*.\n${biz.upi ? 'UPI: ' + biz.upi + '\n' : ''}Thank you! 🙏`;
        openWhatsApp(msg, c.phone);
        break;
      }

      case 'job-for-cust': {
        const c = state.customer;
        if (!c) return;
        state.job.name = c.name;
        state.job.village = c.village || '';
        state.job.phone = c.phone || '';
        goTo('job');
        break;
      }

      case 'cust-filter': {
        state.custFilter = el.dataset.filter;
        document.querySelectorAll('[data-act="cust-filter"]').forEach((b) => {
          b.classList.toggle('is-on', b.dataset.filter === state.custFilter);
        });
        const box = document.getElementById('cust-list');
        if (box) box.innerHTML = customerRows(filteredCustomers());
        break;
      }

      case 'del-entry': {
        if (!confirm('Delete this ledger entry?')) return;
        await withBusy(el, async () => {
          const data = await api('/api/entries/delete', { id: el.dataset.id });
          if (data) {
            applyState(data.state);
            toast('Entry deleted');
          }
        });
        break;
      }

      case 'del-service':
        if (!confirm('Delete this product / service?')) return;
        await withBusy(el, async () => {
          const data = await api('/api/services/delete', { id: el.dataset.id });
          if (data) {
            applyState(data.state);
            toast('Service deleted');
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
        window.__appRender?.();
        toast('Logged out');
        break;

      default:
        break;
    }
  });

  // Global change listener (language selector)
  document.addEventListener('change', (ev) => {
    const tEl = ev.target;
    if (tEl && tEl.dataset.act === 'change-lang') {
      setLanguage(tEl.value);
      window.__appRender?.();
      toast(tEl.value === 'hi' ? 'भाषा बदली गई' : 'Language updated');
    }
  });

  // Global input listener
  document.addEventListener('input', (ev) => {
    const tEl = ev.target;

    if (tEl.id === 'cust-search') {
      state.q = tEl.value;
      const box = document.getElementById('cust-list');
      if (box) box.innerHTML = customerRows(filteredCustomers());
      return;
    }

    if (tEl.id === 'j-qty' || tEl.id === 'j-rate' || tEl.id === 'j-loss-rate') {
      recalcJob();
      return;
    }

    // 2-entity lookup banner in Job Form
    if (tEl.id === 'j-name' || tEl.id === 'j-village') {
      const nameVal = (document.getElementById('j-name')?.value || '').trim().toLowerCase();
      const villageVal = (document.getElementById('j-village')?.value || '').trim().toLowerCase();
      const banner = document.getElementById('cust-balance-banner');
      if (!banner || !state.data) return;

      if (!nameVal) {
        banner.style.display = 'none';
        return;
      }

      const match = state.data.customers.find((c) => {
        const nameMatch = c.name.toLowerCase() === nameVal;
        if (!nameMatch) return false;
        if (villageVal) {
          return (c.village || '').toLowerCase() === villageVal;
        }
        return true;
      });

      if (match) {
        const cls = match.balancePaise > 0 ? 'due' : (match.balancePaise < 0 ? 'adv' : 'zero');
        const text = match.balancePaise > 0
          ? inr(match.balancePaise) + ' ' + t('dueTag')
          : (match.balancePaise < 0 ? inr(-match.balancePaise) + ' ' + t('advTag') : t('settledTag'));
        banner.className = `cust-banner ${cls}`;
        banner.innerHTML = `
          <span><strong>${match.name}${match.village ? ' (' + match.village + ')' : ''}</strong> ledger:</span>
          <strong>${text}</strong>`;
        banner.style.display = '';

        const phoneInput = document.getElementById('j-phone');
        if (phoneInput && !phoneInput.value && match.phone) {
          phoneInput.value = match.phone;
        }
      } else {
        banner.style.display = 'none';
      }
    }
  });

  // Global form submit handler
  document.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('form[data-form]');
    if (!form) return;
    ev.preventDefault();
    const kind = form.dataset.form;
    const fd = new FormData(form);

    if (kind === 'auth') {
      const mode = state.auth.mode;
      const phone = String(fd.get('phone') || '').trim();
      const password = String(fd.get('password') || '');
      const shopName = String(fd.get('shopName') || '').trim();

      const btn = form.querySelector('[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '…';
      }

      try {
        const path = mode === 'signup' ? '/api/signup' : '/api/login';
        const payload = mode === 'signup' ? { phone, password, shopName } : { phone, password };
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'same-origin',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showAuthError(data.error || 'Authentication error');
        } else {
          state.auth.error = '';
          state.view = 'dashboard';
          state.data = data.state;
          window.__appRender?.();
          toast(mode === 'signup' ? 'Welcome! Shop created' : 'Welcome back');
        }
      } catch (err) {
        showAuthError('Connection error. Please try again.');
      } finally {
        if (btn && btn.isConnected) {
          btn.disabled = false;
          btn.textContent = state.auth.mode === 'signup' ? t('signupBtn') : t('loginBtn');
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
      state.job.village = String(fd.get('village') || '').trim();
      state.job.phone = String(fd.get('phone') || '').trim();
      state.job.note = String(fd.get('note') || '').trim();
      state.job.paid = fd.get('paid') !== 'no';
      state.job.withToken = fd.get('withToken') === 'on';

      const grossWeight = Number(fd.get('qty'));
      const rate = Number(fd.get('rate'));
      const lossRateG = Number(fd.get('lossRateG') || 0);
      const totalLossG = Math.round(grossWeight * lossRateG);
      const netWeight = Math.max(0, grossWeight - (totalLossG / 1000));

      const data = await api('/api/jobs', {
        serviceId: state.job.serviceId,
        qty: grossWeight,
        grossWeight,
        rate,
        lossRateG,
        totalLossG,
        lossG: totalLossG,
        netWeight,
        paid: state.job.paid,
        name: state.job.name,
        village: state.job.village,
        phone: state.job.phone,
        note: state.job.note,
        withToken: state.job.withToken,
        tokenId: state.job.tokenId,
        tokenNo: state.job.tokenNo,
      });

      state.busy = false;
      if (submitBtn && submitBtn.isConnected) submitBtn.disabled = false;

      if (data && data.state) {
        state.data = data.state;
        state.job.qty = '';
        state.job.name = '';
        state.job.village = '';
        state.job.phone = '';
        state.job.note = '';
        state.job.paid = true;
        state.job.withToken = false;
        state.job.tokenId = null;
        state.job.tokenNo = null;

        const svc = currentService();
        state.job.rate = svc ? String(svc.ratePaise / 100) : '';
        state.job.lossRateG = svc ? String(svc.lossRateG || svc.katotiG || 0) : '0';
        window.__appRender?.();

        if (data.entryId) {
          showJobDone(data);
        } else {
          toast(t('jobDoneTitle'));
        }
      }
      return;
    }

    if (kind === 'token') {
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const name = String(fd.get('name') || '').trim();
        const village = String(fd.get('village') || '').trim();
        const data = await api('/api/tokens', {
          serviceId: state.tokenForm.serviceId,
          name,
          village,
        });
        if (data) {
          applyState(data.state);
          form.reset();
          toast(`Token #${data.token.no} issued ✓`);
        }
      });
      return;
    }

    if (kind === 'customer') {
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const payload = {
          name: String(fd.get('name') || '').trim(),
          village: String(fd.get('village') || '').trim(),
          phone: String(fd.get('phone') || '').trim(),
        };
        const id = fd.get('id');
        if (id) payload.id = id;
        const data = await api('/api/customers', payload);
        if (data) {
          applyState(data.state);
          closeModal();
          toast('Customer saved ✓');
        }
      });
      return;
    }

    if (kind === 'payment') {
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const data = await api('/api/payments', {
          customerId: fd.get('customerId'),
          amount: Number(fd.get('amount')),
          note: String(fd.get('note') || '').trim(),
        });
        if (data) {
          applyState(data.state);
          closeModal();
          toast('Payment recorded ✓');
        }
      });
      return;
    }

    if (kind === 'password') {
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const data = await api('/api/password', {
          currentPassword: fd.get('currentPassword'),
          newPassword: fd.get('newPassword'),
        });
        if (data) {
          applyState(data.state);
          form.reset();
          toast('Password updated ✓');
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
          toast('Settings saved');
        }
      });
      return;
    }

    if (kind === 'service') {
      const body = {
        name: fd.get('name'),
        unit: fd.get('unit'),
        rate: Number(fd.get('rate')),
        lossRateG: Number(fd.get('lossRateG')) || 0,
      };
      if (fd.get('id')) body.id = fd.get('id');
      await withBusy(form.querySelector('[type="submit"]'), async () => {
        const data = await api('/api/services', body);
        if (data) {
          applyState(data.state);
          toast('Product / Service saved');
        }
      });
    }
  });
}
