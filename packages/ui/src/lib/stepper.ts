import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ZardButtonComponent } from './zard/components/button';
import { ZardIconComponent } from './zard/components/icon';

/**
 * − value +. Emits the next value; the parent decides what 0 means (usually "remove").
 * Use step 1 for count items and 0.5 for portions.
 *
 * ZardUI has no stepper, so this stays ours — but it is built out of ZardUI's Button and
 * Icon so it inherits the same variants, focus ring and sizing as everything around it.
 */
@Component({
  selector: 'ui-stepper',
  imports: [ZardButtonComponent, ZardIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center gap-1 rounded-xl border bg-muted p-1',
    role: 'group',
    '[attr.aria-label]': 'label()',
  },
  template: `
    <button
      type="button"
      z-button
      zType="ghost"
      zSize="icon-sm"
      aria-label="Decrease"
      [zDisabled]="disabled()"
      (click)="changed.emit(round(value() - step()))"
    >
      <span aria-hidden="true" class="text-lg leading-none">−</span>
    </button>

    <span class="min-w-16 px-1 text-center text-sm font-medium tabular-nums" aria-live="polite">{{ display() }}</span>

    <button
      type="button"
      z-button
      zType="ghost"
      zSize="icon-sm"
      aria-label="Increase"
      [zDisabled]="disabled() || value() >= max()"
      (click)="changed.emit(round(value() + step()))"
    >
      <z-icon zType="plus" class="size-4" />
    </button>
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
