// Formatting Utilities (Currency, Dates, Units, Escaping)
import { UNIT_LABEL, RANGES } from '../state.js';
import { getLanguage, t } from '../i18n.js';

export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (m) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
));

const decFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const inr = (paise, forceDecimals) => {
  const num = (Number(paise) || 0) / 100;
  if (forceDecimals || num % 1 !== 0) {
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const qtyFmt = (q) => decFmt.format(Number(q) || 0);
export const unitOf = (unit) => UNIT_LABEL[unit] || 'kg';
export const phoneFmt = (p) => (p && p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p || '');

export function dateTxt(ts) {
  const d = new Date(ts);
  const lang = getLanguage() === 'en' ? 'en-IN' : 'hi-IN';
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
}

export function timeTxt(ts) {
  const lang = getLanguage() === 'en' ? 'en-IN' : 'hi-IN';
  return new Date(ts).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}

export function relTxt(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  const lang = getLanguage();
  if (lang === 'en') {
    if (min < 1) return 'just now';
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const days = Math.floor(hr / 24);
    return days === 1 ? 'yesterday' : days + 'd ago';
  }
  if (min < 1) return 'अभी';
  if (min < 60) return min + ' मिनट पहले';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' घंटे पहले';
  const days = Math.floor(hr / 24);
  return days === 1 ? 'कल' : days + ' दिन पहले';
}

export function rangeLabel(range) {
  const found = RANGES.find((r) => r.id === range);
  return found ? (t(found.labelKey) || found.labelKey) : 'Today';
}

export function todayTxt() {
  const lang = getLanguage() === 'en' ? 'en-IN' : 'hi-IN';
  return new Date().toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'long' });
}

export function logoMark(size) {
  const s = size || 44;
  return `<div class="logo-mark" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.48)}px;border-radius:${Math.round(s * 0.3)}px">च</div>`;
}

export function emptyBlock(title, sub) {
  return `<div class="empty"><div class="empty-mark">◌</div><div class="strong">${esc(title)}</div><div>${esc(sub)}</div></div>`;
}
