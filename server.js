const express = require('express');
const path = require('path');
const fs = require('fs');
const { calculateDeal, calculateTargetOfferPrice } = require('./src/calcs');
const { getSDLTBreakdown } = require('./src/sdlt');

const app = express();
const PORT = 5000;

app.use(express.json());

const htmlTemplate = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

const OG_IMAGE = 'https://rentalmetrics.co.uk/rental-metrics-icon-1024.png';

const routeMeta = {
  '/': {
    pageTitle: 'Rental Yield Calculator UK | Free BTL Tool',
    metaDesc: 'Free UK rental yield calculator. Estimate gross and net yield, cash flow and acquisition costs for buy-to-let property deals.',
    canonical: 'https://rentalmetrics.co.uk/',
    ogTitle: 'Rental Yield Calculator UK (Free)',
    ogDesc: 'Estimate gross and net yield, cash flow and acquisition costs for UK buy-to-let deals in seconds.',
    ogUrl: 'https://rentalmetrics.co.uk/',
  },
  '/deal-analyser': {
    pageTitle: 'Buy-to-Let Deal Analyser UK | Stress Test Deals',
    metaDesc: 'Analyse UK buy-to-let deals with stress testing, cash-on-cash return and full acquisition cost breakdown. Free online tool.',
    canonical: 'https://rentalmetrics.co.uk/deal-analyser',
    ogTitle: 'Buy-to-Let Deal Analyser UK',
    ogDesc: 'Stress test rent vs mortgage, model costs and cash-on-cash return, and see if a deal meets your target yield. Free tool.',
    ogUrl: 'https://rentalmetrics.co.uk/deal-analyser',
  },
  '/sdlt-calculator': {
    pageTitle: 'Stamp Duty Calculator UK | Free SDLT Tool',
    metaDesc: 'Free UK Stamp Duty calculator for investors, additional properties and first-time buyers. Accurate SDLT estimates in seconds.',
    canonical: 'https://rentalmetrics.co.uk/sdlt-calculator',
    ogTitle: 'Stamp Duty Calculator UK (SDLT)',
    ogDesc: 'Free SDLT calculator for investors, additional properties and first-time buyers. Instant estimates using current England rates.',
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
  res.send(html);
}

app.get(['/', '/deal-analyser', '/sdlt-calculator'], serveHtml);

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
