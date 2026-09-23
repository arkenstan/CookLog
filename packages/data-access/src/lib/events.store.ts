import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { AuthStore } from './auth.store';
import { eventPhase, initialAmount, stepFor } from './event-utils';
import type {
  ActionResult,
  EventEntry,
  ItemKind,
  Meal,
  MealType,
  Rsvp,
  RsvpStatus,
} from './models';
import { watchTables } from './realtime';
import { SUPABASE } from './supabase';

interface EventsState {
  events: Meal[];
  /** RSVPs of every resident for the loaded events. */
  rsvps: Rsvp[];
  /** Every resident's item entries for the loaded events. */
  entries: EventEntry[];
  /** profile id → display name */
  names: Record<string, string>;
  loading: boolean;
}

export interface CreateEventInput {
  title: string;
  type: MealType;
  startsAt: Date;
  cutoffAt: Date;
}

type MutationResult = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

export const EventsStore = signalStore(
  { providedIn: 'root' },
  withState<EventsState>({ events: [], rsvps: [], entries: [], names: {}, loading: false }),
  withComputed((store, auth = inject(AuthStore)) => {
    const byPhase = (phase: 'active' | 'upcoming' | 'completed') =>
      computed(() => {
        const now = new Date();
        const list = store.events().filter((e) => eventPhase(e, now) === phase);
        const dir = phase === 'completed' ? -1 : 1;
        return list.sort((a, b) => dir * (Date.parse(a.starts_at) - Date.parse(b.starts_at)));
      });

    return {
      active: byPhase('active'),
      upcoming: byPhase('upcoming'),
      completed: byPhase('completed'),
      /** meal id → my RSVP status (absent = not answered yet) */
      myRsvps: computed(() => {
        const uid = auth.userId();
        return Object.fromEntries(
          store.rsvps().filter((r) => r.user_id === uid).map((r) => [r.meal_id, r.status]),
        ) as Record<string, RsvpStatus>;
      }),
      /** meal id → number of residents marked "in" */
      inCounts: computed(() => {
        const counts: Record<string, number> = {};
        for (const r of store.rsvps()) {
          if (r.status === 'in') counts[r.meal_id] = (counts[r.meal_id] ?? 0) + 1;
        }
        return counts;
      }),
      /** meal id → my entries */
      myEntries: computed(() => {
        const uid = auth.userId();
        const out: Record<string, EventEntry[]> = {};
        for (const e of store.entries()) if (e.user_id === uid) (out[e.meal_id] ??= []).push(e);
        return out;
      }),
      /** meal id → item id → total across residents who are "in" */
      totals: computed(() => {
        const inSet = new Set(
          store.rsvps().filter((r) => r.status === 'in').map((r) => `${r.meal_id}:${r.user_id}`),
        );
        const out: Record<string, Record<string, number>> = {};
        for (const e of store.entries()) {
          if (!inSet.has(`${e.meal_id}:${e.user_id}`)) continue;
          const perItem = (out[e.meal_id] ??= {});
          perItem[e.item_id] = (perItem[e.item_id] ?? 0) + Number(e.amount);
        }
        return out;
      }),
    };
  }),
  withMethods((store, client = inject(SUPABASE), auth = inject(AuthStore)) => {
    async function load(opts: { silent?: boolean } = {}): Promise<void> {
      if (!opts.silent) patchState(store, { loading: true });
      const { data: events } = await client.from('meals').select('*').order('starts_at');
      const ids = (events ?? []).map((e) => e.id);
      const [rsvps, entries, people] = await Promise.all([
        client.from('rsvps').select('*').in('meal_id', ids),
        client.from('event_entries').select('*').in('meal_id', ids),
        client.from('profiles').select('id, username'),
      ]);
      patchState(store, {
        events: events ?? [],
        rsvps: rsvps.data ?? [],
        entries: entries.data ?? [],
        // Usernames are null until a user finishes setup; drop those so the display
        // fallbacks ("Someone", "someone in the house") fire instead of an empty string.
        names: Object.fromEntries(
          (people.data ?? []).flatMap((p) => (p.username ? [[p.id, p.username] as const] : [])),
        ),
        loading: false,
      });
    }

    /**
     * Applies `patch` immediately, runs the write, and restores the previous state
     * if the database errors or (RLS / closed event) touches no row.
     */
    async function optimistic(
      patch: () => void,
      snapshot: () => () => void,
      run: () => MutationResult,
      closedMessage: string,
    ): Promise<ActionResult> {
      const revert = snapshot();
      patch();
      const { data, error } = await run();
      if (error || !data?.length) {
        revert();
        return { error: error?.message ?? closedMessage };
      }
      return { error: null };
    }

    const snapshotEntries = () => {
      const previous = store.entries();
      return () => patchState(store, { entries: previous });
    };

    return {
      load,

      /** Live refresh; returns the unsubscribe function. */
      watch(): () => void {
        return watchTables(client, 'events', ['meals', 'rsvps', 'event_entries'], () =>
          void load({ silent: true }),
        );
      },

      async createEvent(input: CreateEventInput): Promise<ActionResult> {
        const { data, error } = await client.rpc('create_meal_event', {
          p_title: input.title,
          p_type: input.type,
          p_starts_at: input.startsAt.toISOString(),
          p_cutoff_at: input.cutoffAt.toISOString(),
        });
        if (error) return { error: error.message };
        await load({ silent: true });
        return { error: null, id: data.id };
      },

      /** Optimistic; the RPC also pre-fills my regulars when I go "in", so entries are re-read. */
      async setAvailability(mealId: string, status: RsvpStatus): Promise<ActionResult> {
        const uid = auth.userId();
        if (!uid) return { error: 'Not signed in' };
        const previous = store.rsvps();
        const exists = previous.some((r) => r.meal_id === mealId && r.user_id === uid);
        patchState(store, {
          rsvps: exists
            ? previous.map((r) => (r.meal_id === mealId && r.user_id === uid ? { ...r, status } : r))
            : [...previous, { meal_id: mealId, user_id: uid, status }],
        });
        const { error } = await client.rpc('set_availability', { p_meal: mealId, p_status: status });
        if (error) {
          patchState(store, { rsvps: previous });
          return { error: error.message };
        }
        await load({ silent: true });
        return { error: null };
      },

      /** "Add one": +1 for count items, +0.5 for portions; creates the entry if missing. */
      async addOne(mealId: string, itemId: string, kind: ItemKind): Promise<ActionResult> {
        const uid = auth.userId();
        if (!uid) return { error: 'Not signed in' };
        const current = store.entries().find(
          (e) => e.meal_id === mealId && e.user_id === uid && e.item_id === itemId,
        );
        if (current) return this.setAmount(mealId, itemId, Number(current.amount) + stepFor(kind));

        const entry: EventEntry = {
          meal_id: mealId,
          user_id: uid,
          item_id: itemId,
          amount: initialAmount(),
          source: 'manual',
        };
        return optimistic(
          () => patchState(store, { entries: [...store.entries(), entry] }),
          snapshotEntries,
          () => client.from('event_entries').insert(entry).select(),
          'This event is closed for changes',
        );
      },

      async setAmount(mealId: string, itemId: string, amount: number): Promise<ActionResult> {
        const uid = auth.userId();
        if (!uid) return { error: 'Not signed in' };
        if (amount <= 0) return this.removeEntry(mealId, itemId);
        const match = (e: EventEntry) =>
          e.meal_id === mealId && e.user_id === uid && e.item_id === itemId;
        return optimistic(
          () =>
            patchState(store, {
              entries: store.entries().map((e) => (match(e) ? { ...e, amount } : e)),
            }),
          snapshotEntries,
          () =>
            client
              .from('event_entries')
              .update({ amount })
              .eq('meal_id', mealId)
              .eq('user_id', uid)
              .eq('item_id', itemId)
              .select(),
          'This event is closed for changes',
        );
      },

      async removeEntry(mealId: string, itemId: string): Promise<ActionResult> {
        const uid = auth.userId();
        if (!uid) return { error: 'Not signed in' };
        return optimistic(
          () =>
            patchState(store, {
              entries: store
                .entries()
                .filter((e) => !(e.meal_id === mealId && e.user_id === uid && e.item_id === itemId)),
            }),
          snapshotEntries,
          () =>
            client
              .from('event_entries')
              .delete()
              .eq('meal_id', mealId)
              .eq('user_id', uid)
              .eq('item_id', itemId)
              .select(),
          'This event is closed for changes',
        );
      },
    };
  }),
);
