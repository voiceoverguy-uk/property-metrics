import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { validateDeal } from '@/lib/deals';
import { useDeals } from '@/context/DealsContext';
import { useColors } from '@/hooks/useColors';
import { Banner, Button, ConfirmDialog, ErrorList, IconButton, Page, Skeleton, T, errMsg, tap, warn } from '@/components/ui';
import { CostsStep, IncomeStep, MortgageStep, PropertyStep } from '@/components/Steps';
import { ResultsView } from '@/components/Results';

const LABELS = ['Property', 'Income', 'Mortgage', 'Costs', 'Results'];

export default function Analyse() {
  const { draft, ready, error, saving, updateDraft, startNew, retry } = useDeals();
  const c = useColors();
  const scroll = useRef<ScrollView>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmNew, setConfirmNew] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const headerRight = (
    <>
      <IconButton name="file-plus" label="New deal" testID="new-deal" onPress={() => setConfirmNew(true)} />
      <IconButton name="settings" label="Settings and About" testID="open-settings" onPress={() => router.push('/settings')} />
    </>
  );

  if (!ready) {
    return (
      <Page headerRight={<IconButton name="settings" label="Settings and About" testID="open-settings" onPress={() => router.push('/settings')} />}>
        {error ? (
          <Banner message={error} actionLabel="Retry loading" onAction={() => { retry().catch(e => setActionError(errMsg(e))); }} testID="hydrate-error" />
        ) : <Skeleton lines={5} />}
        {actionError ? <Banner message={actionError} /> : null}
      </Page>
    );
  }

  const step = draft.step;
  const goTo = (n: number) => {
    setErrors([]);
    updateDraft({ step: n });
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const next = () => {
    const errs = step === 3 ? validateDeal(draft) : validateDeal(draft, step);
    if (errs.length) { warn(); setErrors(errs); scroll.current?.scrollTo({ y: 0, animated: true }); return; }
    goTo(step + 1);
  };
  async function reset() {
    setConfirmNew(false);
    try { await startNew(); setErrors([]); setActionError(null); scroll.current?.scrollTo({ y: 0, animated: false }); }
    catch (e) { setActionError(errMsg(e)); }
  }

  return (
    <Page headerRight={headerRight} scrollRef={scroll}>
      {error ? <Banner message={error} actionLabel="Retry" onAction={() => { retry().catch(e => setActionError(errMsg(e))); }} testID="store-error" /> : null}
      {actionError ? <Banner message={actionError} /> : null}
      <View style={{ gap: 8 }} accessibilityRole="progressbar" accessibilityLabel={`Step ${step + 1} of 5, ${LABELS[step]}`}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {LABELS.map((l, i) => (
            <Pressable key={l} testID={`step-${i}`} disabled={i > step} accessibilityRole="button" accessibilityLabel={`Go to ${l}`} onPress={() => { tap(); goTo(i); }}
              style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: i <= step ? c.primary : c.secondary }} />
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <T variant="label" tone="primary">{`Step ${step + 1} of 5`}</T>
          <T variant="small" tone={error ? 'destructive' : 'muted'}>{error ? 'Draft not saved — retry' : saving ? 'Saving draft\u2026' : 'Draft saved on this device'}</T>
        </View>
      </View>
      <ErrorList errors={errors} testID="step-errors" />
      {step === 0 ? <PropertyStep d={draft} set={updateDraft} /> : null}
      {step === 1 ? <IncomeStep d={draft} set={updateDraft} /> : null}
      {step === 2 ? <MortgageStep d={draft} set={updateDraft} /> : null}
      {step === 3 ? <CostsStep d={draft} set={updateDraft} /> : null}
      {step === 4 ? <ResultsView key={draft.id} deal={draft} onEdit={() => goTo(0)} /> : null}
      {step < 4 ? (
        <View style={{ gap: 10, paddingTop: 8 }}>
          <Button label={step === 3 ? 'See results' : 'Next'} icon="arrow-right" variant="primary" onPress={next} testID="step-next" />
          {step > 0 ? <Button label="Back" variant="secondary" onPress={() => goTo(step - 1)} testID="step-back" /> : null}
        </View>
      ) : (
        <Button label="Back to costs" variant="secondary" onPress={() => goTo(3)} testID="step-back" />
      )}
      <ConfirmDialog visible={confirmNew} title="Start a new deal?" message="The current entries will be cleared and replaced with a blank deal. Deals you have already saved are not affected."
        confirmLabel="Start new deal" destructive onConfirm={reset} onCancel={() => setConfirmNew(false)} />
    </Page>
  );
}
