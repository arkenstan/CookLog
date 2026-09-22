import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiDropdown, UiMenuItem } from '@cooklog/ui';

@Component({
  imports: [UiDropdown, UiMenuItem],
  template: `
    <ui-dropdown label="More">
      <span trigger>Menu</span>
      <button uiMenuItem type="button">One</button>
      <button uiMenuItem type="button">Two</button>
      <button uiMenuItem type="button">Three</button>
    </ui-dropdown>
  `,
})
class Host {}

describe('UiDropdown keyboard contract', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector<HTMLElement>('button[aria-haspopup="menu"]')!;
    const press = (key: string) =>
      el.querySelector('ui-dropdown')!.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
    const items = () => [...el.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    return { fixture, el, trigger, press, items };
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

  it('moves focus into the panel when it opens', async () => {
    const { fixture, trigger, items } = setup();
    await open(fixture, trigger);
    expect(document.activeElement).toBe(items()[0]);
  });

  it('keeps menu rows out of the tab order', async () => {
    const { fixture, trigger, items } = setup();
    await open(fixture, trigger);
    expect(items().map((i) => i.getAttribute('tabindex'))).toEqual(['-1', '-1', '-1']);
  });

  it('roves with ArrowDown, ArrowUp, Home and End', async () => {
    const { fixture, trigger, press, items } = setup();
    await open(fixture, trigger);

    press('ArrowDown');
    expect(document.activeElement).toBe(items()[1]);

    press('ArrowUp');
    expect(document.activeElement).toBe(items()[0]);

    // Wraps backwards off the first row.
    press('ArrowUp');
    expect(document.activeElement).toBe(items()[2]);

    press('Home');
    expect(document.activeElement).toBe(items()[0]);

    press('End');
    expect(document.activeElement).toBe(items()[2]);
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    const { fixture, el, trigger, press } = setup();
    await open(fixture, trigger);

    press('Escape');
    fixture.detectChanges();

    expect(el.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('opens with ArrowDown from the closed trigger', async () => {
    const { fixture, el, press } = setup();
    press('ArrowDown');
    fixture.detectChanges();
    expect(el.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('lets Tab leave without dragging focus back to the trigger', async () => {
    const { fixture, el, trigger, press } = setup();
    await open(fixture, trigger);

    press('Tab');
    fixture.detectChanges();

    // The menu closes, but focus is left alone so the browser's own Tab moves it onward.
    expect(el.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).not.toBe(trigger);
  });
});
