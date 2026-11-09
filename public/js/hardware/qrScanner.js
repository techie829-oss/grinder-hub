// Camera QR / Barcode Scanner for Token Slips and Customer Cards
// Uses native BarcodeDetector API with lightweight Canvas fallback

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

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    videoElement.srcObject = mediaStream;
    await videoElement.play();

    startScanning(videoElement, canvasElement, onScan);
  } catch (err) {
    throw new Error('Camera permission denied or camera unavailable: ' + err.message);
  }
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
          } else if (canvas && ctx) {
            // Fallback: draw center box to canvas
            canvas.width = 300;
            canvas.height = 300;
            const srcSize = Math.min(video.videoWidth, video.videoHeight) * 0.7;
            const sx = (video.videoWidth - srcSize) / 2;
            const sy = (video.videoHeight - srcSize) / 2;
            ctx.drawImage(video, sx, sy, srcSize, srcSize, 0, 0, 300, 300);
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

