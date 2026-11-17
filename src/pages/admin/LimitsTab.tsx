import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getSettings, saveSettings } from '../../lib/settings';
import { Spinner, useToast } from '../../components/ui';

export default function LimitsTab() {
  const toast = useToast();
  const [maxResults, setMaxResults] = useState('20');
  const [daily, setDaily] = useState('0');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings(['max_results_per_search', 'daily_search_limit']).then((s) => {
      if (s.max_results_per_search) setMaxResults(s.max_results_per_search);
      if (s.daily_search_limit) setDaily(s.daily_search_limit);
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const m = Math.round(Number(maxResults));
    const d = Math.round(Number(daily));
    if (!(m >= 1 && m <= 40)) { toast({ kind: 'error', text: 'Results per search must be between 1 and 40.' }); return; }
    if (!(d >= 0 && d <= 1000)) { toast({ kind: 'error', text: 'Daily limit must be between 0 and 1000.' }); return; }
    setSaving(true);
    try { await saveSettings({ max_results_per_search: String(m), daily_search_limit: String(d) }); toast({ kind: 'ok', text: 'Limits saved. They apply to the next search.' }); }
    catch (e2) { toast({ kind: 'error', text: 'Could not save the limits.', detail: (e2 as Error).message }); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={(e) => void save(e)} className="card max-w-2xl space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="font-extrabold">Search limits</h2>
        <p className="mt-1 text-sm text-ink/70">Each search uses your Apify credit. These limits protect it. They are enforced on the server for every customer.</p>
      </div>
      <div>
        <label htmlFor="max" className="label">Businesses per search (1 to 40)</label>
        <input id="max" type="number" min={1} max={40} className="input sm:max-w-[12rem]" value={maxResults} onChange={(e) => setMaxResults(e.target.value)} disabled={!loaded} />
      </div>
      <div>
        <label htmlFor="daily" className="label">Searches per customer per 24 hours</label>
        <input id="daily" type="number" min={0} max={1000} className="input sm:max-w-[12rem]" value={daily} onChange={(e) => setDaily(e.target.value)} disabled={!loaded} />
        <p className="mt-1 text-xs text-ink/60">0 means unlimited.</p>
      </div>
      <button type="submit" className="btn-primary" disabled={saving || !loaded}>{saving && <Spinner />} Save limits</button>
    </form>
  );
}
