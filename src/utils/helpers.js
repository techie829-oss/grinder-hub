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
  return clean(v, 60).toLowerCase();
}

export const SEEDED_VILLAGES = [
  'केवलपुरवा',
  'अशोगापुर',
  'नकहा',
  'सहजननी',
  'चंदीदीन पुरवा',
  'अहिरन पुरवा',
  'लोनियन पुरवा',
  'पडरी पुरवा',
  'चौफेरी',
  'झंडी',
  'बिलरिया',
  'लोधनपुरवा',
];

export const VILLAGE_STANDARDIZATION_MAP = {
  'kewalpurwa': 'केवलपुरवा',
  'kewal purwa': 'केवलपुरवा',
  'केवल पुरवा': 'केवलपुरवा',
  'ashogapur': 'अशोगापुर',
  'asogapur': 'अशोगापुर',
  'nakaha': 'नकहा',
  'sahajani': 'सहजननी',
  'sahjani': 'सहजननी',
  'सहजनी': 'सहजननी',
  'sahajnani': 'सहजननी',
  'chandidin purwa': 'चंदीदीन पुरवा',
  'chandidin': 'चंदीदीन पुरवा',
  'चंदीदीनपुरवा': 'चंदीदीन पुरवा',
  'ahiran purwa': 'अहिरन पुरवा',
  'ahiran': 'अहिरन पुरवा',
  'अहिरनपुरवा': 'अहिरन पुरवा',
  'loniyan purwa': 'लोनियन पुरवा',
  'lonian purwa': 'लोनियन पुरवा',
  'लोनिअन पुरवा': 'लोनियन पुरवा',
  'लोनियनपुरवा': 'लोनियन पुरवा',
  'padari purwa': 'पडरी पुरवा',
  'padri purva': 'पडरी पुरवा',
  'padri purwa': 'पडरी पुरवा',
  'पडरीपुरवा': 'पडरी पुरवा',
  'choupheri': 'चौफेरी',
  'chaupheri': 'चौफेरी',
  'jhandi': 'झंडी',
  'bilriya': 'बिलरिया',
  'bilaria': 'बिलरिया',
  'lodhanpurwa': 'लोधनपुरवा',
  'lodhan purwa': 'लोधनपुरवा',
  'लोधन पुरवा': 'लोधनपुरवा',
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
  return clean(std, 60).toLowerCase();
}

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

