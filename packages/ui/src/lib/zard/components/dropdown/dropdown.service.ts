import {
  type ConnectedPosition,
  Overlay,
  type OverlayConfig,
  OverlayPositionBuilder,
  type OverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ViewportRuler } from '@angular/cdk/scrolling';
import { isPlatformBrowser } from '@angular/common';
import {
  type ElementRef,
  inject,
  Injectable,
  PLATFORM_ID,
  type Renderer2,
  RendererFactory2,
  signal,
  type TemplateRef,
  type ViewContainerRef,
} from '@angular/core';

import { filter, type Subscription } from 'rxjs';

import { noopFn } from '../../utils/merge-classes';

/**
 * Below the trigger, falling back to the other edge and then above it. Without the
 * `end`-aligned pairs a trigger near the right of the viewport pushes the panel off screen.
 */
const CONNECTED_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
];

/** Keep the panel this far from the viewport edges. */
const VIEWPORT_MARGIN = 8;

/** At or below this viewport width there isn't room to anchor a panel, so it becomes a bottom sheet. */
const SHEET_MAX_WIDTH = 639;

@Injectable({
  providedIn: 'root',
})
export class ZardDropdownService {
  private readonly overlay = inject(Overlay);
  private readonly overlayPositionBuilder = inject(OverlayPositionBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly rendererFactory = inject(RendererFactory2);
  private readonly viewportRuler = inject(ViewportRuler);

  private overlayRef?: OverlayRef;
  private portal?: TemplatePortal;
  private triggerElement?: ElementRef;
  private renderer!: Renderer2;
  private readonly focusedIndex = signal<number>(-1);
  private outsideClickSubscription!: Subscription;
  private backdropSubscription?: Subscription;
  private unlisten: () => void = noopFn;

  readonly isOpen = signal(false);

  /**
   * True while the open panel is presented as a bottom sheet rather than anchored to its
   * trigger. The content component reads this to restyle itself for a phone.
   */
  readonly isSheet = signal(false);

  constructor() {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  toggle(
    triggerElement: ElementRef,
    template: TemplateRef<unknown>,
    viewContainerRef: ViewContainerRef,
  ) {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open(triggerElement, template, viewContainerRef);
    }
  }

  private open(
    triggerElement: ElementRef,
    template: TemplateRef<unknown>,
    viewContainerRef: ViewContainerRef,
  ) {
    if (this.isOpen()) {
      this.close();
    }

    this.triggerElement = triggerElement;
    this.isSheet.set(this.prefersSheet());
    this.createOverlay(triggerElement);

    if (!this.overlayRef) {
      return;
    }

    this.portal = new TemplatePortal(template, viewContainerRef);
    this.overlayRef.attach(this.portal);

    // Setup keyboard navigation
    setTimeout(() => {
      this.setupKeyboardNavigation();
      this.focusFirstItem();
    }, 0);

    // Close on outside click
    this.outsideClickSubscription = this.overlayRef
      .outsidePointerEvents()
      .pipe(filter((event) => !triggerElement.nativeElement.contains(event.target)))
      .subscribe(() => {
        this.close();
      });
    // A sheet has a backdrop, which swallows the outside pointer events above.
    this.backdropSubscription = this.overlayRef.backdropClick().subscribe(() => this.close());
    this.isOpen.set(true);
  }

  getTriggerElement(): ElementRef | undefined {
    return this.triggerElement;
  }

  close() {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
    this.focusedIndex.set(-1);
    this.unlisten();
    this.destroyOverlay();
    this.isOpen.set(false);
    this.isSheet.set(false);
    this.triggerElement = undefined;
  }

  closeAndReturnTrigger(): ElementRef | undefined {
    const trigger = this.triggerElement;
    this.close();
    return trigger;
  }

  private createOverlay(triggerElement: ElementRef) {
    if (this.overlayRef) {
      this.destroyOverlay();
    }

    this.overlayRef = this.overlay.create(
      this.isSheet() ? this.sheetConfig() : this.anchoredConfig(triggerElement),
    );
  }

  private prefersSheet(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      this.viewportRuler.getViewportSize().width <= SHEET_MAX_WIDTH
    );
  }

  /** Docked to the bottom edge, full width, over a dimmed page. */
  private sheetConfig(): OverlayConfig {
    return {
      positionStrategy: this.overlay.position().global().bottom('0').left('0'),
      hasBackdrop: true,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      width: '100%',
      maxHeight: '80vh',
    };
  }

  private anchoredConfig(triggerElement: ElementRef): OverlayConfig {
    return {
      positionStrategy: this.overlayPositionBuilder
        .flexibleConnectedTo(triggerElement)
        .withPositions(CONNECTED_POSITIONS)
        .withViewportMargin(VIEWPORT_MARGIN)
        // Nudge back into view when no position fits outright.
        .withPush(true),
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      minWidth: 200,
      maxHeight: 400,
    };
  }

  private destroyOverlay() {
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.outsideClickSubscription?.unsubscribe();
    this.backdropSubscription?.unsubscribe();
  }

  private setupKeyboardNavigation() {
    if (!this.overlayRef?.hasAttached() || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const dropdownElement = this.overlayRef.overlayElement.querySelector(
      '[role="menu"]',
    ) as HTMLElement;
    if (!dropdownElement) {
      return;
    }

    this.unlisten = this.renderer.listen(
      dropdownElement,
      'keydown.{arrowdown,arrowup,enter,space,escape,home,end}.prevent',
      (event: KeyboardEvent) => {
        const items = this.getDropdownItems();

        switch (event.key) {
          case 'ArrowDown':
            this.navigateItems(1, items);
            break;
          case 'ArrowUp':
            this.navigateItems(-1, items);
            break;
          case 'Enter':
          case ' ':
            this.selectFocusedItem(items);
            break;
          case 'Escape': {
            const triggerToFocus = this.closeAndReturnTrigger();
            triggerToFocus?.nativeElement.focus();
            break;
          }
          case 'Home':
            this.focusItemAtIndex(items, 0);
            break;
          case 'End':
            this.focusItemAtIndex(items, items.length - 1);
            break;
        }
      },
    );

    // Focus dropdown container
    dropdownElement.focus();
  }

  private getDropdownItems(): HTMLElement[] {
    if (!this.overlayRef?.hasAttached()) {
      return [];
    }
    const dropdownElement = this.overlayRef.overlayElement;
    return Array.from(
      dropdownElement.querySelectorAll<HTMLElement>('z-dropdown-menu-item, [z-dropdown-menu-item]'),
    ).filter((item) => item.dataset['disabled'] === undefined);
  }

  private navigateItems(direction: number, items: HTMLElement[]) {
    if (items.length === 0) {
      return;
    }

    const currentIndex = this.focusedIndex();
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) {
      nextIndex = items.length - 1;
    } else if (nextIndex >= items.length) {
      nextIndex = 0;
    }

    this.focusItemAtIndex(items, nextIndex);
  }

  private focusItemAtIndex(items: HTMLElement[], index: number) {
    if (index >= 0 && index < items.length) {
      this.focusedIndex.set(index);
      this.updateItemFocus(items, index);
    }
  }

  private focusFirstItem() {
    const items = this.getDropdownItems();
    if (items.length > 0) {
      this.focusItemAtIndex(items, 0);
    }
  }

  private selectFocusedItem(items: HTMLElement[]) {
    const currentIndex = this.focusedIndex();
    if (currentIndex >= 0 && currentIndex < items.length) {
      const item = items[currentIndex];
      item.click();
    }
  }

  private updateItemFocus(items: HTMLElement[], focusedIndex: number) {
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (index === focusedIndex) {
        item.focus();
        item.dataset['highlighted'] = '';
      } else {
        delete item.dataset['highlighted'];
      }
    }
  }
}
