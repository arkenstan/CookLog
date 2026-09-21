import type { ItemKind, Meal } from './models';

export type EventPhase = 'active' | 'upcoming' | 'completed';

/**
 * Where an event sits relative to today (in the browser's local time):
 * active = today and not cooked, upcoming = a later day, completed = cooked or an earlier day.
 */
export function eventPhase(meal: Pick<Meal, 'starts_at' | 'status'>, now = new Date()): EventPhase {
  if (meal.status === 'cooked') return 'completed';
  const start = new Date(meal.starts_at);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (start < today) return 'completed';
  if (start >= tomorrow) return 'upcoming';
  return 'active';
}

/** Count items move in whole units, portion items in half servings. */
export const stepFor = (kind: ItemKind): number => (kind === 'count' ? 1 : 0.5);

/** Amount used when an item is first added to an event or to regulars. */
export const initialAmount = (): number => 1;

export function formatAmount(kind: ItemKind, amount: number): string {
  const n = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
  if (kind === 'count') return `${n} ${amount === 1 ? 'pc' : 'pcs'}`;
  return `${n} ${amount === 1 ? 'portion' : 'portions'}`;
}
