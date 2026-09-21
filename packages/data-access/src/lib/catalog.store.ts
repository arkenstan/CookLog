import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { AuthStore } from './auth.store';
import { initialAmount, stepFor } from './event-utils';
import type { ActionResult, Item, ItemKind, Regular } from './models';
import { watchTables } from './realtime';
import { SUPABASE } from './supabase';

interface CatalogState {
  /** Household item catalog (things a resident can add to an event). */
  items: Item[];
  /** My regular items with default amounts. */
  regulars: Regular[];
  loading: boolean;
}

export const CatalogStore = signalStore(
  { providedIn: 'root' },
  withState<CatalogState>({ items: [], regulars: [], loading: false }),
  withComputed((store) => ({
    itemsById: computed(() => new Map(store.items().map((i) => [i.id, i]))),
    /** Catalog items I have not made a regular yet. */
    nonRegularItems: computed(() => {
      const taken = new Set(store.regulars().map((r) => r.item_id));
      return store.items().filter((i) => !taken.has(i.id));
    }),
  })),
  withMethods((store, client = inject(SUPABASE), auth = inject(AuthStore)) => {
    async function load(opts: { silent?: boolean } = {}): Promise<void> {
      if (!opts.silent) patchState(store, { loading: true });
      const [items, regulars] = await Promise.all([
        client.from('items').select('*').order('name'),
        client.from('regulars').select('*'),
      ]);
      // Regulars belong to the user across households; show only those of the active catalog.
      const ids = new Set((items.data ?? []).map((i) => i.id));
      patchState(store, {
        items: items.data ?? [],
        regulars: (regulars.data ?? []).filter((r) => ids.has(r.item_id)),
        loading: false,
      });
    }

    return {
      load,

      watch(): () => void {
        return watchTables(client, 'catalog', ['items'], () => void load({ silent: true }));
      },

      /** Adds an item to the household catalog; `id` is set on success. */
      async createItem(name: string, kind: ItemKind): Promise<ActionResult> {
        const uid = auth.userId();
        const householdId = auth.activeHouseholdId();
        if (!uid || !householdId) return { error: 'Not signed in' };
        const { data, error } = await client
          .from('items')
          .insert({ household_id: householdId, name: name.trim(), kind, created_by: uid })
          .select()
          .single();
        if (error) {
          return { error: error.code === '23505' ? 'That item already exists' : error.message };
        }
        patchState(store, { items: [...store.items(), data].sort((a, b) => a.name.localeCompare(b.name)) });
        return { error: null, id: data.id };
      },

      async addRegular(itemId: string, amount = initialAmount()): Promise<ActionResult> {
        const uid = auth.userId();
        if (!uid) return { error: 'Not signed in' };
        const row: Regular = { user_id: uid, item_id: itemId, amount };
        const { error } = await client.from('regulars').insert(row);
        if (error) return { error: error.message };
        patchState(store, { regulars: [...store.regulars(), row] });
        return { error: null };
      },

      async setRegular(itemId: string, amount: number): Promise<ActionResult> {
        const uid = auth.userId();
        if (!uid) return { error: 'Not signed in' };
        if (amount <= 0) return this.removeRegular(itemId);
        const previous = store.regulars();
        patchState(store, {
          regulars: previous.map((r) => (r.item_id === itemId ? { ...r, amount } : r)),
        });
        const { data, error } = await client
          .from('regulars')
          .update({ amount })
          .eq('user_id', uid)
          .eq('item_id', itemId)
          .select();
        if (error || !data?.length) {
          patchState(store, { regulars: previous });
          return { error: error?.message ?? 'Could not update' };
        }
        return { error: null };
      },

      async removeRegular(itemId: string): Promise<ActionResult> {
        const uid = auth.userId();
        if (!uid) return { error: 'Not signed in' };
        const previous = store.regulars();
        patchState(store, { regulars: previous.filter((r) => r.item_id !== itemId) });
        const { data, error } = await client
          .from('regulars')
          .delete()
          .eq('user_id', uid)
          .eq('item_id', itemId)
          .select();
        if (error || !data?.length) {
          patchState(store, { regulars: previous });
          return { error: error?.message ?? 'Could not remove' };
        }
        return { error: null };
      },

      /** Step used by +/- controls for an item kind. */
      stepFor,
    };
  }),
);
