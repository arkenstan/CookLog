import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore, UserRole } from '@cooklog/data-access';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/auth/login']);
};

/** Login/register are for signed-out users only. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return !auth.isAuthenticated() || inject(Router).createUrlTree(['/']);
};

export const householdGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.hasHousehold() || inject(Router).createUrlTree(['/onboarding']);
};

export const noHouseholdGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return !auth.hasHousehold() || inject(Router).createUrlTree(['/']);
};

export const roleGuard =
  (role: UserRole): CanActivateFn =>
  () => {
    const auth = inject(AuthStore);
    return auth.role() === role || inject(Router).createUrlTree(['/']);
  };

/** `/` sends everyone to the right place for their state. */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  if (!auth.hasHousehold()) return router.createUrlTree(['/onboarding']);
  return router.createUrlTree([auth.role() === 'cook' ? '/kitchen' : '/home']);
};
