const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

test('Vercel build excludes native mobile and design sandbox', () => {
  const config = require('../../vercel.json');
  const scripts = require('../../package.json').scripts;
  assert.equal(config.buildCommand, 'pnpm run build:website');
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, '.vercel-static');
  assert.doesNotMatch(scripts['build:website'], /pnpm -r|mobile|mockup/);
  assert.equal(config.rewrites[0].destination, '/api/index');
  assert.ok(config.functions['api/index.js']);
});

test('generated website pages contain rendered metadata and original assets', () => {
  const output = path.join(root, '.vercel-static');
  const titles = {
    'index.html': 'RentalMetrics | UK Buy-to-Let Deal &amp;',
    'deal-analyser.html': 'RentalMetrics | Buy-to-Let Deal Calculator UK',
    'simple-analyser.html': 'RentalMetrics | UK Buy-to-Let Deal',
    'sdlt-calculator.html': 'Stamp Duty Calculator UK',
    'privacy-policy.html': 'Privacy Policy | RentalMetrics',
  };
  for (const [file, title] of Object.entries(titles)) {
    const html = fs.readFileSync(path.join(output, file), 'utf8');
    assert.doesNotMatch(html, /%%[A-Z_]+%%/);
    // The original template uses raw ampersands in injected title text.
    assert.ok(html.includes(title.replace('&amp;', '&')), file);
  }
  for (const asset of ['app.js', 'style.css', 'privacy.css',
    'fonts/Manrope-SemiBold.ttf', 'rental-metrics-logo-primary-600x60.png',
    'data/uk-train-stations.json', 'sitemap.xml']) {
    assert.ok(fs.existsSync(path.join(output, asset)), asset);
  }
});

test('Vercel API exports without PORT, processes calculators, and explicitly rejects file persistence', async () => {
  const oldPort = process.env.PORT;
  const oldVercel = process.env.VERCEL;
  delete process.env.PORT;
  process.env.VERCEL = '1';
  const api = require('../../api/index.js');
  const server = api.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/api/healthz`);
    assert.equal(health.status, 200);
    const sdlt = await fetch(`${base}/api/sdlt?price=300000`);
    assert.equal(sdlt.status, 200);
    assert.ok(await sdlt.json());
    const calculation = await fetch(`${base}/api/calculate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 200000, monthlyRent: 1100, runningCosts: 100 }),
    });
    assert.equal(calculation.status, 200);
    const results = await calculation.json();
    assert.equal(results.main.grossYield, 6.6);
    assert.ok(results.investor);
    const suggestion = await fetch(`${base}/api/suggestions/cost-label`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Garden service', source: 'recurring_costs' }),
    });
    assert.equal(suggestion.status, 503);
    assert.match((await suggestion.json()).error, /remain saved in your browser/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (oldPort === undefined) delete process.env.PORT; else process.env.PORT = oldPort;
    if (oldVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = oldVercel;
  }
});
