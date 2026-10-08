import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Deal, calculate, gbp, percent, validateDeal } from '@/lib/deals';
import { useDeals } from '@/context/DealsContext';
import { useColors } from '@/hooks/useColors';
import { Banner, Button, Card, Check, ConfirmDialog, Empty, IconButton, Page, Skeleton, T, errMsg } from '@/components/ui';

export default function Saved() {
  const { deals, draft, ready, error, retry, openDeal, updateDraft, duplicateDeal, deleteDeal } = useDeals();
  const c = useColors();
  const [sel, setSel] = useState<string[]>([]);
  const [fail, setFail] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState<{ deal: Deal; edit: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Deal | null>(null);
  const settings = <IconButton name="settings" label="Settings and About" testID="open-settings" onPress={() => router.push('/settings')} />;

  if (!ready) {
    return (
      <Page headerRight={settings}>
        {error ? <Banner message={error} actionLabel="Retry loading" onAction={() => { retry().catch(e => setFail(errMsg(e))); }} testID="hydrate-error" /> : <Skeleton lines={5} />}
        {fail ? <Banner message={fail} /> : null}
      </Page>
    );
  }

  const chosen = sel.filter(id => deals.some(d => d.id === id));
  const toggle = (id: string) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : s.length >= 3 ? s : [...s, id]));
  const stored = deals.find(d => d.id === draft.id);
  const meaningful = ({ step, updatedAt, ...rest }: Deal) => rest;
  const dirty = !!(draft.price.trim() || draft.name.trim() || draft.address.trim())
    && (!stored || JSON.stringify(meaningful(draft)) !== JSON.stringify(meaningful(stored)));

  async function doOpen(deal: Deal, edit: boolean) {
    setPendingOpen(null); setFail(null);
    try {
      await openDeal(deal);
      updateDraft({ step: edit || validateDeal(deal).length ? 0 : 4 });
      router.navigate('/');
    } catch (e) { setFail(errMsg(e)); }
  }
  const open = (deal: Deal, edit: boolean) => (dirty ? setPendingOpen({ deal, edit }) : doOpen(deal, edit));

  return (
    <Page headerRight={settings}>
      <View style={{ gap: 4 }}>
        <T variant="display">Saved Deals</T>
        <T tone="muted">Stored on this device only. No account needed.</T>
      </View>
      {error ? <Banner message={error} actionLabel="Retry" onAction={() => { retry().catch(e => setFail(errMsg(e))); }} /> : null}
      {fail ? <Banner message={fail} /> : null}
      {deals.length === 0 ? (
        <Empty icon="inbox" title="No saved deals yet" body="Run an analysis and choose Save deal on the results screen. Saved deals appear here for reopening and comparing.">
          <Button label="Start an analysis" onPress={() => router.navigate('/')} testID="empty-start" />
        </Empty>
      ) : (
        <>
          {deals.length > 1 ? <T variant="small" tone="muted">Select 2 or 3 deals to compare the same metrics in a phone-friendly view.</T> : null}
          {chosen.length >= 2 ? <Button label={`Compare ${chosen.length} deals`} icon="columns" onPress={() => router.push({ pathname: '/compare', params: { ids: chosen.join(',') } })} testID="compare-go" /> : null}
          {deals.map(d => {
            let line = 'Cannot calculate';
            let sub = '';
            try { const r = calculate(d); line = `${gbp(r.cashFlow)} / month before tax`; sub = `Gross ${percent(r.grossYield)}  \u00b7  Cash required ${gbp(r.cashRequired)}`; } catch { /* shown as unavailable */ }
            const on = chosen.includes(d.id);
            return (
              <Card key={d.id} style={on ? { borderColor: c.primary, borderWidth: 2 } : undefined}>
                <Check testID={`select-${d.id}`} checked={on} onChange={() => toggle(d.id)} label={d.name || d.address || 'Untitled deal'} />
                {d.address && d.name ? <T variant="small" tone="muted">{d.address}</T> : null}
                <T variant="heading">{line}</T>
                {sub ? <T variant="small" tone="muted">{sub}</T> : null}
                <T variant="small" tone="muted">{`Updated ${new Date(d.updatedAt).toLocaleDateString('en-GB')}`}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button label="Results" style={{ flexGrow: 1 }} onPress={() => open(d, false)} testID={`open-${d.id}`} />
                  <Button label="Edit" variant="secondary" style={{ flexGrow: 1 }} onPress={() => open(d, true)} testID={`edit-${d.id}`} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button label="Duplicate" icon="copy" variant="ghost" onPress={() => { setFail(null); duplicateDeal(d).catch(e => setFail(errMsg(e))); }} testID={`dup-${d.id}`} />
                  <Button label="Delete" icon="trash-2" variant="danger" onPress={() => setPendingDelete(d)} testID={`del-${d.id}`} />
                </View>
              </Card>
            );
          })}
        </>
      )}
      <ConfirmDialog visible={!!pendingOpen} title="Replace current analysis?" message="Your current unsaved analysis will be replaced by this saved deal."
        confirmLabel="Open deal" destructive onConfirm={() => pendingOpen && doOpen(pendingOpen.deal, pendingOpen.edit)} onCancel={() => setPendingOpen(null)} />
      <ConfirmDialog visible={!!pendingDelete} title="Delete this deal?" message={`"${pendingDelete?.name || pendingDelete?.address || 'Untitled deal'}" will be removed from this device. This cannot be undone.`}
        confirmLabel="Delete deal" destructive
        onConfirm={() => { const d = pendingDelete; setPendingDelete(null); if (d) deleteDeal(d.id).catch(e => setFail(errMsg(e))); }} onCancel={() => setPendingDelete(null)} />
    </Page>
  );
}
