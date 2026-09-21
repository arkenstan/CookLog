import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentOption {
  value: string;
  label: string;
}

/** Radio-style segmented control, e.g. the In / Out RSVP toggle. */
@Component({
  selector: 'ui-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'radiogroup',
    class: 'inline-flex rounded-xl border bg-muted p-1',
    '[attr.aria-label]': 'label()',
  },
  template: `
    @for (o of options(); track o.value) {
      <button
        type="button"
        role="radio"
        class="press h-11 min-w-20 cursor-pointer rounded-lg px-5 text-sm font-medium transition-[background-color,color,box-shadow] duration-base ease-out-expo disabled:cursor-not-allowed disabled:opacity-50"
        [class]="
          value() === o.value
            ? 'bg-primary text-primary-foreground shadow-glow-sm'
            : 'text-muted-foreground hover:text-foreground'
        "
        [attr.aria-checked]="value() === o.value"
        [disabled]="disabled()"
        (click)="value.set(o.value)"
      >
        {{ o.label }}
      </button>
    }
  `,
})
export class UiSegmented {
  readonly options = input.required<SegmentOption[]>();
  readonly value = model<string | null>(null);
  readonly disabled = input(false);
  readonly label = input('');
}
