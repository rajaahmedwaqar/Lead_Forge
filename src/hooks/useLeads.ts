import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead } from '../types';

/** Leads belonging to ONE search session. searchId null = "new search", nothing shown. */
export function useLeads(searchId: string | null) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const ticket = ++latest.current;
    if (!searchId) { setLeads([]); setError(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from('search_leads').select('leads(*)').eq('search_id', searchId);
    if (ticket !== latest.current) return; // a newer request replaced this one
    if (error) { console.error('[LeadForge] load leads', error); setError(error.message); setLeads([]); }
    else {
      const rows = ((data ?? []) as unknown as { leads: Lead | null }[])
        .map((r) => r.leads)
        .filter((l): l is Lead => !!l)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      setLeads(rows);
      setError(null);
    }
    setLoading(false);
  }, [searchId]);

  // Drop the previous search's leads immediately so they can never be shown under the new search.
  useEffect(() => { setLeads([]); void refresh(); }, [refresh]);

  const update = useCallback(async (id: string, patch: Partial<Lead>) => {
    const { error } = await supabase.from('leads').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  return { leads, loading, error, refresh, update };
}
