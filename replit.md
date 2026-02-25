# RentalMetrics – UK Buy-to-Let Deal Calculator & Modelling Tool

## Overview
RentalMetrics is a web-based UK buy-to-let deal calculator and modelling tool specifically for England & Northern Ireland. It empowers investors and first-time buyers by providing essential financial metrics for property deals, including Stamp Duty Land Tax (SDLT), total acquisition costs, gross and net yields, and target offer prices. The tool also features a mortgage calculator, a deal rating system, interactive charts, dark mode, comparison history, and a standalone SDLT calculator mode. The project aims to simplify UK buy-to-let calculations, offering a comprehensive and user-friendly platform for property investment analysis.

## User Preferences
- Currency: GBP with £ and commas
- V1: England & NI only (no Scotland LBTT / Wales LTT)
- Clean, modern UI with tooltips
- RentalMetrics branding: deep red #B11217, charcoal #1a1a1a

## System Architecture

### UI/UX Decisions
The UI/UX prioritizes a clean, modern aesthetic with RentalMetrics branding (deep red #B11217, charcoal #1a1a1a). It features a single-row header with logo, tagline, mode tabs (Deal Calculator, SDLT Calculator), and a dark mode toggle. Tooltips provide user guidance, and form fields utilize placeholders. Buyer type selection is dynamically controlled based on the active mode. Results are displayed for a single scenario with a focus on mortgage-based calculations when applicable. A "Compare Deals" overlay allows detailed analysis of selected historical deals, exportable to PDF and XLSX.

### Technical Implementations
The application uses client-side routing with `pushState` for SEO-friendly URLs, supported by Express fallback routes. Each route has unique metadata and route-specific underfold content. Comprehensive deal calculations include costs, yields (Gross, Net, Cash-on-Cash), and target offer price. SDLT calculations adhere to GOV.UK guidance for various buyer types. A collapsible mortgage calculator provides detailed payment and cash flow analysis, including stress testing. A deal rating system grades deals A-F based on Net Yield (Asset). Costs are itemized, and features like capital growth projection, Section 24 tax impact analysis, and refinance scenarios are included. Deal history is stored locally, allowing comparison and sorting. A real-time "Deal Snapshot" displays key metrics, and deals can be shared via URL parameters. Structured data (JSON-LD) is implemented for SEO, and XSS protection is in place.

### Features
Key features include SDLT calculation for various scenarios, comprehensive yield calculations, a target offer price solver, itemised cost management, capital growth projections, and Section 24 tax impact analysis. The tool offers mortgage stress testing, void allowance consideration, and a deal reference input. Interactive charts (yield gauge, SDLT comparison) enhance data visualization. Currency formatting is automated, and a version system is in place. History includes sorting and ranking options. PDF and snapshot exports are supported with branded logos and text sanitization. A "Start Again" and "Re-analyse" button provide control over the calculation process.

## External Dependencies
- **Google Maps API**: Used for address autocomplete, map previews, and postcode extraction.
- **Node.js**: Backend runtime environment.
- **Express**: Web framework for the Node.js backend.