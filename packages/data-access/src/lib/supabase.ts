import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type CookLogClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  key: string;
}

export const SUPABASE = new InjectionToken<CookLogClient>('SUPABASE');

export function provideSupabase(config: SupabaseConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SUPABASE, useFactory: () => createClient<Database>(config.url, config.key) },
  ]);
}
