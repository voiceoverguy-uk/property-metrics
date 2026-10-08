/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { calculate, newDeal, amount, purchaseTax, validateDeal, scenario, mortgagePayment, type Deal } from '../lib/deals';
import { cloneDeal, decodeStore, emptyStore, saveToStore } from '../lib/storage';
import { summaryHtml } from '../lib/pdf';

const site = readFileSync('../rentalmetrics/public/app.js', 'utf8');
function siteFunction(name: string) {
  const start = site.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const open = site.indexOf('{', start);
  let depth = 1, end = open + 1;
  while (depth && end < site.length) {
    if (site[end] === '{') depth++;
    if (site[end] === '}') depth--;
    end++;
  }
  return site.slice(start, end);
}
// Execute the real website functions with field/helper adapters, not a duplicate expected formula.
function snapshot(d: Deal) {
  const values: Record<string, string> = { address: d.address || 'Fixture', interestRate: d.interestRate, mortgageTerm: d.term, voidAllowance: d.voidPct, lettingAgentFee: d.agentPct, maintenancePct: d.maintenancePct };
  const fields: Record<string, string> = { price: d.price, monthlyRent: d.rent, maintenanceFixed: d.maintenanceAnnual };
  const context = {
    document: { getElementById: (id: string) => ({ value: values[id] || '', checked: id === 'lettingAgentVat' && d.agentVat }) },
    getCurrencyFieldValue: (id: string) => amount(fields[id] || ''),
    getSelectedBuyerType: () => d.buyerType === 'additional' ? 'investor' : 'main',
    getCostItemsTotal: () => d.purchaseCosts.reduce((n, c) => n + amount(c.amount), amount(d.refurb)),
    selectedPurchaseType: d.purchaseType,
    getDepositAmount: () => d.depositMode === 'percent' ? amount(d.price) * amount(d.deposit) / 100 : amount(d.deposit),
    mortgageType: d.mortgageType,
    maintenanceMode: d.maintenanceMode === 'percent' ? 'pct' : 'fixed',
    runningCostItems: d.recurringCosts.map(c => ({ ...c, freq: c.frequency === 'yearly' ? 'yr' : 'mo' })),
  };
  const engine = vm.createContext(context);
  vm.runInContext(['calcSDLTClient', 'calcMortgagePayment', 'getLettingAgentPct', 'getLettingAgentFeeMonthly', 'getMaintenanceAnnual', 'getRunningCostItemsTotal', 'computeSnapshot'].map(siteFunction).join('\n'), engine);
  return vm.runInContext('computeSnapshot()', engine);
}
function fixture(patch: Partial<Deal> = {}): Deal {
  return { ...newDeal(), taxConfirmed: true, name: 'TEST FIXTURE — NOT A REAL PROPERTY', price: '200000', rent: '1100', refurb: '7000',
    purchaseCosts: [{ id: 'legal', label: 'Legal fees', amount: '1500', frequency: 'monthly' }],
    recurringCosts: [{ id: 'insurance', label: 'Insurance', amount: '360', frequency: 'yearly' }],
    voidPct: '5', agentPct: '10', agentVat: true, maintenancePct: '5', ...patch };
}
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
for (const [title, patch] of [
  ['cash', {}], ['interest-only', { purchaseType: 'mortgage', deposit: '25', depositMode: 'percent', interestRate: '5.25' }],
  ['repayment', { purchaseType: 'mortgage', deposit: '50000', interestRate: '5.25', mortgageType: 'repayment', term: '25' }],
  ['zero interest repayment', { purchaseType: 'mortgage', deposit: '50000', interestRate: '0', mortgageType: 'repayment', term: '25' }],
  ['negative cash flow', { purchaseType: 'mortgage', deposit: '50000', interestRate: '12', rent: '400' }],
  ['zero rent and zero costs', { rent: '0', recurringCosts: [], purchaseCosts: [], refurb: '0', voidPct: '0', agentPct: '0', maintenancePct: '0' }],
  ['annual fixed maintenance', { maintenanceMode: 'annual', maintenanceAnnual: '1200' }],
] as [string, Partial<Deal>][]) {
  test(`actual website snapshot parity: ${title}`, () => {
    const d = fixture(patch), r = calculate(d), old = snapshot(d);
    near(r.cashFlow, old.monthlyCashflow); near(r.cashRequired, old.upfrontTotal);
    near(r.netYield, old.netYield); near(r.cashOnCash!, old.cashOnCash);
    near(r.mortgage, old.breakdown.mortgagePayment);
    near(r.management, old.breakdown.lettingAgentFee);
  });
}
test('GBP parsing, zero, invalid values and negative input', () => {
  assert.equal(amount('£ 200,000.50'), 200000.5); assert.equal(amount('0'), 0);
  assert.equal(amount(''), 0); assert.ok(Number.isNaN(amount('price100')));
  assert.ok(Number.isNaN(amount('-10'))); assert.ok(validateDeal(fixture({ rent: '-1' })).length);
  assert.ok(validateDeal(fixture({ price: '0' })).length);
  assert.ok(validateDeal(fixture({ purchaseType: 'mortgage', deposit: '200001', interestRate: '5' })).length);
  assert.ok(validateDeal(fixture({ purchaseType: 'mortgage', deposit: '50000', mortgageType: 'repayment', term: '0', interestRate: '0' })).length);
});
test('monthly/yearly equality with frequency retained through restart', () => {
  const annual = fixture(), monthly = fixture({ recurringCosts: [{ id: 'insurance', label: 'Insurance', amount: '30', frequency: 'monthly' }] });
  near(calculate(annual).cashFlow, calculate(monthly).cashFlow);
  const store = saveToStore(emptyStore(), annual), reopened = decodeStore(JSON.stringify(store));
  assert.deepEqual(reopened.deals[0].recurringCosts, annual.recurringCosts);
  assert.deepEqual(calculate(reopened.deals[0]), calculate(annual));
});
test('save, rename/update, duplicate, delete and invalid schema protection', () => {
  const d = fixture(); let store = saveToStore(emptyStore(), d);
  store = saveToStore(store, { ...d, name: 'Renamed', rent: '1200' });
  assert.equal(store.deals.length, 1); assert.equal(store.deals[0].name, 'Renamed');
  const copy = cloneDeal(store.deals[0]); assert.notEqual(copy.id, d.id);
  assert.deepEqual(copy.recurringCosts, d.recurringCosts);
  store.deals.push(copy); store.deals = store.deals.filter(item => item.id !== d.id);
  assert.equal(decodeStore(JSON.stringify(store)).deals[0].id, copy.id);
  assert.throws(() => decodeStore('{"version":99}'));
});
test('what if does not mutate original; explicit replacement is distinct', () => {
  const d = fixture({ purchaseType: 'mortgage', interestRate: '5', deposit: '50000' });
  const before = JSON.stringify(d), original = calculate(d);
  const changed = scenario(d, '1400', '8');
  assert.equal(JSON.stringify(d), before); assert.notEqual(calculate(changed).cashFlow, original.cashFlow);
});
test('repayment capital is deducted once from cash flow, excluded from asset yield', () => {
  const io = fixture({ purchaseType: 'mortgage', deposit: '50000', interestRate: '5', term: '25' });
  const repay = { ...io, mortgageType: 'repayment' as const };
  near(calculate(io).netYield, calculate(repay).netYield);
  near(calculate(repay).netMonthly - calculate(repay).cashFlow, mortgagePayment(150000, 5, 25, 'repayment'));
});
test('official SDLT examples, boundaries, small additional exception, FTB limit and rounding', () => {
  assert.equal(purchaseTax(295000, 'standard').total, 4750);
  assert.equal(purchaseTax(300000, 'additional').total, 20000);
  assert.equal(purchaseTax(500000, 'ftb').total, 10000);
  assert.equal(purchaseTax(500001, 'ftb').total, 15000);
  assert.equal(purchaseTax(0, 'additional').total, 0);
  assert.equal(purchaseTax(39999, 'additional').total, 0);
  assert.equal(purchaseTax(40000, 'additional').total, 2000);
  assert.equal(purchaseTax(125000, 'standard').total, 0);
  assert.equal(purchaseTax(250000, 'standard').total, 2500);
  assert.equal(purchaseTax(925000, 'standard').total, 36250);
  assert.equal(purchaseTax(1500000, 'standard').total, 93750);
  assert.equal(purchaseTax(1500100, 'standard').total, 93762);
  assert.equal(purchaseTax(300019, 'additional').total, 20001);
  const r = purchaseTax(300019, 'additional');
  assert.equal(Math.floor(r.bands.reduce((n, b) => n + b.tax, 0)), r.total);
});
test('PDF summary is self-contained, branded, escapes user inputs and preserves entered frequencies', () => {
  const d = fixture({ name: '<script>test</script>', address: 'A & B', purchaseType: 'mortgage', deposit: '50000', interestRate: '0', mortgageType: 'repayment', term: '25' });
  const image = `data:image/png;base64,${readFileSync('assets/brand/wordmark.png').toString('base64')}`;
  const html = summaryHtml(d, image);
  assert.ok(html.includes(`src="${image}"`));
  assert.ok(!html.includes('<script>'));
  for (const text of ['&lt;script&gt;', 'A &amp; B', '£360.00 / year', 'Monthly equivalent', '£30.00', '£500.00', '25 years', '0%', 'Recurring Costs', 'Cash-on-cash return', 'Repayment principal is deducted once']) assert.ok(html.includes(text), text);
  assert.ok(!/<(?:link|script)\b/.test(html));
  assert.ok(html.includes('checked 8 October 2026'));
});
test('confirmed scope, invalid deposits and no-cash return are handled explicitly', () => {
  assert.ok(validateDeal(fixture({ taxConfirmed: false })).some(x => /Confirm/.test(x)));
  assert.ok(validateDeal(fixture({ purchaseType: 'mortgage', depositMode: 'percent', deposit: '101', interestRate: '0' })).some(x => /Deposit/.test(x)));
  const r = calculate(fixture({ price: '100000', buyerType: 'standard', purchaseType: 'mortgage', deposit: '0', interestRate: '0', refurb: '', purchaseCosts: [] }));
  assert.equal(r.cashRequired, 0);
  assert.equal(r.cashOnCash, null);
});
