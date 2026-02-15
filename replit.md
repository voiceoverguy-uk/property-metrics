# RentalMetrics – UK Property Deal & Yield Analysis Tool

## Overview
A web-based UK property investment deal analyser for England & Northern Ireland (rentalmetrics.co.uk). Calculates SDLT (Stamp Duty Land Tax), total acquisition costs, gross/net yields, and target offer prices for both investor (additional property) and first-time buyer scenarios. Includes mortgage calculator, deal rating system, SVG charts, dark mode, comparison history, and standalone SDLT calculator mode. RentalMetrics branding (#d42027 red, #1a1a1a charcoal).

## Recent Changes
- 2026-02-15: Leveraged yield calculations — when mortgage is checked, gross/net yields recalculate based on cash invested (deposit + SDLT + fees + costs) instead of total purchase price; mortgage payments deducted from net annual rent; deal rating adjusts accordingly
- 2026-02-15: Replaced logo image with Manrope Semi Bold text heading "Rental Metrics"; custom @font-face loaded from public/fonts/
- 2026-02-15: Header background changed to red (#d42027); subtitle font increased ~20%, spacing improved
- 2026-02-15: Updated placeholders: address "e.g. WF2", price "e.g. £200,000", rent "e.g. £900", running costs "e.g. £150"
- 2026-02-15: Rebranded to RentalMetrics; mortgage summary shows Cash Deposit, SDLT, Solicitor Fees, then Amount to Borrow as bottom-line total
- 2026-02-14: Added buyer type toggle (Investor/FTB) at top of form, defaulting to Investor; Calculate Mortgage button in mortgage section
- 2026-02-14: Changed letting agent fee to percentage input (% of monthly rent) instead of flat £ amount; +20% VAT checkbox; integrated into running costs, yield calcs, mortgage cash flow, PDF, history, and share URL
- 2026-02-14: Added mortgage include/exclude checkbox inside expanded mortgage section for cash vs mortgage purchase toggle
- 2026-02-14: Added dark mode toggle (moon/sun icon, localStorage persistence), mobile responsive improvements
- 2026-02-14: Added comparison history (localStorage, max 20 entries) with load/delete/clear; share deal via URL query params with clipboard copy
- 2026-02-14: Added standalone SDLT calculator mode with toggle buttons and dedicated /api/sdlt endpoint; shows all 3 buyer types
- 2026-02-14: Added SVG yield gauge (semi-circle arc) and SDLT comparison bar chart (investor vs FTB horizontal bars)
- 2026-02-14: Added mortgage/financing calculator — collapsible section with deposit %, interest rate, term; shows monthly payment, cash flow, cash-on-cash return
- 2026-02-14: Added deal rating indicator (A+ to F letter grades with color-coded circles based on net yield vs target yield)
- 2026-02-14: Added live currency formatting on numeric inputs (£ with commas, formatted on blur, raw on focus)
- 2026-02-14: Added XSS protection via escHtml() for user-provided strings in innerHTML
- 2026-02-14: Added Save as PDF feature — window.print() with clean print layout
- 2026-02-13: Switched to new AutocompleteSuggestion API; added Google Maps integration
- 2026-02-13: Fixed investor SDLT bands to post-April 2025 rates; replaced single refurb input with itemised cost list
- 2026-02-12: Initial build — Express server, SDLT calculator, yield analysis, target offer price solver

## Project Architecture

### Tech Stack
- **Backend**: Node.js + Express (server.js)
- **Frontend**: Plain HTML + CSS + vanilla JS (served from /public)
- **Storage**: localStorage for history and dark mode preference — no database

### Structure
```
server.js              — Express server, API endpoints
src/sdlt.js            — SDLT band calculations (standard, FTB, additional property)
src/calcs.js           — Deal calculations (costs, yields, target offer price solver)
public/index.html      — Single-page UI with mode toggle, mortgage section, history
public/style.css       — Styling incl. dark mode, print styles, responsive
public/app.js          — Client-side: form handling, results, charts, history, sharing
public/fonts/          — Custom fonts (Manrope-SemiBold.ttf)
```

### API
- `GET /api/maps-key` — Returns Google Maps API key for client-side use
- `POST /api/calculate` — Accepts property details, returns investor and FTB analysis
- `GET /api/sdlt?price=N` — Standalone SDLT calculation for all 3 buyer types

### Features
- **Mode Toggle**: "Deal Analyser" (full) vs "SDLT Calculator Only" (price + SDLT only)
- **Deal Rating**: A+ to F grades based on net yield vs target yield difference
- **Mortgage Calculator**: Collapsible section; annuity formula; shows deposit, payment, cash flow, cash-on-cash return
- **SVG Charts**: Yield gauge (semi-circle arc) and SDLT comparison bar chart
- **Currency Formatting**: £ with commas on blur, raw number on focus; data-rawValue attribute
- **Comparison History**: localStorage, max 20 entries, click to reload, delete/clear
- **Share via URL**: Query params auto-populate form; clipboard copy with "Copied!" feedback
- **Dark Mode**: Toggle in header, localStorage persistence, CSS body.dark selector
- **PDF Export**: window.print() with clean layout, suggested filename
- **Google Maps**: AutocompleteSuggestion API, session tokens, map preview with Marker

### Google Maps Integration
- Uses new Places API (`AutocompleteSuggestion.fetchAutocompleteSuggestions`)
- Custom dropdown with debounce (300ms) and session tokens for billing optimisation
- `place.fetchFields()` to get coordinates; `google.maps.Marker` for map pins
- API key stored in Replit Secrets (`GOOGLE_MAPS_API_KEY`), served via `/api/maps-key`
- Restricted to UK addresses (`includedRegionCodes: ['gb']`)

### SDLT Rates (England & NI, as of build date)
- **Standard**: 0% up to £250k, 5% £250k-£925k, 10% £925k-£1.5m, 12% above
- **First-time buyer**: 0% up to £425k, 5% £425k-£625k (reverts to standard above £625k)
- **Additional property** (post-April 2025): 5% up to £125k, 7% £125k-£250k, 10% £250k-£925k, 15% £925k-£1.5m, 17% above

## Running
```
node server.js
```
Server binds to 0.0.0.0:5000.

## User Preferences
- Currency: GBP with £ and commas
- V1: England & NI only (no Scotland LBTT / Wales LTT)
- Clean, modern UI with tooltips
- RentalMetrics branding: red #d42027, charcoal #1a1a1a
