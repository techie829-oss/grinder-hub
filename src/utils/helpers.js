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

export function normVillage(v) {
  return clean(v, 60).toLowerCase();
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

