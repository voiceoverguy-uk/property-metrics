import React from 'react';
import { ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import { ASSUMPTIONS, TAX_EFFECTIVE, TAX_SCOPE, TAX_VERIFIED, TAX_SOURCE, TAX_HIGHER_SOURCE } from '@/lib/deals';
import { useColors } from '@/hooks/useColors';
import { Card, ExternalLink, T, WEBSITE, useBottomInset } from '@/components/ui';

export default function Settings() {
  const c = useColors();
  const bottom = useBottomInset();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 20, paddingBottom: bottom + 24, gap: 16 }} contentInsetAdjustmentBehavior="automatic">
      <Card>
        <T variant="heading">About RentalMetrics</T>
        <T>A viewing companion for UK property investors. Enter a deal and see cash flow, yields and cash required with every assumption visible.</T>
        <T variant="small" tone="muted" testID="app-version">{`Version ${Constants.expoConfig?.version ?? '1.0.0'}`}</T>
      </Card>
      <Card>
        <T variant="heading">Your data stays on this device</T>
        <T>RentalMetrics stores your drafts and saved deals on this device. There is no account and no cloud sync, and no login is needed.</T>
        <T variant="small">Deleting the app can permanently lose local data. Exported summaries go wherever you choose to share them. Device backups are subject to your operating system settings.</T>
      </Card>
      <Card>
        <T variant="heading">Works offline</T>
        <T>All calculations and the SDLT tool run offline. Only the links marked online need a connection.</T>
      </Card>
      <Card>
        <T variant="heading">Calculation assumptions</T>
        {ASSUMPTIONS.map((a, i) => <T key={i} variant="small">{a}</T>)}
        <T variant="small">SDLT totals are rounded down to the nearest pound, following HMRC guidance (SDLTM00050), so fractional-pound estimates can differ from the website. Additional property rates do not apply below £40,000.</T>
      </Card>
      <Card>
        <T variant="heading">Tax scope</T>
        <T variant="small">Rules effective {TAX_EFFECTIVE}, last verified {TAX_VERIFIED}.</T>
        <T variant="small">{TAX_SCOPE}</T>
      </Card>
      <Card>
        <T variant="heading">Links (online)</T>
        <ExternalLink testID="link-website" label="RentalMetrics website (online)" url={WEBSITE} />
        <ExternalLink label="GOV.UK residential SDLT rates (online)" url={TAX_SOURCE} />
        <ExternalLink label="GOV.UK additional property guidance (online)" url={TAX_HIGHER_SOURCE} />
      </Card>
      <Card tone="soft">
        <T variant="heading">Privacy</T>
        <T variant="small">The release privacy policy still needs confirmation from the app owner before publication. Nothing here should be read as a final legal statement.</T>
        <T variant="small">A dedicated support contact or support-page URL also needs to be supplied before release. No contact details have been assumed.</T>
      </Card>
    </ScrollView>
  );
}
