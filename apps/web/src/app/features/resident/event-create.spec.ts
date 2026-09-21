import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fakeEvents } from '../../../testing/fake-stores';
import { EventCreate, toLocalInput } from './event-create';

function setup() {
  const events = fakeEvents();
  TestBed.configureTestingModule({ imports: [EventCreate], providers: [provideRouter([]), events] });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(EventCreate);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const field = <T extends HTMLElement>(id: string) => el.querySelector<T>(`#${id}`)!;
  const submit = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    return fixture.whenStable();
  };
  return { fixture, el, events: events.useValue, navigate, field, submit };
}

describe('EventCreate', () => {
  it('defaults to a dinner in the future with RSVPs closing 3 hours before', async () => {
    const { events, navigate, submit } = setup();
    await submit();

    const input = events.createEvent.mock.calls[0][0];
    expect(input.title).toBe('Dinner');
    expect(input.type).toBe('dinner');
    expect(input.startsAt.getTime()).toBeGreaterThan(Date.now());
    expect(input.startsAt.getTime() - input.cutoffAt.getTime()).toBe(3 * 3600_000);
    expect(navigate).toHaveBeenCalledWith(['/events', 'new-1']);
  });

  it('follows the meal type for the default title until the title is edited', () => {
    const { fixture, field } = setup();
    const type = field<HTMLSelectElement>('type');
    type.value = 'lunch';
    type.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(field<HTMLInputElement>('title').value).toBe('Lunch');

    const title = field<HTMLInputElement>('title');
    title.value = 'Birthday lunch';
    title.dispatchEvent(new Event('input'));
    type.value = 'dinner';
    type.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(field<HTMLInputElement>('title').value).toBe('Birthday lunch');
  });

  it('rejects an RSVP cutoff after the start and does not call the store', async () => {
    const { fixture, el, events, field, submit } = setup();
    const tomorrow = (h: number) => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(h, 0, 0, 0);
      return toLocalInput(d);
    };
    const set = (id: string, value: string) => {
      const input = field<HTMLInputElement>(id);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('startsAt', tomorrow(10));
    set('cutoffAt', tomorrow(11));
    await submit();
    fixture.detectChanges();

    expect(events.createEvent).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('RSVPs must close before the meal starts');
  });
});
