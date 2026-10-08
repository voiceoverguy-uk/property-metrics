export type Buyer = 'standard' | 'additional' | 'ftb';
export type Frequency = 'monthly' | 'yearly';
export type Cost = { id: string; label: string; amount: string; frequency: Frequency };
export type Deal = {
  id: string; name: string; address: string; price: string; rent: string;
  purchaseType: 'cash' | 'mortgage'; deposit: string; depositMode: 'pounds' | 'percent';
  interestRate: string; mortgageType: 'interest-only' | 'repayment'; term: string;
  refurb: string; purchaseCosts: Cost[]; recurringCosts: Cost[];
  voidPct: string; agentPct: string; agentVat: boolean;
  maintenanceMode: 'percent' | 'annual'; maintenancePct: string; maintenanceAnnual: string;
  buyerType: 'standard' | 'additional'; taxConfirmed: boolean; step: number; updatedAt: string;
};
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
export const newCost = (): Cost => ({ id: uid(), label: '', amount: '', frequency: 'monthly' });
export const newDeal = (): Deal => ({
  id: uid(), name: '', address: '', price: '', rent: '', purchaseType: 'cash',
  deposit: '', depositMode: 'pounds', interestRate: '', mortgageType: 'interest-only', term: '',
  refurb: '', purchaseCosts: [], recurringCosts: [], voidPct: '', agentPct: '', agentVat: false,
  maintenanceMode: 'percent', maintenancePct: '', maintenanceAnnual: '',
  buyerType: 'additional', taxConfirmed: false, step: 0, updatedAt: new Date().toISOString(),
});
// Empty optional amounts mean zero. Invalid/pasted text is never silently coerced to zero.
export function amount(text: string): number {
  const cleaned = text.trim().replace(/£/g, '').replace(/,/g, '').replace(/\s/g, '');
  if (!cleaned) return 0;
  if (!/^\d*(?:\.\d*)?$/.test(cleaned) || cleaned === '.') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
export const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);
export const percent = (n: number | null) => n === null ? 'Not applicable' : `${n.toFixed(2)}%`;
export const monthlyCosts = (rows: Cost[]) => rows.reduce((total, row) => total + amount(row.amount) / (row.frequency === 'yearly' ? 12 : 1), 0);
export const purchaseCostTotal = (rows: Cost[]) => rows.reduce((total, row) => total + amount(row.amount), 0);
export const TAX_EFFECTIVE = '1 April 2025';
export const TAX_VERIFIED = '8 October 2026';
export const TAX_SOURCE = 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates';
export const TAX_HIGHER_SOURCE = 'https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property';
export const TAX_SCOPE = 'England / Northern Ireland. UK-resident individual buying one residential property, freehold or an existing assigned lease. Excludes companies, trusts, linked purchases, mixed use, new lease rent, non-residents and special reliefs. Confirm eligibility with your conveyancer.';
export type TaxBand = { from: number; to: number; rate: number; taxable: number; tax: number };
export function purchaseTax(price: number, buyer: Buyer): { total: number; bands: TaxBand[] } {
  if (!Number.isFinite(price) || price < 0) throw new Error('Enter a valid non-negative purchase price.');
  if (price === 0 || (buyer === 'additional' && price < 40000)) return { total: 0, bands: [] };
  const ftb = buyer === 'ftb' && price <= 500000;
  const thresholds = ftb ? [300000, 500000] : [125000, 250000, 925000, 1500000, Infinity];
  const rates = ftb ? [0, 0.05] : buyer === 'additional' ? [0.05, 0.07, 0.10, 0.15, 0.17] : [0, 0.02, 0.05, 0.10, 0.12];
  let from = 0;
  const bands: TaxBand[] = [];
  thresholds.forEach((to, i) => {
    const taxable = Math.max(0, Math.min(price, to) - from);
    if (taxable > 0) bands.push({ from, to: Math.min(price, to), taxable, rate: rates[i], tax: taxable * rates[i] });
    from = to;
  });
  // HMRC SDLTM00050 requires rounding DOWN once, matching the corrected website.
  return { total: Math.floor(bands.reduce((n, b) => n + b.tax, 0) + 1e-8), bands };
}
export function mortgagePayment(loan: number, rate: number, years: number, type: Deal['mortgageType']) {
  if (loan <= 0) return 0;
  const r = rate / 1200;
  if (type === 'interest-only') return loan * r;
  const months = years * 12;
  if (months <= 0) throw new Error('Repayment mortgages need a positive term.');
  return r === 0 ? loan / months : loan * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}
export function validateDeal(d: Deal, step?: number): string[] {
  const errors: string[] = [];
  const check = (value: string, label: string, max = Infinity, required = false) => {
    const n = amount(value);
    if (!Number.isFinite(n) || n < 0 || n > max || (required && (!value.trim() || n <= 0))) errors.push(`${label}: enter ${required ? 'a positive' : 'a valid non-negative'} amount${max !== Infinity ? `, no more than ${max}` : ''}.`);
  };
  if (step === undefined || step === 0) {
    check(d.price, 'Purchase price', Infinity, true);
    if (!d.taxConfirmed) errors.push('Confirm the supported SDLT buyer assumptions before continuing.');
  }
  if (step === undefined || step === 1) {
    check(d.rent, 'Monthly rent');
    if (!d.rent.trim()) errors.push('Monthly rent: enter an amount (zero is allowed).');
  }
  if ((step === undefined || step === 2) && d.purchaseType === 'mortgage') {
    check(d.deposit, 'Deposit', d.depositMode === 'percent' ? 100 : amount(d.price));
    if (!d.deposit.trim()) errors.push('Enter your deposit (zero is allowed).');
    check(d.interestRate, 'Interest rate', 100);
    if (!d.interestRate.trim()) errors.push('Enter your interest rate (zero is allowed).');
    if (d.mortgageType === 'repayment') check(d.term, 'Mortgage term in years', 50, true);
  }
  if (step === undefined || step === 3) {
    check(d.refurb, 'Refurbishment'); check(d.voidPct, 'Void allowance', 100);
    check(d.agentPct, 'Management fee', 100);
    check(d.maintenanceMode === 'percent' ? d.maintenancePct : d.maintenanceAnnual, 'Maintenance', d.maintenanceMode === 'percent' ? 100 : Infinity);
    [...d.purchaseCosts, ...d.recurringCosts].forEach((row, i) => {
      check(row.amount, row.label || `Cost ${i + 1}`);
      if (row.amount.trim() && !row.label.trim()) errors.push(`Give cost ${i + 1} a name.`);
    });
  }
  return errors;
}
export type Results = ReturnType<typeof calculate>;
export function calculate(d: Deal) {
  const errors = validateDeal(d);
  if (errors.length) throw new Error(errors.join('\n'));
  const price = amount(d.price), rent = amount(d.rent);
  const sdlt = purchaseTax(price, d.buyerType).total;
  const fees = purchaseCostTotal(d.purchaseCosts) + amount(d.refurb);
  const deposit = d.purchaseType === 'cash' ? price : d.depositMode === 'percent' ? price * amount(d.deposit) / 100 : amount(d.deposit);
  const loan = d.purchaseType === 'mortgage' ? Math.max(0, price - deposit) : 0;
  const mortgage = mortgagePayment(loan, amount(d.interestRate), amount(d.term), d.mortgageType);
  const effectiveRent = rent * (1 - amount(d.voidPct) / 100);
  // Website charges agent fee on scheduled rent, maintenance percentage on rent after voids.
  const management = rent * amount(d.agentPct) / 100 * (d.agentVat ? 1.2 : 1);
  const maintenance = d.maintenanceMode === 'annual' ? amount(d.maintenanceAnnual) / 12 : effectiveRent * amount(d.maintenancePct) / 100;
  const recurring = monthlyCosts(d.recurringCosts);
  const netMonthly = effectiveRent - management - maintenance - recurring;
  const cashFlow = netMonthly - mortgage;
  const cashRequired = deposit + sdlt + fees;
  const roundPct = (n: number) => Math.round(n * 100) / 100;
  return {
    price, rent, sdlt, fees, deposit, loan, mortgage, effectiveRent, management, maintenance, recurring,
    netMonthly, cashFlow, cashRequired, totalAcquisition: price + sdlt + fees,
    grossYield: roundPct(rent * 12 / price * 100),
    netYield: roundPct(netMonthly * 12 / price * 100),
    cashOnCash: cashRequired > 0 ? roundPct(cashFlow * 12 / cashRequired * 100) : null,
  };
}
export function scenario(d: Deal, rent: string, rate: string) {
  return { ...d, rent, interestRate: d.purchaseType === 'mortgage' ? rate : d.interestRate };
}
export const ASSUMPTIONS = [
  'Monthly cash flow is rent after voids, recurring costs, management (including 20% VAT when selected), maintenance and the full mortgage payment, before income tax.',
  'Gross yield is scheduled annual rent divided by purchase price. Net yield is annual operating income after voids and operating costs divided by purchase price; borrowing and acquisition costs are excluded from this yield.',
  'Total cash required includes price for cash purchases or deposit for mortgage purchases, SDLT, refurbishment and one-off purchase costs. Cash-on-cash is annual pre-tax cash flow divided by this cash investment.',
  'Repayment principal is deducted once in cash flow, not again as an operating cost or from net rental yield. Capital growth, tax, refinancing, disposal costs and future rate changes are not modelled.',
  'Management percentage is applied to scheduled rent, matching the website. Maintenance percentage is applied to rent after voids. Yearly recurring amounts are divided by 12; one-off purchase costs are not recurring.',
  'These are estimates based on your entries, not an investment recommendation. Yield alone cannot assess risk, property condition, affordability or investment suitability.',
];
