# RentalMetrics – UK Property Deal & Yield Analysis Tool

## Overview
RentalMetrics is a web-based UK property investment deal analyser for England & Northern Ireland (rentalmetrics.co.uk). Its primary purpose is to empower investors and first-time buyers by calculating essential financial metrics for property deals. Key capabilities include calculating Stamp Duty Land Tax (SDLT), total acquisition costs, gross and net yields, and target offer prices. The tool also features a mortgage calculator, a deal rating system, interactive charts, dark mode, comparison history, and a standalone SDLT calculator mode. The project aims to provide UK buy-to-let maths without the headache, offering a comprehensive yet user-friendly platform for property investment analysis.

## User Preferences
- Currency: GBP with £ and commas
- V1: England & NI only (no Scotland LBTT / Wales LTT)
- Clean, modern UI with tooltips
- RentalMetrics branding: deep red #B11217, charcoal #1a1a1a

## System Architecture

### Tech Stack
- **Backend**: Node.js + Express
- **Frontend**: Plain HTML + CSS + vanilla JS
- **Storage**: localStorage for history and dark mode preference

### UI/UX Decisions
- **Branding**: RentalMetrics branding uses primary red (#d42027, #B11217) and charcoal (#1a1a1a).
- **Header**: Single-row layout with logo and tagline on the left, pill-style mode tabs (Simple Analyser, Deal Analyser, SDLT Calculator Only) and dark mode toggle on the right. Light grey background with a 2px red underline, sticky with blur/shadow on scroll.
- **Mode Toggle**: Functionality to switch between "Deal Analyser" (full analysis) and "SDLT Calculator Only" (price + SDLT).
- **Dark Mode**: Toggleable with localStorage persistence.
- **Tooltips**: JS-driven tooltip system with 270px max-width bubbles, positioned above (flips below if near viewport top), arrow indicator, fade/scale animation (150ms), hover (desktop) and tap (mobile) support. Dark mode aware.
- **Form Fields**: Utilize placeholders for user guidance (e.g., "e.g. £1,500" for solicitor fees). Simple Analyser starts with 1 recurring cost row (expandable), and includes Letting Agent Fee (%) with VAT toggle.
- **Results Display**: Single scenario display (Investor or FTB), not side-by-side. Mortgage calculations are based on cash invested (deposit + SDLT + fees + costs) when a mortgage is active.
- **Comparison Feature**: "Compare Deals" overlay in the history section, ranking deals by rating/yield with gold/silver/bronze badges for top deals.
- **PDF Export**: Clean print layout for generating PDF reports.

### Technical Implementations
- **Client-side Routing**: Implemented using `pushState` for SEO-friendly URLs (`/`, `/deal-analyser`, `/sdlt-calculator`) with Express fallback routes. Unique title, description, canonical, OG, and Twitter metadata per route. Body class system: `simple-mode` (homepage), `deal-mode` (deal analyser), `sdlt-mode` (SDLT calculator) controls route-specific visibility.
- **Route-Specific Underfold Content**: Each route has its own below-the-fold landing content (intro, info cards, FAQs) controlled via CSS body classes. Deal Analyser has 3-column card grid on desktop. All sections support mobile toggle (collapsible) pattern.
- **Calculations**: Comprehensive deal calculations for costs, yields, and target offer price. SDLT calculations adhere to GOV.UK guidance for England & Northern Ireland, including standard residential (0%/2%/5%/10%/12%), first-time buyer relief (0% to £300k, 5% to £500k, fallback >£500k), and additional property / higher rates (5%/7%/10%/15%/17%). Form layout: Address → Deal Reference → red divider → Buyer Type → financial fields.
- **Mortgage Calculator**: Collapsible section with deposit percentage, interest rate, and term inputs. Displays monthly payment, cash flow, and cash-on-cash return. Includes stress test functionality.
- **Yield Analysis**: Net Yield (Asset) = (Annual Rent - Operating Costs) / Purchase Price — never changes with mortgage. Cash-on-Cash = Annual Cashflow After Mortgage / Cash Invested — shown separately when mortgage selected. `adjustYieldsForMortgage()` removed; displayData uses server's raw data.
- **Deal Rating**: A–F grades based on fixed Net Yield (Asset) thresholds: A≥8%, B 7–7.99%, C 6–6.99%, D 5–5.99%, F<5%. Colours: A/B green, C amber, D orange, F red. Independent of target yield.
- **Itemised Costs**: Replaced single inputs for additional costs and monthly running costs with itemised label + amount pairs.
- **Capital Growth & Tax Impact**: Collapsible sections for projecting capital growth and estimating Section 24 tax impact.
- **Refinance Scenario**: Interactive section to model refinance scenarios.
- **History**: Stores up to 20 deal entries in `localStorage`, including mortgage metrics (cashOnCash, totalCashInvested, monthlyCashFlow, stress data). Two-line row layout: deal name + price shorthand · Yield 1dp · ±cashflow/mo (bold, coloured) · COC (mortgage only) · 🏦/💷 icon. Grade badge tappable to open compare modal filtered to that deal. Auto-naming: address → "£{price} Deal" → "Untitled Deal". Sorted by Net Yield (Asset) descending (highest first). Each metric chunk wrapped in nowrap spans to prevent mid-number wrapping on mobile.
- **Comparison Feature**: "Compare Deals" overlay in the history section, ranking deals by rating/yield with gold/silver/bronze badges for top deals. Primary metrics (Net Yield 2dp, Monthly Cashflow, Cash-on-Cash, Cash Invested) and secondary details (Price, Rent, Gross Yield, SDLT, Purchase type, Buyer). Stress test badge per deal. BEST DEAL = highest Net Yield (Asset) with helper text. Rating note: "Rating based on Net Yield (Asset) only." Sort by: Rating, Net Yield, Cash-on-Cash, Monthly Cashflow, Price, Rent. Deal highlight on tap from history.
- **Deal Snapshot (Live Running Totals)**: Real-time Upfront Total, Monthly Cashflow, Net Yield (Asset), and Cash-on-Cash (when mortgage) display in the results panel (desktop) and a sticky top bar (mobile). Uses client-side SDLT calculation (`calcSDLTClient`) and shared helpers (`computeSnapshot`). Desktop shows 3 metrics (cash) or 4 metrics (mortgage adds Cash-on-Cash). Mobile shows 3 metrics with the 3rd switching between Net Yield (cash) and Cash-on-Cash (mortgage) with pulse animation on toggle. Snapshot yields show 1dp; details breakdown shows 2dp. Standardised labels: "Net Yield (Asset)", "Cash-on-Cash", "Gross Yield". Updates live as user types. Breakdown details collapsed by default. Hidden in SDLT-only mode. Visual hierarchy: Net Yield largest/boldest, Upfront Total reduced weight. Header mounted once (stable DOM) via `mountSnapshotCard()` — only metric values update on each render, preventing logo/header jitter. CSS grid header: title (row 1, left), logo (row 1, right). Capture Snapshot button positioned at bottom-right of card, below breakdown. `.is-capturing` class forces light-mode styles during PNG export.
- **URL Sharing**: Deals can be shared via URL query parameters, which auto-populate the form.
- **Structured Data**: Implemented various JSON-LD schemas (@graph, Organization, WebSite, SoftwareApplication+WebApplication, FAQPage) for SEO.
- **Security**: XSS protection implemented via `escHtml()` for user-provided strings.

### Features
- **SDLT Calculation**: Standard, First-Time Buyer, and Additional Property rates.
- **Yield Calculation**: Gross, Net, Cash-on-Cash Return, and Payback Period.
- **Target Offer Price Solver**.
- **Itemised Costs Management**: Additional costs and monthly running costs.
- **Capital Growth Projection**: 5yr/10yr projection with "Projected Equity" label.
- **Section 24 Tax Impact Analysis**: Estimated tax, mortgage interest credit, and after-tax cash flow. Shows "Estimate only — not tax advice" disclaimer. `isLimitedCompany` boolean (false) prepared for future limited company option — hides section with note when true.
- **Target Offer Price**: Based on Net Yield (Asset), excluding mortgage. Tooltip confirms this.
- **Mortgage Stress Testing**: Calculates impact of higher interest rates. Single badge only (stress-rate based).
- **Void Allowance**: Percentage-based void allowance impacting effective annual rent.
- **Deal Reference**: Input field to identify deals.
- **Interactive Charts**: SVG yield gauge and SDLT comparison bar chart.
- **Currency Formatting**: Automatic formatting with £ and commas. `fmtShort()` for price shorthand (£143k, £1.2m). Sanitises string inputs (strips £/commas, parseFloat), returns "—" for NaN/Infinity. Under £1k shows full amount (e.g. £950), £1k–£999k whole k, £1m+ 1dp m.
- **Version System**: `APP_VERSION` and `APP_VERSION_DATE` manual string constants. Displayed in footer and both PDFs (deal + comparison).
- **PDF Text Sanitisation**: `sanitizePdfText()` strips control chars, converts smart quotes/dashes to ASCII, removes non-printable characters (keeps £). Applied to user-provided text in PDF exports.
- **History Sort Indicator**: "Sorted by: Net Yield (Asset) · Highest first" meta line with "Show ranks" toggle under Comparison History heading.
- **ROI Rank Toggle**: Toggle switch near history heading. When ON, shows rank badges (#1, #2, #3...) on history rows based on Net Yield descending sort. Compare modal always shows ranks with gold/silver/bronze badges.
- **PDF Logo**: 1200x120 logo (`rental-metrics-logo-primary-1200x120.png`) added to top-right of first page header in both deal and comparison PDFs via `loadPdfLogo()` + `addPdfLogo()`.
- **Snapshot Logo**: 600x60 logo in DOM header (`.snapshot-header-logo`), far-right aligned with Capture button, ~0.18 opacity grayscale, 30px height (22px mobile). Dark mode: inverted + 0.25 opacity. Captured by html2canvas naturally; dark mode capture temporarily resets to light-mode styles.
- **"Start Again" Reset Button**.

## External Dependencies
- **Google Maps API**: Used for address autocomplete suggestions and displaying a map preview with a marker. The API key is served via `/api/maps-key`.
- **Node.js**: Backend runtime environment.
- **Express**: Web framework for the Node.js backend.