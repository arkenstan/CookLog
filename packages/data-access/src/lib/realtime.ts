import type { CookLogClient } from './supabase';

/**
 * Calls `onChange` (debounced) whenever any of the tables change. Row visibility is
 * enforced by RLS, so events only arrive for the caller's own household.
 * Returns an unsubscribe function.
 */
export function watchTables(
  client: CookLogClient,
  name: string,
  tables: string[],
  onChange: () => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fire = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 150);
  };

  const channel = client.channel(name);
  for (const table of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire);
  }
  channel.subscribe();

  return () => {
    clearTimeout(timer);
    void client.removeChannel(channel);
  };
}
