import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore, MealsStore, SUPABASE } from '@cooklog/data-access';

/** Thenable query builder: every chained call returns itself; awaiting yields the canned result. */
function fakeClient(updateResult: unknown) {
  const tables: Record<string, unknown[]> = {
    menu_items: [],
    profiles: [],
    rsvps: [{ meal_id: 'm1', user_id: 'u1', status: 'in' }],
  };
  const query = (table: string) => {
    let op: 'select' | 'update' = 'select';
    const chain: Record<string, unknown> = {
      update: () => ((op = 'update'), chain),
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      then: (resolve: (v: unknown) => void) =>
        resolve(op === 'update' ? updateResult : { data: tables[table], error: null }),
    };
    return chain;
  };
  return {
    from: query,
    rpc: async () => ({ data: [{ id: 'm1', menu_item_id: null }], error: null }),
  };
}

async function setup(updateResult: unknown) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: SUPABASE, useValue: fakeClient(updateResult) },
      { provide: AuthStore, useValue: { userId: signal('u1') } },
    ],
  });
  const store = TestBed.inject(MealsStore);
  await store.load();
  return store;
}

describe('MealsStore.setRsvp', () => {
  it('keeps the optimistic change when the database accepts it', async () => {
    const store = await setup({ data: [{}], error: null });
    expect(store.myRsvps()['m1']).toBe('in');

    const result = await store.setRsvp('m1', 'out');

    expect(result.error).toBeNull();
    expect(store.myRsvps()['m1']).toBe('out');
    expect(store.inCounts()['m1'] ?? 0).toBe(0);
  });

  it('rolls back when no row was updated (locked / RLS)', async () => {
    const store = await setup({ data: [], error: null });

    const result = await store.setRsvp('m1', 'out');

    expect(result.error).toBe('RSVP is locked');
    expect(store.myRsvps()['m1']).toBe('in');
    expect(store.inCounts()['m1']).toBe(1);
  });

  it('rolls back on a database error', async () => {
    const store = await setup({ data: null, error: { message: 'boom' } });

    const result = await store.setRsvp('m1', 'out');

    expect(result.error).toBe('boom');
    expect(store.myRsvps()['m1']).toBe('in');
  });
});
