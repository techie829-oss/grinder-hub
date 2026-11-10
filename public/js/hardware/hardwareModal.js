// Hardware Interface Modal & Viewfinders
// Handles Camera Scale OCR, QR Scanner, Bluetooth Scale, and Voice UI

import { modalRoot, state } from '../state.js';
import { startScaleCamera, stopScaleCamera } from './scaleOcr.js';
import { startQrScanner, stopQrScanner, parseTokenQr } from './qrScanner.js';
import { startVoiceRecognition, stopVoiceRecognition, speakText } from './voiceCommander.js';
import { connectScale, disconnectScale, isScaleConnected, subscribeWeight, isBluetoothSupported } from './scaleBluetooth.js';
import { connectPrinter, isPrinterConnected } from './thermalPrinter.js';
import { t } from '../i18n.js';

export function closeHardwareModal() {
  stopScaleCamera();
  stopQrScanner();
  stopVoiceRecognition();
  modalRoot.classList.remove('open');
  modalRoot.innerHTML = '';
  if (document.body) document.body.classList.remove('no-scroll');
}

// 1. Open Camera Scale OCR Viewfinder
export function openScaleOcrModal(onWeightLocked) {
  if (document.body) document.body.classList.add('no-scroll');
  modalRoot.innerHTML = `
    <div class="sheet-backdrop">
      <div class="sheet hardware-modal" style="max-width:480px;text-align:center;padding:16px">
        <div class="sheet-head" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:1.1rem;display:flex;align-items:center;gap:6px">
            <span>📷</span> <span>${t('scaleOcrTitle')}</span>
          </h3>
          <button type="button" class="icon-btn" id="hw-close-btn" aria-label="Close">✕</button>
        </div>

        <p class="tiny muted" style="margin-bottom:12px">${t('scaleOcrSub')}</p>

        <div class="camera-viewport-box" style="position:relative;width:100%;height:240px;background:#000;border-radius:12px;overflow:hidden">
          <video id="scale-ocr-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
          <canvas id="scale-ocr-canvas" style="display:none"></canvas>

          <!-- Targeting overlay reticle -->
          <div class="reticle-box" style="position:absolute;top:25%;left:15%;right:15%;bottom:25%;border:2px dashed #22c55e;border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,0.5);pointer-events:none;display:flex;align-items:center;justify-content:center">
            <div style="font-size:0.75rem;color:#22c55e;font-weight:700;background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:4px">SCALE DISPLAY HERE</div>
          </div>
        </div>

        <div class="ocr-reading-bar" style="margin:12px 0 8px;padding:10px;background:var(--bg-card);border:2px solid var(--border);border-radius:12px">
          <div class="tiny muted">${t('detectedReadingLabel')}</div>
          <div id="ocr-detected-val" style="font-size:1.8rem;font-weight:800;color:var(--brand);font-family:monospace">${t('alignDisplayPrompt')}</div>
        </div>

        <!-- Manual fallback input & quick weight pills -->
        <div style="margin:8px 0 12px;text-align:left;">
          <label style="font-size:11.5px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">${t('orManualWeightPrompt')}</label>
          <div style="display:flex;gap:6px;margin-bottom:8px;">
            <button type="button" class="btn btn-xs ocr-preset-pill" data-wt="10" style="flex:1;padding:4px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;font-weight:700;">10 kg</button>
            <button type="button" class="btn btn-xs ocr-preset-pill" data-wt="25" style="flex:1;padding:4px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;font-weight:700;">25 kg</button>
            <button type="button" class="btn btn-xs ocr-preset-pill" data-wt="30" style="flex:1;padding:4px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;font-weight:700;">30 kg</button>
            <button type="button" class="btn btn-xs ocr-preset-pill" data-wt="50" style="flex:1;padding:4px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;font-weight:700;">50 kg</button>
          </div>
          <input type="number" step="any" min="0" id="ocr-manual-input" placeholder="0.00" style="width:100%;font-size:20px;font-weight:900;text-align:center;padding:8px;border:2px solid #cbd5e1;border-radius:10px;background:#f8fafc;">
        </div>

        <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button type="button" class="btn btn-ghost" id="hw-cancel-ocr">रद्द करें</button>
          <button type="button" class="btn btn-primary" id="hw-manual-lock">${t('lockReadingBtn')}</button>
        </div>
      </div>
    </div>`;

  modalRoot.classList.add('open');

  const video = document.getElementById('scale-ocr-video');
  const canvas = document.getElementById('scale-ocr-canvas');
  const readingEl = document.getElementById('ocr-detected-val');
  const manualInput = document.getElementById('ocr-manual-input');

  document.getElementById('hw-close-btn').onclick = closeHardwareModal;
  document.getElementById('hw-cancel-ocr').onclick = closeHardwareModal;

  // Preset button clicks
  modalRoot.querySelectorAll('.ocr-preset-pill').forEach((btn) => {
    btn.onclick = () => {
      if (manualInput) manualInput.value = btn.dataset.wt;
      if (readingEl) readingEl.textContent = `${btn.dataset.wt}.00 kg`;
    };
  });

  startScaleCamera(video, canvas, readingEl, (weight) => {
    if (manualInput) manualInput.value = String(weight);
    closeHardwareModal();
    onWeightLocked(weight);
  }).catch((err) => {
    readingEl.textContent = 'कैमरा: ' + err.message;
  });

  document.getElementById('hw-manual-lock').onclick = () => {
    const manualVal = manualInput ? parseFloat(manualInput.value) : NaN;
    const textNum = parseFloat(readingEl.textContent);
    const chosen = (!isNaN(manualVal) && manualVal > 0) ? manualVal : textNum;
    if (!isNaN(chosen) && chosen > 0) {
      closeHardwareModal();
      onWeightLocked(chosen);
    } else {
      alert('कृपया कांटे से वजन स्कैन करें या ऊपर सीधे वजन दर्ज करें।');
    }
  };
}

// 2. Open QR / Barcode Scanner Viewfinder
export function openQrScannerModal(onScanSuccess) {
  if (document.body) document.body.classList.add('no-scroll');
  modalRoot.innerHTML = `
    <div class="sheet-backdrop">
      <div class="sheet hardware-modal" style="max-width:440px;text-align:center;padding:16px">
        <div class="sheet-head" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:1.1rem;display:flex;align-items:center;gap:6px">
            <span>📱</span> <span>${t('qrModalTitle')}</span>
          </h3>
          <button type="button" class="icon-btn" id="hw-close-qr" aria-label="Close">✕</button>
        </div>

        <p class="tiny muted" style="margin-bottom:12px">${t('qrModalSub')}</p>

        <div class="camera-viewport-box" style="position:relative;width:100%;height:260px;background:#000;border-radius:12px;overflow:hidden">
          <video id="qr-scan-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
          <canvas id="qr-scan-canvas" style="display:none"></canvas>

          <div style="position:absolute;top:20%;left:20%;right:20%;bottom:20%;border:2px solid #6366f1;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,0.5);pointer-events:none">
            <div class="scanner-laser" style="position:absolute;left:0;right:0;height:2px;background:#ef4444;box-shadow:0 0 8px #ef4444;animation:scanLaser 2s infinite ease-in-out"></div>
          </div>
        </div>

        <!-- Manual token / phone input fallback -->
        <div style="margin-top:12px;padding:12px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;text-align:left;">
          <label style="font-size:11.5px;font-weight:750;color:#334155;display:block;margin-bottom:6px;">${t('orEnterTokenNumber')}</label>
          <div style="display:flex;gap:6px;">
            <input type="text" id="hw-qr-manual-val" placeholder="उदा. #2 या 9876543210" style="flex:1;padding:8px 10px;font-size:14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;">
            <button type="button" id="hw-qr-manual-btn" class="btn btn-primary" style="padding:8px 14px;font-size:12px;font-weight:750;">${t('searchAndLoadBtn')}</button>
          </div>
        </div>

        <button type="button" class="btn btn-ghost mt-14 btn-block" id="hw-cancel-qr">बंद करें</button>
      </div>
    </div>`;

  modalRoot.classList.add('open');

  const video = document.getElementById('qr-scan-video');
  const canvas = document.getElementById('qr-scan-canvas');
  const manualInput = document.getElementById('hw-qr-manual-val');
  const manualBtn = document.getElementById('hw-qr-manual-btn');

  document.getElementById('hw-close-qr').onclick = closeHardwareModal;
  document.getElementById('hw-cancel-qr').onclick = closeHardwareModal;

  const handleDetected = (rawVal) => {
    closeHardwareModal();
    const parsed = parseTokenQr(rawVal);
    onScanSuccess(parsed, rawVal);
  };

  if (manualBtn && manualInput) {
    manualBtn.onclick = () => {
      const val = manualInput.value.trim();
      if (val) {
        handleDetected(val);
      }
    };
    manualInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const val = manualInput.value.trim();
        if (val) handleDetected(val);
      }
    };
  }

  startQrScanner(video, canvas, (rawVal) => {
    handleDetected(rawVal);
  }).catch((err) => {
    console.warn('QR camera unavailable, manual input active:', err);
  });
}

// 3. Open Bluetooth / Electronic Weighing Scale Modal (कांटा)
export function openScaleConnectModal(onWeightLocked) {
  if (document.body) document.body.classList.add('no-scroll');
  const connected = isScaleConnected();
  const liveWt = (state.scale && state.scale.weight) || 0;

  modalRoot.innerHTML = `
    <div class="sheet-backdrop">
      <div class="sheet hardware-modal" style="max-width:440px;text-align:center;padding:16px">
        <div class="sheet-head" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:1.1rem;display:flex;align-items:center;gap:6px">
            <span>⚖️</span> <span>${t('scaleBtModalTitle')}</span>
          </h3>
          <button type="button" class="icon-btn" id="hw-close-scale" aria-label="Close">✕</button>
        </div>

        <div style="background:#0f172a;color:#22c55e;font-family:monospace;padding:16px;border-radius:14px;margin-bottom:12px;box-shadow:inset 0 2px 8px rgba(0,0,0,0.6);">
          <div id="scale-modal-status-txt" style="font-size:12px;color:#94a3b8;margin-bottom:4px;">
            ${connected ? t('scaleBtConnected') : t('scaleBtNotConnected')}
          </div>
          <div id="scale-modal-live-val" style="font-size:3rem;font-weight:900;letter-spacing:1px;line-height:1;">
            ${liveWt.toFixed(2)} <span style="font-size:1.2rem;color:#94a3b8;">kg</span>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button type="button" class="btn btn-sm btn-ghost" id="hw-scale-tare-btn" style="flex:1;border:1px solid #cbd5e1;padding:8px;font-weight:700;">${t('tareZeroBtn')}</button>
          <button type="button" class="btn btn-sm btn-soft" id="hw-scale-bt-toggle" style="flex:1;border:1.5px solid #6366f1;padding:8px;font-weight:750;color:#4338ca;">
            ${connected ? t('disconnectScaleBtn') : t('searchScaleBtn')}
          </button>
        </div>

        <div style="margin:12px 0 6px;text-align:left;">
          <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">${t('orManualWeightPrompt')}</div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;margin-bottom:10px;">
            <button type="button" class="btn btn-xs scale-preset-btn" data-wt="10" style="padding:6px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;font-weight:750;">10 kg</button>
            <button type="button" class="btn btn-xs scale-preset-btn" data-wt="25" style="padding:6px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;font-weight:750;">25 kg</button>
            <button type="button" class="btn btn-xs scale-preset-btn" data-wt="30" style="padding:6px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;font-weight:750;">30 kg</button>
            <button type="button" class="btn btn-xs scale-preset-btn" data-wt="50" style="padding:6px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;font-weight:750;">50 kg</button>
          </div>
          <input type="number" step="any" min="0" id="scale-manual-val" class="input" placeholder="0.00" value="${liveWt || ''}" style="font-size:22px;font-weight:900;text-align:center;padding:8px;border:2px solid #cbd5e1;border-radius:10px;width:100%;background:#fff;">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
          <button type="button" class="btn btn-ghost" id="hw-cancel-scale">रद्द करें</button>
          <button type="button" class="btn btn-primary" id="hw-lock-scale-btn">${t('lockReadingBtn')}</button>
        </div>
      </div>
    </div>`;

  modalRoot.classList.add('open');

  const liveValEl = document.getElementById('scale-modal-live-val');
  const statusEl = document.getElementById('scale-modal-status-txt');
  const manualInput = document.getElementById('scale-manual-val');
  const toggleBtn = document.getElementById('hw-scale-bt-toggle');

  document.getElementById('hw-close-scale').onclick = closeHardwareModal;
  document.getElementById('hw-cancel-scale').onclick = closeHardwareModal;

  // Preset buttons
  modalRoot.querySelectorAll('.scale-preset-btn').forEach((btn) => {
    btn.onclick = () => {
      if (manualInput) manualInput.value = btn.dataset.wt;
      if (liveValEl) liveValEl.innerHTML = `${btn.dataset.wt}.00 <span style="font-size:1.2rem;color:#94a3b8;">kg</span>`;
    };
  });

  // Zero / Tare button
  document.getElementById('hw-scale-tare-btn').onclick = () => {
    if (state.scale) state.scale.weight = 0;
    if (liveValEl) liveValEl.innerHTML = `0.00 <span style="font-size:1.2rem;color:#94a3b8;">kg</span>`;
    if (manualInput) manualInput.value = '0';
  };

  // Toggle Bluetooth Connection
  toggleBtn.onclick = async () => {
    if (!isBluetoothSupported()) {
      alert('इस फोन / ब्राउज़र में ब्लूटूथ डायरेक्ट सपोर्ट नहीं है। आप ऊपर दिए गए बटनों से या "📷 OCR" से सीधे वजन ले सकते हैं।');
      return;
    }
    if (!isScaleConnected()) {
      try {
        statusEl.textContent = 'कनेक्ट हो रहा है…';
        const name = await connectScale();
        statusEl.textContent = `कांटा जुड़ा: ${name} ✓`;
        toggleBtn.textContent = t('disconnectScaleBtn');
        if (!state.scale) state.scale = {};
        state.scale.connected = true;

        subscribeWeight((wt) => {
          if (state.scale) state.scale.weight = wt;
          if (liveValEl) liveValEl.innerHTML = `${wt.toFixed(2)} <span style="font-size:1.2rem;color:#94a3b8;">kg</span>`;
          if (manualInput) manualInput.value = String(wt);
        });
      } catch (err) {
        statusEl.textContent = 'कांटा नहीं जुड़ा: ' + err.message;
      }
    } else {
      await disconnectScale();
      if (state.scale) state.scale.connected = false;
      statusEl.textContent = t('scaleBtNotConnected');
      toggleBtn.textContent = t('searchScaleBtn');
    }
  };

  document.getElementById('hw-lock-scale-btn').onclick = () => {
    const manualVal = manualInput ? parseFloat(manualInput.value) : NaN;
    const liveVal = (state.scale && state.scale.weight) || 0;
    const finalWt = (!isNaN(manualVal) && manualVal > 0) ? manualVal : liveVal;
    if (!isNaN(finalWt) && finalWt > 0) {
      closeHardwareModal();
      onWeightLocked(finalWt);
    } else {
      alert('कृपया कांटे से वजन लें या ऊपर वजन दर्ज करें।');
    }
  };
}

// 3. Open Voice Hands-Free Order Modal
export function openVoiceOrderModal(onVoiceParsed) {
  if (document.body) document.body.classList.add('no-scroll');
  modalRoot.innerHTML = `
    <div class="sheet-backdrop">
      <div class="sheet hardware-modal" style="max-width:440px;text-align:center;padding:20px">
        <div class="sheet-head" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:1.1rem;display:flex;align-items:center;gap:6px">
            <span>🎙️</span> <span>Voice Hands-Free Order</span>
          </h3>
          <button type="button" class="icon-btn" id="hw-close-voice" aria-label="Close">✕</button>
        </div>

        <div class="voice-mic-wave" style="margin:20px auto;width:90px;height:90px;border-radius:50%;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;position:relative">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem">
            🎙️
          </div>
        </div>

        <div id="voice-status-txt" style="font-weight:700;color:var(--brand);font-size:1.1rem;margin-bottom:8px">Listening… बोलिए</div>
        <p class="tiny muted" style="margin-bottom:16px">उदा: <em>"रमेश रामपुर 20 किलो गेहूं"</em> या <em>"सुरेश जनकपुर 15 किलो मक्का"</em></p>

        <div id="voice-transcript-box" style="min-height:50px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;font-style:italic;margin-bottom:16px">
          …
        </div>

        <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button type="button" class="btn btn-ghost" id="hw-cancel-voice">रद्द करें</button>
          <button type="button" class="btn btn-primary" id="hw-apply-voice" disabled>ऑर्डर भरें</button>
        </div>
      </div>
    </div>`;

  modalRoot.classList.add('open');

  const statusTxt = document.getElementById('voice-status-txt');
  const transBox = document.getElementById('voice-transcript-box');
  const applyBtn = document.getElementById('hw-apply-voice');

  document.getElementById('hw-close-voice').onclick = closeHardwareModal;
  document.getElementById('hw-cancel-voice').onclick = closeHardwareModal;

  let lastParsed = null;

  startVoiceRecognition({
    onStart: () => {
      statusTxt.textContent = 'Listening… बोलिए';
    },
    onTranscript: (t) => {
      transBox.textContent = `"${t}"`;
    },
    onParsed: (parsed, transcript) => {
      lastParsed = parsed;
      statusTxt.textContent = 'Understood ✓';
      applyBtn.disabled = false;

      // Speak feedback
      if (parsed.name && parsed.qty) {
        const grainName = parsed.service ? parsed.service.name : 'अनाज';
        const villageTxt = parsed.village ? ` (${parsed.village})` : '';
        speakText(`${parsed.name}${villageTxt}, ${parsed.qty} किलो ${grainName}`);
      }

      applyBtn.onclick = () => {
        closeHardwareModal();
        onVoiceParsed(parsed);
      };

      // Auto-apply if name and quantity are both present
      if (parsed.name && parsed.qty) {
        setTimeout(() => {
          closeHardwareModal();
          onVoiceParsed(parsed);
        }, 1200);
      }
    },
    onError: (err) => {
      statusTxt.textContent = 'Error: ' + err;
    },
    onEnd: () => {
      if (!lastParsed) {
        statusTxt.textContent = 'Stopped. Tap Mic to try again';
      }
    },
  });
}

// 4. Open Hardware Devices Settings Modal (Bluetooth Scale & Thermal Printer)
export function openHardwareDevicesModal() {
  const isScaleConn = isScaleConnected();
  const isPrintConn = isPrinterConnected();
  if (document.body) document.body.classList.add('no-scroll');

  modalRoot.innerHTML = `
    <div class="sheet-backdrop">
      <div class="sheet hardware-modal" style="max-width:440px;padding:20px">
        <div class="sheet-head" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:1.1rem;display:flex;align-items:center;gap:6px">
            <span>⚙️</span> <span>Connected Machine & Hardware</span>
          </h3>
          <button type="button" class="icon-btn" id="hw-close-dev" aria-label="Close">✕</button>
        </div>

        <div class="card" style="margin-bottom:12px;padding:12px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:700">⚖️ Bluetooth Weighing Scale</div>
              <div class="tiny muted">${isScaleConn ? 'Connected & Streaming' : 'Wireless digital scale (Phoenix, Essae, Eagle, BLE)'}</div>
            </div>
            <button type="button" class="btn btn-sm ${isScaleConn ? 'btn-danger' : 'btn-primary'}" id="hw-btn-scale">
              ${isScaleConn ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>

        <div class="card" style="margin-bottom:16px;padding:12px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:700">🖨️ Bluetooth Thermal Printer</div>
              <div class="tiny muted">${isPrintConn ? 'Connected' : '58mm / 80mm ESC/POS slip printer'}</div>
            </div>
            <button type="button" class="btn btn-sm ${isPrintConn ? 'btn-danger' : 'btn-primary'}" id="hw-btn-printer">
              ${isPrintConn ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>

        <button type="button" class="btn btn-ghost btn-block" id="hw-done-dev">Done</button>
      </div>
    </div>`;

  modalRoot.classList.add('open');

  document.getElementById('hw-close-dev').onclick = closeHardwareModal;
  document.getElementById('hw-done-dev').onclick = closeHardwareModal;

  document.getElementById('hw-btn-scale').onclick = async () => {
    if (isScaleConnected()) {
      await disconnectScale();
      openHardwareDevicesModal();
    } else {
      try {
        const name = await connectScale();
        alert(`Scale connected: ${name}`);
        openHardwareDevicesModal();
      } catch (e) {
        alert('Scale connection failed: ' + e.message);
      }
    }
  };

  document.getElementById('hw-btn-printer').onclick = async () => {
    try {
      const name = await connectPrinter();
      alert(`Printer connected: ${name}`);
      openHardwareDevicesModal();
    } catch (e) {
      alert('Printer connection failed: ' + e.message);
    }
  };
}

