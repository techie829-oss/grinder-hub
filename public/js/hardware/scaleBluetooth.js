// Web Bluetooth Digital Scale Reader
// Connects to Bluetooth Weighing Scales & BLE Serial Scales (Phoenix, Essae, Eagle, ESP32/HC-05)

let bluetoothDevice = null;
let weightCharacteristic = null;
let currentWeight = 0;
let isStable = false;
let listeners = new Set();
let buffer = '';

// Known BLE Scale and Serial Service UUIDs
const BLE_SERVICES = [
  '0000181d-0000-1000-8000-00805f9b34fb', // Standard Weight Scale
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Common HC-05/CC2541 BLE Serial
  '0000fff0-0000-1000-8000-00805f9b34fb', // Generic Transparent Serial
];

export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function isScaleConnected() {
  return !!(bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected);
}

export function getLiveWeight() {
  return { weight: currentWeight, isStable };
}

export function subscribeWeight(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyWeight(wt, stable) {
  currentWeight = wt;
  isStable = !!stable;
  for (const fn of listeners) {
    try {
      fn(currentWeight, isStable);
    } catch (_) {}
  }
}

// Parse incoming weight string or binary
export function parseWeightData(rawStr) {
  // Common formats: "ST,GS,+0015.420kg", "WN: 15.42kg", "  15.42 kg  ", "15.420\r\n"
  const clean = rawStr.replace(/[^\d.\-+]/g, ' ').trim();
  const tokens = clean.split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    const num = parseFloat(tok);
    if (!isNaN(num) && num >= 0 && num <= 2000) {
      return Math.round(num * 1000) / 1000;
    }
  }
  return null;
}

function handleValueNotification(event) {
  const value = event.target.value;
  if (!value) return;

  // Check if standard Bluetooth Weight Scale Profile (IEEE 11073 format)
  if (value.byteLength >= 3 && event.target.uuid.includes('2a9d')) {
    const flags = value.getUint8(0);
    const isLbs = (flags & 0x01) !== 0;
    const rawVal = value.getUint16(1, true);
    let wtKg = isLbs ? rawVal * 0.005 * 0.453592 : rawVal * 0.005;
    wtKg = Math.round(wtKg * 1000) / 1000;
    notifyWeight(wtKg, true);
    return;
  }

  // ASCII Serial Stream
  const decoder = new TextDecoder();
  const text = decoder.decode(value);
  buffer += text;

  if (buffer.includes('\n') || buffer.includes('\r')) {
    const lines = buffer.split(/[\r\n]+/);
    buffer = lines.pop() || ''; // Keep remainder
    for (const line of lines) {
      if (!line.trim()) continue;
      const wt = parseWeightData(line);
      if (wt !== null) {
        const stable = !line.includes('US') && (line.includes('ST') || line.includes('kg') || true);
        notifyWeight(wt, stable);
      }
    }
  }
}

export async function connectScale() {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Use Chrome on Android or Desktop.');
  }

  // Request device with optional services
  bluetoothDevice = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BLE_SERVICES,
  });

  if (!bluetoothDevice || !bluetoothDevice.gatt) {
    throw new Error('Scale device not selected');
  }

  bluetoothDevice.addEventListener('gattserverdisconnected', () => {
    notifyWeight(0, false);
    for (const fn of listeners) {
      try { fn(0, false, 'disconnected'); } catch (_) {}
    }
  });

  const server = await bluetoothDevice.gatt.connect();

  // Try to find a matching notify characteristic across supported services
  for (const serviceUuid of BLE_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.notify || ch.properties.indicate) {
          weightCharacteristic = ch;
          await ch.startNotifications();
          ch.addEventListener('characteristicvaluechanged', handleValueNotification);
          return bluetoothDevice.name || 'Digital Scale';
        }
      }
    } catch (_) {
      // Try next service
    }
  }

  // Fallback: If no known service found, inspect first available service
  const services = await server.getPrimaryServices();
  for (const service of services) {
    try {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.notify || ch.properties.indicate) {
          weightCharacteristic = ch;
          await ch.startNotifications();
          ch.addEventListener('characteristicvaluechanged', handleValueNotification);
          return bluetoothDevice.name || 'Digital Scale';
        }
      }
    } catch (_) {}
  }

  throw new Error('Connected to device, but no weight stream characteristic was found.');
}

export async function disconnectScale() {
  if (bluetoothDevice && bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  bluetoothDevice = null;
  weightCharacteristic = null;
  notifyWeight(0, false);
}
