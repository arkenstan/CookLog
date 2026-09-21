import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeAuth, fakeCatalog, fakeEvents, hours, meal } from '../../../testing/fake-stores';
import { ResidentHome } from './resident-home';

const today = meal({ id: 'a1', title: 'Dinner tonight' });
const later = meal({ id: 'b1', title: 'Sunday brunch', type: 'other' });
const closed = meal({ id: 'c1', title: 'Late lunch', cutoff_at: hours(-1) });

function setup(events: ReturnType<typeof fakeEvents>) {
  TestBed.configureTestingModule({
    imports: [ResidentHome],
    providers: [provideRouter([]), events, fakeCatalog(), fakeAuth()],
  });
  const fixture = TestBed.createComponent(ResidentHome);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const radios = (scope: ParentNode = el) => [...scope.querySelectorAll<HTMLButtonElement>('button[role="radio"]')];
  const tab = (label: string) => radios().find((b) => b.textContent?.includes(label))!;
  return { fixture, el, radios, tab };
}

describe('ResidentHome', () => {
  it('shows counts per phase and switches lists', () => {
    const { fixture, el, tab } = setup(
      fakeEvents({ active: signal([today]), upcoming: signal([later]), completed: signal([]) }),
    );
    expect(tab('Active (1)')).toBeTruthy();
    expect(tab('Upcoming (1)')).toBeTruthy();
    expect(tab('Completed (0)')).toBeTruthy();
    expect(el.textContent).toContain('Dinner tonight');
    expect(el.textContent).not.toContain('Sunday brunch');

    tab('Upcoming').click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Sunday brunch');
    expect(el.textContent).not.toContain('Dinner tonight');
  });

  it('marks availability through the store', () => {
    const events = fakeEvents({ active: signal([today]), myRsvps: signal({ a1: 'in' }) });
    const { fixture, el } = setup(events);
    const out = [...el.querySelectorAll<HTMLButtonElement>('ui-card button[role="radio"]')].find((b) => b.textContent?.trim() === 'Out')!;

    out.click();
    fixture.detectChanges();

    expect(events.useValue.setAvailability).toHaveBeenCalledWith('a1', 'out');
  });

  it('locks the toggle once RSVPs are closed', () => {
    const { el } = setup(fakeEvents({ active: signal([closed]) }));
    expect(el.textContent).toContain('RSVPs closed');
    const radios = [...el.querySelectorAll<HTMLButtonElement>('ui-card button[role="radio"]')];
    expect(radios.every((b) => b.disabled)).toBe(true);
  });

  it('links to create a new event and shows an empty state', () => {
    const { el } = setup(fakeEvents());
    expect(el.querySelector('a[href="/events/new"]')).toBeTruthy();
    expect(el.textContent).toContain('Nothing active right now.');
  });
});
