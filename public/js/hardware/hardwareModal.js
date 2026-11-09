// Hardware Interface Modal & Viewfinders
// Handles Camera Scale OCR, QR Scanner, Bluetooth Scale, and Voice UI

import { modalEl, state } from '../state.js';
import { startScaleCamera, stopScaleCamera } from './scaleOcr.js';
import { startQrScanner, stopQrScanner, parseTokenQr } from './qrScanner.js';
import { startVoiceRecognition, stopVoiceRecognition, speakText } from './voiceCommander.js';
import { connectScale, disconnectScale, isScaleConnected, subscribeWeight } from './scaleBluetooth.js';
import { connectPrinter, isPrinterConnected } from './thermalPrinter.js';

export function closeHardwareModal() {
  stopScaleCamera();
  stopQrScanner();
  stopVoiceRecognition();
  modalEl.classList.remove('open');
  modalEl.innerHTML = '';
}

// 1. Open Camera Scale OCR Viewfinder
export function openScaleOcrModal(onWeightLocked) {
  modalEl.innerHTML = `
    <div class="modal-card hardware-modal" style="max-width:480px;text-align:center;padding:16px">
      <div class="sheet-head" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0;font-size:1.1rem;display:flex;align-items:center;gap:6px">
          <span>📷</span> <span>Scale Display Reader (OCR)</span>
        </h3>
        <button type="button" class="icon-btn" id="hw-close-btn" aria-label="Close">✕</button>
      </div>

      <p class="tiny muted" style="margin-bottom:12px">Point camera at the digital weight scale numbers</p>

      <div class="camera-viewport-box" style="position:relative;width:100%;height:260px;background:#000;border-radius:12px;overflow:hidden">
        <video id="scale-ocr-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
        <canvas id="scale-ocr-canvas" style="display:none"></canvas>

        <!-- Targeting overlay reticle -->
        <div class="reticle-box" style="position:absolute;top:25%;left:15%;right:15%;bottom:25%;border:2px dashed #22c55e;border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,0.5);pointer-events:none;display:flex;align-items:center;justify-content:center">
          <div style="font-size:0.75rem;color:#22c55e;font-weight:700;background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:4px">SCALE DISPLAY HERE</div>
        </div>
      </div>

      <div class="ocr-reading-bar" style="margin:16px 0;padding:12px;background:var(--bg-card);border:2px solid var(--border);border-radius:12px">
        <div class="tiny muted">Detected Reading</div>
        <div id="ocr-detected-val" style="font-size:1.8rem;font-weight:800;color:var(--brand);font-family:monospace">Align display…</div>
      </div>

      <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button type="button" class="btn btn-ghost" id="hw-cancel-ocr">Cancel</button>
        <button type="button" class="btn btn-primary" id="hw-manual-lock">Lock Reading</button>
      </div>
    </div>`;

  modalEl.classList.add('open');

  const video = document.getElementById('scale-ocr-video');
  const canvas = document.getElementById('scale-ocr-canvas');
  const readingEl = document.getElementById('ocr-detected-val');

  document.getElementById('hw-close-btn').onclick = closeHardwareModal;
  document.getElementById('hw-cancel-ocr').onclick = closeHardwareModal;

  let currentDetected = null;

  startScaleCamera(video, canvas, readingEl, (weight) => {
    closeHardwareModal();
    onWeightLocked(weight);
  }).catch((err) => {
    readingEl.textContent = 'Camera Error: ' + err.message;
  });

  document.getElementById('hw-manual-lock').onclick = () => {
    const text = readingEl.textContent;
    const num = parseFloat(text);
    if (!isNaN(num) && num > 0) {
      closeHardwareModal();
      onWeightLocked(num);
    } else {
      alert('No valid weight reading detected yet.');
    }
  };
}

// 2. Open QR / Barcode Scanner Viewfinder
export function openQrScannerModal(onScanSuccess) {
  modalEl.innerHTML = `
    <div class="modal-card hardware-modal" style="max-width:440px;text-align:center;padding:16px">
      <div class="sheet-head" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0;font-size:1.1rem;display:flex;align-items:center;gap:6px">
          <span>📱</span> <span>Token & Bill Scanner</span>
        </h3>
        <button type="button" class="icon-btn" id="hw-close-qr" aria-label="Close">✕</button>
      </div>

      <p class="tiny muted" style="margin-bottom:12px">Scan Token Slip QR Code or Barcode</p>

      <div class="camera-viewport-box" style="position:relative;width:100%;height:280px;background:#000;border-radius:12px;overflow:hidden">
        <video id="qr-scan-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
        <canvas id="qr-scan-canvas" style="display:none"></canvas>

        <div style="position:absolute;top:20%;left:20%;right:20%;bottom:20%;border:2px solid #6366f1;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,0.5);pointer-events:none">
          <div class="scanner-laser" style="position:absolute;left:0;right:0;height:2px;background:#ef4444;box-shadow:0 0 8px #ef4444;animation:scanLaser 2s infinite ease-in-out"></div>
        </div>
      </div>

      <button type="button" class="btn btn-ghost mt-14 btn-block" id="hw-cancel-qr">Close Scanner</button>
    </div>`;

  modalEl.classList.add('open');

  const video = document.getElementById('qr-scan-video');
  const canvas = document.getElementById('qr-scan-canvas');

  document.getElementById('hw-close-qr').onclick = closeHardwareModal;
  document.getElementById('hw-cancel-qr').onclick = closeHardwareModal;

  startQrScanner(video, canvas, (rawVal) => {
    closeHardwareModal();
    const parsed = parseTokenQr(rawVal);
    onScanSuccess(parsed, rawVal);
  }).catch((err) => {
    alert(err.message);
    closeHardwareModal();
  });
}

// 3. Open Voice Hands-Free Order Modal
export function openVoiceOrderModal(onVoiceParsed) {
  modalEl.innerHTML = `
    <div class="modal-card hardware-modal" style="max-width:440px;text-align:center;padding:20px">
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
        <button type="button" class="btn btn-ghost" id="hw-cancel-voice">Cancel</button>
        <button type="button" class="btn btn-primary" id="hw-apply-voice" disabled>Apply Order</button>
      </div>
    </div>`;

  modalEl.classList.add('open');

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

  modalEl.innerHTML = `
    <div class="modal-card hardware-modal" style="max-width:440px;padding:20px">
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
    </div>`;

  modalEl.classList.add('open');

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
