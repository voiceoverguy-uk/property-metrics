import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  executablePath: '/repl/tools/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:80/');
  await page.locator('#address').fill('LS1');
  await page.locator('#price').fill('200000');
  await page.locator('#monthlyRent').fill('900');
  const calculation = page.waitForResponse((res) => res.url().includes('/api/calculate') && res.request().method() === 'POST');
  await page.locator('#dealForm button[type=submit]').click();
  assert.equal((await calculation).status(), 200);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('dealHistory') || '[]').length === 1);
  assert.equal(await page.locator('#savePdfBtn').isVisible(), true);
  assert.equal(await page.locator('#resultsPlaceholder').isVisible(), false);
  await page.waitForFunction(() => !!window.jspdf?.jsPDF);
  const pdf = page.waitForEvent('download');
  await page.locator('#savePdfBtn').click();
  assert.ok((await pdf).suggestedFilename().endsWith('.pdf'));
  await page.reload();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dealHistory')).length), 1);
  await page.locator('.history-card').waitFor();
  assert.ok((await page.locator('#historyList').innerText()).includes('LS1'));
  await page.locator('.history-card').click();
  await page.waitForFunction(() => !!document.getElementById('price').value);
  await page.locator('#price').fill('150000');
  await page.locator('#dealForm button[type=submit]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('dealHistory') || '[]').length === 2);
  await page.locator('.history-card-checkbox input').nth(0).check();
  await page.locator('.history-card-checkbox input').nth(1).check();
  await page.locator('.btn-compare-deals').click();
  await page.waitForFunction(() => !!window.XLSX);
  const xlsx = page.waitForEvent('download');
  await page.locator('.btn-compare-xlsx').click();
  assert.ok((await xlsx).suggestedFilename().endsWith('.xlsx'));
  await page.evaluate(() => closeCompare());
  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('.history-card-delete').first().click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dealHistory')).length), 1);
  await page.locator('#darkModeToggle').click();
  const theme = await page.evaluate(() => localStorage.getItem('darkMode'));
  await page.reload();
  assert.equal(await page.evaluate(() => localStorage.getItem('darkMode')), theme);
  await page.goto('http://localhost:80/sdlt-calculator');
  assert.equal(await page.title(), 'Stamp Duty Calculator UK | Free SDLT Tool');
  await page.goto('http://localhost:80/deal-analyser');
  assert.equal(await page.title(), 'RentalMetrics | Buy-to-Let Deal Calculator UK');
  assert.deepEqual(errors, []);
  console.info('RentalMetrics browser checks passed: deal analysis, visible results, saved/reloaded/deleted history, PDF and comparison XLSX downloads, dark-mode persistence and calculator routes.');
} finally {
  await browser.close();
}
