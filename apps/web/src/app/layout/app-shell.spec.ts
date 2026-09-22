import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthStore } from '@cooklog/data-access';
import { AppShell } from './app-shell';

@Component({ template: '' })
class Blank {}

describe('AppShell', () => {
  const signOut = vi.fn(async () => ({ error: null }));

  function setup(role: 'resident' | 'cook' = 'resident') {
    signOut.mockClear();
    TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([
          { path: 'home', component: Blank },
          { path: 'grocery', component: Blank },
          { path: 'regulars', component: Blank },
        ]),
        {
          provide: AuthStore,
          useValue: {
            role: signal(role),
            household: signal({ id: 'h1', name: 'Flat 3B', invite_code: 'abc123' }),
            households: signal([{ id: 'h1', name: 'Flat 3B' }]),
            activeHouseholdId: signal('h1'),
            switchHousehold: vi.fn(async () => ({ error: null })),
            signOut,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const moreMenu = () => el.querySelector<HTMLElement>('button[aria-label="Account and settings"]')!;
    return { fixture, el, moreMenu };
  }

  it('offers a skip link that targets the main landmark', () => {
    const { el } = setup();
    const skip = el.querySelector<HTMLAnchorElement>('a[href="#main-content"]');
    expect(skip?.textContent?.trim()).toBe('Skip to content');

    const main = el.querySelector('main');
    expect(main?.id).toBe('main-content');
    // Programmatically focusable, so the skip link actually lands somewhere.
    expect(main?.getAttribute('tabindex')).toBe('-1');
  });

  it('gives the page a top-level heading', () => {
    const { el } = setup();
    expect(el.querySelector('h1')?.textContent).toContain('CookLog');
  });

  it('marks the current nav item with aria-current, not just colour', async () => {
    const { fixture, el } = setup();
    await TestBed.inject(Router).navigateByUrl('/grocery');
    fixture.detectChanges();

    const current = [...el.querySelectorAll('nav[aria-label="Main"] a')].filter(
      (a) => a.getAttribute('aria-current') === 'page',
    );
    expect(current).toHaveLength(1);
    expect(current[0].textContent?.trim()).toBe('Grocery');
  });

  it('collects invite code, theme and sign out into the more menu', async () => {
    const { fixture, el, moreMenu } = setup();
    // Nothing loose in the header any more.
    expect(el.textContent).not.toContain('abc123');

    moreMenu().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = [...el.querySelectorAll('[role="menuitem"]')].map((r) => r.textContent?.trim());
    expect(rows.some((r) => r?.includes('Copy invite code') && r?.includes('abc123'))).toBe(true);
    expect(rows.some((r) => r?.includes('theme'))).toBe(true);
    expect(rows.some((r) => r === 'Sign out')).toBe(true);
  });

  it('names the theme action by what it will do', async () => {
    const { fixture, el, moreMenu } = setup();
    moreMenu().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const theme = [...el.querySelectorAll('[role="menuitem"]')].find((r) =>
      r.textContent?.includes('theme'),
    )!;
    // Dark is the default, so the offer is to switch to light.
    expect(theme.textContent?.trim()).toBe('Switch to light theme');
    // No aria-label fighting the visible text.
    expect(theme.getAttribute('aria-label')).toBeNull();
  });

  it('signs out and returns to the login page', async () => {
    const { fixture, el, moreMenu } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    moreMenu().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const out = [...el.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (r) => r.textContent?.trim() === 'Sign out',
    )!;
    out.click();
    await fixture.whenStable();

    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/auth/login');
  });

  it('announces the invite code copy politely', async () => {
    const { fixture, el, moreMenu } = setup();
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } });

    moreMenu().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const copy = [...el.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((r) =>
      r.textContent?.includes('Copy invite code'),
    )!;
    copy.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const live = el.querySelector('[role="status"][aria-live="polite"]');
    expect(live?.textContent).toContain('abc123');
  });

  it('shows the bottom nav to residents only', () => {
    expect(setup('resident').el.querySelector('app-bottom-nav')).not.toBeNull();
    TestBed.resetTestingModule();
    expect(setup('cook').el.querySelector('app-bottom-nav')).toBeNull();
  });
});
