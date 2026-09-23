import { Route } from '@angular/router';
import { routes } from './app.routes';
import { homeRedirectGuard, noHouseholdGuard, noProfileGuard } from './core/guards';

/**
 * Regression cover for a blank page after sign-in: `homeRedirectGuard` was correct but
 * unreachable, because the AppShell route also matches '' and claimed it first, rendering
 * the shell around an empty outlet.
 */
describe('app routes', () => {
  const emptyPathRedirect = routes.findIndex((r) => r.path === '' && r.pathMatch === 'full');
  const shell = routes.findIndex((r) => r.path === '' && r.component);

  it('routes "" through homeRedirectGuard', () => {
    expect(emptyPathRedirect).toBeGreaterThanOrEqual(0);
    expect(routes[emptyPathRedirect].canActivate).toContain(homeRedirectGuard);
  });

  it('puts that redirect ahead of the shell, which also matches ""', () => {
    expect(shell).toBeGreaterThanOrEqual(0);
    expect(emptyPathRedirect).toBeLessThan(shell);
  });

  it('has no empty-path child that would swallow "" inside the shell', () => {
    expect(routes[shell].children?.some((c) => c.path === '')).toBe(false);
  });

  it('sends unknown paths back through the same redirect', () => {
    expect(routes.find((r) => r.path === '**')?.redirectTo).toBe('');
  });

  describe('sign-in and setup', () => {
    const auth = routes.find((r) => r.path === 'auth') as Route;
    const onboarding = routes.find((r) => r.path === 'onboarding') as Route;
    const child = (parent: Route, path: string) =>
      parent.children?.find((c) => c.path === path) as Route;

    it('has no register route: Google SSO is the only way in', () => {
      expect(child(auth, 'register')).toBeUndefined();
      expect(child(auth, 'login')).toBeDefined();
    });

    /**
     * Regression cover for a redirect loop: with noHouseholdGuard on the parent, a user who
     * has a household but no username bounces off 'profile' straight back to '' and around.
     */
    it('gates the household step, not the whole onboarding tree, on having no household', () => {
      expect(onboarding.canActivate).not.toContain(noHouseholdGuard);
      expect(child(onboarding, '').canActivate).toContain(noHouseholdGuard);
    });

    it('puts username setup behind noProfileGuard', () => {
      expect(child(onboarding, 'profile').canActivate).toContain(noProfileGuard);
    });
  });
});
