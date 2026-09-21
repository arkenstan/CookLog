import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore, EventsStore, SUPABASE } from '@cooklog/data-access';
import { FakeOptions, fakeSupabase } from '../../testing/fake-supabase';

const soon = new Date(Date.now() + 3600_000).toISOString();
const meal = { id: 'm1', household_id: 'h', title: 'Dinner', type: 'dinner', status: 'pending', starts_at: soon, cutoff_at: soon, created_by: 'u1' };

async function setup(options: FakeOptions = {}) {
  const client = fakeSupabase({
    ...options,
    tables: {
      meals: [meal],
      rsvps: [
        { meal_id: 'm1', user_id: 'u1', status: 'in' },
        { meal_id: 'm1', user_id: 'u2', status: 'in' },
      ],
      event_entries: [
        { meal_id: 'm1', user_id: 'u1', item_id: 'roti', amount: 4, source: 'regular' },
        { meal_id: 'm1', user_id: 'u2', item_id: 'roti', amount: 2, source: 'regular' },
        { meal_id: 'm1', user_id: 'u2', item_id: 'soup', amount: 1, source: 'manual' },
      ],
      profiles: [{ id: 'u1', name: 'Asha' }, { id: 'u2', name: 'Ben' }],
      ...options.tables,
    },
  });
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: SUPABASE, useValue: client },
      { provide: AuthStore, useValue: { userId: signal('u1') } },
    ],
  });
  const store = TestBed.inject(EventsStore);
  await store.load();
  return { store, client };
}

const mine = (s: Awaited<ReturnType<typeof setup>>['store'], item: string) =>
  s.myEntries()['m1']?.find((e) => e.item_id === item)?.amount;

describe('EventsStore', () => {
  it('derives my rsvp, in-count and totals from the loaded rows', async () => {
    const { store } = await setup();
    expect(store.myRsvps()['m1']).toBe('in');
    expect(store.inCounts()['m1']).toBe(2);
    expect(store.totals()['m1']).toEqual({ roti: 6, soup: 1 });
    expect(store.active()).toHaveLength(1);
  });

  it('excludes residents who are out from totals', async () => {
    const { store } = await setup({
      tables: { rsvps: [{ meal_id: 'm1', user_id: 'u1', status: 'out' }, { meal_id: 'm1', user_id: 'u2', status: 'in' }] },
    });
    expect(store.totals()['m1']).toEqual({ roti: 2, soup: 1 });
    expect(store.inCounts()['m1']).toBe(1);
  });

  describe('addOne', () => {
    it('increments a count item by 1', async () => {
      const { store } = await setup();
      expect((await store.addOne('m1', 'roti', 'count')).error).toBeNull();
      expect(mine(store, 'roti')).toBe(5);
    });

    it('increments a portion item by 0.5', async () => {
      const { store } = await setup({ tables: { event_entries: [{ meal_id: 'm1', user_id: 'u1', item_id: 'soup', amount: 1, source: 'manual' }] } });
      await store.addOne('m1', 'soup', 'portion');
      expect(mine(store, 'soup')).toBe(1.5);
    });

    it('creates a missing entry at 1', async () => {
      const { store, client } = await setup();
      await store.addOne('m1', 'bread', 'count');
      expect(mine(store, 'bread')).toBe(1);
      expect(client.calls.some((c) => c.table === 'event_entries' && c.op === 'insert')).toBe(true);
    });

    it('rolls back when the event is closed (no row written)', async () => {
      const { store } = await setup({ mutation: { data: [], error: null } });
      const result = await store.addOne('m1', 'roti', 'count');
      expect(result.error).toBe('This event is closed for changes');
      expect(mine(store, 'roti')).toBe(4);
    });
  });

  it('setAmount to 0 removes the entry, and rolls back on a database error', async () => {
    const { store } = await setup();
    await store.setAmount('m1', 'roti', 0);
    expect(mine(store, 'roti')).toBeUndefined();

    const failing = await setup({ mutation: { data: null, error: { message: 'boom' } } });
    const result = await failing.store.removeEntry('m1', 'roti');
    expect(result.error).toBe('boom');
    expect(mine(failing.store, 'roti')).toBe(4);
  });

  describe('setAvailability', () => {
    it('applies optimistically and keeps the change on success', async () => {
      const { store } = await setup({ tables: { rsvps: [{ meal_id: 'm1', user_id: 'u1', status: 'in' }] } });
      expect((await store.setAvailability('m1', 'out')).error).toBeNull();
    });

    it('rolls back when the RPC rejects (RSVPs closed)', async () => {
      const { store } = await setup({
        rpc: { set_availability: { data: null, error: { message: 'RSVPs are closed for this event' } } },
      });
      const result = await store.setAvailability('m1', 'out');
      expect(result.error).toBe('RSVPs are closed for this event');
      expect(store.myRsvps()['m1']).toBe('in');
    });
  });

  it('createEvent returns the new id', async () => {
    const { store } = await setup({ rpc: { create_meal_event: { data: { id: 'new-1' }, error: null } } });
    const result = await store.createEvent({ title: 'Brunch', type: 'other', startsAt: new Date(), cutoffAt: new Date() });
    expect(result).toEqual({ error: null, id: 'new-1' });
  });
});
