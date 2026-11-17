import { useCallback, useEffect, useState } from 'react';
import { Activity, BarChart3, Gauge, KeyRound, PlugZap, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSeo } from '../lib/seo';
import { Notice, Skeleton } from '../components/ui';
import type { Overview } from './admin/types';
import OverviewTab from './admin/OverviewTab';
import UsersTab from './admin/UsersTab';
import ActivityTab from './admin/ActivityTab';
import IntegrationsTab from './admin/IntegrationsTab';
import LimitsTab from './admin/LimitsTab';
import AccountTab from './admin/AccountTab';

type Tab = 'overview' | 'users' | 'activity' | 'integrations' | 'limits' | 'account';
const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'limits', label: 'Limits', icon: Gauge },
  { id: 'account', label: 'Account', icon: KeyRound },
];

export default function AdminPage() {
  useSeo({ title: 'Admin | LeadForge', noindex: true });
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // One shared load of the aggregate numbers, reused by Overview and Users.
  const reload = useCallback(async () => {
    const { data: d, error: e } = await supabase.rpc('admin_overview');
    if (e) setError(e.message); else { setData(d as Overview); setError(null); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const needsData = tab === 'overview' || tab === 'users';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold">Admin panel</h1>
        <p className="mt-1 text-sm text-ink/70">Manage customers, integrations and limits for LeadForge.</p>
      </header>

      <div role="tablist" aria-label="Admin sections" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} aria-controls={`panel-${id}`} id={`tab-${id}`}
            onClick={() => setTab(id)}
            className={`-mb-px inline-flex min-h-[2.75rem] items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-bold transition ${
              tab === id ? 'border-moss text-moss' : 'border-transparent text-ink/65 hover:text-ink'}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="animate-fade-up">
        {needsData && error && (
          <Notice n={{ kind: 'error', text: 'Could not load admin data.', detail: `${error}. Run the latest supabase/schema.sql in the SQL Editor.` }} />
        )}
        {needsData && !error && !data && (
          <div className="space-y-2" aria-busy="true"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>
        )}
        {tab === 'overview' && data && <OverviewTab data={data} />}
        {tab === 'users' && data && <UsersTab data={data} reload={reload} />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'integrations' && <IntegrationsTab />}
        {tab === 'limits' && <LimitsTab />}
        {tab === 'account' && <AccountTab />}
      </div>
    </div>
  );
}
