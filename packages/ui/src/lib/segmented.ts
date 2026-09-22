import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
} from '@angular/core';

export interface SegmentOption {
  value: string;
  label: string;
}

/**
 * Radio-style segmented control, e.g. the In / Out RSVP toggle.
 *
 * Roving tabindex: the group is a single tab stop that lands on the checked option, and
 * Arrow/Home/End move the selection — the contract `role="radiogroup"` promises.
 */
@Component({
  selector: 'ui-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'radiogroup',
    class: 'inline-flex rounded-xl border bg-muted p-1',
    '[attr.aria-label]': 'label()',
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    @for (o of options(); track o.value; let i = $index) {
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
        [attr.tabindex]="i === activeIndex() ? 0 : -1"
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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The tab stop: the checked option, or the first one when nothing is chosen yet. */
  protected readonly activeIndex = computed(() => {
    const i = this.options().findIndex((o) => o.value === this.value());
    return i === -1 ? 0 : i;
  });

  protected onKeydown(event: KeyboardEvent): void {
    const options = this.options();
    if (this.disabled() || options.length < 2) return;

    const current = this.activeIndex();
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.value.set(options[next].value);
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  }
}
