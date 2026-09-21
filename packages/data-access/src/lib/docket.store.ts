import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { DocketItem, DocketRow } from './models';
import { watchTables } from './realtime';
import { SUPABASE } from './supabase';

interface DocketState {
  /** Today's and upcoming events, soonest first. */
  events: DocketRow[];
  items: DocketItem[];
  loading: boolean;
}

export const DocketStore = signalStore(
  { providedIn: 'root' },
  withState<DocketState>({ events: [], items: [], loading: false }),
  withMethods((store, client = inject(SUPABASE)) => {
    async function load(opts: { silent?: boolean } = {}): Promise<void> {
      if (!opts.silent) patchState(store, { loading: true });
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: events } = await client
        .from('daily_kitchen_docket')
        .select('*')
        .gte('starts_at', startOfToday.toISOString())
        .order('starts_at');
      const { data: items } = await client
        .from('docket_items')
        .select('*')
        .in('meal_id', (events ?? []).map((e) => e.meal_id!));
      patchState(store, { events: events ?? [], items: items ?? [], loading: false });
    }

    return {
      load,
      /** Live refresh when events, RSVPs or items change; returns the unsubscribe function. */
      watch(): () => void {
        return watchTables(client, 'cook-docket', ['meals', 'rsvps', 'event_entries'], () =>
          void load({ silent: true }),
        );
      },
    };
  }),
);
