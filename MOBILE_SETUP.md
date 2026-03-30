# RentalMetrics — Mobile App Setup (iOS & Android)

This project uses **Capacitor** to wrap the web app into native iOS and Android apps.

## Architecture

- The mobile app bundles the files from `mobile/www/`
- API calls go to `https://rentalmetrics.co.uk` when running inside the app
- All calculations, SDLT, Maps — everything uses the live server
- `scripts/build-mobile.sh` regenerates `mobile/www/` from `public/` whenever needed

---

## Prerequisites (on your Mac)

- **Xcode** (for iOS) — install from the Mac App Store
- **CocoaPods** — `sudo gem install cocoapods`
- **Android Studio** (for Android) — https://developer.android.com/studio
- **Node.js** — https://nodejs.org
- **Git** — to clone the repo

---

## First-Time Setup (run once on your Mac)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd <repo-folder>

# 2. Install dependencies
npm install

# 3. Build the mobile web assets
bash scripts/build-mobile.sh

# 4. Add iOS platform
npx cap add ios

# 5. Add Android platform
npx cap add android

# 6. Sync web assets to native projects
npx cap sync
```

---

## Open in Xcode (iOS)

```bash
npx cap open ios
```

In Xcode:
1. Select your **Apple Developer Team** under Signing & Capabilities
2. Change the Bundle ID if needed (currently: `co.uk.rentalmetrics.app`)
3. Choose a simulator or your connected iPhone
4. Hit **Run** (▶) to test, or **Product → Archive** to submit to App Store

---

## Open in Android Studio

```bash
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to finish
2. Click **Run** to test on emulator or device
3. For Play Store: **Build → Generate Signed Bundle/APK**

---

## Updating After Code Changes

Whenever the web app is updated:

```bash
# Pull latest changes
git pull

# Rebuild mobile web assets
bash scripts/build-mobile.sh

# Sync to native projects
npx cap sync
```

---

## App Store Info

| Field | Value |
|-------|-------|
| Bundle ID | `co.uk.rentalmetrics.app` |
| App Name | RentalMetrics |
| Category | Finance |
| API Server | https://rentalmetrics.co.uk |

---

## Notes

- Google Maps works via the live server API key — no separate mobile Maps key needed
- The app is a hybrid (web view) — it looks and feels like a native app
- Offline mode: SDLT and snapshot calculations work offline; "Analyse the Deal" requires internet
