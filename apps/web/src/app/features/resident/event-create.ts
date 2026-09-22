import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventsStore, MealType } from '@cooklog/data-access';
import { ZardButtonComponent, ZardCardComponent, UiField, ZardInputDirective } from '@cooklog/ui';

const CUTOFF_HOURS_BEFORE = 3;
const DEFAULT_HOUR: Record<MealType, number> = { lunch: 13, dinner: 20, other: 18 };
const DEFAULT_TITLE: Record<MealType, string> = { lunch: 'Lunch', dinner: 'Dinner', other: 'Meal' };

type DayChoice = 'today' | 'tomorrow' | 'pick';

const DAY_CHIP =
  'rounded-lg border px-3 py-2 text-sm transition-colors duration-fast ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-foreground';

/** `Date` → value for `<input type="date">` (local date). */
export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** `Date` → value for `<input type="time">` (local time, no seconds). */
export function toTimeInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** The two native inputs back into one local `Date`; `null` while either is blank or invalid. */
export function fromInputs(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * RSVPs always close {@link CUTOFF_HOURS_BEFORE} hours before the meal — nobody picks this.
 * For a meal sooner than that the window would already be shut, so it stays open right up
 * to the start instead. The database only requires `cutoff_at <= starts_at`.
 */
export function cutoffFor(startsAt: Date, now = Date.now()): Date {
  const cutoff = new Date(startsAt.getTime() - CUTOFF_HOURS_BEFORE * 3600_000);
  return cutoff.getTime() <= now ? startsAt : cutoff;
}

/** The next occurrence of the type's usual time that still leaves room for the RSVP window. */
function defaultStart(type: MealType, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(DEFAULT_HOUR[type], 0, 0, 0);
  if (d.getTime() < from.getTime() + CUTOFF_HOURS_BEFORE * 3600_000) d.setDate(d.getDate() + 1);
  return d;
}

/** Which chip a `yyyy-MM-dd` value belongs to; anything else needs the date input. */
function dayOf(date: string): DayChoice {
  if (date === toDateInput(new Date())) return 'today';
  if (date === toDateInput(addDays(new Date(), 1))) return 'tomorrow';
  return 'pick';
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

@Component({
  selector: 'app-event-create',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ZardButtonComponent,
    ZardCardComponent,
    UiField,
    ZardInputDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-xl">
      <a routerLink="/home" class="text-sm text-muted-foreground hover:underline">← Meal events</a>
      <h2 class="mb-4 mt-2 text-2xl font-semibold tracking-tight">New meal event</h2>

      <z-card>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
          <ui-field label="Meal" for="type">
            <select z-input id="type" formControlName="type">
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="other">Other</option>
            </select>
          </ui-field>
          <ui-field label="Title" for="title" [error]="titleError()">
            <input
              z-input
              id="title"
              formControlName="title"
              [attr.aria-invalid]="titleError() ? 'true' : null"
              [attr.aria-describedby]="titleError() ? 'title-error' : null"
              (input)="titleDirty = true"
            />
          </ui-field>

          <fieldset class="space-y-1.5">
            <legend class="text-sm font-medium">Day</legend>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                [class]="dayChip"
                [attr.aria-pressed]="!showDate() && day() === 'today'"
                (click)="pickDay('today')"
              >
                Today
              </button>
              <button
                type="button"
                [class]="dayChip"
                [attr.aria-pressed]="!showDate() && day() === 'tomorrow'"
                (click)="pickDay('tomorrow')"
              >
                Tomorrow
              </button>
              <button
                type="button"
                [class]="dayChip"
                [attr.aria-pressed]="showDate()"
                (click)="pickDay('pick')"
              >
                Another day
              </button>
            </div>
            @if (showDate()) {
              <input
                z-input
                id="date"
                type="date"
                formControlName="date"
                [min]="today"
                aria-label="Date"
              />
            }
          </fieldset>

          <ui-field label="Time" for="time">
            <input z-input id="time" type="time" formControlName="time" step="300" />
          </ui-field>

          <p class="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground" role="status">
            @if (startsAt(); as s) {
              Starts {{ s | date: 'EEEE d MMM · h:mm a' }}.
              @if (cutoffAt(); as c) {
                RSVPs close
                {{
                  closesAtStart()
                    ? 'when the meal starts'
                    : (c | date: 'h:mm a') + ', 3 hours before'
                }}.
              }
            } @else {
              Pick a day and a time.
            }
          </p>

          @if (error()) {
            <p class="text-sm text-destructive" role="alert">{{ error() }}</p>
          }
          <div class="flex gap-3">
            <button z-button zSize="lg" type="submit" class="flex-1" [zDisabled]="busy()">
              {{ busy() ? 'Creating…' : 'Create event' }}
            </button>
            <a z-button zType="ghost" zSize="lg" routerLink="/home">Cancel</a>
          </div>
        </form>
      </z-card>
    </div>
  `,
})
export class EventCreate {
  private readonly events = inject(EventsStore);
  private readonly router = inject(Router);

  protected titleDirty = false;
  protected readonly dayChip = DAY_CHIP;
  protected readonly today = toDateInput(new Date());

  /** A method, not a computed: reactive-forms state isn't a signal. */
  protected titleError(): string | null {
    const title = this.form.controls.title;
    return title.touched && title.invalid ? 'Give the event a title' : null;
  }

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly start = defaultStart('dinner');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: ['dinner' as MealType],
    title: [DEFAULT_TITLE.dinner, Validators.required],
    date: [toDateInput(this.start), Validators.required],
    time: [toTimeInput(this.start), Validators.required],
  });

  /** Mirrors the date and time controls so the summary below the form can react to them. */
  protected readonly startsAt = signal<Date | null>(this.start);
  protected readonly cutoffAt = computed(() => {
    const s = this.startsAt();
    return s ? cutoffFor(s) : null;
  });
  protected readonly closesAtStart = computed(
    () => this.cutoffAt()?.getTime() === this.startsAt()?.getTime(),
  );

  /** Which chip the chosen date matches. */
  protected readonly day = signal<DayChoice>(dayOf(toDateInput(this.start)));
  /**
   * Whether the date input is on screen. Sticky once "Another day" is chosen, so the input
   * doesn't vanish mid-edit when the typed date happens to land on today or tomorrow.
   */
  protected readonly showDate = signal(dayOf(toDateInput(this.start)) === 'pick');

  constructor() {
    const { type, title, date, time } = this.form.controls;
    type.valueChanges.pipe(takeUntilDestroyed()).subscribe((t) => {
      if (!this.titleDirty) title.setValue(DEFAULT_TITLE[t]);
      const next = defaultStart(t);
      date.setValue(toDateInput(next));
      time.setValue(toTimeInput(next));
    });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.startsAt.set(fromInputs(date.value, time.value));
      this.day.set(dayOf(date.value));
    });
  }

  protected pickDay(choice: DayChoice): void {
    this.showDate.set(choice === 'pick');
    if (choice === 'pick') return;
    this.form.controls.date.setValue(toDateInput(addDays(new Date(), choice === 'today' ? 0 : 1)));
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const startsAt = fromInputs(v.date, v.time);
    if (!startsAt) {
      this.error.set('Enter a valid day and time');
      return;
    }
    if (startsAt.getTime() <= Date.now()) {
      this.error.set('The meal must start in the future');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    const result = await this.events.createEvent({
      title: v.title.trim(),
      type: v.type,
      startsAt,
      cutoffAt: cutoffFor(startsAt),
    });
    this.busy.set(false);
    if (result.error) this.error.set(result.error);
    else await this.router.navigate(['/events', result.id]);
  }
}
