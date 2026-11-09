// Centralized DOM Event Listeners & Dispatcher with Offline-First Fallback
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
import { enqueueOfflineAction, syncOfflineQueue, saveOfflineSnapshot } from './sync.js';
import {
  openScaleOcrModal,
  openQrScannerModal,
  openVoiceOrderModal,
  openHardwareDevicesModal,
  closeHardwareModal,
} from './hardware/hardwareModal.js';
import { connectScale, disconnectScale, isScaleConnected, subscribeWeight, getLiveWeight } from './hardware/scaleBluetooth.js';
import { printThermalToken, printThermalBill, isPrinterConnected } from './hardware/thermalPrinter.js';
import { sendAataReadyNotification } from './hardware/whatsappNotify.js';

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
  const lossRateVal = lossRateEl ? (Number(lossRateEl.value) || 0) : (svc ? Number(svc.lossRateG || 0) : 0);

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
    state.job.lossRateG = String(svc.lossRateG || 0);

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

      case 'trigger-sync':
        toast('Syncing with server…');
        await syncOfflineQueue();
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

      // --- Hardware & Machine Automation Actions ---
      case 'hw-scale-ocr':
        openScaleOcrModal((lockedWeight) => {
          state.job.qty = String(lockedWeight);
          const qtyInput = document.getElementById('j-qty');
          if (qtyInput) qtyInput.value = state.job.qty;
          recalcJob();
          toast(`Scale reading locked: ${lockedWeight} kg ✓`);
        });
        break;

      case 'hw-scale-bt':
        if (!isScaleConnected()) {
          try {
            const name = await connectScale();
            toast(`Connected: ${name} ✓`);
            const meter = document.getElementById('scale-live-meter');
            const valEl = document.getElementById('scale-live-val');
            const lbl = document.getElementById('hw-bt-label');
            if (meter) meter.style.display = 'flex';
            if (lbl) lbl.textContent = 'Scale ON';

            subscribeWeight((wt, stable) => {
              if (valEl) valEl.textContent = `${wt.toFixed(2)} kg`;
            });
          } catch (err) {
            toast(`Scale error: ${err.message}`);
          }
        } else {
          await disconnectScale();
          const meter = document.getElementById('scale-live-meter');
          const lbl = document.getElementById('hw-bt-label');
          if (meter) meter.style.display = 'none';
          if (lbl) lbl.textContent = 'Scale BT';
          toast('Scale disconnected');
        }
        break;

      case 'hw-lock-scale-wt': {
        const { weight } = getLiveWeight();
        if (weight > 0) {
          state.job.qty = String(weight);
          const qtyInput = document.getElementById('j-qty');
          if (qtyInput) qtyInput.value = state.job.qty;
          recalcJob();
          toast(`Locked weight: ${weight} kg ✓`);
        } else {
          toast('Scale reading is 0.00 kg. Place bag on scale.');
        }
        break;
      }

      case 'hw-voice-mic':
        openVoiceOrderModal((parsed) => {
          if (parsed.name) state.job.name = parsed.name;
          if (parsed.village) state.job.village = parsed.village;
          if (parsed.qty) state.job.qty = String(parsed.qty);
          if (parsed.serviceId) {
            state.job.serviceId = parsed.serviceId;
            const svc = state.data.services.find((s) => s.id === parsed.serviceId);
            if (svc) {
              state.job.rate = String(svc.ratePaise / 100);
              state.job.lossRateG = String(svc.lossRateG || 0);
            }
          }
          window.__appRender?.();
          recalcJob();
          toast(`Voice order: ${parsed.name || ''} ${parsed.qty ? parsed.qty + 'kg' : ''} ✓`);
        });
        break;

      case 'hw-scan-qr':
        openQrScannerModal((parsed) => {
          if (parsed.type === 'token') {
            const tok = state.data.tokens.serving?.no === parsed.tokenNo
              ? state.data.tokens.serving
              : state.data.tokens.waiting.find((t) => t.no === parsed.tokenNo);
            if (tok) {
              state.job.tokenId = tok.id;
              state.job.tokenNo = tok.no;
              state.job.name = tok.name;
              state.job.village = tok.village || '';
              if (tok.serviceId) {
                state.job.serviceId = tok.serviceId;
                const svc = state.data.services.find((s) => s.id === tok.serviceId);
                if (svc) {
                  state.job.rate = String(svc.ratePaise / 100);
                  state.job.lossRateG = String(svc.lossRateG || 0);
                }
              }
              if (tok.grossWeight) state.job.qty = String(tok.grossWeight);
              goTo('job');
              toast(`Loaded Token #${parsed.tokenNo} ✓`);
            } else {
              toast(`Token #${parsed.tokenNo} not in active queue`);
            }
          } else if (parsed.type === 'customer') {
            state.job.name = parsed.name;
            state.job.village = parsed.village;
            goTo('job');
            toast(`Customer: ${parsed.name} (${parsed.village})`);
          } else {
            toast(`Scanned: ${parsed.value}`);
          }
        });
        break;

      case 'token-notify-wa': {
        const tok = state.data.tokens.serving?.id === el.dataset.id
          ? state.data.tokens.serving
          : state.data.tokens.waiting.find((x) => x.id === el.dataset.id);
        if (tok) {
          sendAataReadyNotification(tok);
        }
        break;
      }

      case 'token-print-pos': {
        const tok = state.data.tokens.serving?.id === el.dataset.id
          ? state.data.tokens.serving
          : state.data.tokens.waiting.find((x) => x.id === el.dataset.id);
        if (tok) {
          if (isPrinterConnected()) {
            try {
              await printThermalToken(tok);
              toast('Token slip printed on Bluetooth POS ✓');
            } catch (err) {
              toast('Printer error: ' + err.message);
            }
          } else {
            printReceipt({
              kind: 'token',
              name: tok.name,
              village: tok.village,
              tokenNo: tok.no,
              qty: tok.grossWeight,
              lossG: tok.lossG,
              netWeight: tok.netWeight,
              at: tok.at,
            });
          }
        }
        break;
      }

      case 'open-hw-modal':
        openHardwareDevicesModal();
        break;

      case 'token-done':
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { id: el.dataset.id, status: 'done' });
          if (data && data.offline) {
            enqueueOfflineAction('tokenStatus', { id: el.dataset.id, status: 'done' });
            const tok = state.data.tokens.serving?.id === el.dataset.id
              ? state.data.tokens.serving
              : state.data.tokens.waiting.find((x) => x.id === el.dataset.id);
            if (tok) tok.status = 'done';
            if (state.data.tokens.serving?.id === el.dataset.id) state.data.tokens.serving = null;
            state.data.tokens.done += 1;
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('Token marked done (offline)');
          } else if (data) {
            applyState(data.state);
            toast('Token completed ✓');
          }
        });
        break;

      case 'token-start':
        await withBusy(el, async () => {
          const data = await api('/api/tokens/status', { id: el.dataset.id, status: 'serving' });
          if (data && data.offline) {
            enqueueOfflineAction('tokenStatus', { id: el.dataset.id, status: 'serving' });
            const tok = state.data.tokens.waiting.find((x) => x.id === el.dataset.id);
            if (tok) {
              tok.status = 'serving';
              state.data.tokens.serving = tok;
              state.data.tokens.waiting = state.data.tokens.waiting.filter((x) => x.id !== el.dataset.id);
            }
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('Calling token (offline)');
          } else if (data) {
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
          if (data && data.offline) {
            enqueueOfflineAction('tokenStatus', { id: next.id, status: 'serving' });
            next.status = 'serving';
            state.data.tokens.serving = next;
            state.data.tokens.waiting.shift();
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast(`Calling token #${next.no} (offline)`);
          } else if (data) {
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
          if (data && data.offline) {
            enqueueOfflineAction('tokenDelete', { id: el.dataset.id });
            state.data.tokens.waiting = state.data.tokens.waiting.filter((x) => x.id !== el.dataset.id);
            if (state.data.tokens.serving?.id === el.dataset.id) state.data.tokens.serving = null;
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('Token cancelled (offline)');
          } else if (data) {
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
            state.job.lossRateG = String(svc.lossRateG || 0);
          }
        }
        if (tok.grossWeight) state.job.qty = String(tok.grossWeight);
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
          if (data && data.offline) {
            enqueueOfflineAction('customerDelete', { id });
            state.data.customers = state.data.customers.filter((c) => c.id !== id);
            saveOfflineSnapshot(state.data);
            closeModal();
            window.__appRender?.();
            toast('Customer deleted (offline)');
          } else if (data) {
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

      case 'pos-print-entry': {
        const e = findEntry(el.dataset.id);
        if (e) {
          if (isPrinterConnected()) {
            try {
              await printThermalBill(e);
              toast('Bill printed on Bluetooth POS ✓');
            } catch (err) {
              toast('Printer error: ' + err.message);
            }
          } else {
            printReceipt(e);
          }
        }
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
        const c = state.customer?.customer || state.customer;
        if (!c) return;
        const biz = state.data.business;
        const balance = c.balancePaise || 0;
        const msg = `*${biz.name}*\nHello ${c.name}${c.village ? ' (' + c.village + ')' : ''},\nYour pending due balance is *${inr(balance)}*.\n${biz.upi ? 'UPI: ' + biz.upi + '\n' : ''}Thank you! 🙏`;
        openWhatsApp(msg, c.phone);
        break;
      }

      case 'job-for-cust': {
        const c = state.customer?.customer || state.customer;
        if (!c) return;
        state.job.name = c.name;
        state.job.village = c.village || '';
        state.job.phone = c.phone || '';
        closeModal();
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
          if (data && data.offline) {
            enqueueOfflineAction('entryDelete', { id: el.dataset.id });
            state.data.entries = state.data.entries.filter((x) => x.id !== el.dataset.id);
            saveOfflineSnapshot(state.data);
            window.__appRender?.();
            toast('Entry deleted (offline)');
          } else if (data) {
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
          saveOfflineSnapshot(data.state);
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
      const amountPaise = Math.round(grossWeight * rate * 100);

      const jobPayload = {
        serviceId: state.job.serviceId,
        grossWeight,
        rate,
        lossRateG,
        totalLossG,
        netWeight,
        paid: state.job.paid,
        name: state.job.name,
        village: state.job.village,
        phone: state.job.phone,
        note: state.job.note,
        withToken: state.job.withToken,
        tokenId: state.job.tokenId,
        tokenNo: state.job.tokenNo,
      };

      const data = await api('/api/jobs', jobPayload);
      state.busy = false;
      if (submitBtn && submitBtn.isConnected) submitBtn.disabled = false;

      // Handle offline mode fallback
      if (data && data.offline) {
        const offlineEntryId = 'offline-' + crypto.randomUUID();
        const svc = currentService();
        const now = Date.now();

        enqueueOfflineAction('job', { ...jobPayload, offlineId: offlineEntryId, at: now });

        const newEntry = {
          id: offlineEntryId,
          kind: 'job',
          name: jobPayload.name,
          village: jobPayload.village,
          grossWeight,
          lossG: totalLossG,
          netWeight,
          ratePaise: Math.round(rate * 100),
          amountPaise,
          paid: jobPayload.paid,
          note: jobPayload.note,
          tokenNo: jobPayload.tokenNo,
          serviceName: svc ? svc.name : 'Grinding',
          unit: svc ? svc.unit : 'kg',
          at: now,
        };

        state.data.entries.unshift(newEntry);
        state.data.stats.jobs += 1;
        state.data.stats.grossWeight += grossWeight;
        state.data.stats.lossG += totalLossG;
        state.data.stats.netWeight += netWeight;
        state.data.stats.salePaise += amountPaise;

        if (jobPayload.paid) {
          state.data.stats.cashPaise += amountPaise;
        } else {
          state.data.stats.creditPaise += amountPaise;
          state.data.stats.outstandingPaise += amountPaise;
          // Optimistically update customer balance if present
          const cust = state.data.customers.find(
            (c) => c.name.toLowerCase() === jobPayload.name.toLowerCase() &&
                   (c.village || '').toLowerCase() === (jobPayload.village || '').toLowerCase()
          );
          if (cust) cust.balancePaise += amountPaise;
        }

        saveOfflineSnapshot(state.data);

        // Reset form inputs
        state.job.qty = '';
        state.job.name = '';
        state.job.village = '';
        state.job.phone = '';
        state.job.note = '';
        state.job.paid = true;
        state.job.withToken = false;
        state.job.tokenId = null;
        state.job.tokenNo = null;

        window.__appRender?.();
        showJobDone({ entryId: offlineEntryId, token: null, state: state.data });
        toast('Saved Offline — Will sync automatically');
        return;
      }

      if (data && data.state) {
        state.data = data.state;
        saveOfflineSnapshot(data.state);

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
        state.job.lossRateG = svc ? String(svc.lossRateG || 0) : '0';
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
        const payload = {
          serviceId: state.tokenForm.serviceId,
          name,
          village,
        };

        const data = await api('/api/tokens', payload);
        if (data && data.offline) {
          const nextNo = state.data.tokens.nextNo;
          state.data.tokens.nextNo += 1;
          enqueueOfflineAction('token', { ...payload, no: nextNo, at: Date.now() });

          state.data.tokens.waiting.push({
            id: 'offline-' + crypto.randomUUID(),
            no: nextNo,
            name: name || 'Customer',
            village: village || '',
            serviceId: payload.serviceId,
            grossWeight: 0,
            lossG: 0,
            netWeight: 0,
            status: 'waiting',
            at: Date.now(),
          });

          saveOfflineSnapshot(state.data);
          form.reset();
          window.__appRender?.();
          toast(`Token #${nextNo} issued (offline)`);
          return;
        }

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
        if (data && data.offline) {
          enqueueOfflineAction('customer', payload);
          if (!id) {
            state.data.customers.push({
              id: 'offline-' + crypto.randomUUID(),
              name: payload.name,
              village: payload.village,
              phone: payload.phone,
              balancePaise: 0,
              lastAt: Date.now(),
            });
          }
          saveOfflineSnapshot(state.data);
          closeModal();
          window.__appRender?.();
          toast('Customer saved (offline)');
          return;
        }

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
        const payload = {
          customerId: fd.get('customerId'),
          amount: Number(fd.get('amount')),
          note: String(fd.get('note') || '').trim(),
        };

        const data = await api('/api/payments', payload);
        if (data && data.offline) {
          const offlineId = 'offline-' + crypto.randomUUID();
          const amountPaise = Math.round(payload.amount * 100);
          const cust = state.data.customers.find((c) => c.id === payload.customerId);
          const now = Date.now();

          enqueueOfflineAction('payment', { ...payload, offlineId, at: now });

          state.data.entries.unshift({
            id: offlineId,
            kind: 'payment',
            customerId: payload.customerId,
            name: cust ? cust.name : 'Customer',
            village: cust ? cust.village : '',
            grossWeight: 0,
            lossG: 0,
            netWeight: 0,
            amountPaise,
            paid: true,
            note: payload.note,
            at: now,
          });

          if (cust) cust.balancePaise -= amountPaise;
          state.data.stats.cashPaise += amountPaise;
          state.data.stats.outstandingPaise -= amountPaise;

          saveOfflineSnapshot(state.data);
          closeModal();
          window.__appRender?.();
          toast('Payment recorded (offline)');
          return;
        }

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
