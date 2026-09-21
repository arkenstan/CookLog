import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeAuth, fakeCatalog, fakeEvents, hours, meal } from '../../../testing/fake-stores';
import { EventDetail } from './event-detail';

const entries = [
  { meal_id: 'm1', user_id: 'u1', item_id: 'roti', amount: 4, source: 'regular' },
  { meal_id: 'm1', user_id: 'u1', item_id: 'soup', amount: 1, source: 'manual' },
];

function setup(event = meal()) {
  const events = fakeEvents({
    events: signal([event]),
    myRsvps: signal({ m1: 'in' }),
    inCounts: signal({ m1: 2 }),
    myEntries: signal({ m1: entries }),
    totals: signal({ m1: { roti: 6, soup: 2.5 } }),
    rsvps: signal([
      { meal_id: 'm1', user_id: 'u1', status: 'in' },
      { meal_id: 'm1', user_id: 'u2', status: 'out' },
    ]),
    names: signal({ u1: 'Asha', u2: 'Ben' }),
  });
  TestBed.configureTestingModule({
    imports: [EventDetail],
    providers: [provideRouter([]), events, fakeCatalog(), fakeAuth()],
  });
  const fixture = TestBed.createComponent(EventDetail);
  fixture.componentRef.setInput('id', 'm1');
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, events: events.useValue };
}

const stepperFor = (el: HTMLElement, name: string) =>
  el.querySelector<HTMLElement>(`ui-stepper[aria-label="${name}"]`)!;

describe('EventDetail', () => {
  it('lists my items with kind-aware units and everyone’s totals', () => {
    const { el } = setup();
    expect(stepperFor(el, 'Roti').textContent).toContain('4 pcs');
    expect(stepperFor(el, 'Soup').textContent).toContain('1 portions');
    expect(el.textContent).toContain('regular');
    expect(el.textContent).toContain('6 pcs');
    expect(el.textContent).toContain('2.5 portions');
    expect(el.textContent).toMatch(/In\s*Asha/);
    expect(el.textContent).toMatch(/Out\s*Ben/);
  });

  it('adds one roti (count) and half a portion of soup', () => {
    const { fixture, el, events } = setup();
    stepperFor(el, 'Roti').querySelector<HTMLButtonElement>('button[aria-label="Increase"]')!.click();
    stepperFor(el, 'Soup').querySelector<HTMLButtonElement>('button[aria-label="Increase"]')!.click();
    fixture.detectChanges();

    expect(events.setAmount).toHaveBeenCalledWith('m1', 'roti', 5);
    expect(events.setAmount).toHaveBeenCalledWith('m1', 'soup', 1.5);
  });

  it('adds a catalog item that is not in my list yet', () => {
    const { fixture, el, events } = setup();
    const select = el.querySelector<HTMLSelectElement>('select[aria-label="Item to add"]')!;
    expect([...select.options].map((o) => o.textContent?.trim())).toEqual(['Add an item…', 'Bread (count)']);

    select.value = 'bread';
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Add')!.click();
    fixture.detectChanges();

    expect(events.addOne).toHaveBeenCalledWith('m1', 'bread', 'count');
  });

  it('removes an entry', () => {
    const { el, events } = setup();
    el.querySelector<HTMLButtonElement>('button[aria-label="Remove Roti"]')!.click();
    expect(events.removeEntry).toHaveBeenCalledWith('m1', 'roti');
  });

  it('is read-only once the event is closed', () => {
    const { el } = setup(meal({ cutoff_at: hours(-1) }));
    expect(el.textContent).toContain('Closed for changes');
    expect(el.querySelector('select[aria-label="Item to add"]')).toBeNull();
    expect(stepperFor(el, 'Roti').querySelector<HTMLButtonElement>('button[aria-label="Increase"]')!.disabled).toBe(true);
  });

  it('says so when the event does not exist', () => {
    TestBed.configureTestingModule({
      imports: [EventDetail],
      providers: [provideRouter([]), fakeEvents(), fakeCatalog(), fakeAuth()],
    });
    const fixture = TestBed.createComponent(EventDetail);
    fixture.componentRef.setInput('id', 'nope');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('couldn’t find that event');
  });
});
