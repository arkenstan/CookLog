import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventsStore, MealType } from '@cooklog/data-access';
import { UiButton, UiCard, UiField, UiInput } from '@cooklog/ui';

const CUTOFF_HOURS_BEFORE = 3;
const DEFAULT_HOUR: Record<MealType, number> = { lunch: 13, dinner: 20, other: 18 };
const DEFAULT_TITLE: Record<MealType, string> = { lunch: 'Lunch', dinner: 'Dinner', other: 'Meal' };

/** `Date` → value for `<input type="datetime-local">` (local time, no seconds). */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** The next occurrence of the type's usual time that still leaves room for the RSVP window. */
function defaultStart(type: MealType, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(DEFAULT_HOUR[type], 0, 0, 0);
  if (d.getTime() < from.getTime() + CUTOFF_HOURS_BEFORE * 3600_000) d.setDate(d.getDate() + 1);
  return d;
}

@Component({
  selector: 'app-event-create',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiCard, UiField, UiInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-xl">
      <a routerLink="/home" class="text-sm text-muted-foreground hover:underline">← Meal events</a>
      <h2 class="mb-4 mt-2 text-2xl font-semibold tracking-tight">New meal event</h2>

      <ui-card>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
          <ui-field label="Meal" for="type">
            <select uiInput id="type" formControlName="type">
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="other">Other</option>
            </select>
          </ui-field>
          <ui-field label="Title" for="title" [error]="titleError()">
            <input
              uiInput
              id="title"
              formControlName="title"
              [attr.aria-invalid]="titleError() ? 'true' : null"
              [attr.aria-describedby]="titleError() ? 'title-error' : null"
              (input)="titleDirty = true"
            />
          </ui-field>
          <ui-field label="Starts" for="startsAt">
            <input uiInput id="startsAt" type="datetime-local" formControlName="startsAt" />
          </ui-field>
          <ui-field label="RSVPs close" for="cutoffAt">
            <input uiInput id="cutoffAt" type="datetime-local" formControlName="cutoffAt" (input)="cutoffDirty = true" />
          </ui-field>

          @if (error()) {
            <p class="text-sm text-destructive" role="alert">{{ error() }}</p>
          }
          <div class="flex gap-3">
            <button uiButton size="lg" type="submit" class="flex-1" [disabled]="busy()">
              {{ busy() ? 'Creating…' : 'Create event' }}
            </button>
            <a uiButton variant="ghost" size="lg" routerLink="/home">Cancel</a>
          </div>
        </form>
      </ui-card>
    </div>
  `,
})
export class EventCreate {
  private readonly events = inject(EventsStore);
  private readonly router = inject(Router);

  protected titleDirty = false;

  /** A method, not a computed: reactive-forms state isn't a signal. */
  protected titleError(): string | null {
    const title = this.form.controls.title;
    return title.touched && title.invalid ? 'Give the event a title' : null;
  }

  protected cutoffDirty = false;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly start = defaultStart('dinner');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: ['dinner' as MealType],
    title: [DEFAULT_TITLE.dinner, Validators.required],
    startsAt: [toLocalInput(this.start), Validators.required],
    cutoffAt: [toLocalInput(new Date(this.start.getTime() - CUTOFF_HOURS_BEFORE * 3600_000)), Validators.required],
  });

  constructor() {
    const { type, title, startsAt, cutoffAt } = this.form.controls;
    type.valueChanges.pipe(takeUntilDestroyed()).subscribe((t) => {
      if (!this.titleDirty) title.setValue(DEFAULT_TITLE[t]);
      startsAt.setValue(toLocalInput(defaultStart(t)));
    });
    startsAt.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const d = new Date(value);
      if (!this.cutoffDirty && !Number.isNaN(d.getTime())) {
        cutoffAt.setValue(toLocalInput(new Date(d.getTime() - CUTOFF_HOURS_BEFORE * 3600_000)), { emitEvent: false });
      }
    });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const startsAt = new Date(v.startsAt);
    const cutoffAt = new Date(v.cutoffAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(cutoffAt.getTime())) {
      this.error.set('Enter a valid start and RSVP time');
      return;
    }
    if (startsAt.getTime() <= Date.now()) {
      this.error.set('The meal must start in the future');
      return;
    }
    if (cutoffAt > startsAt) {
      this.error.set('RSVPs must close before the meal starts');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    const result = await this.events.createEvent({ title: v.title.trim(), type: v.type, startsAt, cutoffAt });
    this.busy.set(false);
    if (result.error) this.error.set(result.error);
    else await this.router.navigate(['/events', result.id]);
  }
}
