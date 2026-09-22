import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Label + control + inline error. Wrap a `[z-input]` element with the matching `id`.
 *
 * When `for` is set the error paragraph gets the id `<for>-error`; point the control's
 * `aria-describedby` at it (and set `aria-invalid`) so the error is announced with the field.
 */
@Component({
  selector: 'ui-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-1.5' },
  template: `
    <label class="text-sm font-medium" [attr.for]="for()">{{ label() }}</label>
    <ng-content />
    @if (error()) {
      <p class="text-sm text-destructive" role="alert" [attr.id]="errorId()">{{ error() }}</p>
    }
  `,
})
export class UiField {
  readonly label = input.required<string>();
  readonly for = input<string>();
  readonly error = input<string | null>(null);

  /** Id of the error paragraph, for the control's `aria-describedby`. */
  readonly errorId = computed(() => {
    const target = this.for();
    return target ? `${target}-error` : null;
  });
}
