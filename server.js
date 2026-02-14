const express = require('express');
const path = require('path');
const { calculateDeal, calculateTargetOfferPrice } = require('./src/calcs');
const { getSDLTBreakdown } = require('./src/sdlt');

const app = express();
const PORT = 5000;

app.use(express.json());
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
    const { price, monthlyRent, solicitorFees, refurbCosts, otherCosts, costItems, voidMonths, runningCosts, targetYield } = req.body;

    if (!price || price <= 0 || !monthlyRent || monthlyRent <= 0) {
      return res.status(400).json({ error: 'Price and monthly rent are required and must be positive.' });
    }

    const params = {
      price: Number(price),
      monthlyRent: Number(monthlyRent),
      solicitorFees: Number(solicitorFees) || 1500,
      refurbCosts: Number(refurbCosts) || 0,
      otherCosts: Number(otherCosts) || 0,
      voidMonths: Number(voidMonths) || 0,
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
