import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore, CatalogStore, SUPABASE } from '@cooklog/data-access';
import { FakeOptions, fakeSupabase } from '../../testing/fake-supabase';

async function setup(options: FakeOptions = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: SUPABASE,
        useValue: fakeSupabase({
          ...options,
          tables: {
            items: [
              { id: 'roti', name: 'Roti', kind: 'count' },
              { id: 'soup', name: 'Soup', kind: 'portion' },
              { id: 'other-h', name: 'Elsewhere', kind: 'count' },
            ].slice(0, 2),
            regulars: [
              { user_id: 'u1', item_id: 'roti', amount: 4 },
              { user_id: 'u1', item_id: 'gone', amount: 1 }, // belongs to another household's catalog
            ],
          },
        }),
      },
      { provide: AuthStore, useValue: { userId: signal('u1'), activeHouseholdId: signal('h1') } },
    ],
  });
  const store = TestBed.inject(CatalogStore);
  await store.load();
  return store;
}

describe('CatalogStore', () => {
  it('keeps only regulars whose item is in the active catalog', async () => {
    const store = await setup();
    expect(store.regulars().map((r) => r.item_id)).toEqual(['roti']);
    expect(store.nonRegularItems().map((i) => i.id)).toEqual(['soup']);
  });

  it('adds and removes a regular', async () => {
    const store = await setup();
    await store.addRegular('soup');
    expect(store.regulars().find((r) => r.item_id === 'soup')?.amount).toBe(1);
    await store.removeRegular('soup');
    expect(store.regulars().some((r) => r.item_id === 'soup')).toBe(false);
  });

  it('rolls back a regular update that touched no row', async () => {
    const store = await setup({ mutation: { data: [], error: null } });
    const result = await store.setRegular('roti', 6);
    expect(result.error).toBe('Could not update');
    expect(store.regulars()[0].amount).toBe(4);
  });

  it('reports a duplicate item name in plain words', async () => {
    const store = await setup({ mutation: { data: null, error: { message: 'dup', code: '23505' } } });
    expect((await store.createItem('Roti', 'count')).error).toBe('That item already exists');
  });
});
