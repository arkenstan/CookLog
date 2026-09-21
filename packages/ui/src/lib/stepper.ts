import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * − value +. Emits the next value; the parent decides what 0 means (usually "remove").
 * Use step 1 for count items and 0.5 for portions.
 */
@Component({
  selector: 'ui-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1 rounded-xl border bg-muted p-1', role: 'group', '[attr.aria-label]': 'label()' },
  template: `
    <button type="button" [class]="btn" [disabled]="disabled()" aria-label="Decrease" (click)="changed.emit(round(value() - step()))">−</button>
    <span class="min-w-16 px-1 text-center text-sm font-medium tabular-nums" aria-live="polite">{{ display() }}</span>
    <button type="button" [class]="btn" [disabled]="disabled() || value() >= max()" aria-label="Increase" (click)="changed.emit(round(value() + step()))">+</button>
  `,
})
export class UiStepper {
  readonly value = input.required<number>();
  readonly step = input(1);
  readonly max = input(100);
  /** Shown after the number, e.g. "pcs" or "portions". */
  readonly unit = input('');
  readonly disabled = input(false);
  readonly label = input('');
  readonly changed = output<number>();

  protected readonly btn =
    'press size-9 cursor-pointer rounded-lg text-lg leading-none transition-colors duration-fast hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40';

  protected readonly display = computed(() => {
    const v = this.value();
    const n = Number.isInteger(v) ? String(v) : v.toFixed(1);
    return this.unit() ? `${n} ${this.unit()}` : n;
  });

  /** Avoids 0.1+0.2-style drift for half steps. */
  protected round(n: number): number {
    return Math.round(n * 10) / 10;
  }
}
