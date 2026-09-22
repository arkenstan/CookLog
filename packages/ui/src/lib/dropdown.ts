import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/** Row inside a `<ui-dropdown>` panel. Not tabbable: the menu is driven by arrow keys. */
@Directive({
  selector: 'button[uiMenuItem], a[uiMenuItem]',
  host: {
    role: 'menuitem',
    tabindex: '-1',
    class:
      'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ' +
      'transition-colors duration-fast hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
  },
})
export class UiMenuItem {}

/**
 * Popover menu. Put the trigger content in an element with the `trigger` attribute and menu
 * rows (`uiMenuItem`) as the other children.
 *
 *   <ui-dropdown label="More"><span trigger>Menu</span><button uiMenuItem>One</button></ui-dropdown>
 *
 * Implements the menu-button keyboard contract its ARIA roles promise: opening moves focus
 * into the panel, Arrow/Home/End rove between rows, and closing returns focus to the trigger.
 */
@Component({
  selector: 'ui-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative inline-block',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    <button
      #triggerButton
      type="button"
      class="press inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium transition-colors duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-haspopup="menu"
      [attr.aria-label]="label() || null"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      <ng-content select="[trigger]" />
      @if (chevron()) {
        <span aria-hidden="true" class="text-muted-foreground">▾</span>
      }
    </button>
    @if (open()) {
      <div #panel role="menu" [class]="panelClass()" (click)="close()" tabindex="-1">
        <ng-content />
      </div>
    }
  `,
})
export class UiDropdown {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly triggerButton = viewChild.required<ElementRef<HTMLButtonElement>>('triggerButton');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly align = input<'start' | 'end'>('start');
  /** Accessible name for the trigger. Required when the trigger has no visible text. */
  readonly label = input('');
  /** Set false for an icon-only trigger, where a second affordance just adds noise. */
  readonly chevron = input(true);

  protected readonly open = signal(false);
  protected readonly panelClass = computed(
    () =>
      'absolute z-20 mt-2 min-w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg animate-fade-up ' +
      (this.align() === 'end' ? 'right-0' : 'left-0'),
  );

  protected toggle(): void {
    if (this.open()) this.close();
    else this.openMenu();
  }

  /** Closes the menu. Focus goes back to the trigger unless the user is leaving on their own. */
  protected close(restoreFocus = true): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) this.triggerButton().nativeElement.focus();
  }

  private openMenu(): void {
    this.open.set(true);
    afterNextRender(() => this.items()[0]?.focus(), { injector: this.injector });
  }

  private items(): HTMLElement[] {
    const panel = this.panel()?.nativeElement;
    return panel ? Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      // ArrowDown on a closed menu button opens it, per the menu-button pattern.
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.openMenu();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    // Tab leaves the menu entirely, so don't drag focus back to the trigger.
    if (event.key === 'Tab') {
      this.close(false);
      return;
    }

    const items = this.items();
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = current < 0 ? 0 : (current + 1) % items.length;
        break;
      case 'ArrowUp':
        next = current <= 0 ? items.length - 1 : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    items[next]?.focus();
  }

  protected onDocumentClick(event: Event): void {
    // Clicking away shouldn't yank focus back to the trigger.
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close(false);
  }
}
