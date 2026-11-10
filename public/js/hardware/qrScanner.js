// Camera QR / Barcode Scanner for Token Slips and Customer Cards
// Uses native BarcodeDetector API with lightweight Canvas fallback
import '../vendor/jsqr.min.js';

let mediaStream = null;
let animationId = null;
let barcodeDetector = null;

function playBeep(freq = 1200, duration = 0.12) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

export async function isBarcodeSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export async function startQrScanner(videoElement, canvasElement, onScan) {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      barcodeDetector = new window.BarcodeDetector({
        formats: ['qr_code', 'code_128', 'ean_13', 'upc_a'],
      });
    } catch (_) {
      barcodeDetector = null;
    }
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera is not supported on this device/browser');
  }

  videoElement.setAttribute('autoplay', '');
  videoElement.setAttribute('muted', '');
  videoElement.setAttribute('playsinline', '');
  videoElement.muted = true;
  videoElement.playsInline = true;

  const tryConstraints = [
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } },
    { video: { facingMode: 'environment' } },
    { video: true }
  ];

  let stream = null;
  let lastErr = null;
  for (const c of tryConstraints) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(c);
      if (stream) break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!stream) {
    throw new Error('Camera access failed: ' + (lastErr?.message || 'Permission denied'));
  }

  mediaStream = stream;
  videoElement.srcObject = mediaStream;
  try {
    await videoElement.play();
  } catch (_) {}

  startScanning(videoElement, canvasElement, onScan);
}

export function stopQrScanner() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
    mediaStream = null;
  }
}

function startScanning(video, canvas, onScan) {
  const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  let lastCheck = 0;
  let isScanning = true;

  async function check() {
    if (!mediaStream || !isScanning) return;

    const now = performance.now();
    if (now - lastCheck > 120) { // Check every 120ms
      lastCheck = now;
      if (video.videoWidth && video.videoHeight) {
        try {
          if (barcodeDetector) {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const raw = barcodes[0].rawValue;
              if (raw) {
                isScanning = false;
                playBeep(1200, 0.15);
                stopQrScanner();
                onScan(raw);
                return;
              }
            }
          }
          
          if (canvas && ctx) {
            const scanW = 320;
            const scanH = 320;
            if (canvas.width !== scanW) {
              canvas.width = scanW;
              canvas.height = scanH;
            }
            const minDim = Math.min(video.videoWidth, video.videoHeight);
            const sx = (video.videoWidth - minDim) / 2;
            const sy = (video.videoHeight - minDim) / 2;
            ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, scanW, scanH);

            const qrDecoder = (typeof window !== 'undefined' && window.jsQR) || (typeof self !== 'undefined' && self.jsQR);
            if (qrDecoder) {
              const imgData = ctx.getImageData(0, 0, scanW, scanH);
              const qrResult = qrDecoder(imgData.data, scanW, scanH, { inversionAttempts: 'attemptBoth' });
              if (qrResult && qrResult.data) {
                isScanning = false;
                playBeep(1200, 0.15);
                stopQrScanner();
                onScan(qrResult.data);
                return;
              }
            }
          }
        } catch (_) {}
      }
    }

    if (isScanning) {
      animationId = requestAnimationFrame(check);
    }
  }

  animationId = requestAnimationFrame(check);
}

// Parses Chakki-specific QR/Barcode content
export function parseTokenQr(rawValue) {
  const val = String(rawValue || '').trim();
  // Formats:
  // "TOKEN:14"
  // "CHAKKI:TOKEN:14"
  // "#14"
  // "14"
  const tokenMatch = val.match(/(?:token[:#\s]*|#\s*)(\d+)/i);
  if (tokenMatch) {
    return { type: 'token', tokenNo: parseInt(tokenMatch[1], 10) };
  }

  // Customer format: "CUST:Name:Village"
  if (val.startsWith('CUST:')) {
    const parts = val.split(':');
    return {
      type: 'customer',
      name: parts[1] || '',
      village: parts[2] || '',
    };
  }

  // Pure integer
  if (/^\d{1,4}$/.test(val)) {
    return { type: 'token', tokenNo: parseInt(val, 10) };
  }

  return { type: 'raw', value: val };
}

