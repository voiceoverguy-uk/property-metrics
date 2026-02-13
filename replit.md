# UK Property Deal Analyser

## Overview
A web-based UK property investment deal analyser for England & Northern Ireland. Calculates SDLT (Stamp Duty Land Tax), total acquisition costs, gross/net yields, and target offer prices for both investor (additional property) and first-time buyer scenarios.

## Recent Changes
- 2026-02-13: Switched to new AutocompleteSuggestion API (replaces deprecated AutocompleteService); uses session tokens, place.fetchFields() for coordinates
- 2026-02-13: Added Google Maps integration — custom autocomplete dropdown, map preview with Marker; API key served via /api/maps-key endpoint
- 2026-02-13: Fixed investor SDLT bands to post-April 2025 rates; replaced single refurb input with itemised cost list; fixed re-calculation on repeated clicks
- 2026-02-12: Initial build — Express server, SDLT calculator, yield analysis, target offer price solver

## Project Architecture

### Tech Stack
- **Backend**: Node.js + Express (server.js)
- **Frontend**: Plain HTML + CSS + vanilla JS (served from /public)
- **No database** — pure calculation tool

### Structure
```
server.js           — Express server, API endpoint
src/sdlt.js         — SDLT band calculations (standard, FTB, additional property)
src/calcs.js        — Deal calculations (costs, yields, target offer price solver)
public/index.html   — Single-page UI
public/style.css    — Styling
public/app.js       — Client-side form handling and results rendering
```

### API
- `GET /api/maps-key` — Returns Google Maps API key for client-side use
- `POST /api/calculate` — Accepts property details, returns investor and FTB analysis

### Google Maps Integration
- Uses new Places API (`AutocompleteSuggestion.fetchAutocompleteSuggestions`) — required for keys created after March 2025
- Custom dropdown with debounce (300ms) and session tokens for billing optimisation
- `place.fetchFields()` to get coordinates after selection; `google.maps.Marker` for map pins
- API key stored in Replit Secrets (`GOOGLE_MAPS_API_KEY`), served via `/api/maps-key` endpoint (never hardcoded)
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
