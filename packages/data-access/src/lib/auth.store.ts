import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { Session } from '@supabase/supabase-js';
import type { ActionResult, Household, Profile, UserRole } from './models';
import { SUPABASE } from './supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  /** Every household the user belongs to. */
  households: Household[];
  /** True once the persisted session has been restored (guards wait for this). */
  initialized: boolean;
}

const initialState: AuthState = { session: null, profile: null, households: [], initialized: false };

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ session, profile, households }) => ({
    userId: computed(() => session()?.user.id ?? null),
    isAuthenticated: computed(() => session() !== null),
    role: computed<UserRole | null>(() => profile()?.role ?? null),
    activeHouseholdId: computed(() => profile()?.active_household_id ?? null),
    hasHousehold: computed(() => profile()?.active_household_id != null),
    /** The household the UI is currently showing. */
    household: computed(
      () => households().find((h) => h.id === profile()?.active_household_id) ?? null,
    ),
  })),
  withMethods((store, client = inject(SUPABASE)) => {
    async function loadProfile(): Promise<void> {
      const uid = store.userId();
      if (!uid) return;
      const [{ data: profile }, { data: households }] = await Promise.all([
        client.from('profiles').select('*').eq('id', uid).maybeSingle(),
        client.from('households').select('*').order('name'),
      ]);
      patchState(store, { profile, households: households ?? [] });
    }

    const clear = () => patchState(store, { session: null, profile: null, households: [] });

    return {
      /** Restores the persisted session and starts listening for auth changes. */
      async init(): Promise<void> {
        const { data } = await client.auth.getSession();
        patchState(store, { session: data.session });
        await loadProfile();
        patchState(store, { initialized: true });

        client.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            clear();
          } else if (event === 'SIGNED_IN' && session?.user.id !== store.profile()?.id) {
            patchState(store, { session });
            // Deferred: supabase-js must not be re-entered from inside this callback.
            setTimeout(() => void loadProfile());
          }
        });
      },

      async signIn(email: string, password: string): Promise<ActionResult> {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        patchState(store, { session: data.session });
        await loadProfile();
        return { error: null };
      },

      async signUp(input: {
        name: string;
        email: string;
        password: string;
        role: UserRole;
      }): Promise<ActionResult> {
        const { data, error } = await client.auth.signUp({
          email: input.email,
          password: input.password,
          options: { data: { name: input.name, role: input.role } },
        });
        if (error) return { error: error.message };
        if (!data.session) return { error: null, needsConfirmation: true };
        patchState(store, { session: data.session });
        await loadProfile();
        return { error: null };
      },

      async signOut(): Promise<void> {
        await client.auth.signOut();
        clear();
      },

      /** Creates a household (residents only) and makes it the active one. */
      async createHousehold(name: string): Promise<ActionResult> {
        const { error } = await client.rpc('create_household', { p_name: name });
        if (error) return { error: error.message };
        await loadProfile();
        return { error: null };
      },

      /** Joins by invite code and makes that household the active one. */
      async joinHousehold(code: string): Promise<ActionResult> {
        const { error } = await client.rpc('join_household', { p_code: code });
        if (error) return { error: error.message };
        await loadProfile();
        return { error: null };
      },

      async switchHousehold(householdId: string): Promise<ActionResult> {
        if (householdId === store.activeHouseholdId()) return { error: null };
        const { error } = await client.rpc('set_active_household', { p_household: householdId });
        if (error) return { error: error.message };
        await loadProfile();
        return { error: null };
      },
    };
  }),
);
