// Keep the legacy server-side HTML replacement rather than a static SPA fallback.
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = Number(process.env.PORT);
if (require.main === module && (!Number.isInteger(PORT) || PORT <= 0)) throw new Error('PORT is required');
const CACHE_BUST = Date.now().toString(36);
const ALLOWED_ORIGINS = [
  'https://rentalmetrics.co.uk',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:3000',
];
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('www.')) {
    const canonical = 'https://' + host.replace(/^www\./, '') + req.url;
    return res.redirect(301, canonical);
  }
  next();
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const htmlTemplate = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const OG_IMAGE = 'https://rentalmetrics.co.uk/rental-metrics-logo-primary-1200x630-og.png?v=2';
const routeMeta = {
  '/': {
    pageTitle: 'RentalMetrics | UK Buy-to-Let Deal & Yield Calculator',
    metaDesc: 'Free UK buy-to-let deal calculator and modelling tool. Analyse rental yield, stress test mortgages, model costs and project returns in seconds.',
    canonical: 'https://rentalmetrics.co.uk/',
    ogTitle: 'RentalMetrics | UK Buy-to-Let Deal Calculator & Modelling Tool',
    ogDesc: 'Free UK buy-to-let deal calculator and modelling tool. Analyse rental yield, stress test mortgages and project returns.',
    ogUrl: 'https://rentalmetrics.co.uk/',
  },
  '/deal-analyser': {
    pageTitle: 'RentalMetrics | Buy-to-Let Deal Calculator UK',
    metaDesc: 'Free UK buy-to-let deal calculator and modelling tool. Analyse rental yield, stress test mortgages, model costs and project returns in seconds.',
    canonical: 'https://rentalmetrics.co.uk/deal-analyser',
    ogTitle: 'Buy-to-Let Deal Calculator (UK) | RentalMetrics',
    ogDesc: 'Stress test rent vs mortgage, model costs and cash-on-cash return, and see if a deal meets your target yield. Free tool.',
    ogUrl: 'https://rentalmetrics.co.uk/deal-analyser',
  },
  '/sdlt-calculator': {
    pageTitle: 'Stamp Duty Calculator UK | Free SDLT Tool',
    metaDesc: 'Free UK Stamp Duty calculator for main residences, first-time buyers and investors. Accurate SDLT estimates in seconds.',
    canonical: 'https://rentalmetrics.co.uk/sdlt-calculator',
    ogTitle: 'Stamp Duty Calculator UK (SDLT)',
    ogDesc: 'Free SDLT calculator for main residences, first-time buyers and investors. Instant estimates using current England rates.',
    ogUrl: 'https://rentalmetrics.co.uk/sdlt-calculator',
  },
};
function renderHtml(routePath) {
  const meta = routeMeta[routePath] || routeMeta['/'];
  const html = htmlTemplate
    .replace(/%%PAGE_TITLE%%/g, meta.pageTitle)
    .replace(/%%META_DESC%%/g, meta.metaDesc)
    .replace(/%%CANONICAL%%/g, meta.canonical)
    .replace(/%%OG_TITLE%%/g, meta.ogTitle)
    .replace(/%%OG_DESC%%/g, meta.ogDesc)
    .replace(/%%OG_URL%%/g, meta.ogUrl)
    .replace(/%%OG_IMAGE%%/g, OG_IMAGE);
  return html.replace(/\?v=\d+/g, '?v=' + CACHE_BUST);
}
app.locals.renderHtml = renderHtml;
app.locals.pageRoutes = ['/', '/deal-analyser', '/simple-analyser', '/sdlt-calculator'];
function serveHtml(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(renderHtml(req.path));
}
app.get(['/', '/deal-analyser', '/simple-analyser', '/sdlt-calculator'], serveHtml);
app.get('/privacy', (req, res) => res.redirect(301, '/privacy-policy'));
app.get('/privacy-policy', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, 'public', 'robots.txt'));
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    require('pino')().info({ port: PORT }, 'RentalMetrics website running');
  });
}
module.exports = app;
