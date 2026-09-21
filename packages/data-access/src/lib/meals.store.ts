import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { AuthStore } from './auth.store';
import type { ActionResult, Meal, MenuItem, Rsvp, RsvpStatus } from './models';
import { watchTables } from './realtime';
import { SUPABASE } from './supabase';

interface MealsState {
  meals: Meal[];
  menuItems: MenuItem[];
  /** RSVPs of every resident in the household for today's meals. */
  rsvps: Rsvp[];
  /** profile id → display name (for showing who picks). */
  names: Record<string, string>;
  loading: boolean;
}

export const MealsStore = signalStore(
  { providedIn: 'root' },
  withState<MealsState>({ meals: [], menuItems: [], rsvps: [], names: {}, loading: false }),
  withComputed((store, auth = inject(AuthStore)) => ({
    /** meal id → my RSVP status */
    myRsvps: computed(() => {
      const uid = auth.userId();
      return Object.fromEntries(
        store
          .rsvps()
          .filter((r) => r.user_id === uid)
          .map((r) => [r.meal_id, r.status]),
      ) as Record<string, RsvpStatus>;
    }),
    /** meal id → number of residents marked "in" */
    inCounts: computed(() => {
      const counts: Record<string, number> = {};
      for (const r of store.rsvps()) if (r.status === 'in') counts[r.meal_id] = (counts[r.meal_id] ?? 0) + 1;
      return counts;
    }),
  })),
  withMethods((store, client = inject(SUPABASE), auth = inject(AuthStore)) => {
    async function load(): Promise<void> {
      patchState(store, { loading: true });
      const { data: meals } = await client.rpc('ensure_todays_meals');
      const ids = (meals ?? []).map((m) => m.id);
      const [menu, rsvps, people] = await Promise.all([
        client.from('menu_items').select('*').order('name'),
        client.from('rsvps').select('*').in('meal_id', ids),
        client.from('profiles').select('id, name'),
      ]);
      patchState(store, {
        meals: meals ?? [],
        menuItems: menu.data ?? [],
        rsvps: rsvps.data ?? [],
        names: Object.fromEntries((people.data ?? []).map((p) => [p.id, p.name])),
        loading: false,
      });
    }

    return {
      load,

      /** Live refresh; returns the unsubscribe function. */
      watch(): () => void {
        return watchTables(client, 'resident-today', ['meals', 'rsvps'], () => void load());
      },

      /** Optimistic RSVP change; rolls back if the database rejects it (e.g. after cutoff). */
      async setRsvp(mealId: string, status: RsvpStatus): Promise<ActionResult> {
        const uid = auth.userId();
        if (!uid) return { error: 'Not signed in' };
        const previous = store.rsvps();
        patchState(store, {
          rsvps: previous.map((r) =>
            r.meal_id === mealId && r.user_id === uid ? { ...r, status } : r,
          ),
        });
        const { data, error } = await client
          .from('rsvps')
          .update({ status })
          .eq('meal_id', mealId)
          .eq('user_id', uid)
          .select();
        if (error || !data?.length) {
          patchState(store, { rsvps: previous });
          return { error: error?.message ?? 'RSVP is locked' };
        }
        return { error: null };
      },

      async setMenu(mealId: string, menuItemId: string | null): Promise<ActionResult> {
        const previous = store.meals();
        patchState(store, {
          meals: previous.map((m) => (m.id === mealId ? { ...m, menu_item_id: menuItemId } : m)),
        });
        const { data, error } = await client
          .from('meals')
          .update({ menu_item_id: menuItemId })
          .eq('id', mealId)
          .select();
        if (error || !data?.length) {
          patchState(store, { meals: previous });
          return { error: error?.message ?? 'Only today’s picker can choose the menu' };
        }
        return { error: null };
      },
    };
  }),
);
