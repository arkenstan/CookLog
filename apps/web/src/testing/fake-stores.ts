import { signal } from '@angular/core';
import {
  AuthStore,
  CatalogStore,
  CreateEventInput,
  EventsStore,
  GroceryStore,
} from '@cooklog/data-access';

export const hours = (n: number) => new Date(Date.now() + n * 3600_000).toISOString();

export const meal = (over: Record<string, unknown> = {}) => ({
  id: 'm1', household_id: 'h1', title: 'Dinner', type: 'dinner', status: 'pending',
  starts_at: hours(5), cutoff_at: hours(2), created_by: 'u1', ...over,
});

/** Signal-shaped stand-in for EventsStore with spy-able methods. */
export function fakeEvents(over: Record<string, unknown> = {}) {
  return {
    provide: EventsStore,
    useValue: {
      events: signal([]), active: signal([]), upcoming: signal([]), completed: signal([]),
      myRsvps: signal({}), inCounts: signal({}), myEntries: signal({}), totals: signal({}),
      rsvps: signal([]), names: signal({}), loading: signal(false),
      load: vi.fn(async () => {}), watch: vi.fn(() => () => {}),
      setAvailability: vi.fn(async () => ({ error: null })),
      addOne: vi.fn(async () => ({ error: null })),
      setAmount: vi.fn(async () => ({ error: null })),
      removeEntry: vi.fn(async () => ({ error: null })),
      createEvent: vi.fn(async (_input: CreateEventInput) => ({ error: null, id: 'new-1' })),
      ...over,
    },
  };
}

export const ITEMS = [
  { id: 'roti', name: 'Roti', kind: 'count' },
  { id: 'soup', name: 'Soup', kind: 'portion' },
  { id: 'bread', name: 'Bread', kind: 'count' },
];

export function fakeCatalog(over: Record<string, unknown> = {}) {
  return {
    provide: CatalogStore,
    useValue: {
      items: signal(ITEMS),
      itemsById: signal(new Map(ITEMS.map((i) => [i.id, i]))),
      regulars: signal([]), nonRegularItems: signal(ITEMS), loading: signal(false),
      load: vi.fn(async () => {}), watch: vi.fn(() => () => {}),
      createItem: vi.fn(async () => ({ error: null, id: 'khichdi' })),
      addRegular: vi.fn(async () => ({ error: null })),
      setRegular: vi.fn(async () => ({ error: null })),
      removeRegular: vi.fn(async () => ({ error: null })),
      ...over,
    },
  };
}

export const GROCERIES = [
  { id: 'g1', household_id: 'h1', name: 'Atta', status: 'missing', added_by: 'u1', note: null },
  { id: 'g2', household_id: 'h1', name: 'Oil', status: 'stocked', added_by: 'u2', note: null },
];

export function fakeGrocery(over: Record<string, unknown> = {}) {
  return {
    provide: GroceryStore,
    useValue: {
      items: signal(GROCERIES),
      missing: signal(GROCERIES.filter((g) => g.status === 'missing')),
      stocked: signal(GROCERIES.filter((g) => g.status === 'stocked')),
      names: signal({ u1: 'Asha', u2: 'Ben' }),
      loading: signal(false),
      load: vi.fn(async () => {}), watch: vi.fn(() => () => {}),
      add: vi.fn(async () => ({ error: null, id: 'g3' })),
      setStatus: vi.fn(async () => ({ error: null })),
      remove: vi.fn(async () => ({ error: null })),
      ...over,
    },
  };
}

export const fakeAuth = () => ({
  provide: AuthStore,
  useValue: {
    userId: signal('u1'),
    activeHouseholdId: signal('h1'),
    username: signal('Asha'),
    hasProfile: signal(true),
    role: signal('resident'),
  },
});
