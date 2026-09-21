import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <p class="text-sm text-muted-foreground">{{ label() }}</p>
    <p class="mt-1 text-3xl font-semibold tracking-tight">{{ value() }}</p>
    @if (hint()) {
      <p class="mt-1 text-xs text-muted-foreground">{{ hint() }}</p>
    }
  `,
})
export class UiStat {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
}
