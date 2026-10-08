import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Buyer, amount, gbp, purchaseTax, TAX_EFFECTIVE, TAX_VERIFIED, TAX_SCOPE, TAX_SOURCE, TAX_HIGHER_SOURCE } from '@/lib/deals';
import { Banner, Card, Check, ExternalLink, IconButton, Page, Row, Segmented, Field, T, HEADING } from '@/components/ui';

const BASE = [
  'I am buying as a UK-resident individual, not a company, trust or non-resident.',
  'This is one residential purchase of a freehold or an assigned existing lease, with none of the excluded cases in the scope below.',
];
const EXTRA: Record<Buyer, string[]> = {
  standard: ['The additional-property higher rates do not apply to any buyer or their spouse for this purchase.'],
  additional: ['I will own another qualifying residential property after this purchase, so the higher rates apply.'],
  ftb: ['Every buyer has never owned a residential property anywhere in the world.', 'We intend to live in this property as our main residence.'],
};
const EXPLAIN: Record<Buyer, string> = {
  standard: 'Standard residential rates: 0% to £125,000, 2% to £250,000, 5% to £925,000, 10% to £1.5m and 12% above.',
  additional: 'Additional property: 5% is added to each standard band (5%, 7%, 10%, 15%, 17%). No higher-rate SDLT applies to purchases below £40,000.',
  ftb: 'First-time buyer relief: 0% to £300,000 and 5% from £300,000 to £500,000, for main residences only. Above £500,000 the relief is not available and standard rates apply.',
};

export default function Tools() {
  const [price, setPrice] = useState('');
  const [buyer, setBuyer] = useState<Buyer>('standard');
  const [acks, setAcks] = useState<Record<string, boolean>>({});
  const items = [...BASE, ...EXTRA[buyer]];
  const all = items.every((_, i) => acks[`${buyer}:${i}`]);
  const n = amount(price);
  const priceOk = price.trim() !== '' && Number.isFinite(n) && n >= 0;
  let result: ReturnType<typeof purchaseTax> | null = null;
  if (all && priceOk) { try { result = purchaseTax(n, buyer); } catch { result = null; } }

  return (
    <Page headerRight={<IconButton name="settings" label="Settings and About" testID="open-settings" onPress={() => router.push('/settings')} />}>
      <View style={{ gap: 4 }}>
        <T variant="display">Tools</T>
        <T tone="muted">Stamp Duty Land Tax (SDLT) for England and Northern Ireland. Works offline.</T>
      </View>
      <Card>
        <Field label="Purchase price" prefix="£" numeric value={price} onChangeText={setPrice} testID="tools-price" hint="Zero is allowed." />
        {price.trim() !== '' && !priceOk ? <T variant="small" tone="destructive">Enter a valid non-negative amount.</T> : null}
        <T variant="small" style={{ fontFamily: HEADING }}>Buyer type</T>
        <Segmented testID="tools-buyer" value={buyer} onChange={setBuyer}
          options={[{ value: 'standard', label: 'Standard' }, { value: 'additional', label: 'Additional property' }, { value: 'ftb', label: 'First-time buyer' }]} />
        <T variant="small" tone="muted">{EXPLAIN[buyer]}</T>
      </Card>
      <Card>
        <T variant="heading">Confirm eligibility</T>
        <T variant="small" tone="muted">The estimate stays hidden until every statement applies to you.</T>
        {items.map((t, i) => (
          <Check key={`${buyer}:${i}`} testID={`ack-${buyer}-${i}`} checked={!!acks[`${buyer}:${i}`]} onChange={v => setAcks(a => ({ ...a, [`${buyer}:${i}`]: v }))} label={t} />
        ))}
      </Card>
      {!all ? (
        <Banner tone="info" message="Calculation unavailable until you confirm the statements above. If any do not apply, this tool does not support your purchase." testID="tools-blocked" />
      ) : !priceOk ? (
        <Banner tone="info" message="Enter a purchase price to see the estimate." />
      ) : result ? (
        <Card>
          <T variant="label" tone="muted">Estimated SDLT</T>
          <T variant="display" testID="tools-total">{gbp(result.total)}</T>
          <T variant="small" tone="muted">{n > 0 ? `Effective rate ${((result.total / n) * 100).toFixed(2)}% of price.` : 'No tax on a zero price.'}</T>
          {buyer === 'ftb' && n > 500000 ? <Banner tone="info" message="First-time buyer relief is not available above £500,000, so standard rates are used." /> : null}
          {buyer === 'additional' && n > 0 && n < 40000 ? <Banner tone="info" message="Additional property rates do not apply below £40,000." /> : null}
          <View>{result.bands.map((b, i) => <Row key={i} label={`${gbp(b.from)} to ${gbp(b.to)} at ${(b.rate * 100).toFixed(0)}%`} value={gbp(b.tax)} />)}</View>
          <T variant="small" tone="muted">The overall total is rounded down to the nearest pound, following HMRC guidance (SDLTM00050). The website follows the same rounding rule.</T>
        </Card>
      ) : null}
      <Card tone="soft">
        <T variant="heading">Rules and scope</T>
        <T variant="small">Rates effective {TAX_EFFECTIVE}. Last verified {TAX_VERIFIED}. The explanations above are bundled with the app and work offline.</T>
        <T variant="small">{TAX_SCOPE}</T>
        <T variant="small" tone="muted">Official guidance (opens online):</T>
        <ExternalLink testID="link-rates" label="GOV.UK residential SDLT rates (online)" url={TAX_SOURCE} />
        <ExternalLink testID="link-higher" label="GOV.UK additional property guidance (online)" url={TAX_HIGHER_SOURCE} />
      </Card>
    </Page>
  );
}
