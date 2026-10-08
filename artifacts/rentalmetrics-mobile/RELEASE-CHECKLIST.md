# RentalMetrics iPhone companion

## Current build

This is a separate Expo / React Native mobile artifact. The existing RentalMetrics website and API remain in place. No mobile login, accounts, cloud synchronisation, listing feeds, ads or subscriptions were added.

Select **RentalMetrics Mobile** in the Replit preview, then use its iPhone / Expo Go QR flow. Open the QR on an iPhone with a compatible Expo Go version; the browser preview is only a layout/interaction preview, not an iOS simulator. The development bundle needs a connection to Replit to load. A release build bundles the calculation code, tax rules, wordmark and font. Core operations do not call the API.

## Verification completed

- TypeScript check; Expo Doctor: 21/21 checks passed.
- Production iOS JavaScript/Hermes bundle exported successfully, with the wordmark and Manrope font included. This is **not** a signed iOS archive.
- Calculation tests execute the actual website snapshot, mortgage, management, maintenance, recurring-cost and SDLT functions, with adapters for native inputs. Representative cash, interest-only, repayment, zero-interest, zero-rent, negative-cash-flow and yearly-cost cases match.
- Tests cover frequency-preserving serialisation, schema protection, saving/updating/duplicating/deleting, scenario non-mutation, deposit validation and inapplicable cash-on-cash.
- Browser interaction tests: guided flow/back navigation, GBP paste and formatting, draft and saved-deal reload, offline operations after bundle load, editable saved deals, three-deal comparison, delete/cancel, SDLT eligibility, first-time buyer limits, corrupt-storage error handling and widths 320/375/430.
- PDF HTML is tested for original frequencies, results, mortgage inputs, assumptions and escaping. A branded PDF is rendered in headless Chromium with networking disabled and a base64 logo.
- The website still renders in its own artifact. Its calculations/assets were read, not replaced.

Run from `artifacts/rentalmetrics-mobile`:

```sh
pnpm test
pnpm run typecheck
pnpm run test:ui
pnpm dlx expo-doctor@latest
```

`test:ui` uses Replit's supplied Chromium and the mobile preview domain. iOS bundle export can be run without publishing:

```sh
pnpm exec expo export --platform ios --output-dir /tmp/rentalmetrics-ios
```

## Physical-iPhone sign-off still required

The browser tests do **not** prove native UIKit navigation, iOS keyboards, Dynamic Type, VoiceOver or the actual share sheet. No physical device or signed build was available in this environment.

- Small iPhone and a large iPhone: complete all five steps, go backwards, reopen saved results, compare two and three deals. Check notch, bottom safe area and tab navigation.
- Set the largest accessibility text sizes; verify text wraps, values are readable, all controls remain reachable and there is no horizontal scrolling. Results use a single column on small screens or when native font scale exceeds 1.2.
- On each numeric field: enter decimals, paste `£200,000`, dismiss using Done, scroll with keyboard open and reach Next/Back. Check text-field keyboard dismissal and address/name entry.
- Force-close and relaunch; check draft, saved names, edits, duplicate IDs and original cost frequencies.
- In an installed release/TestFlight build, launch in airplane mode from a fully closed state. Analyse, save/reopen/edit, compare and Tools must work. Online-labelled links should fail explicitly rather than change calculations.
- Share a long deal summary in airplane mode through the **native iOS share sheet**. Open it in Files and another PDF reader; verify the logo, pagination, all inputs, yearly/monthly labels and results. Confirm cancelling sharing returns safely. The PDF is generated locally using `expo-print` and shared through `expo-sharing`; only temporary PDF files are removed.
- Check standard/additional selections with a conveyancer for the user's actual transaction. This is an estimate, not tax advice.

## Tax audit (verified 8 October 2026)

Supported: **England / Northern Ireland SDLT**, UK-resident individuals, one residential purchase of a freehold or an assigned existing lease. Scotland LBTT and Wales LTT are deliberately not offered. Companies, trusts, linked/mixed-use purchases, new lease rent, non-residents and special reliefs are excluded. The app requires acknowledgement of its supported assumptions.

Rates effective **1 April 2025**:

- Standard: 0% to £125,000; 2% to £250,000; 5% to £925,000; 10% to £1.5m; 12% above.
- Additional property: add five percentage points to each band; the higher rates do not apply to a purchase below £40,000.
- Eligible first-time buyer/main residence only: 0% to £300,000, 5% to £500,000. Above £500,000 use standard rates. Every buyer must qualify. This is offered only in Tools, not the buy-to-let Analyse flow.
- HMRC requires the **total** tax to be rounded down to the whole pound, not individual band amounts.

Official sources consulted:

1. https://www.gov.uk/stamp-duty-land-tax/residential-property-rates
2. https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property
3. https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm29831
4. https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm00050

### Intentional website differences, not silently changed

The preserved website lacks the below-£40,000 additional-property exception, rounds to the nearest pound, and exposes first-time buyer relief in its investment flow without confirming main-residence eligibility. The native companion uses the verified restrictions/rounding instead. These are flagged in the app and remain a separate website correction decision.

The site prose also describes net yield on an acquisition-cost basis while its live snapshot uses purchase price. The companion matches the live **purchase-price denominator** and labels it explicitly. Net yield excludes financing; cash flow deducts the mortgage payment exactly once (including capital for repayment mortgages). Management uses scheduled rent; percentage maintenance uses rent after voids. Defaults are blank/zero, not invented property figures.

## Before TestFlight / App Store

Use Replit's supported **Expo Launch / Publish to App Store** workflow when the owner decides to proceed. No upload, submission or approval has been performed.

- Active paid Apple Developer Program membership, correct individual/company team, accepted Apple agreements and a user authorised to create/manage the app.
- Confirm the permanent bundle identifier before the first upload. The companion currently uses `co.uk.rentalmetrics.companion`, deliberately distinct from the existing Capacitor wrapper. Confirm ownership/availability; an existing App Store record might require a different agreed identifier.
- App Store Connect app record, app name, primary language, SKU, categories, age rating and rights to branding/content.
- Signing certificates/provisioning through the supported Apple connection/build flow; check version `1.0.0` and increment build number for subsequent uploads.
- Owner-approved public **privacy policy and support URLs**. About contains factual local-storage/export behaviour and a clearly pending privacy-policy note, not an invented legal policy or support address. The website link is not a substitute for an approved support page.
- Review release dependency/SDK behaviour, privacy manifests, Apple App Privacy answers and encryption declaration for the actual signed binary. Do not claim “no data collected” based solely on local deal storage or on Expo Go behaviour. The initial exemption flag assumes no custom non-exempt encryption and must be confirmed by the owner.
- Final app icon and native splash verification in an installed build; the existing house/growth-bars symbol is on an opaque white 1024×1024 icon. The wordmark retains its original 10:1 aspect ratio. Use the `expo-splash-screen` plugin rather than a top-level splash field for SDK 57.
- Capture real iPhone screenshots at Apple's required sizes from the final build (not browser previews). Prepare description, keywords, promotional text if used and accurate review notes explaining offline use, tax scope and no login.
- Upload when authorised, wait for processing, install with TestFlight, complete the physical-device checks above, then separately decide whether to submit for review. Submission does not guarantee approval.

Official Replit instructions:

- https://docs.replit.com/features/artifact-types/building-mobile-apps
- https://docs.replit.com/build/mobile-apple-account
- https://docs.replit.com/build/mobile-upload-ios
- https://docs.replit.com/build/mobile-testflight
- https://docs.replit.com/build/mobile-store-screenshots
- https://docs.replit.com/build/mobile-publish-ios
