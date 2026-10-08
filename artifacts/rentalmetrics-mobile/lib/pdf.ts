import { Deal, calculate, amount, gbp, percent, ASSUMPTIONS, TAX_EFFECTIVE, TAX_VERIFIED, TAX_SCOPE } from './deals';
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function summaryHtml(d: Deal, logo: string) {
  const r = calculate(d);
  const row = (label: string, value: string) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{margin:32px}body{font-family:-apple-system,Arial,sans-serif;color:#1a1a1a;font-size:12px;line-height:1.5}
  img{width:280px;height:28px;object-fit:contain}h1{font-size:24px}h2{font-size:16px;color:#d42027;margin-top:26px}
  table{width:100%;border-collapse:collapse}td{padding:7px;border-bottom:1px solid #eee;vertical-align:top}td:last-child{text-align:right}
  tr{break-inside:avoid}p{color:#555}header{border-bottom:3px solid #d42027;padding-bottom:18px}</style></head><body>
  <header><img src="${logo}" alt="RentalMetrics"><p>PROPERTY DEAL SUMMARY · BEFORE INCOME TAX</p></header>
  <h1>${escapeHtml(d.name || d.address || 'Untitled deal')}</h1><p>${escapeHtml(d.address)}<br>Generated ${escapeHtml(new Date().toLocaleDateString('en-GB'))}</p>
  <h2>Results</h2><table>${row('Monthly cash flow before tax', gbp(r.cashFlow))}${row('Gross rental yield', percent(r.grossYield))}${row('Net rental yield (purchase-price basis)', percent(r.netYield))}${row('Total cash required', gbp(r.cashRequired))}${row('Cash-on-cash return', percent(r.cashOnCash))}</table>
  <h2>Property, income and borrowing</h2><table>${row('Purchase price', gbp(r.price))}${row('Monthly rent', gbp(r.rent))}${row('Purchase', d.purchaseType)}${row('Buyer tax treatment', d.buyerType === 'additional' ? 'Additional property' : 'Standard / only property')}${row('Deposit entered', d.purchaseType === 'cash' ? 'Cash purchase' : d.depositMode === 'percent' ? `${d.deposit}%` : gbp(amount(d.deposit)))}${row('Loan', gbp(r.loan))}${row('Mortgage type', d.purchaseType === 'mortgage' ? d.mortgageType : 'None')}${row('Interest rate', d.purchaseType === 'mortgage' ? `${amount(d.interestRate)}%` : 'None')}${row('Term', d.purchaseType === 'mortgage' && d.mortgageType === 'repayment' ? `${amount(d.term)} years` : 'Not applicable')}${row('Monthly mortgage payment', gbp(r.mortgage))}${row('SDLT estimate', gbp(r.sdlt))}${row('Refurbishment', gbp(amount(d.refurb)))}${d.purchaseCosts.map(c => row(c.label || 'Purchase cost', `${gbp(amount(c.amount))} one-off`)).join('')}</table>
  <h2>Recurring Costs</h2><table>${d.recurringCosts.map(c => row(c.label || 'Recurring cost', `${gbp(amount(c.amount))} / ${c.frequency === 'yearly' ? 'year' : 'month'}`)).join('')}${row('Monthly equivalent', gbp(r.recurring))}</table>
  <h2>Editable assumptions</h2><table>${row('Void allowance', `${amount(d.voidPct)}%`)}${row('Management fee', `${amount(d.agentPct)}% of scheduled rent; VAT ${d.agentVat ? '20% added' : 'not added'}`)}${row('Maintenance entered', d.maintenanceMode === 'percent' ? `${amount(d.maintenancePct)}% of rent after voids` : `${gbp(amount(d.maintenanceAnnual))} / year`)}${row('Management monthly', gbp(r.management))}${row('Maintenance monthly', gbp(r.maintenance))}${row('Rent after voids', gbp(r.effectiveRent))}</table>
  <h2>How to read this summary</h2>${ASSUMPTIONS.map(a => `<p>${escapeHtml(a)}</p>`).join('')}
  <p>SDLT rules effective ${TAX_EFFECTIVE}, checked ${TAX_VERIFIED}. ${escapeHtml(TAX_SCOPE)}<br>Source: gov.uk/stamp-duty-land-tax/residential-property-rates</p></body></html>`;
}
export async function shareDeal(d: Deal) {
  // Lazy imports leave summary generation independently testable and require no server.
  const [{ Asset }, { File }, Print, Sharing, { Platform }] = await Promise.all([
    import('expo-asset'), import('expo-file-system'), import('expo-print'),
    import('expo-sharing'), import('react-native'),
  ]);
  if (Platform.OS === 'web') {
    const logo = Asset.fromModule(require('../assets/brand/wordmark.png')).uri;
    await Print.printAsync({ html: summaryHtml(d, logo) });
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Native sharing is not available on this device.');
  const logo = Asset.fromModule(require('../assets/brand/wordmark.png'));
  await logo.downloadAsync();
  if (!logo.localUri) throw new Error('Bundled brand image could not be loaded.');
  const inlineLogo = `data:image/png;base64,${await new File(logo.localUri).base64()}`;
  const { uri } = await Print.printToFileAsync({ html: summaryHtml(d, inlineLogo) });
  try { await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share RentalMetrics deal summary' }); }
  finally { try { new File(uri).delete(); } catch { /* OS can already have cleared the temporary file. */ } }
}
