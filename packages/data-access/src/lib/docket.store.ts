import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { DocketRow } from './models';
import { watchTables } from './realtime';
import { SUPABASE } from './supabase';

interface DocketState {
  rows: DocketRow[];
  loading: boolean;
}

export const DocketStore = signalStore(
  { providedIn: 'root' },
  withState<DocketState>({ rows: [], loading: false }),
  withMethods((store, client = inject(SUPABASE)) => {
    async function load(): Promise<void> {
      patchState(store, { loading: true });
      const { data: meals } = await client.rpc('ensure_todays_meals');
      const { data } = await client
        .from('daily_kitchen_docket')
        .select('*')
        .in('meal_id', (meals ?? []).map((m) => m.id));
      const rows = (data ?? []).slice().sort((a, b) => (a.type === b.type ? 0 : a.type === 'lunch' ? -1 : 1));
      patchState(store, { rows, loading: false });
    }

    return {
      load,
      /** Live refresh when RSVPs or meals change; returns the unsubscribe function. */
      watch(): () => void {
        return watchTables(client, 'cook-docket', ['meals', 'rsvps'], () => void load());
      },
    };
  }),
);
