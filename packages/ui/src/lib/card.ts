import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Bento tile. `glow` adds the gradient border + ambient glow for key interactions. */
@Component({
  selector: 'ui-card',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class UiCard {
  readonly glow = input(false);
  protected readonly classes = computed(() =>
    this.glow()
      ? 'block rounded-xl glow-border shadow-glow-sm p-5 animate-fade-up'
      : 'block rounded-xl border bg-card text-card-foreground p-5 animate-fade-up',
  );
}
