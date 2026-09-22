import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { AuthStore } from './auth.store';
import type { ActionResult, GroceryItem, StockStatus } from './models';
import { watchTables } from './realtime';
import { SUPABASE } from './supabase';

interface GroceryState {
  /** The household's shared pantry ledger. */
  items: GroceryItem[];
  /** profile id -> display name, for "added by". */
  names: Record<string, string>;
  loading: boolean;
}

const byName = (a: GroceryItem, b: GroceryItem) => a.name.localeCompare(b.name);

export const GroceryStore = signalStore(
  { providedIn: 'root' },
  withState<GroceryState>({ items: [], names: {}, loading: false }),
  withComputed((store) => ({
    /** Needs buying — shown first, because that is what the list is for. */
    missing: computed(() => store.items().filter((i) => i.status === 'missing').sort(byName)),
    stocked: computed(() => store.items().filter((i) => i.status === 'stocked').sort(byName)),
  })),
  withMethods((store, client = inject(SUPABASE), auth = inject(AuthStore)) => {
    async function load(opts: { silent?: boolean } = {}): Promise<void> {
      if (!opts.silent) patchState(store, { loading: true });
      const [rows, people] = await Promise.all([
        client.from('inventory').select('*').order('name'),
        client.from('profiles').select('id, name'),
      ]);
      patchState(store, {
        items: rows.data ?? [],
        names: Object.fromEntries((people.data ?? []).map((p) => [p.id, p.name])),
        loading: false,
      });
    }

    /**
     * Applies `patch`, runs the write, and restores the previous rows if the database
     * errors or (RLS) touches no row.
     */
    async function optimistic(
      patch: () => void,
      run: () => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
      rejectedMessage: string,
    ): Promise<ActionResult> {
      const previous = store.items();
      patch();
      const { data, error } = await run();
      if (error || !data?.length) {
        patchState(store, { items: previous });
        return { error: error?.message ?? rejectedMessage };
      }
      return { error: null };
    }

    return {
      load,

      /** Live refresh; returns the unsubscribe function. */
      watch(): () => void {
        return watchTables(client, 'grocery', ['inventory'], () => void load({ silent: true }));
      },

      /** Adds an item to the ledger, already marked as needed. */
      async add(name: string, note: string | null = null): Promise<ActionResult> {
        const uid = auth.userId();
        const householdId = auth.activeHouseholdId();
        if (!uid || !householdId) return { error: 'Not signed in' };
        const trimmed = name.trim();
        if (!trimmed) return { error: 'Give the item a name' };

        const { data, error } = await client
          .from('inventory')
          .insert({
            household_id: householdId,
            name: trimmed,
            status: 'missing',
            added_by: uid,
            note,
          })
          .select()
          .single();
        if (error) {
          return { error: error.code === '23505' ? 'That item is already on the list' : error.message };
        }
        patchState(store, { items: [...store.items(), data] });
        return { error: null, id: data.id };
      },

      async setStatus(id: string, status: StockStatus): Promise<ActionResult> {
        return optimistic(
          () =>
            patchState(store, {
              items: store.items().map((i) => (i.id === id ? { ...i, status } : i)),
            }),
          () => client.from('inventory').update({ status }).eq('id', id).select(),
          'Could not update that item',
        );
      },

      async remove(id: string): Promise<ActionResult> {
        return optimistic(
          () => patchState(store, { items: store.items().filter((i) => i.id !== id) }),
          () => client.from('inventory').delete().eq('id', id).select(),
          'Could not remove that item',
        );
      },
    };
  }),
);
