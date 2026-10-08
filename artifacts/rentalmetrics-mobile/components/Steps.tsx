import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Deal, Cost, newCost, monthlyCosts, gbp, purchaseCostTotal, TAX_SCOPE, TAX_EFFECTIVE, TAX_VERIFIED } from '@/lib/deals';
import { useColors } from '@/hooks/useColors';
import { Button, Card, Check, Field, IconButton, Segmented, T, HEADING, tap } from '@/components/ui';

type P = { d: Deal; set: (p: Partial<Deal>) => void };

export function PropertyStep({ d, set }: P) {
  return (
    <View style={{ gap: 16 }}>
      <T variant="title">Property and purchase</T>
      <Field label="Name (optional)" value={d.name} onChangeText={t => set({ name: t })} placeholder="e.g. Terrace near the station" testID="field-name" autoCapitalize="sentences" />
      <Field label="Address (optional)" value={d.address} onChangeText={t => set({ address: t })} placeholder="Street, town, postcode" testID="field-address" />
      <Field label="Purchase price" prefix="£" numeric value={d.price} onChangeText={t => set({ price: t })} testID="field-price" />
      <View style={{ gap: 8 }}>
        <T variant="small" style={{ fontFamily: HEADING }}>Stamp Duty (SDLT) treatment</T>
        <Segmented testID="buyer" value={d.buyerType} onChange={v => set({ buyerType: v, taxConfirmed: false })}
          options={[{ value: 'additional', label: 'Additional property' }, { value: 'standard', label: 'Standard rates' }]} />
        <T variant="small" tone="muted">
          {d.buyerType === 'additional'
            ? 'Use when you or a joint buyer/spouse will own another qualifying residential property and no main-residence replacement exception applies.'
            : 'Use when this is your only qualifying residential property and the additional-property rules do not apply. First-time buyer relief is not available for buy-to-let.'}
        </T>
      </View>
      <Card tone="soft">
        <T variant="heading">Tax scope</T>
        <T variant="small">{TAX_SCOPE}</T>
        <T variant="small" tone="muted">Rules effective {TAX_EFFECTIVE}, checked {TAX_VERIFIED}.</T>
        <Check testID="ack-scope" checked={!!d.taxConfirmed} onChange={v => set({ taxConfirmed: v })}
          label="I confirm I am a UK-resident individual making one supported residential purchase, and that the standard or additional property choice above is correct." />
        <T variant="small" tone="muted">Estimates may differ from the website by under £1 because HMRC guidance (SDLTM00050) rounds the SDLT total down to the nearest pound. Additional property rates do not apply below £40,000.</T>
      </Card>
    </View>
  );
}

export function IncomeStep({ d, set }: P) {
  return (
    <View style={{ gap: 16 }}>
      <T variant="title">Rental income</T>
      <Field label="Monthly rent" prefix="£" numeric value={d.rent} onChangeText={t => set({ rent: t })} testID="field-rent" hint="Enter 0 if the property earns no rent." />
    </View>
  );
}

export function MortgageStep({ d, set }: P) {
  return (
    <View style={{ gap: 16 }}>
      <T variant="title">Mortgage</T>
      <Segmented testID="purchase-type" value={d.purchaseType} onChange={v => set({ purchaseType: v })}
        options={[{ value: 'cash', label: 'Cash purchase' }, { value: 'mortgage', label: 'With a mortgage' }]} />
      {d.purchaseType === 'cash' ? (
        <T tone="muted">No borrowing. Total cash required will include the full purchase price.</T>
      ) : (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <T variant="small" style={{ fontFamily: HEADING }}>Deposit entered as</T>
            <Segmented testID="deposit-mode" value={d.depositMode} onChange={v => set({ depositMode: v })}
              options={[{ value: 'pounds', label: 'Pounds' }, { value: 'percent', label: 'Percent of price' }]} />
          </View>
          <Field label={d.depositMode === 'percent' ? 'Deposit' : 'Deposit'} numeric prefix={d.depositMode === 'pounds' ? '£' : undefined} suffix={d.depositMode === 'percent' ? '%' : undefined}
            value={d.deposit} onChangeText={t => set({ deposit: t })} testID="field-deposit" hint="Zero is allowed." />
          <Field label="Interest rate" numeric suffix="%" value={d.interestRate} onChangeText={t => set({ interestRate: t })} testID="field-rate" />
          <View style={{ gap: 8 }}>
            <T variant="small" style={{ fontFamily: HEADING }}>Mortgage type</T>
            <Segmented testID="mortgage-type" value={d.mortgageType} onChange={v => set({ mortgageType: v })}
              options={[{ value: 'interest-only', label: 'Interest-only' }, { value: 'repayment', label: 'Repayment' }]} />
          </View>
          <T variant="small" tone="muted">{d.mortgageType === 'repayment' ? 'Repayment pays interest and reduces the loan balance. The full payment reduces cash flow once.' : 'Interest-only pays interest each month; the loan capital still needs repaying at the end.'}</T>
          {d.mortgageType === 'repayment' ? (
            <Field label="Term" numeric suffix="years" value={d.term} onChangeText={t => set({ term: t })} testID="field-term" />
          ) : null}
        </View>
      )}
    </View>
  );
}

function CostList({ title, hint, rows, onChange, recurring, tid }: { title: string; hint: string; rows: Cost[]; onChange: (r: Cost[]) => void; recurring?: boolean; tid: string }) {
  const c = useColors();
  const patch = (id: string, p: Partial<Cost>) => onChange(rows.map(r => (r.id === id ? { ...r, ...p } : r)));
  const eq = monthlyCosts(rows);
  const total = purchaseCostTotal(rows);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <T variant="heading">{title}</T>
        <T variant="small" tone="muted">{hint}</T>
      </View>
      {rows.map((r, i) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T variant="label" tone="muted">{`${recurring ? 'Recurring' : 'One-off'} cost ${i + 1}`}</T>
            <IconButton name="trash-2" label={`Remove cost ${i + 1}`} tone="destructive" testID={`${tid}-remove-${i}`} onPress={() => onChange(rows.filter(x => x.id !== r.id))} />
          </View>
          <Field label="Name" value={r.label} onChangeText={t => patch(r.id, { label: t })} testID={`${tid}-label-${i}`} placeholder={recurring ? 'e.g. Insurance' : 'e.g. Legal fees'} />
          <Field label="Amount" prefix="£" numeric value={r.amount} onChangeText={t => patch(r.id, { amount: t })} testID={`${tid}-amount-${i}`} />
          {recurring ? (
            <Segmented testID={`${tid}-freq-${i}`} value={r.frequency} onChange={v => patch(r.id, { frequency: v })}
              options={[{ value: 'monthly', label: 'Per month' }, { value: 'yearly', label: 'Per year' }]} />
          ) : null}
        </Card>
      ))}
      <Button label={recurring ? 'Add recurring cost' : 'Add one-off cost'} icon="plus" variant="secondary" testID={`${tid}-add`} onPress={() => onChange([...rows, newCost()])} />
      {rows.length > 0 || recurring ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 }}>
          <T style={{ fontFamily: HEADING }}>{recurring ? 'Monthly equivalent' : 'One-off total'}</T>
          <T style={{ fontFamily: HEADING }}>{Number.isFinite(recurring ? eq : total) ? gbp(recurring ? eq : total) : 'Check amounts'}</T>
        </View>
      ) : null}
    </View>
  );
}

export function CostsStep({ d, set }: P) {
  const c = useColors();
  const [open, setOpen] = useState(!!(d.voidPct || d.agentPct || d.maintenancePct || d.maintenanceAnnual));
  return (
    <View style={{ gap: 20 }}>
      <T variant="title">Costs</T>
      <Field label="Refurbishment" prefix="£" numeric value={d.refurb} onChangeText={t => set({ refurb: t })} testID="field-refurb" hint="Leave empty for none." />
      <CostList tid="purchase-cost" title="One-off purchase costs" hint="Legal, survey, broker fees and similar. Not recurring." rows={d.purchaseCosts} onChange={r => set({ purchaseCosts: r })} />
      <CostList tid="recurring-cost" recurring title="Recurring Costs" hint="Enter each as monthly or yearly; yearly amounts are divided by 12." rows={d.recurringCosts} onChange={r => set({ recurringCosts: r })} />
      <Card>
        <Pressable testID="toggle-assumptions" accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { tap(); setOpen(!open); }}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T variant="heading">Voids, management and maintenance</T>
            <T variant="small" tone="muted">Optional. Empty means zero.</T>
          </View>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={22} color={c.foreground} />
        </Pressable>
        {open ? (
          <View style={{ gap: 16 }}>
            <Field label="Void allowance" numeric suffix="%" value={d.voidPct} onChangeText={t => set({ voidPct: t })} testID="field-void" hint="Rent lost while empty or unpaid, as a percentage of scheduled rent." />
            <Field label="Management fee" numeric suffix="%" value={d.agentPct} onChangeText={t => set({ agentPct: t })} testID="field-agent" hint="Applied to scheduled rent." />
            <Check testID="agent-vat" checked={d.agentVat} onChange={v => set({ agentVat: v })} label="Add 20% VAT to the management fee" />
            <Segmented testID="maintenance-mode" value={d.maintenanceMode} onChange={v => set({ maintenanceMode: v })}
              options={[{ value: 'percent', label: 'Maintenance %' }, { value: 'annual', label: 'Per year' }]} />
            {d.maintenanceMode === 'percent'
              ? <Field label="Maintenance" numeric suffix="%" value={d.maintenancePct} onChangeText={t => set({ maintenancePct: t })} testID="field-maint-pct" hint="Repairs allowance as a percentage of rent after voids. Do not also enter the same allowance as a recurring cost." />
              : <Field label="Maintenance" numeric prefix="£" suffix="/ year" value={d.maintenanceAnnual} onChangeText={t => set({ maintenanceAnnual: t })} testID="field-maint-annual" />}
          </View>
        ) : null}
      </Card>
    </View>
  );
}
