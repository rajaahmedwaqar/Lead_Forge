import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Search } from '../types';

/** The signed-in user's search history. Row-level security guarantees it is only their own. */
export function useSearches() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('lead_searches').select('*').order('created_at', { ascending: false });
    if (error) { console.error('[LeadForge] load searches', error); setError(error.message); }
    else { setSearches((data ?? []) as Search[]); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { searches, loading, error, refresh };
}
