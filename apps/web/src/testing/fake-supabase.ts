/**
 * Minimal Supabase stand-in for store specs. Every builder call returns the same thenable chain;
 * awaiting it yields the canned result for the last operation (select/insert/update/delete).
 */
export interface FakeOptions {
  /** Rows returned by plain selects, per table. */
  tables?: Record<string, unknown[]>;
  /** Result of a mutation on any table (default: one row affected). */
  mutation?: { data: unknown[] | null; error: { message: string; code?: string } | null };
  /** Results by RPC name. */
  rpc?: Record<string, { data: unknown; error: { message: string } | null }>;
}

export function fakeSupabase(options: FakeOptions = {}) {
  const calls: { table: string; op: string; args: unknown }[] = [];
  const mutation = options.mutation ?? { data: [{}], error: null };

  const query = (table: string) => {
    let op = 'select';
    const chain: Record<string, unknown> = {};
    const record = (name: string) => (args?: unknown) => {
      op = name;
      calls.push({ table, op, args });
      return chain;
    };
    for (const name of ['insert', 'update', 'delete']) chain[name] = record(name);
    for (const name of ['select', 'eq', 'in', 'order', 'gte', 'single']) chain[name] = () => chain;
    chain['then'] = (resolve: (v: unknown) => void) =>
      resolve(op === 'select' ? { data: options.tables?.[table] ?? [], error: null } : mutation);
    return chain;
  };

  return {
    calls,
    from: query,
    rpc: async (name: string) => options.rpc?.[name] ?? { data: null, error: null },
  };
}
