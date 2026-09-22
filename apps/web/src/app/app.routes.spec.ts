import { routes } from './app.routes';
import { homeRedirectGuard } from './core/guards';

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
});
