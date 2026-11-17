import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Service } from '../types';

export function useServices() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from('service_offers').select('*').order('created_at', { ascending: true });
    if (error) setError(error.message);
    else { setServices((data ?? []) as Service[]); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const add = async (name: string, description: string, target_keyword: string) => {
    const { error } = await supabase.from('service_offers').insert({
      user_id: userId, name, description: description || null, target_keyword: target_keyword || null,
    });
    if (error) throw new Error(error.message);
    await refresh();
  };
  const toggle = async (s: Service) => {
    const { error } = await supabase.from('service_offers').update({ is_active: !s.is_active }).eq('id', s.id);
    if (error) throw new Error(error.message);
    setServices((xs) => xs.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)));
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('service_offers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setServices((xs) => xs.filter((x) => x.id !== id));
  };

  return { services, loading, error, add, toggle, remove };
}
