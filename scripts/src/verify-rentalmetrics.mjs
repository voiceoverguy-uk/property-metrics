// Migration parity checks against the preserved source, without starting a second server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '../..');
const backup = path.join(root, '.migration-backup');
const base = 'http://localhost:80';
const originalRequire = createRequire(path.join(backup, 'server.js'));
const routes = new Map();
const fakeApp = {
  use() {},
  get(paths, handler) {
    for (const route of Array.isArray(paths) ? paths : [paths]) routes.set(`GET ${route}`, handler);
  },
  post(route, handler) { routes.set(`POST ${route}`, handler); },
  listen() {},
};
const express = () => fakeApp;
express.json = express.static = () => () => {};
vm.runInNewContext(fs.readFileSync(path.join(backup, 'server.js'), 'utf8'), {
  require: (name) => name === 'express' ? express : originalRequire(name),
  __dirname: backup,
  process,
  console,
});

function reference(method, route, { body = {}, query = {} } = {}) {
  let output;
  let status = 200;
  const response = {
    setHeader() {},
    status(value) { status = value; return this; },
    json(value) { output = JSON.parse(JSON.stringify(value)); },
    send(value) { output = value; },
  };
  routes.get(`${method} ${route}`)({ body, query, path: route }, response);
  return { status, output };
}

function allFiles(dir, relative = '') {
  return fs.readdirSync(path.join(dir, relative), { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(relative, entry.name);
    return entry.isDirectory() ? allFiles(dir, name) : [name];
  });
}
for (const file of allFiles(path.join(backup, 'public'))) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, 'artifacts/rentalmetrics/public', file)),
    fs.readFileSync(path.join(backup, 'public', file)),
    `Website asset changed: ${file}`,
  );
}
for (const file of ['calcs.js', 'sdlt.js']) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, 'artifacts/api-server/legacy-src', file)),
    fs.readFileSync(path.join(backup, 'src', file)),
  );
}

const normalize = (html) => html.replace(/\?v=[a-z0-9]+/g, '?v=CACHE');
for (const route of ['/', '/deal-analyser', '/simple-analyser', '/sdlt-calculator']) {
  const response = await fetch(base + route);
  assert.equal(response.status, 200, route);
  assert.equal(normalize(await response.text()), normalize(reference('GET', route).output), route);
}
for (const file of ['style.css', 'app.js', 'robots.txt', 'sitemap.xml', 'site.webmanifest', 'fonts/Manrope-SemiBold.ttf', 'data/uk-train-stations.json', 'rental-metrics-logo-primary-1200x630-og.png']) {
  const response = await fetch(`${base}/${file}`);
  assert.equal(response.status, 200, file);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join(backup, 'public', file)), file);
}

for (const body of [
  { price: 200000, monthlyRent: 900 },
  { price: 120000, monthlyRent: 850, solicitorFees: 0, targetYield: 10 },
  { price: 300000, monthlyRent: 1600, voidPct: 8, runningCosts: 100, refurbCosts: 10000, otherCosts: 800, costItems: [{ label: 'Survey', amount: 800 }] },
  { price: 500000, monthlyRent: 2400, targetYield: 5 },
  { price: 700000, monthlyRent: 3500, solicitorFees: '', targetYield: 7 },
  { price: '250000', monthlyRent: '1200', solicitorFees: '2000' },
  {}, { price: -1, monthlyRent: 900 }, { price: 200000, monthlyRent: 0 },
]) {
  const expected = reference('POST', '/api/calculate', { body });
  const response = await fetch(`${base}/api/calculate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  assert.equal(response.status, expected.status);
  assert.deepEqual(await response.json(), expected.output);
}
for (const price of [120000, 125000, 250000, 300000, 500000, 500001, 925000, 1500000, 2000000, 0, -1]) {
  const expected = reference('GET', '/api/sdlt', { query: { price: String(price) } });
  const response = await fetch(`${base}/api/sdlt?price=${price}`);
  assert.equal(response.status, expected.status);
  assert.deepEqual(await response.json(), expected.output);
}
// The development proxy replaces Host. Exercise the unchanged canonical
// middleware directly with the actual production host instead.
for (const file of ['artifacts/rentalmetrics/server.cjs', 'artifacts/api-server/server.cjs']) {
  const middleware = [];
  const capturedApp = { ...fakeApp, use(handler) { middleware.push(handler); } };
  const capturedExpress = () => capturedApp;
  capturedExpress.json = capturedExpress.static = express.json;
  const serverPath = path.join(root, file);
  const serverRequire = createRequire(serverPath);
  vm.runInNewContext(fs.readFileSync(serverPath, 'utf8'), {
    require: (name) => name === 'express' ? capturedExpress : serverRequire(name),
    __dirname: path.dirname(serverPath), process: { env: { PORT: '8080' } }, console,
  });
  for (const route of ['/deal-analyser?price=200000', '/api/sdlt?price=200000']) {
    let redirected = false;
    middleware[0]({ headers: { host: 'www.rentalmetrics.co.uk' }, url: route }, {
      redirect(status, location) {
        assert.equal(status, 301);
        assert.equal(location, 'https://rentalmetrics.co.uk' + route);
        redirected = true;
      },
    }, () => assert.fail('Expected canonical redirect'));
    assert.equal(redirected, true);
  }
}
const options = await fetch(`${base}/api/calculate`, { method: 'OPTIONS', headers: { Origin: 'capacitor://localhost' } });
assert.equal(options.status, 204);
assert.equal(options.headers.get('access-control-allow-origin'), 'capacitor://localhost');
const invalidSuggestion = await fetch(`${base}/api/suggestions/cost-label`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: '' }),
});
assert.equal(invalidSuggestion.status, 400);
assert.deepEqual(await invalidSuggestion.json(), { error: 'Label is required' });
assert.equal((await fetch(`${base}/missing-page`)).status, 404);
console.info('RentalMetrics parity checks passed: original assets, HTML/SEO, calculation results, SDLT boundaries, redirects, CORS and validation.');
