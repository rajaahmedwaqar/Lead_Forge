import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configError: string | null =
  !url || !key ? 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in the .env file. Add them and restart npm.cmd run dev.' : null;

// The anon key is public by design; what a signed-in user may read or write is decided by RLS.
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
