import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Deal, calculate, scenario, gbp, percent, ASSUMPTIONS, amount, TAX_EFFECTIVE, TAX_VERIFIED, TAX_SCOPE } from '@/lib/deals';
import { shareDeal } from '@/lib/pdf';
import { useDeals } from '@/context/DealsContext';
import { useColors } from '@/hooks/useColors';
import { Banner, Button, Card, Field, Row, T, HEADING, errMsg, signed, success, tap, warn } from '@/components/ui';

function Metric({ label, value, big, tid }: { label: string; value: string; big?: boolean; tid?: string }) {
  const c = useColors();
  const { fontScale, width } = useWindowDimensions();
  return (
    <View testID={tid} style={{ flexGrow: 1, flexBasis: big || fontScale > 1.2 || width < 360 ? '100%' : '46%', minWidth: 140, backgroundColor: big ? c.charcoal : c.card, borderRadius: c.radius, padding: 16, gap: 4, borderWidth: big ? 0 : 1, borderColor: c.border }}>
      <T variant="label" tone={big ? 'inverse' : 'muted'} style={big ? { opacity: 0.8 } : undefined}>{label}</T>
      <T variant="metric" tone={big ? 'inverse' : 'default'}>{value}</T>
    </View>
  );
}

function WhatIf({ deal }: { deal: Deal }) {
  const { updateDraft, saveDeal } = useDeals();
  const [open, setOpen] = useState(false);
  const [rent, setRent] = useState(deal.rent);
  const [rate, setRate] = useState(deal.interestRate);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const c = useColors();
  const mortgage = deal.purchaseType === 'mortgage';
  const base = calculate(deal);
  let alt: ReturnType<typeof calculate> | null = null;
  let problem: string | null = null;
  try { alt = calculate(scenario(deal, rent, rate)); } catch (e) { problem = errMsg(e); }
  const changed = rent !== deal.rent || (mortgage && rate !== deal.interestRate);
  async function adopt() {
    setBusy(true); setMsg(null);
    try {
      updateDraft(mortgage ? { rent, interestRate: rate } : { rent });
      await saveDeal();
      success(); setMsg({ ok: true, text: 'New assumptions saved. This deal now uses the changed values.' });
    } catch (e) { warn(); setMsg({ ok: false, text: errMsg(e) }); } finally { setBusy(false); }
  }
  return (
    <Card>
      <Pressable testID="toggle-whatif" accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { tap(); setOpen(!open); }}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <T variant="heading">What if</T>
          <T variant="small" tone="muted">Try a different rent or rate. Your deal stays unchanged.</T>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={22} color={c.foreground} />
      </Pressable>
      {open ? (
        <View style={{ gap: 14 }}>
          <Field label="Scenario monthly rent" prefix="£" numeric value={rent} onChangeText={t => { setRent(t); setMsg(null); }} testID="whatif-rent" />
          {mortgage ? (
            <Field label="Scenario interest rate" suffix="%" numeric value={rate} onChangeText={t => { setRate(t); setMsg(null); }} testID="whatif-rate" />
          ) : (
            <T variant="small" tone="muted">Interest rate does not apply to a cash purchase.</T>
          )}
          {problem ? <Banner message={problem} /> : alt ? (
            <View>
              <Row label="Cash flow before tax (scenario)" value={gbp(alt.cashFlow)} strong note={`Original ${gbp(base.cashFlow)} per month`} />
              <Row label="Change in monthly cash flow" value={signed(alt.cashFlow - base.cashFlow, gbp)} strong />
              <Row label="Gross yield" value={percent(alt.grossYield)} note={`Original ${percent(base.grossYield)}`} />
              <Row label="Net yield" value={percent(alt.netYield)} note={`Original ${percent(base.netYield)}`} />
              <Row label="Cash-on-cash" value={percent(alt.cashOnCash)} note={`Original ${percent(base.cashOnCash)}`} />
            </View>
          ) : null}
          {msg ? <Banner tone={msg.ok ? 'success' : 'error'} message={msg.text} /> : null}
          <View style={{ gap: 8 }}>
            <Button label="Save new assumptions" testID="whatif-save" disabled={!!problem || !changed} loading={busy} onPress={adopt} />
            <Button label="Reset to original" variant="secondary" testID="whatif-reset" disabled={!changed} onPress={() => { setRent(deal.rent); setRate(deal.interestRate); setMsg(null); }} />
          </View>
          <T variant="small" tone="muted">Saving replaces rent{mortgage ? ' and interest rate' : ''} in this deal and saves it.</T>
        </View>
      ) : null}
    </Card>
  );
}

export function ResultsView({ deal, onEdit }: { deal: Deal; onEdit: () => void }) {
  const { updateDraft, saveDeal, deals } = useDeals();
  const [showAssume, setShowAssume] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const c = useColors();
  let r: ReturnType<typeof calculate>;
  try { r = calculate(deal); } catch (e) {
    return (
      <View style={{ gap: 12 }}>
        <T variant="title">Results</T>
        <Banner message={`These entries cannot be calculated yet.\n${errMsg(e)}`} />
        <Button label="Edit entries" icon="edit-2" onPress={onEdit} testID="results-edit" />
      </View>
    );
  }
  const exists = deals.some(d => d.id === deal.id);
  async function save() {
    setSaving(true); setSaveMsg(null);
    try { await saveDeal(); success(); setSaveMsg({ ok: true, text: exists ? 'Changes saved to this deal on this device.' : 'Deal saved on this device. Find it in Saved Deals.' }); }
    catch (e) { warn(); setSaveMsg({ ok: false, text: errMsg(e) }); } finally { setSaving(false); }
  }
  async function share() {
    setSharing(true); setShareErr(null);
    try { await shareDeal(deal); } catch (e) { warn(); setShareErr(errMsg(e)); } finally { setSharing(false); }
  }
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <T variant="title">{deal.name || deal.address || 'Results'}</T>
        <T variant="small" tone="muted">Estimates before income tax, based on your entries.</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Metric big tid="metric-cashflow" label="Monthly cash flow before tax" value={gbp(r.cashFlow)} />
        <Metric tid="metric-gross" label="Gross yield" value={percent(r.grossYield)} />
        <Metric tid="metric-net" label="Net yield" value={percent(r.netYield)} />
        <Metric tid="metric-cash" label="Total cash required" value={gbp(r.cashRequired)} />
        <Metric tid="metric-coc" label="Cash-on-cash" value={percent(r.cashOnCash)} />
      </View>
      <Card>
        <T variant="heading">Save this deal</T>
        <Field label="Deal name" value={deal.name} onChangeText={t => { updateDraft({ name: t }); setSaveMsg(null); }} testID="save-name" placeholder={deal.address || 'Untitled deal'} autoCapitalize="sentences" />
        {saveMsg ? <Banner tone={saveMsg.ok ? 'success' : 'error'} message={saveMsg.text} testID="save-feedback" /> : null}
        <Button label={exists ? 'Update saved deal' : 'Save deal'} icon="save" onPress={save} loading={saving} testID="save-deal" />
        {shareErr ? <Banner message={shareErr} actionLabel="Try again" onAction={share} testID="share-error" /> : null}
        <Button label="Share summary (PDF)" icon="share" variant="secondary" onPress={share} loading={sharing} testID="share-deal" />
      </Card>
      <Card>
        <Pressable testID="toggle-breakdown" accessibilityRole="button" accessibilityState={{ expanded: showBreakdown }}
          onPress={() => { tap(); setShowBreakdown(!showBreakdown); }} style={{ minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <T variant="heading" style={{ flex: 1 }}>How the numbers build up</T>
          <Feather name={showBreakdown ? 'chevron-up' : 'chevron-down'} size={22} color={c.foreground} />
        </Pressable>
        {showBreakdown ? <>
        <View>
          <Row label="Purchase price" value={gbp(r.price)} />
          <Row label="Stamp Duty (SDLT) estimate" value={gbp(r.sdlt)} note={deal.buyerType === 'additional' ? 'Additional property rates' : 'Standard rates'} />
          <Row label="Refurbishment and one-off costs" value={gbp(r.fees)} />
          <Row label={deal.purchaseType === 'cash' ? 'Cash paid for property' : 'Deposit'} value={gbp(r.deposit)} />
          <Row label="Total cash required" value={gbp(r.cashRequired)} strong />
          <Row label="Loan" value={gbp(r.loan)} />
          <Row label="Monthly rent" value={gbp(r.rent)} />
          <Row label="Rent after voids" value={gbp(r.effectiveRent)} />
          <Row label="Management" value={`\u2212${gbp(r.management)}`} />
          <Row label="Maintenance" value={`\u2212${gbp(r.maintenance)}`} />
          <Row label="Recurring costs (monthly equivalent)" value={`\u2212${gbp(r.recurring)}`} />
          <Row label="Operating income per month" value={gbp(r.netMonthly)} strong />
          <Row label="Mortgage payment" value={`\u2212${gbp(r.mortgage)}`} />
          <Row label="Cash flow before tax" value={gbp(r.cashFlow)} strong />
        </View>
        <T variant="small" tone="muted">Yields describe the numbers only. They are not a rating and cannot tell you whether this is a good investment.</T>
        </> : <T variant="small" tone="muted">View purchase costs, operating income and mortgage payments. Net yield excludes borrowing.</T>}
      </Card>
      {deal.recurringCosts.length ? (
        <Card>
          <T variant="heading">Recurring Costs as entered</T>
          {deal.recurringCosts.map(x => <Row key={x.id} label={x.label || 'Recurring cost'} value={`${gbp(amount(x.amount))} / ${x.frequency === 'yearly' ? 'year' : 'month'}`} />)}
          <Row label="Monthly equivalent" value={gbp(r.recurring)} strong />
        </Card>
      ) : null}
      <WhatIf key={deal.id} deal={deal} />
      <Card>
        <Pressable testID="toggle-assumptions-info" accessibilityRole="button" accessibilityState={{ expanded: showAssume }} onPress={() => { tap(); setShowAssume(!showAssume); }}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T variant="heading" style={{ flex: 1 }}>Assumptions and tax scope</T>
          <Feather name={showAssume ? 'chevron-up' : 'chevron-down'} size={22} color={c.foreground} />
        </Pressable>
        {showAssume ? (
          <View style={{ gap: 10 }}>
            {ASSUMPTIONS.map((a, i) => <T key={i} variant="small">{a}</T>)}
            <T variant="small" tone="muted">SDLT rules effective {TAX_EFFECTIVE}, checked {TAX_VERIFIED}. {TAX_SCOPE}</T>
          </View>
        ) : null}
      </Card>
      <Button label="Edit entries" variant="ghost" icon="edit-2" onPress={onEdit} testID="results-edit" />
    </View>
  );
}
