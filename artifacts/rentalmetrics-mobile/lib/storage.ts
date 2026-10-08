import { z } from 'zod';
import { Deal, newDeal, uid } from './deals';
const costSchema = z.object({ id: z.string(), label: z.string(), amount: z.string(), frequency: z.enum(['monthly', 'yearly']) });
const dealSchema = z.object({
  id: z.string(), name: z.string(), address: z.string(), price: z.string(), rent: z.string(),
  purchaseType: z.enum(['cash', 'mortgage']), deposit: z.string(), depositMode: z.enum(['pounds', 'percent']),
  interestRate: z.string(), mortgageType: z.enum(['interest-only', 'repayment']), term: z.string(),
  refurb: z.string(), purchaseCosts: z.array(costSchema), recurringCosts: z.array(costSchema),
  voidPct: z.string(), agentPct: z.string(), agentVat: z.boolean(),
  maintenanceMode: z.enum(['percent', 'annual']), maintenancePct: z.string(), maintenanceAnnual: z.string(),
  buyerType: z.enum(['standard', 'additional']), taxConfirmed: z.boolean().default(false),
  step: z.number().int().min(0).max(4), updatedAt: z.string(),
});
const storeSchema = z.object({ version: z.literal(1), draft: dealSchema, deals: z.array(dealSchema) });
export type Store = { version: 1; draft: Deal; deals: Deal[] };
export const STORAGE_KEY = 'rentalmetrics-native:v1';
export const emptyStore = (): Store => ({ version: 1, draft: newDeal(), deals: [] });
export function decodeStore(text: string | null): Store {
  if (text === null) return emptyStore();
  const parsed = storeSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error('Saved data could not be read. It has not been overwritten. Contact support before clearing app data.');
  return parsed.data;
}
export const cloneDeal = (d: Deal): Deal => ({ ...JSON.parse(JSON.stringify(d)), id: uid(), name: `${d.name || d.address || 'Untitled deal'} (copy)`, updatedAt: new Date().toISOString() });
export function saveToStore(s: Store, d: Deal): Store {
  const deal = { ...d, name: d.name.trim() || d.address.trim() || 'Untitled deal', updatedAt: new Date().toISOString() };
  return { ...s, draft: deal, deals: [deal, ...s.deals.filter(item => item.id !== deal.id)] };
}
