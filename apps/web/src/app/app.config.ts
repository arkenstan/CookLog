import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { AuthStore, provideSupabase } from '@cooklog/data-access';
import { provideZard } from '@cooklog/ui';
import { environment } from '../environments/environment';
import { provideRouteFocus } from './core/focus';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // ZardUI event-modifier plugins: enables (keydown.enter.prevent) syntax in its templates.
    provideZard(),
    provideSupabase(environment.supabase),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideRouteFocus(),
    // Restore the session (and profile) before the first navigation so guards see real state.
    provideAppInitializer(() => inject(AuthStore).init()),
  ],
};
