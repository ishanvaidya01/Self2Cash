/**
 * ExternalSignalService — Agmarknet mandi prices + OpenWeatherMap + Festival calendar
 */

const axios = require('axios');
const ExternalSignal = require('../models/ExternalSignal');
const festivalCalendar = require('../data/festivalCalendar.json');

// ── Mandi Price Polling ───────────────────────────────────────────────────────
const MANDI_COMMODITIES = [
  { name: 'Onion', commodity: 'ONION', state: 'Uttar Pradesh' },
  { name: 'Tomato', commodity: 'TOMATO', state: 'Uttar Pradesh' },
  { name: 'Potato', commodity: 'POTATO', state: 'Uttar Pradesh' },
  { name: 'Mustard Seed', commodity: 'MUSTARD', state: 'Rajasthan' }
];

async function pollMandiPrices() {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey || apiKey === 'your_data_gov_api_key_here') {
    console.log('[Mandi] No API key — using cached/mock prices');
    await injectMockMandiPrices();
    return;
  }

  try {
    for (const commodity of MANDI_COMMODITIES) {
      const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070` +
        `?api-key=${apiKey}&format=json&filters[commodity]=${commodity.commodity}&filters[state]=${encodeURIComponent(commodity.state)}&limit=5`;

      const response = await axios.get(url, { timeout: 8000 });
      const records = response.data?.records || [];

      if (records.length === 0) continue;

      // Average modal price across returned records
      const avgPrice = records.reduce((s, r) => s + parseFloat(r.modal_price || 0), 0) / records.length;

      // Fetch last stored price to compute change
      const lastSignal = await ExternalSignal.findOne({
        type: 'MANDI_PRICE', commodity: commodity.commodity, isActive: true
      }).sort({ fetchedAt: -1 });

      const lastPrice = lastSignal?.payload?.modalPrice || avgPrice;
      const priceChangePercent = Math.round((avgPrice - lastPrice) / lastPrice * 1000) / 10;

      // Deactivate old signal
      await ExternalSignal.updateMany(
        { type: 'MANDI_PRICE', commodity: commodity.commodity },
        { isActive: false }
      );

      await ExternalSignal.create({
        signalId: `mandi_${commodity.commodity.toLowerCase()}_${Date.now()}`,
        type: 'MANDI_PRICE',
        commodity: commodity.commodity,
        location: commodity.state,
        payload: {
          commodity: commodity.name,
          modalPrice: Math.round(avgPrice),
          priceChangePercent,
          unit: '₹/quintal',
          markets: records.map(r => ({ market: r.market, price: parseFloat(r.modal_price) })).slice(0, 3),
          alertMessage: Math.abs(priceChangePercent) >= 5
            ? `${commodity.name} wholesale ${priceChangePercent < 0 ? 'down' : 'up'} ${Math.abs(priceChangePercent)}% — ${priceChangePercent < 0 ? 'buy opportunity' : 'procure before price rises'}`
            : null
        },
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000), // 7h (slightly longer than polling interval)
        isActive: true
      });

      console.log(`[Mandi] ${commodity.name}: ₹${Math.round(avgPrice)}/q (${priceChangePercent > 0 ? '+' : ''}${priceChangePercent}%)`);
    }
  } catch (err) {
    console.error('[Mandi] API error:', err.message);
    await injectMockMandiPrices();
  }
}

async function injectMockMandiPrices() {
  // Only inject if no active mandi signals exist
  const existing = await ExternalSignal.countDocuments({ type: 'MANDI_PRICE', isActive: true });
  if (existing > 0) return;

  const mockPrices = [
    { commodity: 'ONION', name: 'Onion', price: 1850, change: -12.3 }, // Demo: buy signal
    { commodity: 'TOMATO', name: 'Tomato', price: 2400, change: 8.5 },
    { commodity: 'POTATO', name: 'Potato', price: 1200, change: -3.1 },
    { commodity: 'MUSTARD', name: 'Mustard Seed', price: 5200, change: 5.8 }
  ];

  for (const mp of mockPrices) {
    await ExternalSignal.findOneAndUpdate(
      { type: 'MANDI_PRICE', commodity: mp.commodity, isActive: true },
      {
        signalId: `mandi_mock_${mp.commodity.toLowerCase()}`,
        type: 'MANDI_PRICE',
        commodity: mp.commodity,
        location: 'Uttar Pradesh',
        payload: {
          commodity: mp.name,
          modalPrice: mp.price,
          priceChangePercent: mp.change,
          unit: '₹/quintal',
          markets: [{ market: 'Azadpur Mandi, Delhi', price: mp.price }],
          alertMessage: Math.abs(mp.change) >= 5
            ? `${mp.name} wholesale ${mp.change < 0 ? 'down' : 'up'} ${Math.abs(mp.change)}% — ${mp.change < 0 ? 'buy opportunity' : 'procure before price rises'}`
            : null,
          isDemo: true
        },
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        isActive: true
      },
      { upsert: true, new: true }
    );
  }
  console.log('[Mandi] Mock prices injected (no API key configured)');
}

// ── Weather Polling ───────────────────────────────────────────────────────────
async function pollWeather(lat = 28.5706, lon = 77.3261) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    console.log('[Weather] No API key — using mock weather');
    await injectMockWeather();
    return;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=8`;
    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    const forecasts = data.list || [];
    const avgTemp = forecasts.reduce((s, f) => s + f.main.temp, 0) / forecasts.length;
    const hasRain = forecasts.some(f => f.weather.some(w => w.main === 'Rain'));
    const hasClearSky = forecasts.filter(f => f.weather.some(w => w.main === 'Clear')).length > 4;

    let condition = 'normal';
    let demandImpact = 'No significant weather impact on demand expected.';
    let affectedCategories = [];

    if (avgTemp > 35) {
      condition = 'heat_wave';
      demandImpact = `High temp (${Math.round(avgTemp)}°C) forecast — cold drinks, ice cream, beverages will spike. Stock up on Dairy & Beverages.`;
      affectedCategories = ['Dairy & Beverages'];
    } else if (hasRain) {
      condition = 'heavy_rain';
      demandImpact = 'Rain forecast — customers stock up on noodles, biscuits, snacks for home. Umbrella/raincoat demand spikes.';
      affectedCategories = ['Biscuits & Snacks', 'Noodles & Pasta'];
    } else if (hasClearSky && avgTemp > 25) {
      condition = 'pleasant';
      demandImpact = 'Pleasant weather — normal foot traffic expected. No special demand adjustments.';
    }

    await ExternalSignal.deleteMany({ type: 'WEATHER_ALERT' });
    await ExternalSignal.create({
      signalId: `weather_${Date.now()}`,
      type: 'WEATHER_ALERT',
      location: `${lat},${lon}`,
      payload: {
        condition,
        avgTempCelsius: Math.round(avgTemp),
        hasRain,
        description: `${condition.replace('_', ' ')} — ${Math.round(avgTemp)}°C`,
        demandImpact,
        affectedCategories,
        source: 'OpenWeatherMap'
      },
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      isActive: true
    });

    console.log(`[Weather] ${condition} at ${Math.round(avgTemp)}°C`);
  } catch (err) {
    console.error('[Weather] API error:', err.message);
    await injectMockWeather();
  }
}

async function injectMockWeather() {
  const existing = await ExternalSignal.countDocuments({ type: 'WEATHER_ALERT', isActive: true });
  if (existing > 0) return;

  await ExternalSignal.create({
    signalId: `weather_mock_${Date.now()}`,
    type: 'WEATHER_ALERT',
    location: '28.5706,77.3261',
    payload: {
      condition: 'heat_wave',
      avgTempCelsius: 38,
      hasRain: false,
      description: 'Heat wave — 38°C forecast for Noida',
      demandImpact: 'High temperature forecast — cold drinks, water, juices will spike 35–40%. Stock up on Dairy & Beverages.',
      affectedCategories: ['Dairy & Beverages'],
      source: 'Demo (OpenWeatherMap key not configured)',
      isDemo: true
    },
    fetchedAt: new Date(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    isActive: true
  });
  console.log('[Weather] Mock heat wave signal injected');
}

// ── Festival Calendar ─────────────────────────────────────────────────────────
async function getUpcomingFestivals(daysAhead = 60) {
  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const now = new Date();

  return festivalCalendar
    .filter(f => {
      const startDate = new Date(f.startDate);
      return startDate >= now && startDate <= cutoff;
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

// ── Get all active signals ────────────────────────────────────────────────────
async function getAllSignals() {
  const [dbSignals, festivals] = await Promise.all([
    ExternalSignal.find({ isActive: true, expiresAt: { $gt: new Date() } }).sort({ fetchedAt: -1 }),
    getUpcomingFestivals(60)
  ]);

  return {
    mandiPrices: dbSignals.filter(s => s.type === 'MANDI_PRICE'),
    weather: dbSignals.filter(s => s.type === 'WEATHER_ALERT'),
    festivals: dbSignals.filter(s => s.type === 'FESTIVAL'),
    upcomingFestivals: festivals,
    lastRefreshed: dbSignals[0]?.fetchedAt || null
  };
}

module.exports = {
  pollMandiPrices,
  pollWeather,
  getAllSignals,
  getUpcomingFestivals,
  injectMockMandiPrices,
  injectMockWeather
};
