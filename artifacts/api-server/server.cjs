const express = require('express');
const path = require('path');
const fs = require('fs');
const { calculateDeal, calculateTargetOfferPrice, calculateRequiredRent } = require('./legacy-src/calcs');
const { getSDLTBreakdown } = require('./legacy-src/sdlt');

const app = express();
const PORT = Number(process.env.PORT);
if (!Number.isInteger(PORT) || PORT <= 0) throw new Error('PORT is required');

const ALLOWED_ORIGINS = [
  'https://rentalmetrics.co.uk',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:3000',
];

app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('www.')) {
    const canonical = 'https://' + host.replace(/^www\./, '') + req.url;
    return res.redirect(301, canonical);
  }
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get('/api/healthz', (req, res) => res.json({ status: 'ok' }));

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
    const { calculateSDLT } = require('./legacy-src/sdlt');
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

    const resolvedTargetYield = Number(targetYield) || 7.0;
    const requiredRentParams = { price: params.price, targetYield: resolvedTargetYield, voidPct: params.voidPct, runningCosts: params.runningCosts };

    const investorResult = calculateDeal({ ...params, buyerType: 'additional' });
    investorResult.breakdown.costItems = parsedCostItems;
    const investorBreakdown = getSDLTBreakdown(params.price, 'additional');
    const investorOffer = calculateTargetOfferPrice({ ...params, buyerType: 'additional', targetYield: resolvedTargetYield });
    const investorRequiredRent = calculateRequiredRent(requiredRentParams);

    const ftbResult = calculateDeal({ ...params, buyerType: 'ftb' });
    ftbResult.breakdown.costItems = parsedCostItems;
    const ftbBreakdown = getSDLTBreakdown(params.price, 'ftb');
    const ftbOffer = calculateTargetOfferPrice({ ...params, buyerType: 'ftb', targetYield: resolvedTargetYield });
    const ftbRequiredRent = calculateRequiredRent(requiredRentParams);

    const mainResult = calculateDeal({ ...params, buyerType: 'standard' });
    mainResult.breakdown.costItems = parsedCostItems;
    const mainBreakdown = getSDLTBreakdown(params.price, 'standard');
    const mainOffer = calculateTargetOfferPrice({ ...params, buyerType: 'standard', targetYield: resolvedTargetYield });
    const mainRequiredRent = calculateRequiredRent(requiredRentParams);

    res.json({
      investor: {
        ...investorResult,
        sdltBreakdown: investorBreakdown,
        targetOffer: investorOffer,
        requiredRent: investorRequiredRent,
      },
      ftb: {
        ...ftbResult,
        sdltBreakdown: ftbBreakdown,
        targetOffer: ftbOffer,
        requiredRent: ftbRequiredRent,
      },
      main: {
        ...mainResult,
        sdltBreakdown: mainBreakdown,
        targetOffer: mainOffer,
        requiredRent: mainRequiredRent,
      },
      targetYield: Number(targetYield) || 7.0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Calculation error. Please check your inputs.' });
  }
});

const SUGGESTIONS_FILE = path.join(__dirname, 'data', 'cost-label-suggestions.json');
const rateLimitMap = new Map();

function loadSuggestions() {
  try {
    if (fs.existsSync(SUGGESTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveSuggestions(data) {
  const dir = path.dirname(SUGGESTIONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(data, null, 2));
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 });
    return false;
  }
  if (now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

app.post('/api/suggestions/cost-label', (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const { label, source } = req.body;
    if (!label || typeof label !== 'string') {
      return res.status(400).json({ error: 'Label is required' });
    }

    const cleaned = label.trim();
    if (cleaned.length < 3 || cleaned.length > 40) {
      return res.status(400).json({ error: 'Label must be 3-40 characters' });
    }

    if (/https?:\/\/|www\./i.test(cleaned)) {
      return res.status(400).json({ error: 'Invalid label' });
    }

    const blocked = ['fuck','shit','damn','crap','ass','dick','bitch','bastard','cunt','piss'];
    if (blocked.some(w => cleaned.toLowerCase().includes(w))) {
      return res.status(400).json({ error: 'Invalid label' });
    }

    const validSource = source === 'recurring_costs' ? 'recurring_costs' : 'additional_costs';
    const suggestions = loadSuggestions();
    const key = cleaned.toLowerCase();

    if (!suggestions[key]) {
      suggestions[key] = { label: cleaned, source: validSource, count: 1, firstSeen: new Date().toISOString() };
    } else {
      suggestions[key].count++;
      suggestions[key].lastSeen = new Date().toISOString();
    }

    saveSuggestions(suggestions);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  require('pino')().info({ port: PORT }, 'RentalMetrics API running');
});
