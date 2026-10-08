// Build only the desktop website for Vercel. Replit keeps its managed builds.
const fs = require('node:fs');
const path = require('node:path');
const website = require('../artifacts/rentalmetrics/server.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.vercel-static');
fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(path.join(root, 'artifacts/rentalmetrics/public'), output, { recursive: true });
for (const route of website.locals.pageRoutes) {
  const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
  fs.writeFileSync(path.join(output, file), website.locals.renderHtml(route));
}
