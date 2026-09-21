import { ChangeDetectionStrategy, Component, Directive, input } from '@angular/core';

/** Styles a native `<input>` / `<select>`. */
@Directive({
  selector: 'input[uiInput], select[uiInput]',
  host: {
    class:
      'h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground ' +
      'placeholder:text-muted-foreground transition-colors duration-fast ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
  },
})
export class UiInput {}

/** Label + control + inline error. Wrap a `[uiInput]` element with the matching `id`. */
@Component({
  selector: 'ui-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-1.5' },
  template: `
    <label class="text-sm font-medium" [attr.for]="for()">{{ label() }}</label>
    <ng-content />
    @if (error()) {
      <p class="text-sm text-destructive" role="alert">{{ error() }}</p>
    }
  `,
})
export class UiField {
  readonly label = input.required<string>();
  readonly for = input<string>();
  readonly error = input<string | null>(null);
}
