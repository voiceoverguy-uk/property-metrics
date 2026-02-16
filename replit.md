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
- **Form Fields**: Utilize placeholders for user guidance (e.g., "e.g. £1,500" for solicitor fees).
- **Results Display**: Single scenario display (Investor or FTB), not side-by-side. Mortgage calculations are based on cash invested (deposit + SDLT + fees + costs) when a mortgage is active.
- **Comparison Feature**: "Compare Deals" overlay in the history section, ranking deals by rating/yield with gold/silver/bronze badges for top deals.
- **PDF Export**: Clean print layout for generating PDF reports.

### Technical Implementations
- **Client-side Routing**: Implemented using `pushState` for SEO-friendly URLs (`/`, `/deal-analyser`, `/sdlt-calculator`) with Express fallback routes. Unique title, description, canonical, OG, and Twitter metadata per route.
- **Calculations**: Comprehensive deal calculations for costs, yields, and target offer price. SDLT calculations adhere to England & Northern Ireland rates, including standard, first-time buyer, and additional property scenarios (post-April 2025 rates for additional property).
- **Mortgage Calculator**: Collapsible section with deposit percentage, interest rate, and term inputs. Displays monthly payment, cash flow, and cash-on-cash return. Includes stress test functionality.
- **Yield Analysis**: Leveraged yield calculations when a mortgage is active, deducting mortgage payments from net annual rent.
- **Deal Rating**: A+ to F grades based on net yield vs. target yield difference.
- **Itemised Costs**: Replaced single inputs for additional costs and monthly running costs with itemised label + amount pairs.
- **Capital Growth & Tax Impact**: Collapsible sections for projecting capital growth and estimating Section 24 tax impact.
- **Refinance Scenario**: Interactive section to model refinance scenarios.
- **History**: Stores up to 20 deal entries in `localStorage`, enabling reloading, deletion, and comparison.
- **URL Sharing**: Deals can be shared via URL query parameters, which auto-populate the form.
- **Structured Data**: Implemented various JSON-LD schemas (@graph, Organization, WebSite, SoftwareApplication+WebApplication, FAQPage) for SEO.
- **Security**: XSS protection implemented via `escHtml()` for user-provided strings.

### Features
- **SDLT Calculation**: Standard, First-Time Buyer, and Additional Property rates.
- **Yield Calculation**: Gross, Net, Cash-on-Cash Return, and Payback Period.
- **Target Offer Price Solver**.
- **Itemised Costs Management**: Additional costs and monthly running costs.
- **Capital Growth Projection**: 5yr/10yr projection and estimated equity.
- **Section 24 Tax Impact Analysis**: Estimated tax, mortgage interest credit, and after-tax cash flow.
- **Mortgage Stress Testing**: Calculates impact of higher interest rates.
- **Void Allowance**: Percentage-based void allowance impacting effective annual rent.
- **Deal Reference**: Input field to identify deals.
- **Interactive Charts**: SVG yield gauge and SDLT comparison bar chart.
- **Currency Formatting**: Automatic formatting with £ and commas.
- **"Start Again" Reset Button**.

## External Dependencies
- **Google Maps API**: Used for address autocomplete suggestions and displaying a map preview with a marker. The API key is served via `/api/maps-key`.
- **Node.js**: Backend runtime environment.
- **Express**: Web framework for the Node.js backend.