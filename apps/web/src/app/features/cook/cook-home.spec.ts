import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore, DocketStore } from '@cooklog/data-access';
import { hours } from '../../../testing/fake-stores';
import { CookHome } from './cook-home';

function setup(events: unknown[], items: unknown[]) {
  const store = {
    events: signal(events), items: signal(items), loading: signal(false),
    load: vi.fn(async () => {}), watch: vi.fn(() => () => {}),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CookHome],
    providers: [
      { provide: DocketStore, useValue: store },
      { provide: AuthStore, useValue: { activeHouseholdId: signal('h1') } },
    ],
  });
  const fixture = TestBed.createComponent(CookHome);
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, store };
}

const dinner = { meal_id: 'm1', title: 'Dinner', type: 'dinner', status: 'pending', starts_at: hours(5), cutoff_at: hours(2), people_in: 2, allergies: ['nuts'] };

describe('CookHome', () => {
  it('shows each event with people and per-item totals in the right unit', () => {
    const { el, store } = setup(
      [dinner],
      [
        { meal_id: 'm1', item_id: 'soup', name: 'Soup', kind: 'portion', total: 2.5, contributors: 2 },
        { meal_id: 'm1', item_id: 'roti', name: 'Roti', kind: 'count', total: 6, contributors: 2 },
        { meal_id: 'other', item_id: 'x', name: 'Elsewhere', kind: 'count', total: 9, contributors: 1 },
      ],
    );
    expect(store.load).toHaveBeenCalled();
    expect(el.textContent).toContain('Dinner');
    expect(el.textContent).toMatch(/2\s*people/);
    expect(el.textContent).toContain('6 pcs');
    expect(el.textContent).toContain('2.5 portions');
    expect(el.textContent).not.toContain('Elsewhere');
    expect(el.textContent).toContain('Allergies: nuts');
    // items sorted by name: Roti before Soup
    expect(el.textContent!.indexOf('Roti')).toBeLessThan(el.textContent!.indexOf('Soup'));
  });

  it('shows an empty state and singular person', () => {
    expect(setup([], []).el.textContent).toContain('No meal events today or coming up.');
    const { el } = setup([{ ...dinner, people_in: 1, allergies: [] }], []);
    expect(el.textContent).toMatch(/1\s*person/);
    expect(el.textContent).toContain('No items yet.');
  });
});
