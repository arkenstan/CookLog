import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { AuthStore, provideSupabase } from '@cooklog/data-access';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideSupabase(environment.supabase),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    // Restore the session (and profile) before the first navigation so guards see real state.
    provideAppInitializer(() => inject(AuthStore).init()),
  ],
};
