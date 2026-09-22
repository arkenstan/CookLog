import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ZardCardComponent } from './zard/components/card';

/**
 * A single headline number. ZardUI has no stat tile, so this stays ours, wrapped in a
 * ZardUI Card so it sits on the same surface as every other panel.
 */
@Component({
  selector: 'ui-stat',
  imports: [ZardCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <z-card class="gap-2 py-4">
      <p class="text-sm text-muted-foreground">{{ label() }}</p>
      <p class="mt-1 text-3xl font-semibold tracking-tight">{{ value() }}</p>
      @if (hint()) {
        <p class="mt-1 text-xs text-muted-foreground">{{ hint() }}</p>
      }
    </z-card>
  `,
})
export class UiStat {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
}
