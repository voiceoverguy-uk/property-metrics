---
name: Expo native verification limits
description: SDK 57 splash schema and native-device checks versus browser previews
---
For this Expo SDK generation, native splash configuration belongs in the expo-splash-screen plugin; Expo Doctor rejects a top-level splash field.

**Why:** The scaffold/schema combination accepted the plugin but rejected the legacy top-level property.

**How to apply:** Validate static app.json through Expo Doctor when changing splash/icon configuration.

Browser flow checks and iOS JavaScript export do not verify physical-iPhone keyboard behaviour, accessibility text, VoiceOver or the native PDF share sheet.

**Why:** The Linux workspace can bundle iOS code but cannot produce evidence of those UIKit/device behaviours.

**How to apply:** Report the distinction honestly and require installed-device sign-off before claiming release readiness. Development preview loading also needs Replit connectivity; test cold-start offline in an installed release binary.

Expo Go's project-owner mismatch is a managed preview authorization issue, not an app login requirement. Sign out in Expo Go, then follow the current project's Replit “Preview on your phone” sign-in flow. Never instruct manual sign-in to a replit-private account.

**Why:** The user encountered this mismatch when switching projects and subsequently confirmed the app works in Expo Go after being directed to the managed flow.

**How to apply:** Consult the Expo skill's current sign-in instructions. If the preview panel lacks managed sign-in steps, report that limitation rather than modifying app code or suggesting manual Expo/EAS authentication.
