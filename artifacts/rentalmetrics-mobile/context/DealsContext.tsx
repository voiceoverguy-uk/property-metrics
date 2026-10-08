import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Deal, newDeal, validateDeal } from '@/lib/deals';
import { Store, STORAGE_KEY, decodeStore, emptyStore, cloneDeal, saveToStore } from '@/lib/storage';
type API = {
  draft: Deal; deals: Deal[]; ready: boolean; error: string | null; saving: boolean;
  updateDraft: (patch: Partial<Deal>) => void; saveDeal: () => Promise<void>;
  openDeal: (deal: Deal) => Promise<void>; duplicateDeal: (deal: Deal) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>; startNew: () => Promise<void>; retry: () => Promise<void>;
};
const Context = createContext<API | null>(null);
export function DealsProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store>(emptyStore);
  const current = useRef(store), queue = useRef<Promise<void>>(Promise.resolve());
  const [ready, setReady] = useState(false), [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef(0);
  async function hydrate() {
    try {
      const loaded = decodeStore(await AsyncStorage.getItem(STORAGE_KEY));
      current.current = loaded; setStore(loaded); setReady(true); setError(null);
    } catch (e) { setError(`Cannot load saved deals: ${e instanceof Error ? e.message : 'storage unavailable'}`); }
  }
  useEffect(() => { void hydrate(); }, []);
  function commit(next: Store) {
    if (!ready) return Promise.reject(new Error('Saved data is still loading.'));
    current.current = next; setStore(next); pending.current++; setSaving(true);
    const write = queue.current.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)));
    queue.current = write;
    return write.then(() => { setError(null); }).catch(e => {
      setError('Your latest changes could not be stored. Keep the app open and retry before leaving.');
      throw e;
    }).finally(() => { pending.current--; setSaving(pending.current > 0); });
  }
  const api: API = {
    ...store, ready, error, saving,
    updateDraft: patch => { void commit({ ...current.current, draft: { ...current.current.draft, ...patch, updatedAt: new Date().toISOString() } }).catch(() => {}); },
    saveDeal: async () => { const e = validateDeal(current.current.draft); if (e.length) throw new Error(e.join('\n')); await commit(saveToStore(current.current, current.current.draft)); },
    openDeal: async d => { await commit({ ...current.current, draft: JSON.parse(JSON.stringify(d)) }); },
    duplicateDeal: async d => { const copy = cloneDeal(d); await commit({ ...current.current, deals: [copy, ...current.current.deals] }); },
    deleteDeal: async id => { await commit({ ...current.current, deals: current.current.deals.filter(d => d.id !== id), draft: current.current.draft.id === id ? newDeal() : current.current.draft }); },
    startNew: async () => { await commit({ ...current.current, draft: newDeal() }); },
    retry: async () => { if (!ready) await hydrate(); else await commit(current.current); },
  };
  return <Context.Provider value={api}>{children}</Context.Provider>;
}
export function useDeals() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('DealsProvider is missing.');
  return ctx;
}
