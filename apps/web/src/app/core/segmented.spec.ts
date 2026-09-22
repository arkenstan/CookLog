import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SegmentOption, UiSegmented } from '@cooklog/ui';

@Component({
  imports: [UiSegmented],
  template: `
    <ui-segmented
      label="Your availability"
      [options]="options"
      [disabled]="disabled()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly options: SegmentOption[] = [
    { value: 'in', label: 'In' },
    { value: 'out', label: 'Out' },
  ];
  readonly value = signal<string | null>('in');
  readonly disabled = signal(false);
}

describe('UiSegmented keyboard contract', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const radios = () => [...el.querySelectorAll<HTMLElement>('[role="radio"]')];
    const press = (key: string) => {
      el.querySelector('ui-segmented')!.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
      fixture.detectChanges();
    };
    return { fixture, el, radios, press, host: fixture.componentInstance };
  }

  it('is a single tab stop, landing on the checked option', () => {
    const { radios } = setup();
    expect(radios().map((r) => r.getAttribute('tabindex'))).toEqual(['0', '-1']);
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });

  it('puts the tab stop on the first option when nothing is chosen', () => {
    const { fixture, radios, host } = setup();
    host.value.set(null);
    fixture.detectChanges();
    expect(radios().map((r) => r.getAttribute('tabindex'))).toEqual(['0', '-1']);
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'false']);
  });

  it('selects the next option with ArrowRight and wraps around', () => {
    const { press, host } = setup();
    press('ArrowRight');
    expect(host.value()).toBe('out');

    press('ArrowRight');
    expect(host.value()).toBe('in');
  });

  it('selects the previous option with ArrowLeft', () => {
    const { press, host } = setup();
    press('ArrowLeft');
    expect(host.value()).toBe('out');
  });

  it('jumps with Home and End', () => {
    const { press, host } = setup();
    press('End');
    expect(host.value()).toBe('out');

    press('Home');
    expect(host.value()).toBe('in');
  });

  it('moves focus along with the selection', () => {
    const { press, radios } = setup();
    press('ArrowRight');
    expect(document.activeElement).toBe(radios()[1]);
  });

  it('ignores arrow keys while disabled', () => {
    const { fixture, press, host } = setup();
    host.disabled.set(true);
    fixture.detectChanges();

    press('ArrowRight');
    expect(host.value()).toBe('in');
  });
});
