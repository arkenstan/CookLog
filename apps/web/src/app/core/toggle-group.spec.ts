import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ZardToggleGroupComponent, ZardToggleGroupItem } from '@cooklog/ui';

@Component({
  imports: [ZardToggleGroupComponent],
  template: `
    <z-toggle-group
      zMode="single"
      zLabel="Your availability"
      [items]="items"
      [disabled]="disabled()"
      [value]="value()"
      (valueChange)="value.set($any($event))"
    />
  `,
})
class Host {
  readonly items: ZardToggleGroupItem[] = [
    { value: 'in', label: 'In' },
    { value: 'out', label: 'Out' },
  ];
  readonly value = signal('in');
  readonly disabled = signal(false);
}

describe('ZardUI toggle group, as the app uses it', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => [...el.querySelectorAll<HTMLButtonElement>('[role="group"] button')];
    return { fixture, el, buttons, host: fixture.componentInstance };
  }

  // zLabel is our patch: upstream leaves role="group" with no accessible name.
  it('gives the group an accessible name', () => {
    const { el } = setup();
    expect(el.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Your availability');
  });

  it('reflects the selected option with aria-pressed', () => {
    const { buttons } = setup();
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  });

  it('selects a single option at a time', () => {
    const { fixture, buttons, host } = setup();
    buttons()[1].click();
    fixture.detectChanges();

    expect(host.value()).toBe('out');
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  });

  it('disables every option when the group is disabled', () => {
    const { fixture, buttons, host } = setup();
    host.disabled.set(true);
    fixture.detectChanges();

    expect(buttons().every((b) => b.disabled)).toBe(true);
  });
});
