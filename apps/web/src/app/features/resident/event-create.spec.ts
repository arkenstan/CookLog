import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fakeEvents } from '../../../testing/fake-stores';
import { EventCreate, cutoffFor, toDateInput, toTimeInput } from './event-create';

function setup() {
  const events = fakeEvents();
  TestBed.configureTestingModule({
    imports: [EventCreate],
    providers: [provideRouter([]), events],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(EventCreate);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const field = <T extends HTMLElement>(id: string) => el.querySelector<T>(`#${id}`)!;
  const chip = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('fieldset button')].find(
      (b) => b.textContent?.trim() === label,
    )!;
  const set = (id: string, value: string) => {
    const input = field<HTMLInputElement>(id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    return fixture.whenStable();
  };
  return { fixture, el, events: events.useValue, navigate, field, chip, set, submit };
}

const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

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

  it('asks for no RSVP cutoff: the day is two taps and the time is one field', async () => {
    const { el, chip, field, set, events, submit } = setup();
    // Nothing to fill in for the RSVP window.
    expect(el.querySelector('#cutoffAt')).toBeNull();
    expect(el.textContent).toContain('3 hours before');

    chip('Tomorrow').click();
    set('time', '19:30');
    await submit();

    const input = events.createEvent.mock.calls[0][0];
    expect(toDateInput(input.startsAt)).toBe(toDateInput(at(1, 0)));
    expect(toTimeInput(input.startsAt)).toBe('19:30');
    expect(input.cutoffAt.getTime()).toBe(input.startsAt.getTime() - 3 * 3600_000);
    // The date input only appears once you step off the two quick chips.
    expect(field('time')).not.toBeNull();
  });

  it('reveals the date input only for "Another day"', () => {
    const { el, chip, fixture } = setup();
    expect(el.querySelector('#date')).toBeNull();

    chip('Another day').click();
    fixture.detectChanges();
    expect(el.querySelector<HTMLInputElement>('#date')).not.toBeNull();
    expect(chip('Another day').getAttribute('aria-pressed')).toBe('true');
  });

  it('rejects a start in the past and does not call the store', async () => {
    const { el, chip, set, events, submit, fixture } = setup();
    chip('Today').click();
    set('time', '00:01');
    await submit();
    fixture.detectChanges();

    expect(events.createEvent).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('must start in the future');
  });
});

describe('cutoffFor', () => {
  it('closes RSVPs 3 hours before the meal', () => {
    const starts = at(1, 20);
    expect(cutoffFor(starts).getTime()).toBe(starts.getTime() - 3 * 3600_000);
  });

  it('keeps RSVPs open to the start when the meal is less than 3 hours away', () => {
    const starts = new Date(Date.now() + 3600_000);
    expect(cutoffFor(starts).getTime()).toBe(starts.getTime());
  });
});
