import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, Router, UrlTree } from '@angular/router';
import { AuthStore, UserRole } from '@cooklog/data-access';
import {
  authGuard,
  guestGuard,
  homeRedirectGuard,
  householdGuard,
  noHouseholdGuard,
  roleGuard,
} from './guards';

interface State {
  signedIn: boolean;
  household: boolean;
  role: UserRole | null;
}

/** Runs a guard against a fake AuthStore; returns `true` or the redirect URL. */
function run(guard: CanActivateFn, s: State): true | string {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthStore,
        useValue: {
          isAuthenticated: signal(s.signedIn),
          hasHousehold: signal(s.household),
          role: signal(s.role),
        },
      },
    ],
  });
  const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  if (result === true) return true;
  return TestBed.inject(Router).serializeUrl(result as UrlTree);
}

const out: State = { signedIn: false, household: false, role: null };
const noHome: State = { signedIn: true, household: false, role: 'resident' };
const resident: State = { signedIn: true, household: true, role: 'resident' };
const cook: State = { signedIn: true, household: true, role: 'cook' };

describe('route guards', () => {

  it('authGuard sends signed-out users to login', () => {
    expect(run(authGuard, out)).toBe('/auth/login');
    expect(run(authGuard, resident)).toBe(true);
  });

  it('guestGuard bounces signed-in users to /', () => {
    expect(run(guestGuard, out)).toBe(true);
    expect(run(guestGuard, resident)).toBe('/');
  });

  it('householdGuard / noHouseholdGuard gate on membership', () => {
    expect(run(householdGuard, noHome)).toBe('/onboarding');
    expect(run(householdGuard, resident)).toBe(true);
    expect(run(noHouseholdGuard, noHome)).toBe(true);
    expect(run(noHouseholdGuard, resident)).toBe('/');
  });

  it('roleGuard only admits the matching role', () => {
    expect(run(roleGuard('resident'), resident)).toBe(true);
    expect(run(roleGuard('resident'), cook)).toBe('/');
    expect(run(roleGuard('cook'), resident)).toBe('/');
    expect(run(roleGuard('cook'), cook)).toBe(true);
  });

  it('homeRedirectGuard routes by auth, household and role', () => {
    expect(run(homeRedirectGuard, out)).toBe('/auth/login');
    expect(run(homeRedirectGuard, noHome)).toBe('/onboarding');
    expect(run(homeRedirectGuard, resident)).toBe('/home');
    expect(run(homeRedirectGuard, cook)).toBe('/kitchen');
  });
});
