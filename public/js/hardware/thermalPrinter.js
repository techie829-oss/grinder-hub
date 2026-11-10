// Direct Bluetooth Thermal POS Printer Engine (ESC/POS 58mm / 80mm)
// Prints high-speed silent slips on cheap portable Bluetooth thermal printers (Phomemo, MunByn, TVS, etc.)

import { state } from '../state.js';
import { inr, qtyFmt, unitOf, dateTxt, timeTxt } from '../utils/formatters.js';

let printerDevice = null;
let printCharacteristic = null;

const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Common Portable POS Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip ISSC Transparent Serial
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Generic BLE Serial
];

export function isPrinterSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function isPrinterConnected() {
  return !!(printerDevice && printerDevice.gatt && printerDevice.gatt.connected);
}

export async function connectPrinter() {
  if (!isPrinterSupported()) {
    throw new Error('Bluetooth is not supported in this browser.');
  }

  printerDevice = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  });

  if (!printerDevice || !printerDevice.gatt) {
    throw new Error('Printer device not selected.');
  }

  const server = await printerDevice.gatt.connect();

  for (const sUuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(sUuid);
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          printCharacteristic = ch;
          return printerDevice.name || 'Thermal POS Printer';
        }
      }
    } catch (_) {}
  }

  // Fallback to inspecting all primary services
  const services = await server.getPrimaryServices();
  for (const s of services) {
    try {
      const chars = await s.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          printCharacteristic = ch;
          return printerDevice.name || 'Thermal POS Printer';
        }
      }
    } catch (_) {}
  }

  throw new Error('Connected to printer, but write characteristic was not found.');
}

// ESC/POS Command Builder
class EscPosBuilder {
  constructor() {
    this.buffer = [];
  }

  raw(bytes) {
    for (const b of bytes) this.buffer.push(b);
    return this;
  }

  init() {
    return this.raw([0x1b, 0x40]); // ESC @
  }

  align(align = 'left') {
    const map = { left: 0, center: 1, right: 2 };
    return this.raw([0x1b, 0x61, map[align] || 0]); // ESC a n
  }

  bold(enable = true) {
    return this.raw([0x1b, 0x45, enable ? 1 : 0]); // ESC E n
  }

  size(doubleWidth = false, doubleHeight = false) {
    let n = 0;
    if (doubleWidth) n |= 0x20;
    if (doubleHeight) n |= 0x01;
    return this.raw([0x1d, 0x21, n]); // GS ! n
  }

  text(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    return this.raw(bytes);
  }

  line(str = '') {
    return this.text(str + '\n');
  }

  hr(char = '-', width = 32) {
    return this.line(char.repeat(width));
  }

  row(col1, col2, width = 32) {
    const str1 = String(col1);
    const str2 = String(col2);
    const spaces = Math.max(1, width - str1.length - str2.length);
    return this.line(str1 + ' '.repeat(spaces) + str2);
  }

  feed(lines = 3) {
    return this.raw([0x1b, 0x64, lines]); // ESC d n
  }

  cut() {
    return this.raw([0x1d, 0x56, 0x42, 0x00]); // GS V B 0
  }

  qr(text, size = 6) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const len = data.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    return this
      .raw([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]) // Model 2
      .raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size])       // Module size
      .raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31])       // Error correction M
      .raw([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...data])   // Store data
      .raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);      // Print QR
  }

  getBytes() {
    return new Uint8Array(this.buffer);
  }
}

// Send buffer in chunks (BLE MTU is usually 20 to 100 bytes)
async function sendRawData(uint8Array) {
  if (!printCharacteristic) {
    throw new Error('Printer not connected');
  }

  const chunkSize = 64;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    if (printCharacteristic.writeValueWithoutResponse) {
      await printCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await printCharacteristic.writeValue(chunk);
    }
    // Small pause to prevent buffer overflow on low-cost printers
    await new Promise((r) => setTimeout(r, 15));
  }
}

// Print 58mm Thermal Token Slip
export async function printThermalToken(tokenRow) {
  const biz = state.data.business || { name: 'Chakki' };
  const hideLoss = (tokenRow.hideLoss != null) ? Boolean(tokenRow.hideLoss) : Boolean(biz.hideLossOnSlip != null ? biz.hideLossOnSlip : 1);
  const svc = tokenRow.serviceId ? state.data.services.find((s) => s.id === tokenRow.serviceId) : null;
  const svcName = svc ? svc.name : 'Flour Mill';
  const unit = svc ? unitOf(svc.unit) : 'kg';
  const gross = tokenRow.grossWeight || 0;
  const lossG = tokenRow.lossG || 0;
  const net = tokenRow.netWeight;

  const builder = new EscPosBuilder();
  builder
    .init()
    .align('center')
    .bold(true)
    .line(biz.name)
    .bold(false);

  if (biz.phone) builder.line('Ph: ' + biz.phone);
  builder
    .hr()
    .align('center')
    .line('TOKEN SLIP')
    .size(true, true)
    .bold(true)
    .line(`#${tokenRow.no}`)
    .size(false, false)
    .bold(false)
    .hr()
    .align('left')
    .row('Customer:', tokenRow.name)
    .row('Village:', tokenRow.village || '—')
    .row('Date:', dateTxt(tokenRow.at) + ' ' + timeTxt(tokenRow.at))
    .row('Product:', svcName);

  if (gross > 0) {
    builder.row(hideLoss ? 'Weight:' : 'Gross Weight:', `${qtyFmt(gross)} ${unit}`);
  }
  if (!hideLoss && lossG > 0) {
    builder.row('Loss Deduction:', `-${lossG} g`);
  }
  if (!hideLoss && net > 0) {
    builder.bold(true).row('Net Flour Return:', `${qtyFmt(net)} ${unit}`).bold(false);
  }

  builder
    .hr()
    .align('center')
    .qr(`TOKEN:${tokenRow.no}`, 6)
    .line(`TOKEN #${tokenRow.no}`)
    .line('Scan to check status')
    .line('Please show this slip at pickup')
    .feed(3)
    .cut();

  await sendRawData(builder.getBytes());
}

// Print Full Thermal Bill Receipt
export async function printThermalBill(entry) {
  const biz = state.data.business || { name: 'Chakki' };
  const hideLoss = (entry.hideLoss != null) ? Boolean(entry.hideLoss) : Boolean(biz.hideLossOnSlip != null ? biz.hideLossOnSlip : 1);
  const customer = entry.customerId ? state.data.customers.find((c) => c.id === entry.customerId) : null;
  const nameShow = customer ? customer.name : (entry.name || 'Customer');
  const villageShow = customer ? (customer.village || '') : (entry.village || '');
  const isPayment = entry.kind === 'payment';
  const lossG = entry.lossG || 0;
  const netWeight = entry.netWeight;

  const builder = new EscPosBuilder();
  builder
    .init()
    .align('center')
    .bold(true)
    .line(biz.name)
    .bold(false);

  if (biz.address) builder.line(biz.address);
  if (biz.phone) builder.line('Ph: ' + biz.phone);

  builder
    .hr()
    .align('left')
    .row('Date:', dateTxt(entry.at) + ' ' + timeTxt(entry.at));

  if (entry.tokenNo) {
    builder.row('Token:', `#${entry.tokenNo}`);
  }

  builder
    .row('Customer:', nameShow)
    .row('Village:', villageShow || '—')
    .hr();

  if (isPayment) {
    builder
      .bold(true)
      .row('Payment Received:', inr(entry.amountPaise))
      .bold(false);
  } else {
    builder
      .row('Product:', entry.serviceName || 'Order')
      .row(hideLoss ? 'Weight:' : 'Gross Wt:', `${qtyFmt(entry.qty)} ${unitOf(entry.unit)}`);

    if (!hideLoss && lossG > 0) {
      builder.row('Loss Deduction:', `-${lossG} g`);
    }
    if (!hideLoss && netWeight != null) {
      builder.bold(true).row('Net Flour:', `${qtyFmt(netWeight)} ${unitOf(entry.unit)}`).bold(false);
    }

    builder
      .row('Rate:', `${inr(entry.ratePaise, true)}/${unitOf(entry.unit)}`)
      .hr()
      .bold(true)
      .row('Total Bill:', inr(entry.amountPaise))
      .row('Status:', entry.paid ? 'PAID (Cash)' : 'DUE (Credit)')
      .bold(false);
  }

  if (customer && customer.balancePaise) {
    builder.row('Balance Due:', inr(customer.balancePaise));
  }

  if (biz.upi) {
    builder.align('center').line('UPI: ' + biz.upi);
  }

  if (entry.tokenNo) {
    builder
      .feed(1)
      .align('center')
      .qr(`TOKEN:${entry.tokenNo}`, 5)
      .line(`TOKEN #${entry.tokenNo}`);
  }

  builder
    .hr()
    .align('center')
    .line(biz.note || 'Thank you! Visit again')
    .feed(3)
    .cut();

  await sendRawData(builder.getBytes());
}

