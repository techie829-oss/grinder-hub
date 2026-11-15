import { canonicalNameKey, toBilingualName } from './phonetic.js';

export const UNITS = { kg: 'किलो', ltr: 'लीटर', pc: 'नग', plate: 'प्लेट' };
export const RANGES = ['today', 'yesterday', 'week', 'month', 'all'];
export const IST_OFFSET = 5.5 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const clean = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

export function normalizePhone(v) {
  const digits = String(v == null ? '' : v).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function normName(v) {
  if (!v) return '';
  return canonicalNameKey(v) || clean(v, 60).toLowerCase();
}

export const SEEDED_VILLAGES = [
  'केवलपुरवा (Kewalpurwa)',
  'अशोगापुर (Ashogapur)',
  'नकहा (Nakaha)',
  'सहजननी (Sahajani)',
  'चंदीदीन पुरवा (Chandidin Purwa)',
  'अहिरन पुरवा (Ahiran Purwa)',
  'लोनियन पुरवा (Loniyan Purwa)',
  'पडरी पुरवा (Padari Purwa)',
  'चौफेरी (Choupheri)',
  'झंडी (Jhandi)',
  'बिलरिया (Bilriya)',
  'लोधनपुरवा (Lodhanpurwa)',
];

export const VILLAGE_STANDARDIZATION_MAP = {
  // Kewalpurwa
  'kewalpurwa': 'केवलपुरवा (Kewalpurwa)',
  'kewal purwa': 'केवलपुरवा (Kewalpurwa)',
  'keval purva': 'केवलपुरवा (Kewalpurwa)',
  'kevalpurva': 'केवलपुरवा (Kewalpurwa)',
  'केवल पुरवा': 'केवलपुरवा (Kewalpurwa)',
  'केवलपुरवा': 'केवलपुरवा (Kewalpurwa)',
  // Ashogapur
  'ashogapur': 'अशोगापुर (Ashogapur)',
  'asogapur': 'अशोगापुर (Ashogapur)',
  'अशोगापुर': 'अशोगापुर (Ashogapur)',
  // Nakaha
  'nakaha': 'नकहा (Nakaha)',
  'नकहा': 'नकहा (Nakaha)',
  // Sahajani
  'sahajani': 'सहजननी (Sahajani)',
  'sahjani': 'सहजननी (Sahajani)',
  'सहजनी': 'सहजननी (Sahajani)',
  'सहजननी': 'सहजननी (Sahajani)',
  'sahajnani': 'सहजननी (Sahajani)',
  // Chandidin Purwa
  'chandidin purwa': 'चंदीदीन पुरवा (Chandidin Purwa)',
  'chandidin': 'चंदीदीन पुरवा (Chandidin Purwa)',
  'चंदीदीनपुरवा': 'चंदीदीन पुरवा (Chandidin Purwa)',
  'चंदीदीन पुरवा': 'चंदीदीन पुरवा (Chandidin Purwa)',
  // Ahiran Purwa
  'ahiran purwa': 'अहिरन पुरवा (Ahiran Purwa)',
  'ahiran': 'अहिरन पुरवा (Ahiran Purwa)',
  'अहिरनपुरवा': 'अहिरन पुरवा (Ahiran Purwa)',
  'अहिरन पुरवा': 'अहिरन पुरवा (Ahiran Purwa)',
  // Loniyan Purwa
  'loniyan purwa': 'लोनियन पुरवा (Loniyan Purwa)',
  'lonian purwa': 'लोनियन पुरवा (Loniyan Purwa)',
  'लोनिअन पुरवा': 'लोनियन पुरवा (Loniyan Purwa)',
  'लोनियनपुरवा': 'लोनियन पुरवा (Loniyan Purwa)',
  'लोनियन पुरवा': 'लोनियन पुरवा (Loniyan Purwa)',
  // Padari Purwa
  'padari purwa': 'पडरी पुरवा (Padari Purwa)',
  'padri purva': 'पडरी पुरवा (Padari Purwa)',
  'padri purwa': 'पडरी पुरवा (Padari Purwa)',
  'पडरीपुरवा': 'पडरी पुरवा (Padari Purwa)',
  'पडरी पुरवा': 'पडरी पुरवा (Padari Purwa)',
  // Choupheri
  'choupheri': 'चौफेरी (Choupheri)',
  'chaupheri': 'चौफेरी (Choupheri)',
  'चौफेरी': 'चौफेरी (Choupheri)',
  // Jhandi
  'jhandi': 'झंडी (Jhandi)',
  'झंडी': 'झंडी (Jhandi)',
  // Bilriya
  'bilriya': 'बिलरिया (Bilriya)',
  'bilaria': 'बिलरिया (Bilriya)',
  'बिलरिया': 'बिलरिया (Bilriya)',
  // Lodhanpurwa
  'lodhanpurwa': 'लोधनपुरवा (Lodhanpurwa)',
  'lodhan purwa': 'लोधनपुरवा (Lodhanpurwa)',
  'लोधन पुरवा': 'लोधनपुरवा (Lodhanpurwa)',
  'लोधनपुरवा': 'लोधनपुरवा (Lodhanpurwa)',
};

export function standardizeVillage(v) {
  if (!v) return '';
  const trimmed = clean(v, 60);
  const lower = trimmed.toLowerCase();
  if (VILLAGE_STANDARDIZATION_MAP[lower]) return VILLAGE_STANDARDIZATION_MAP[lower];
  if (VILLAGE_STANDARDIZATION_MAP[trimmed]) return VILLAGE_STANDARDIZATION_MAP[trimmed];
  return trimmed;
}

export function normVillage(v) {
  const std = standardizeVillage(v);
  return canonicalNameKey(std) || clean(std, 60).toLowerCase();
}

export { toBilingualName };

export function dayKey(ts = Date.now()) {
  return new Date(ts + IST_OFFSET).toISOString().slice(0, 10);
}

export function startOfDay(ts = Date.now()) {
  const d = new Date(ts + IST_OFFSET);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - IST_OFFSET;
}

export function rangeStart(range) {
  if (range === 'yesterday') return startOfDay() - DAY_MS;
  if (range === 'week') return startOfDay() - 6 * DAY_MS;
  if (range === 'month') return startOfDay() - 29 * DAY_MS;
  if (range === 'all') return 0;
  return startOfDay();
}

export function rangeEnd(range) {
  if (range === 'yesterday') return startOfDay();
  return Infinity;
}

