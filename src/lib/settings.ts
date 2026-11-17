import { supabase } from './supabase';

/** Admin-only key/value settings (RLS rejects anyone else). */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('app_settings').select('key, value').in('key', keys);
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((r) => [r.key as string, (r.value as string | null) ?? '']));
}

export async function saveSettings(values: Record<string, string>) {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value: value || null, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from('app_settings').upsert(rows);
  if (error) throw new Error(error.message);
}
