const express = require('express');
const path = require('path');
const fs = require('fs');
const { calculateDeal, calculateTargetOfferPrice } = require('./src/calcs');
const { getSDLTBreakdown } = require('./src/sdlt');

const app = express();
const PORT = 5000;
const CACHE_BUST = Date.now().toString(36);

app.use(express.json());

const htmlTemplate = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

const OG_IMAGE = 'https://rentalmetrics.co.uk/rental-metrics-logo-primary-1200x630-og.png?v=2';

const routeMeta = {
  '/': {
    pageTitle: 'RentalMetrics | UK Buy-to-Let Deal & Yield Calculator',
    metaDesc: 'Free UK buy-to-let deal calculator and modelling tool. Analyse rental yield, stress test mortgages, model costs and project returns in seconds.',
    canonical: 'https://rentalmetrics.co.uk/',
    ogTitle: 'RentalMetrics | UK Buy-to-Let Deal Calculator & Modelling Tool',
    ogDesc: 'Free UK buy-to-let deal calculator and modelling tool. Analyse rental yield, stress test mortgages and project returns.',
    ogUrl: 'https://rentalmetrics.co.uk/',
  },
  '/deal-analyser': {
    pageTitle: 'RentalMetrics | Buy-to-Let Deal Calculator UK',
    metaDesc: 'Free UK buy-to-let deal calculator and modelling tool. Analyse rental yield, stress test mortgages, model costs and project returns in seconds.',
    canonical: 'https://rentalmetrics.co.uk/deal-analyser',
    ogTitle: 'Buy-to-Let Deal Calculator (UK) | RentalMetrics',
    ogDesc: 'Stress test rent vs mortgage, model costs and cash-on-cash return, and see if a deal meets your target yield. Free tool.',
    ogUrl: 'https://rentalmetrics.co.uk/deal-analyser',
  },
  '/sdlt-calculator': {
    pageTitle: 'Stamp Duty Calculator UK | Free SDLT Tool',
    metaDesc: 'Free UK Stamp Duty calculator for main residences, first-time buyers and investors. Accurate SDLT estimates in seconds.',
    canonical: 'https://rentalmetrics.co.uk/sdlt-calculator',
    ogTitle: 'Stamp Duty Calculator UK (SDLT)',
    ogDesc: 'Free SDLT calculator for main residences, first-time buyers and investors. Instant estimates using current England rates.',
    ogUrl: 'https://rentalmetrics.co.uk/sdlt-calculator',
  },
};

function serveHtml(req, res) {
  const meta = routeMeta[req.path] || routeMeta['/'];
  const html = htmlTemplate
    .replace(/%%PAGE_TITLE%%/g, meta.pageTitle)
    .replace(/%%META_DESC%%/g, meta.metaDesc)
    .replace(/%%CANONICAL%%/g, meta.canonical)
    .replace(/%%OG_TITLE%%/g, meta.ogTitle)
    .replace(/%%OG_DESC%%/g, meta.ogDesc)
    .replace(/%%OG_URL%%/g, meta.ogUrl)
    .replace(/%%OG_IMAGE%%/g, OG_IMAGE);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(html.replace(/\?v=\d+/g, '?v=' + CACHE_BUST));
}

app.get(['/', '/deal-analyser', '/simple-analyser', '/sdlt-calculator'], serveHtml);

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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

    const mainResult = calculateDeal({ ...params, buyerType: 'standard' });
    mainResult.breakdown.costItems = parsedCostItems;
    const mainBreakdown = getSDLTBreakdown(params.price, 'standard');
    const mainOffer = calculateTargetOfferPrice({ ...params, buyerType: 'standard', targetYield: Number(targetYield) || 7.0 });

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
      main: {
        ...mainResult,
        sdltBreakdown: mainBreakdown,
        targetOffer: mainOffer,
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
  console.log(`Server running on port ${PORT}`);
});
