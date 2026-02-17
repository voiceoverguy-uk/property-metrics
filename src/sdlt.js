function calculateSDLT(price, buyerType) {
  if (price <= 0) return 0;

  if (buyerType === 'ftb') {
    return calculateFTB(price);
  } else if (buyerType === 'additional') {
    return calculateAdditional(price);
  }
  return calculateStandard(price);
}

function calculateStandard(price) {
  const bands = [
    { threshold: 250000, rate: 0 },
    { threshold: 925000, rate: 0.05 },
    { threshold: 1500000, rate: 0.10 },
    { threshold: Infinity, rate: 0.12 },
  ];
  return applyBands(price, bands);
}

function calculateFTB(price) {
  if (price > 625000) {
    return calculateStandard(price);
  }
  const bands = [
    { threshold: 425000, rate: 0 },
    { threshold: 625000, rate: 0.05 },
  ];
  return applyBands(price, bands);
}

function calculateAdditional(price) {
  const bands = [
    { threshold: 250000, rate: 0.05 },
    { threshold: 925000, rate: 0.10 },
    { threshold: 1500000, rate: 0.15 },
    { threshold: Infinity, rate: 0.17 },
  ];
  return applyBands(price, bands);
}

function applyBands(price, bands) {
  let tax = 0;
  let prev = 0;
  for (const band of bands) {
    if (price <= prev) break;
    const taxable = Math.min(price, band.threshold) - prev;
    if (taxable > 0) {
      tax += taxable * band.rate;
    }
    prev = band.threshold;
  }
  return Math.round(tax);
}

function getSDLTBreakdown(price, buyerType) {
  if (price <= 0) return { total: 0, bands: [] };

  let bands;
  if (buyerType === 'ftb' && price <= 625000) {
    bands = [
      { from: 0, to: 425000, rate: 0 },
      { from: 425000, to: 625000, rate: 0.05 },
    ];
  } else if (buyerType === 'additional') {
    bands = [
      { from: 0, to: 250000, rate: 0.05 },
      { from: 250000, to: 925000, rate: 0.10 },
      { from: 925000, to: 1500000, rate: 0.15 },
      { from: 1500000, to: Infinity, rate: 0.17 },
    ];
  } else {
    bands = [
      { from: 0, to: 250000, rate: 0 },
      { from: 250000, to: 925000, rate: 0.05 },
      { from: 925000, to: 1500000, rate: 0.10 },
      { from: 1500000, to: Infinity, rate: 0.12 },
    ];
  }

  let total = 0;
  const result = [];
  for (const band of bands) {
    if (price <= band.from) break;
    const taxable = Math.min(price, band.to) - band.from;
    if (taxable > 0) {
      const tax = Math.round(taxable * band.rate);
      total += tax;
      result.push({
        from: band.from,
        to: Math.min(price, band.to),
        rate: band.rate,
        taxable,
        tax,
      });
    }
  }

  return { total, bands: result };
}

module.exports = { calculateSDLT, getSDLTBreakdown };
