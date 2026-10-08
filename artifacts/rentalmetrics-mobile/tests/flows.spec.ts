/// <reference types="node" />
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { newDeal } from '../lib/deals';
import { summaryHtml } from '../lib/pdf';
const key = 'rentalmetrics-native:v1';
async function stored(page: Page) {
  return page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), key);
}
async function next(page: Page) { await page.getByTestId('step-next').click(); }
test('Analyse → Save → restart → edit, duplicate, compare, delete; loaded app offline', async ({ page, context }) => {
  const crashes: string[] = [];
  page.on('pageerror', e => crashes.push(e.message));
  await page.goto('/');
  await page.getByTestId('field-price').waitFor();
  await next(page);
  await expect(page.getByTestId('step-errors')).toContainText('Purchase price');
  await page.getByTestId('field-name').fill('AUTOMATED TEST — not a real deal');
  await page.getByTestId('field-price').fill('£200,000');
  await page.getByTestId('ack-scope').click();
  await next(page);
  await page.getByTestId('field-rent').fill('1100');
  await next(page);
  await page.getByTestId('purchase-type-mortgage').click();
  await page.getByTestId('field-deposit').fill('50000');
  await page.getByTestId('field-rate').fill('5.25');
  await next(page);
  await page.getByTestId('field-refurb').fill('7000');
  await page.getByTestId('purchase-cost-add').click();
  await page.getByTestId('purchase-cost-label-0').fill('Legal fees');
  await page.getByTestId('purchase-cost-amount-0').fill('1500');
  await page.getByTestId('recurring-cost-add').click();
  await page.getByTestId('recurring-cost-label-0').fill('Insurance');
  await page.getByTestId('recurring-cost-amount-0').fill('360');
  await page.getByTestId('recurring-cost-freq-0-yearly').click();
  await page.getByTestId('toggle-assumptions').click();
  await page.getByTestId('field-void').fill('5');
  await page.getByTestId('field-agent').fill('10');
  await page.getByTestId('agent-vat').click();
  await page.getByTestId('field-maint-pct').fill('5');
  await page.getByTestId('step-back').click();
  await expect(page.getByTestId('field-deposit')).toHaveValue('50,000');
  await next(page);
  await expect(page.getByTestId('recurring-cost-amount-0')).toHaveValue('360');
  await next(page);
  await expect(page.getByTestId('metric-cashflow')).toContainText('£174.50');
  await expect(page.getByTestId('metric-net')).toContainText('4.98%');
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 932 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('save-deal').click();
  await expect(page.getByTestId('save-feedback')).toContainText('Deal saved');
  const original = (await stored(page)).deals[0];
  expect(original.recurringCosts[0]).toMatchObject({ amount: '360', frequency: 'yearly' });
  await page.reload();
  await expect(page.getByTestId('metric-cashflow')).toContainText('£174.50');
  // Once loaded, calculation and persistence require no requests. Native release uses bundled JS/assets.
  await context.setOffline(true);
  await page.getByTestId('toggle-whatif').click();
  await page.getByTestId('whatif-rent').fill('1400');
  await expect(page.getByTestId('whatif-save')).toBeEnabled();
  expect(Number((await stored(page)).deals[0].rent.replace(/,/g, ''))).toBe(1100);
  await expect(page.getByTestId('metric-cashflow')).toContainText('£174.50');
  await page.getByTestId('whatif-save').click();
  await expect.poll(async () => Number((await stored(page)).deals[0].rent.replace(/,/g, ''))).toBe(1400);
  await page.getByRole('tab', { name: 'Saved Deals' }).click();
  await page.getByTestId(`dup-${original.id}`).click();
  await expect.poll(async () => (await stored(page)).deals.length).toBe(2);
  const copy = (await stored(page)).deals.find((d: { id: string }) => d.id !== original.id);
  await page.getByTestId(`dup-${copy.id}`).click();
  await expect.poll(async () => (await stored(page)).deals.length).toBe(3);
  const all = (await stored(page)).deals;
  for (const d of all) await page.getByTestId(`select-${d.id}`).click();
  await page.getByTestId('compare-go').click();
  await expect(page.getByTestId('compare-screen').getByText('Monthly cash flow before tax', { exact: true })).toBeVisible();
  await expect(page.getByTestId('compare-screen').getByText('£360.00 / year')).toHaveCount(3);
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Go back' }).click();
  await page.getByTestId(`edit-${original.id}`).click();
  await page.getByTestId('field-name').fill('Edited offline');
  await page.getByTestId('step-next').click();
  await next(page); await next(page); await next(page);
  await page.getByTestId('save-deal').click();
  await expect.poll(async () => (await stored(page)).deals.find((d: { id: string }) => d.id === original.id).name).toBe('Edited offline');
  await page.getByRole('tab', { name: 'Saved Deals' }).click();
  await page.getByTestId(`del-${copy.id}`).click();
  await page.getByTestId('confirm-cancel').click();
  expect((await stored(page)).deals.length).toBe(3);
  await page.getByTestId(`del-${copy.id}`).click();
  await page.getByTestId('confirm-yes').click();
  await expect.poll(async () => (await stored(page)).deals.length).toBe(2);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText('Edited offline', { exact: true })).toBeVisible();
  expect(crashes).toEqual([]);
});
test('Tools restricts eligibility; official SDLT cases and FTB are Tools-only', async ({ page }) => {
  await page.goto('/tools');
  await page.getByTestId('tools-price').fill('295000');
  await expect(page.getByTestId('tools-blocked')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByTestId(`ack-standard-${i}`).click();
  await expect(page.getByTestId('tools-total')).toHaveText('£4,750.00');
  await page.getByTestId('tools-buyer-additional').click();
  await page.getByTestId('tools-price').fill('39999');
  for (let i = 0; i < 3; i++) await page.getByTestId(`ack-additional-${i}`).click();
  await expect(page.getByTestId('tools-total')).toHaveText('£0.00');
  await page.getByTestId('tools-price').fill('300000');
  await expect(page.getByTestId('tools-total')).toHaveText('£20,000.00');
  await page.getByTestId('tools-buyer-ftb').click();
  await page.getByTestId('tools-price').fill('500000');
  for (let i = 0; i < 4; i++) await page.getByTestId(`ack-ftb-${i}`).click();
  await expect(page.getByTestId('tools-total')).toHaveText('£10,000.00');
  await page.getByTestId('tools-price').fill('500001');
  await expect(page.getByTestId('tools-total')).toHaveText('£15,000.00');
  await page.getByRole('tab', { name: 'Analyse' }).click();
  await expect(page.getByTestId('buyer-ftb')).toHaveCount(0);
});
test('blank draft autosaves and keyboard-adjacent Done control; small/large screen overflow', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('field-name').fill('Draft retained');
  await page.getByTestId('field-price').fill('123456');
  await page.getByTestId('field-price-done').click();
  await expect.poll(async () => Number((await stored(page)).draft.price.replace(/,/g, ''))).toBe(123456);
  await page.reload();
  await expect(page.getByTestId('field-name')).toHaveValue('Draft retained');
  await expect(page.getByTestId('field-price')).toHaveValue('123,456');
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 932 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.getByTestId('new-deal').click();
  await page.getByTestId('confirm-yes').click();
  await expect(page.getByTestId('field-name')).toHaveValue('');
  await expect(page.getByTestId('field-price')).toHaveValue('');
});
test('storage errors are visible; corrupted persisted data is not overwritten', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('field-price').waitFor();
  await page.evaluate(k => localStorage.setItem(k, '{"version":99}'), key);
  await page.reload();
  await expect(page.getByTestId('hydrate-error')).toContainText('not been overwritten');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe('{"version":99}');
  await expect(page.getByTestId('field-price')).toHaveCount(0);
});
test('branded PDF renders offline with embedded logo and original yearly amounts', async ({ page, context }) => {
  const deal = { ...newDeal(), taxConfirmed: true, name: 'AUTOMATED PDF TEST — not a real deal', price: '200000', rent: '1100',
    recurringCosts: [{ id: 'insurance', label: 'Insurance', amount: '360', frequency: 'yearly' as const }],
    purchaseType: 'mortgage' as const, deposit: '50000', interestRate: '0', mortgageType: 'repayment' as const, term: '25' };
  const image = `data:image/png;base64,${readFileSync('assets/brand/wordmark.png').toString('base64')}`;
  await context.setOffline(true);
  await page.setContent(summaryHtml(deal, image));
  await expect(page.locator('img')).toHaveJSProperty('naturalWidth', 2400);
  await expect(page.getByText('£360.00 / year', { exact: true })).toBeVisible();
  await expect(page.getByText('£500.00', { exact: true })).toBeVisible();
  const pdf = await page.pdf({ path: '/tmp/rentalmetrics-test-summary.pdf', format: 'A4', printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(10000);
});
