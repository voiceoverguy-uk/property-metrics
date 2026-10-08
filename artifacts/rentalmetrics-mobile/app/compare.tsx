import React from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Deal, amount, calculate, gbp, percent } from '@/lib/deals';
import { useDeals } from '@/context/DealsContext';
import { useColors } from '@/hooks/useColors';
import { Banner, Button, Card, Row, Skeleton, T, useBottomInset } from '@/components/ui';

type R = ReturnType<typeof calculate>;
const name = (d: Deal) => d.name || d.address || 'Untitled deal';

export default function Compare() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const { deals, ready } = useDeals();
  const c = useColors();
  const bottom = useBottomInset();
  const picked = (ids ?? '').split(',').map(id => deals.find(d => d.id === id)).filter((d): d is Deal => !!d).slice(0, 3);
  const calc = picked.map(d => { try { return calculate(d); } catch { return null; } });
  const metrics: { label: string; get: (r: R) => string }[] = [
    { label: 'Monthly cash flow before tax', get: r => gbp(r.cashFlow) },
    { label: 'Gross yield', get: r => percent(r.grossYield) },
    { label: 'Net yield', get: r => percent(r.netYield) },
    { label: 'Total cash required', get: r => gbp(r.cashRequired) },
    { label: 'Cash-on-cash', get: r => percent(r.cashOnCash) },
  ];
  return (
    <ScrollView testID="compare-screen" style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 20, paddingBottom: bottom + 24, gap: 16 }} contentInsetAdjustmentBehavior="automatic">
      {!ready ? <Skeleton lines={5} /> : picked.length < 2 ? (
        <>
          <Banner tone="info" message="Choose at least two saved deals to compare." />
          <Button label="Back to Saved Deals" onPress={() => router.back()} testID="compare-back" />
        </>
      ) : (
        <>
          <T variant="small" tone="muted">All figures are monthly estimates before income tax, on the same basis for each deal. Yields do not rate a deal.</T>
          {metrics.map(m => (
            <Card key={m.label}>
              <T variant="heading">{m.label}</T>
              {picked.map((d, i) => <Row key={d.id} label={name(d)} value={calc[i] ? m.get(calc[i]!) : 'Cannot calculate'} strong />)}
            </Card>
          ))}
          <T variant="title">Assumptions</T>
          {picked.map((d, i) => {
            const r = calc[i];
            return (
              <Card key={d.id}>
                <T variant="heading">{name(d)}</T>
                <View>
                  <Row label="Purchase price" value={gbp(amount(d.price))} />
                  <Row label="Monthly rent" value={gbp(amount(d.rent))} />
                  <Row label="SDLT treatment" value={d.buyerType === 'additional' ? 'Additional property' : 'Standard'} />
                  <Row label="SDLT estimate" value={r ? gbp(r.sdlt) : 'n/a'} />
                  <Row label="Purchase" value={d.purchaseType === 'cash' ? 'Cash' : 'Mortgage'} />
                  {d.purchaseType === 'mortgage' ? (
                    <>
                      <Row label="Deposit" value={d.depositMode === 'percent' ? `${d.deposit}%` : gbp(amount(d.deposit))} />
                      <Row label="Interest rate" value={`${amount(d.interestRate)}%`} />
                      <Row label="Mortgage type" value={d.mortgageType === 'repayment' ? `Repayment, ${amount(d.term)} years` : 'Interest-only'} />
                    </>
                  ) : null}
                  <Row label="Refurbishment" value={gbp(amount(d.refurb))} />
                  {d.purchaseCosts.map(x => <Row key={x.id} label={x.label || 'One-off cost'} value={`${gbp(amount(x.amount))} one-off`} />)}
                  {d.recurringCosts.map(x => <Row key={x.id} label={x.label || 'Recurring cost'} value={`${gbp(amount(x.amount))} / ${x.frequency === 'yearly' ? 'year' : 'month'}`} />)}
                  {d.recurringCosts.length ? <Row label="Recurring monthly equivalent" value={r ? gbp(r.recurring) : 'n/a'} strong /> : null}
                  <Row label="Void allowance" value={`${amount(d.voidPct)}%`} />
                  <Row label="Management" value={`${amount(d.agentPct)}%${d.agentVat ? ' plus VAT' : ''}`} />
                  <Row label="Maintenance" value={d.maintenanceMode === 'percent' ? `${amount(d.maintenancePct)}% of rent` : `${gbp(amount(d.maintenanceAnnual))} / year`} />
                </View>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
