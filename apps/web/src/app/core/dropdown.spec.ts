import { ViewportRuler } from '@angular/cdk/scrolling';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ZardButtonComponent, ZardDropdownImports, provideZard } from '@cooklog/ui';

/**
 * ZardUI is vendored source, so it carries its own upstream specs. These assert only the
 * accessibility contract the app depends on, so a future re-vendor can't silently drop it.
 */
@Component({
  imports: [ZardButtonComponent, ZardDropdownImports],
  template: `
    <button type="button" z-button aria-label="More" z-dropdown [zDropdownMenu]="menu">Menu</button>
    <z-dropdown-menu-content #menu="zDropdownMenuContent">
      <z-dropdown-menu-item>One</z-dropdown-menu-item>
      <z-dropdown-menu-item>Two</z-dropdown-menu-item>
      <z-dropdown-menu-item>Three</z-dropdown-menu-item>
    </z-dropdown-menu-content>
  `,
})
class Host {}

describe('ZardUI dropdown a11y contract', () => {
  function setup(viewportWidth = 1024) {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideZard()] });
    vi.spyOn(TestBed.inject(ViewportRuler), 'getViewportSize').mockReturnValue({
      width: viewportWidth,
      height: 800,
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector<HTMLElement>('[aria-haspopup="menu"]')!;
    const items = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    return { fixture, el, trigger, items };
  }

  async function open(fixture: ReturnType<typeof setup>['fixture'], trigger: HTMLElement) {
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('names the trigger and reports its expanded state', async () => {
    const { fixture, trigger } = setup();
    expect(trigger.getAttribute('aria-label')).toBe('More');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    await open(fixture, trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('exposes a menu of menuitems once open', async () => {
    const { fixture, trigger, items } = setup();
    expect(document.querySelector('[role="menu"]')).toBeNull();

    await open(fixture, trigger);
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
    expect(items().map((i) => i.textContent?.trim())).toEqual(['One', 'Two', 'Three']);
  });

  it('keeps menu rows out of the tab order', async () => {
    const { fixture, trigger, items } = setup();
    await open(fixture, trigger);
    expect(items().every((i) => i.getAttribute('tabindex') === '-1')).toBe(true);
  });

  it('anchors the panel to the trigger on a wide viewport', async () => {
    const { fixture, trigger } = setup(1024);
    await open(fixture, trigger);

    // The connected-position strategy wraps the pane; a global (sheet) one does not.
    expect(document.querySelector('.cdk-overlay-connected-position-bounding-box')).not.toBeNull();
    expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
  });

  it('becomes a full-width bottom sheet on a phone viewport', async () => {
    const { fixture, trigger } = setup(390);
    await open(fixture, trigger);

    const pane = document.querySelector<HTMLElement>('.cdk-overlay-pane')!;
    expect(pane.style.width).toBe('100%');
    // Docked to the bottom edge, over a backdrop that dismisses it.
    expect(document.querySelector('.cdk-global-overlay-wrapper')).not.toBeNull();
    expect(document.querySelector('.cdk-overlay-backdrop')).not.toBeNull();
    expect(document.querySelector<HTMLElement>('[role="menu"]')!.className).toContain(
      'rounded-b-none',
    );
  });
});
