// Camera OCR Engine for Digital Weighing Scale Displays (7-Segment LED / LCD)
// Reads numbers directly from the electronic weighing scale display via camera

let mediaStream = null;
let animationId = null;
let consecutiveMatches = 0;
let lastDetectedWeight = null;
let onWeightLockedCallback = null;

// Audio beep for stable weight lock
function playBeep(freq = 880, duration = 0.15) {
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

export async function startScaleCamera(videoElement, canvasElement, resultElement, onLocked) {
  onWeightLockedCallback = onLocked;
  consecutiveMatches = 0;
  lastDetectedWeight = null;

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

  startProcessingFrames(videoElement, canvasElement, resultElement);
}

export function stopScaleCamera() {
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

// 7-segment segment layout map
// a: top, b: top-right, c: bottom-right, d: bottom, e: bottom-left, f: top-left, g: center
const SEGMENT_DIGITS = {
  '1111110': '0',
  '0110000': '1',
  '1101101': '2',
  '1111001': '3',
  '0110011': '4',
  '1011011': '5',
  '1011111': '6',
  '1110000': '7',
  '1111111': '8',
  '1111011': '9',
};

// Process video frame on canvas to detect scale numbers
function startProcessingFrames(video, canvas, resultEl) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let lastCheckTime = 0;

  function loop(now) {
    if (!mediaStream) return;

    if (now - lastCheckTime > 150) { // Check every 150ms for performance & battery
      lastCheckTime = now;
      processFrame(video, canvas, ctx, resultEl);
    }

    animationId = requestAnimationFrame(loop);
  }

  animationId = requestAnimationFrame(loop);
}

function processFrame(video, canvas, ctx, resultEl) {
  if (!video.videoWidth || !video.videoHeight) return;

  const w = 400;
  const h = 200;
  canvas.width = w;
  canvas.height = h;

  // Extract center region where user points the camera at scale display
  const srcW = video.videoWidth * 0.7;
  const srcH = video.videoHeight * 0.35;
  const srcX = (video.videoWidth - srcW) / 2;
  const srcY = (video.videoHeight - srcH) / 2;

  ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, w, h);

  // Read pixel data
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Adaptive thresholding: detect bright LED (red/green) or dark LCD
  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    totalBrightness += (r * 0.299 + g * 0.587 + b * 0.114);
  }
  const avgBrightness = totalBrightness / (data.length / 4);

  // High contrast enhancement
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = (r * 0.299 + g * 0.587 + b * 0.114);

    // Isolate bright LED or high-contrast LCD
    const isBrightLED = (r > 160 && g < 120 && b < 120) || (g > 160 && r < 140) || lum > avgBrightness * 1.4;
    const val = isBrightLED ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  ctx.putImageData(imgData, 0, 0);

  // Detect numeric weight candidates
  const detectedNumber = sampleDisplayDigits(ctx, w, h);

  if (detectedNumber !== null && detectedNumber > 0 && detectedNumber < 1000) {
    if (resultEl) {
      resultEl.textContent = `${detectedNumber.toFixed(2)} kg`;
      resultEl.classList.add('reading-active');
    }

    if (lastDetectedWeight !== null && Math.abs(detectedNumber - lastDetectedWeight) <= 0.05) {
      consecutiveMatches++;
      if (consecutiveMatches >= 3) {
        // Weight is stable and locked!
        playBeep(980, 0.2);
        const lockedWeight = detectedNumber;
        stopScaleCamera();
        if (onWeightLockedCallback) {
          onWeightLockedCallback(lockedWeight);
        }
      }
    } else {
      consecutiveMatches = 1;
      lastDetectedWeight = detectedNumber;
    }
  } else {
    consecutiveMatches = 0;
    if (resultEl && !lastDetectedWeight) {
      resultEl.textContent = 'Align display in box…';
      resultEl.classList.remove('reading-active');
    }
  }
}

// Inspect connected horizontal white pixel clusters to extract 7-segment digits
function sampleDisplayDigits(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Compute vertical projection profile
  const vProfile = new Array(w).fill(0);
  for (let x = 0; x < w; x++) {
    for (let y = Math.floor(h * 0.15); y < Math.floor(h * 0.85); y++) {
      if (data[(y * w + x) * 4] > 128) {
        vProfile[x]++;
      }
    }
  }

  // Find digit boundaries (clusters separated by gaps)
  const minThreshold = 8;
  const segments = [];
  let inDigit = false;
  let startX = 0;

  for (let x = 0; x < w; x++) {
    if (vProfile[x] > minThreshold) {
      if (!inDigit) {
        inDigit = true;
        startX = x;
      }
    } else {
      if (inDigit) {
        inDigit = false;
        const width = x - startX;
        if (width >= 8 && width <= 80) {
          segments.push({ startX, endX: x, width });
        }
      }
    }
  }

  if (segments.length < 2) return null;

  // Recognise each segment cluster
  let resultStr = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    // Check if this segment is a decimal point
    if (seg.width < 14 && i > 0 && i < segments.length - 1) {
      resultStr += '.';
      continue;
    }

    const digit = recognize7Segment(data, w, h, seg.startX, seg.endX);
    if (digit !== null) {
      resultStr += digit;
    }
  }

  // Clean decimal string
  if (!resultStr || resultStr.length < 2) return null;

  // If missing decimal point, auto format realistic scale weights
  let num = parseFloat(resultStr);
  if (!isNaN(num) && num > 0) {
    if (num > 1000 && !resultStr.includes('.')) {
      num = num / 100; // e.g. 1542 -> 15.42 kg
    }
    return Math.round(num * 100) / 100;
  }

  return null;
}

function recognize7Segment(data, w, h, x1, x2) {
  const midX = Math.floor((x1 + x2) / 2);
  const q1X = Math.floor(x1 + (x2 - x1) * 0.25);
  const q3X = Math.floor(x1 + (x2 - x1) * 0.75);

  const topY = Math.floor(h * 0.25);
  const midY = Math.floor(h * 0.50);
  const botY = Math.floor(h * 0.75);
  const q1Y = Math.floor(h * 0.35);
  const q3Y = Math.floor(h * 0.65);

  const isWhite = (px, py) => {
    if (px < 0 || px >= w || py < 0 || py >= h) return false;
    return data[(py * w + px) * 4] > 128;
  };

  // Check 7 segments
  const a = isWhite(midX, topY) ? 1 : 0;
  const b = isWhite(q3X, q1Y) ? 1 : 0;
  const c = isWhite(q3X, q3Y) ? 1 : 0;
  const d = isWhite(midX, botY) ? 1 : 0;
  const e = isWhite(q1X, q3Y) ? 1 : 0;
  const f = isWhite(q1X, q1Y) ? 1 : 0;
  const g = isWhite(midX, midY) ? 1 : 0;

  const key = `${a}${b}${c}${d}${e}${f}${g}`;
  return SEGMENT_DIGITS[key] || null;
}

