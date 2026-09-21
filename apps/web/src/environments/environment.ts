/** Local development: Supabase CLI stack (`pnpm db:start`). The publishable key is public by design. */
export const environment = {
  production: false,
  supabase: {
    url: 'http://127.0.0.1:54321',
    key: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  },
};
