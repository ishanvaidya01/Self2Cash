/**
 * Shelf2Cash API Client
 * All backend calls go through here. Never invent data client-side.
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const DEFAULT_MERCHANT = import.meta.env.VITE_DEMO_MERCHANT || 'merchant_001';

const api = axios.create({ baseURL: BASE_URL });

// Attach merchantId to every GET request
api.interceptors.request.use(config => {
  if (config.method === 'get' && !config.params?.merchantId) {
    config.params = { ...config.params, merchantId: DEFAULT_MERCHANT };
  }
  return config;
});

export const merchantId = DEFAULT_MERCHANT;

// ── Business Health ─────────────────────────────────────────────────────────
export const getBusinessHealth = (mid = DEFAULT_MERCHANT) =>
  api.get('/business-health', { params: { merchantId: mid } }).then(r => r.data);

// ── Inventory ───────────────────────────────────────────────────────────────
export const getInventory = (mid = DEFAULT_MERCHANT) =>
  api.get('/inventory', { params: { merchantId: mid } }).then(r => r.data);

export const updateInventory = (data) =>
  api.post('/inventory', { merchantId: DEFAULT_MERCHANT, ...data }).then(r => r.data);

export const getInventoryHealth = (mid = DEFAULT_MERCHANT) =>
  api.get('/inventory/health', { params: { merchantId: mid } }).then(r => r.data);

// ── Products ─────────────────────────────────────────────────────────────────
export const getProducts = (mid = DEFAULT_MERCHANT) =>
  api.get('/products', { params: { merchantId: mid } }).then(r => r.data);

// ── Sales ────────────────────────────────────────────────────────────────────
export const getSales = (days = 30, mid = DEFAULT_MERCHANT) =>
  api.get('/sales', { params: { merchantId: mid, days } }).then(r => r.data);

export const recordSale = (data) =>
  api.post('/sales', { merchantId: DEFAULT_MERCHANT, ...data }).then(r => r.data);

// ── Working Capital ──────────────────────────────────────────────────────────
export const getWorkingCapital = (mid = DEFAULT_MERCHANT) =>
  api.get('/working-capital', { params: { merchantId: mid } }).then(r => r.data);

export const getCashConversionClock = (productId, mid = DEFAULT_MERCHANT) =>
  api.get(`/working-capital/clock/${productId}`, { params: { merchantId: mid } }).then(r => r.data);

// ── Recommendations ──────────────────────────────────────────────────────────
export const getRecommendations = (mid = DEFAULT_MERCHANT) =>
  api.get('/recommendations', { params: { merchantId: mid } }).then(r => r.data);

// ── Forecast ─────────────────────────────────────────────────────────────────
export const getForecast = (productId, mid = DEFAULT_MERCHANT) =>
  api.get(`/forecast/${productId}`, { params: { merchantId: mid } }).then(r => r.data);

// ── Alerts ───────────────────────────────────────────────────────────────────
export const getAlerts = (mid = DEFAULT_MERCHANT) =>
  api.get('/alerts', { params: { merchantId: mid } }).then(r => r.data);

// ── External Signals ─────────────────────────────────────────────────────────
export const getExternalSignals = () =>
  api.get('/external-signals').then(r => r.data);

export const refreshSignals = () =>
  api.post('/external-signals/refresh').then(r => r.data);

// ── What-If Simulator ────────────────────────────────────────────────────────
export const runSimulation = (params) =>
  api.post('/simulate', { merchantId: DEFAULT_MERCHANT, ...params }).then(r => r.data);

// ── Vision ───────────────────────────────────────────────────────────────────
export const submitVisionVerification = (data) =>
  api.post('/vision/verify-shelf', { merchantId: DEFAULT_MERCHANT, ...data }).then(r => r.data);

export const getVisionHistory = (mid = DEFAULT_MERCHANT) =>
  api.get('/vision/history', { params: { merchantId: mid } }).then(r => r.data);

// ── Khata ────────────────────────────────────────────────────────────────────
export const getKhata = (mid = DEFAULT_MERCHANT) =>
  api.get('/khata', { params: { merchantId: mid } }).then(r => r.data);

export const sendWhatsAppReminder = (customerId) =>
  api.post('/khata/reminder', { merchantId: DEFAULT_MERCHANT, customerId }).then(r => r.data);

// ── Credit Score ─────────────────────────────────────────────────────────────
export const getCreditScore = (mid = DEFAULT_MERCHANT) =>
  api.get(`/credit-score/${mid}`).then(r => r.data);

// ── Mesh ─────────────────────────────────────────────────────────────────────
export const getMeshMatches = (mid = DEFAULT_MERCHANT) =>
  api.get(`/mesh/matches/${mid}`).then(r => r.data);

export const getMeshDemandSignal = (category, mid = DEFAULT_MERCHANT) =>
  api.get(`/mesh/demand-signal/${encodeURIComponent(category)}`, { params: { merchantId: mid } }).then(r => r.data);

export const getNearbyMerchants = (mid = DEFAULT_MERCHANT) =>
  api.get('/mesh/merchants', { params: { merchantId: mid } }).then(r => r.data);

export const proposeSwap = (matchId, action) =>
  api.post('/mesh/propose-swap', { matchId, action, merchantId: DEFAULT_MERCHANT }).then(r => r.data);

export const triggerMeshScan = () =>
  api.post('/mesh/scan').then(r => r.data);

// ── Factoring ────────────────────────────────────────────────────────────────
export const getFactoringQuote = (productId) =>
  api.post('/factoring/quote', { merchantId: DEFAULT_MERCHANT, productId }).then(r => r.data);

export const acceptFactoringQuote = (quoteId) =>
  api.post('/factoring/accept', { merchantId: DEFAULT_MERCHANT, quoteId }).then(r => r.data);

// ── Merchants ────────────────────────────────────────────────────────────────
export const getAllMerchants = () =>
  api.get('/merchants').then(r => r.data);

export default api;
