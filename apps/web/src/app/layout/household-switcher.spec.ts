import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { HouseholdSwitcher } from './household-switcher';

describe('HouseholdSwitcher', () => {
  const switchHousehold = vi.fn(async () => ({ error: null }));

  function setup() {
    switchHousehold.mockClear();
    TestBed.configureTestingModule({
      imports: [HouseholdSwitcher],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            households: signal([
              { id: 'h1', name: 'Flat 3B' },
              { id: 'h2', name: 'Parents' },
            ]),
            activeHouseholdId: signal('h1'),
            household: signal({ id: 'h1', name: 'Flat 3B' }),
            switchHousehold,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(HouseholdSwitcher);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el };
  }

  it('shows the active household and lists all households after opening', async () => {
    const { fixture, el } = setup();
    expect(el.querySelector('button')?.textContent).toContain('Flat 3B');
    expect(el.querySelector('[role="menu"]')).toBeNull();

    el.querySelector('button')!.click();
    fixture.detectChanges();

    const items = [...el.querySelectorAll('[role="menuitem"]')].map((i) => i.textContent?.trim());
    expect(items[0]).toContain('Flat 3B');
    expect(items[1]).toContain('Parents');
    expect(items.at(-1)).toContain('Join or create household');
  });

  it('switches household and closes the menu', async () => {
    const { fixture, el } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    el.querySelector('button')!.click();
    fixture.detectChanges();
    (el.querySelectorAll('[role="menuitem"]')[1] as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(switchHousehold).toHaveBeenCalledWith('h2');
    expect(navigate).toHaveBeenCalledWith('/');
    expect(el.querySelector('[role="menu"]')).toBeNull();
  });
});
