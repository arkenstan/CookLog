import { EnvironmentProviders, inject, provideEnvironmentInitializer } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Moves focus to the main landmark after each in-app navigation, so a keyboard or screen
 * reader user lands on the new page instead of being stranded wherever the old one left them.
 * The first navigation is skipped — nothing has moved yet on a fresh load.
 */
export function provideRouteFocus(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const router = inject(Router);
    let first = true;
    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (first) {
          first = false;
          return;
        }
        document.getElementById('main-content')?.focus({ preventScroll: true });
      });
  });
}
