import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type CookLogClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  key: string;
  /** Where Google sends the user back. Must be in the project's redirect allow-list. */
  redirectTo?: string;
}

export const SUPABASE = new InjectionToken<CookLogClient>('SUPABASE');
/** Injected rather than read off `window` so specs can set it. */
export const SUPABASE_REDIRECT_TO = new InjectionToken<string>('SUPABASE_REDIRECT_TO');

export function provideSupabase(config: SupabaseConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SUPABASE, useFactory: () => createClient<Database>(config.url, config.key) },
    {
      provide: SUPABASE_REDIRECT_TO,
      useFactory: () => config.redirectTo ?? `${globalThis.location.origin}/`,
    },
  ]);
}
