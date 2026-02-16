const express = require('express');
const path = require('path');
const { calculateDeal, calculateTargetOfferPrice } = require('./src/calcs');
const { getSDLTBreakdown } = require('./src/sdlt');

const app = express();
const PORT = 5000;

app.use(express.json());

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

app.get('/api/maps-key', (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY || '';
  res.json({ key });
});

app.get('/api/sdlt', (req, res) => {
  try {
    const price = Number(req.query.price);
    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Price is required and must be positive.' });
    }
    const { calculateSDLT } = require('./src/sdlt');
    res.json({
      standard: {
        total: calculateSDLT(price, 'standard'),
        breakdown: getSDLTBreakdown(price, 'standard'),
      },
      ftb: {
        total: calculateSDLT(price, 'ftb'),
        breakdown: getSDLTBreakdown(price, 'ftb'),
      },
      additional: {
        total: calculateSDLT(price, 'additional'),
        breakdown: getSDLTBreakdown(price, 'additional'),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'SDLT calculation error.' });
  }
});

app.post('/api/calculate', (req, res) => {
  try {
    const { price, monthlyRent, solicitorFees, refurbCosts, otherCosts, costItems, voidPct, runningCosts, targetYield } = req.body;

    if (!price || price <= 0 || !monthlyRent || monthlyRent <= 0) {
      return res.status(400).json({ error: 'Price and monthly rent are required and must be positive.' });
    }

    const params = {
      price: Number(price),
      monthlyRent: Number(monthlyRent),
      solicitorFees: solicitorFees !== undefined && solicitorFees !== null && solicitorFees !== '' ? Number(solicitorFees) : 1500,
      refurbCosts: Number(refurbCosts) || 0,
      otherCosts: Number(otherCosts) || 0,
      voidPct: Number(voidPct) || 0,
      runningCosts: Number(runningCosts) || 0,
    };

    const parsedCostItems = Array.isArray(costItems)
      ? costItems.map(item => ({ label: String(item.label || ''), amount: Number(item.amount) || 0 }))
      : [];

    const investorResult = calculateDeal({ ...params, buyerType: 'additional' });
    investorResult.breakdown.costItems = parsedCostItems;
    const investorBreakdown = getSDLTBreakdown(params.price, 'additional');
    const investorOffer = calculateTargetOfferPrice({ ...params, buyerType: 'additional', targetYield: Number(targetYield) || 7.0 });

    const ftbResult = calculateDeal({ ...params, buyerType: 'ftb' });
    ftbResult.breakdown.costItems = parsedCostItems;
    const ftbBreakdown = getSDLTBreakdown(params.price, 'ftb');
    const ftbOffer = calculateTargetOfferPrice({ ...params, buyerType: 'ftb', targetYield: Number(targetYield) || 7.0 });

    res.json({
      investor: {
        ...investorResult,
        sdltBreakdown: investorBreakdown,
        targetOffer: investorOffer,
      },
      ftb: {
        ...ftbResult,
        sdltBreakdown: ftbBreakdown,
        targetOffer: ftbOffer,
      },
      targetYield: Number(targetYield) || 7.0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Calculation error. Please check your inputs.' });
  }
});

const placesCache = new Map();
const PLACES_CACHE_TTL = 10 * 60 * 1000;

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const CATEGORY_TYPES = {
  supermarkets: 'supermarket',
  schools: 'school',
  transport: 'transit_station',
  parks: 'park',
  healthcare: 'doctor',
  gyms: 'gym',
};

app.post('/api/places/nearby', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }

    const { lat, lng, radiusMeters, category } = req.body;
    if (!lat || !lng || !radiusMeters || !category) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const placeType = CATEGORY_TYPES[category];
    if (!placeType) {
      return res.status(400).json({ error: 'Invalid category.' });
    }

    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)},${radiusMeters},${category}`;
    const cached = placesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PLACES_CACHE_TTL) {
      return res.json({ results: cached.data });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured.' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${placeType}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', data.status, data.error_message);
      return res.status(502).json({ error: 'Places API error.' });
    }

    const results = (data.results || []).slice(0, 10).map(p => ({
      name: p.name,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      placeId: p.place_id,
      rating: p.rating || null,
    }));

    placesCache.set(cacheKey, { data: results, timestamp: Date.now() });

    if (placesCache.size > 500) {
      const now = Date.now();
      for (const [key, val] of placesCache) {
        if (now - val.timestamp > PLACES_CACHE_TTL) placesCache.delete(key);
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('Places nearby error:', err);
    res.status(500).json({ error: 'Failed to fetch nearby places.' });
  }
});

app.get(['/', '/deal-analyser', '/sdlt-calculator'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
