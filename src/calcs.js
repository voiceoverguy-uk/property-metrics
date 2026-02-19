const { calculateSDLT } = require('./sdlt');

function calculateDeal(params) {
  const {
    price,
    monthlyRent,
    solicitorFees = 1500,
    refurbCosts = 0,
    otherCosts = 0,
    voidPct = 0,
    runningCosts = 0,
    buyerType = 'additional',
  } = params;

  const sdlt = calculateSDLT(price, buyerType);
  const totalCost = price + sdlt + solicitorFees + refurbCosts + otherCosts;
  const annualRent = monthlyRent * 12;
  const effectiveAnnualRent = annualRent * (1 - voidPct / 100);
  const grossYield = price > 0 ? (annualRent / price) * 100 : 0;

  const netAnnualRent =
    effectiveAnnualRent - runningCosts * 12;
  const netYield = price > 0 ? (netAnnualRent / price) * 100 : 0;

  return {
    sdlt,
    totalCost,
    annualRent,
    effectiveAnnualRent,
    grossYield: Math.round(grossYield * 100) / 100,
    netAnnualRent,
    netYield: Math.round(netYield * 100) / 100,
    breakdown: {
      price,
      sdlt,
      solicitorFees,
      refurbCosts,
      otherCosts,
    },
  };
}

function calculateTargetOfferPrice(params) {
  const {
    targetYield = 7.0,
    monthlyRent,
    solicitorFees = 1500,
    refurbCosts = 0,
    otherCosts = 0,
    voidPct = 0,
    runningCosts = 0,
    buyerType = 'additional',
  } = params;

  const netAnnualRent =
    monthlyRent * 12 * (1 - voidPct / 100) - runningCosts * 12;

  if (targetYield <= 0 || netAnnualRent <= 0) {
    return { offerPrice: 0, achievable: false };
  }

  const fees = solicitorFees + refurbCosts + otherCosts;
  let guess = (netAnnualRent / (targetYield / 100)) - fees;

  if (guess <= 0) {
    return { offerPrice: 0, achievable: false };
  }

  for (let i = 0; i < 20; i++) {
    const sdlt = calculateSDLT(guess, buyerType);
    const newGuess = (netAnnualRent / (targetYield / 100)) - sdlt - fees;
    if (newGuess <= 0) {
      return { offerPrice: 0, achievable: false };
    }
    if (Math.abs(newGuess - guess) < 50) {
      guess = newGuess;
      break;
    }
    guess = newGuess;
  }

  const offerPrice = Math.round(guess / 100) * 100;
  return { offerPrice, achievable: offerPrice > 0 };
}

module.exports = { calculateDeal, calculateTargetOfferPrice };
