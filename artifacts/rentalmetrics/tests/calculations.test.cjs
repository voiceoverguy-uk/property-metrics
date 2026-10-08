const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { calculateSDLT, getSDLTBreakdown } = require('../../api-server/legacy-src/sdlt');
const { calculateDeal, calculateRequiredRent } = require('../../api-server/legacy-src/calcs');

const source = readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
function siteFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const open = source.indexOf('{', start);
  let depth = 1, end = open + 1;
  while (depth && end < source.length) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  return source.slice(start, end);
}
const engine = vm.createContext({});
vm.runInContext(['calcSDLTClient', 'calcSDLTClientFull'].map(siteFunction).join('\n'), engine);
const eligible = { allBuyersFirstTime: true, mainResidence: true };

// Independent official examples and boundary expectations, not just client/server parity.
const cases = [
  [0, 'additional', 0], [39999.99, 'additional', 0],
  [40000, 'additional', 2000], [40000.01, 'additional', 2000],
  [125000, 'standard', 0], [125029.99, 'standard', 0],
  [125050, 'standard', 1], [250000, 'standard', 2500],
  [250019.99, 'standard', 2500], [295000, 'standard', 4750],
  [300000, 'additional', 20000], [300006.67, 'additional', 20000],
  [925000, 'standard', 36250], [925009.99, 'standard', 36250],
  [1500000, 'standard', 93750], [1500006.67, 'standard', 93750],
  [125000, 'additional', 6250], [250000, 'additional', 15000],
  [925000, 'additional', 82500], [1500000, 'additional', 168750],
  [1500010, 'additional', 168751],
  [299999.99, 'ftb', 0], [300000, 'ftb', 0],
  [300019.99, 'ftb', 0], [300020, 'ftb', 1],
  [500000, 'ftb', 10000], [500000.01, 'ftb', 15000],
];
for (const [price, type, expected] of cases) {
  test(`SDLT ${type} £${price}: totals, raw bands and browser/API parity`, () => {
    const options = type === 'ftb' ? eligible : {};
    assert.equal(calculateSDLT(price, type, options), expected);
    const breakdown = getSDLTBreakdown(price, type, options);
    assert.equal(breakdown.total, expected);
    assert.equal(Math.floor(breakdown.bands.reduce((sum, b) => sum + b.tax, 0)), expected);
    assert.equal(engine.calcSDLTClient(price, type, options), expected);
    const full = engine.calcSDLTClientFull(price, type, options);
    assert.equal(full.total, expected);
    assert.deepEqual(JSON.parse(JSON.stringify(full.breakdown.bands)),
      breakdown.bands.map(({ taxable, ...band }) => band));
    if (type === 'additional') assert.equal(engine.calcSDLTClient(price, 'investor'), expected);
  });
}
test('FTB requires both explicit booleans; investment calculation never grants relief', () => {
  for (const options of [undefined, {}, { allBuyersFirstTime: true }, { mainResidence: true },
    { allBuyersFirstTime: false, mainResidence: true },
    { allBuyersFirstTime: true, mainResidence: false },
    { allBuyersFirstTime: 'true', mainResidence: 'true' }]) {
    assert.equal(calculateSDLT(350000, 'ftb', options), 7500);
    assert.equal(getSDLTBreakdown(350000, 'ftb', options).total, 7500);
    assert.equal(engine.calcSDLTClient(350000, 'ftb', options), 7500);
    assert.equal(engine.calcSDLTClientFull(350000, 'ftb', options).total, 7500);
  }
  assert.equal(calculateSDLT(350000, 'ftb', eligible), 2500);
  assert.equal(calculateDeal({ price: 350000, monthlyRent: 1500, buyerType: 'ftb', ...eligible }).sdlt, 7500);
});
test('buyer selection only permits confirmed FTB in standalone SDLT, not reopened rental deals', () => {
  const fields = { ftbAllBuyers: { checked: false }, ftbMainResidence: { checked: false }, ftbEligibility: {} };
  const context = vm.createContext({
    selectedBuyerType: 'ftb', currentMode: 'sdlt',
    document: { getElementById: id => fields[id] },
  });
  vm.runInContext(['getFTBEligibility', 'getSelectedBuyerType', 'updateFTBEligibility'].map(siteFunction).join('\n'), context);
  context.updateFTBEligibility();
  assert.equal(fields.ftbEligibility.hidden, false);
  assert.equal(context.getSelectedBuyerType(), 'main');
  fields.ftbAllBuyers.checked = true;
  assert.equal(context.getSelectedBuyerType(), 'main');
  fields.ftbMainResidence.checked = true;
  assert.equal(context.getSelectedBuyerType(), 'ftb');
  context.currentMode = 'analyser';
  assert.equal(context.getSelectedBuyerType(), 'main');
  context.updateFTBEligibility();
  assert.equal(fields.ftbEligibility.hidden, true);
});
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
for (const [name, purchaseType, mortgageType, rate] of [
  ['cash', 'cash', 'interest-only', 5.25],
  ['interest-only', 'mortgage', 'interest-only', 5.25],
  ['repayment', 'mortgage', 'repayment', 5.25],
  ['zero-interest repayment', 'mortgage', 'repayment', 0],
]) {
  test(`ordinary ${name}: asset yield, cash flow and upfront costs unchanged`, () => {
    const values = { address: 'Regression fixture', interestRate: String(rate), mortgageTerm: '25',
      voidAllowance: '5', lettingAgentFee: '10', maintenancePct: '5' };
    const amounts = { price: 200000, monthlyRent: 1100, maintenanceFixed: 0 };
    const context = vm.createContext({
      document: { getElementById: id => ({ value: values[id] || '', checked: id === 'lettingAgentVat' }) },
      getCurrencyFieldValue: id => amounts[id] || 0,
      getSelectedBuyerType: () => 'investor',
      getCostItemsTotal: () => 8500,
      selectedPurchaseType: purchaseType,
      getDepositAmount: () => 50000,
      mortgageType, maintenanceMode: 'pct',
      runningCostItems: [{ amount: 360, freq: 'yr' }],
    });
    vm.runInContext(['calcSDLTClient', 'calcMortgagePayment', 'getLettingAgentPct',
      'getLettingAgentFeeMonthly', 'getMaintenanceAnnual', 'getRunningCostItemsTotal',
      'computeSnapshot'].map(siteFunction).join('\n'), context);
    const result = context.computeSnapshot();
    assert.equal(result.netYield, 4.98);
    assert.equal(result.breakdown.sdlt, 11500);
    assert.equal(result.upfrontTotal, purchaseType === 'cash' ? 220000 : 70000);
    near(result.breakdown.lettingAgentFee, 132);
    near(result.breakdown.maintenanceMonthly, 52.25);
    near(result.breakdown.baseRunningCosts, 30);
    const r = rate / 1200;
    const payment = purchaseType === 'cash' ? 0 : mortgageType === 'interest-only' ? 656.25 :
      rate === 0 ? 500 : 150000 * r / (1 - (1 + r) ** -300);
    near(result.breakdown.mortgagePayment, payment);
    near(result.monthlyCashflow, 830.75 - payment);
    const backend = calculateDeal({ price: 200000, monthlyRent: 1100, solicitorFees: 1500,
      refurbCosts: 7000, voidPct: 5, runningCosts: 214.25 });
    assert.equal(backend.netYield, result.netYield);
    assert.equal(backend.totalCost, 220000);
    near(backend.netAnnualRent / 12, 830.75);
  });
}
test('zero rent and negative cash flow remain valid estimates; required rent uses price basis', () => {
  assert.equal(calculateDeal({ price: 200000, monthlyRent: 0, runningCosts: 100 }).netYield, -0.6);
  assert.deepEqual(calculateRequiredRent({ price: 200000, targetYield: 6, runningCosts: 100 }),
    { monthlyRent: 1100, achievable: true });
});
