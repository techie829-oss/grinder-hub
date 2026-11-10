// Centralized Client-Side Reactive State Store
import { t } from './i18n.js';

export const UNIT_LABEL = { kg: 'kg', ltr: 'ltr', pc: 'pc', plate: 'plate' };
export const UNITS = [
  { id: 'kg', label: 'kg' },
  { id: 'ltr', label: 'ltr' },
  { id: 'pc', label: 'pc' },
  { id: 'plate', label: 'plate' },
];

export const RANGES = [
  { id: 'today', labelKey: 'rangeToday' },
  { id: 'yesterday', labelKey: 'rangeYesterday' },
  { id: 'week', labelKey: 'rangeWeek' },
  { id: 'month', labelKey: 'rangeMonth' },
  { id: 'all', labelKey: 'rangeAll' },
];

export const NAV = [
  { id: 'dashboard', labelKey: 'navHome', icon: 'home' },
  { id: 'token', labelKey: 'navToken', icon: 'ticket' },
  { id: 'job', labelKey: 'navJob', icon: 'plus' },
  { id: 'customers', labelKey: 'navCustomers', icon: 'users' },
  { id: 'reports', labelKey: 'navReports', icon: 'chart' },
  { id: 'settings', labelKey: 'navSettings', icon: 'sliders' },
];

export const TITLES = {
  dashboard: 'navHome',
  token: 'tokenBoard',
  job: 'navJob',
  customers: 'navCustomers',
  reports: 'navReports',
  settings: 'navSettings',
  admin: 'navSuperAdmin',
};

export const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.6 12 3l9 7.6"/><path d="M5.5 9.8V21h13V9.8"/><path d="M9.5 21v-6h5v6"/></svg>',
  ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.2A2 2 0 0 1 5.5 6h13a2 2 0 0 1 2 2.2 2.4 2.4 0 0 0 0 7.6A2 2 0 0 1 18.5 20h-13a2 2 0 0 1-2-2.2 2.4 2.4 0 0 0 0-7.6Z"/><path d="M9.5 9.5v5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.2"/><path d="M12 8.4v7.2M8.4 12h7.2"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.4 20a5.6 5.6 0 0 1 11.2 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.4 14.4A5.6 5.6 0 0 1 20.6 20"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16.5v-4M12.7 16.5V8M17.3 16.5v-6"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2.1" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="2.1" fill="currentColor" stroke="none"/></svg>',
};

export const state = {
  view: 'dashboard',
  range: 'today',
  q: '',
  custFilter: 'all',
  data: null,
  customer: null,
  busy: false,
  jobTab: 'grind', // 'grind' | 'sale' | 'purchase'
  job: {
    serviceId: null,
    qty: '',
    rate: '',
    lossRateG: '',
    totalLossG: 0,
    netWeight: 0,
    paid: true,
    name: '',
    village: '',
    phone: '',
    note: '',
    withToken: false,
    tokenId: null,
    tokenNo: null,
  },
  trade: {
    item: '',
    unit: 'kg',
    qty: '',
    rate: '',
    amount: '',
    paid: true,
    name: '',
    village: '',
    phone: '',
    photo: '',
    note: '',
  },
  tokenForm: {
    serviceId: null,
    name: '',
    village: '',
    qty: '',
    lossRateG: '',
    totalLossG: 0,
    netWeight: 0,
  },
  auth: { mode: 'status', error: '' },
  admin: {
    authenticated: false,
    key: '',
    metrics: null,
    tenants: [],
    loading: false,
    q: '',
    filter: 'all',
    error: '',
  },
};

export const root = typeof document !== 'undefined' ? document.getElementById('root') : null;
export const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal') : null;
export const modalEl = modalRoot;
export const toastEl = typeof document !== 'undefined' ? document.getElementById('toast') : null;
export const printEl = typeof document !== 'undefined' ? document.getElementById('print') : null;
