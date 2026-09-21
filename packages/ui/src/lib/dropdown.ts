import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/** Row inside a `<ui-dropdown>` panel. */
@Directive({
  selector: 'button[uiMenuItem], a[uiMenuItem]',
  host: {
    role: 'menuitem',
    class:
      'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ' +
      'transition-colors duration-fast hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
  },
})
export class UiMenuItem {}

/**
 * Popover menu. Put the trigger content in an element with the `trigger` attribute and menu
 * rows (`uiMenuItem`) as the other children. Closes on outside click, Escape, or picking a row.
 *
 *   <ui-dropdown><span trigger>Menu</span><button uiMenuItem>One</button></ui-dropdown>
 */
@Component({
  selector: 'ui-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative inline-block',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="press inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium transition-colors duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      (click)="open.set(!open())"
    >
      <ng-content select="[trigger]" />
      <span aria-hidden="true" class="text-muted-foreground">▾</span>
    </button>
    @if (open()) {
      <div
        role="menu"
        [class]="panelClass()"
        (click)="open.set(false)"
        (keydown.enter)="open.set(false)"
        tabindex="-1"
      >
        <ng-content />
      </div>
    }
  `,
})
export class UiDropdown {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly align = input<'start' | 'end'>('start');
  protected readonly open = signal(false);
  protected readonly panelClass = computed(
    () =>
      'absolute z-20 mt-2 min-w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg animate-fade-up ' +
      (this.align() === 'end' ? 'right-0' : 'left-0'),
  );

  protected onDocumentClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
}
