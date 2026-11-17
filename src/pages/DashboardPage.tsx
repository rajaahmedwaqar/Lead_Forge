import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopSearchBar from '../components/TopSearchBar';
import SearchHistory from '../components/SearchHistory';
import StageStats from '../components/StageStats';
import LeadMap from '../components/LeadMap';
import LeadTable from '../components/LeadTable';
import LeadDrawer from '../components/LeadDrawer';
import { ConfirmDialog, Notice, Spinner, useToast } from '../components/ui';
import type { NoticeData } from '../components/ui';
import { useLeads } from '../hooks/useLeads';
import { useSearches } from '../hooks/useSearches';
import { useServices } from '../hooks/useServices';
import { deleteSearch, describeError, resetSearches, searchLeads } from '../lib/api';
import { categoryFor } from '../lib/categories';
import { configError } from '../lib/supabase';
import { useSeo } from '../lib/seo';
import type { Search, Stage } from '../types';

export default function DashboardPage() {
  useSeo({ title: 'Leads | LeadForge', noindex: true });
  const toast = useToast();
  const { searches, loading: searchesLoading, error: searchesError, refresh: refreshSearches } = useSearches();
  const { services } = useServices();
  const [activeId, setActiveId] = useState<string | null>(null); // null = new search
  const { leads, loading, error, update, refresh: refreshLeads } = useLeads(activeId);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeData | null>(null);
  const [filter, setFilter] = useState<Stage | 'All'>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirm, setConfirm] = useState<{ kind: 'all' } | { kind: 'one'; search: Search } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // After a reload, open the most recent search once.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || searchesLoading) return;
    opened.current = true;
    if (searches.length) setActiveId(searches[0].id);
  }, [searchesLoading, searches]);

  const active = searches.find((s) => s.id === activeId) ?? null;
  const category = useMemo(() => (active ? categoryFor(active.keyword) : null), [active]);
  const picks = useMemo(
    () => services.filter((s) => s.is_active).map((s) => s.target_keyword || s.name),
    [services],
  );
  const visible = useMemo(() => (filter === 'All' ? leads : leads.filter((l) => l.stage === filter)), [leads, filter]);
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const openSearch = useCallback((id: string | null) => {
    setActiveId(id);
    setSelectedId(null);
    setFilter('All');
    setNotice(null);
  }, []);
  const startNew = () => { openSearch(null); setFormKey((k) => k + 1); };

  const onSearch = async (keyword: string, location: string) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await searchLeads(keyword, location);
      // Always switch to the search that just ran, even if it found nothing, so older leads are never shown for it.
      await refreshSearches();
      openSearch(r.search_id);
      if (r.found === 0) {
        setNotice({ kind: 'info', text: r.note ?? 'No businesses found. Try a broader keyword or a bigger city.' });
      } else {
        const text = `Found ${r.found} businesses: ${r.added} new, ${r.found - r.added} already saved (kept with their stage and notes).`;
        setNotice({ kind: r.status === 'partial' ? 'info' : 'ok', text: r.note ? `${text} ${r.note}` : text });
        toast({ kind: 'ok', text: `${r.found} leads found for "${keyword}"` });
      }
    } catch (e) {
      // The previous search stays selected, but the failure is explicit and never looks like "no results".
      setNotice({ kind: 'error', ...describeError(e, 'Unable to retrieve leads. Please try again.') });
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.kind === 'all') {
        const r = await resetSearches();
        toast({ kind: 'ok', text: `Deleted ${r.searches_deleted} searches and ${r.leads_deleted} leads.` });
        startNew();
      } else {
        await deleteSearch(confirm.search.id);
        toast({ kind: 'ok', text: 'Search deleted.' });
        if (confirm.search.id === activeId) startNew();
      }
      await refreshSearches();
      setConfirm(null);
    } catch (e) {
      toast({ kind: 'error', ...describeError(e, 'Could not delete. Please try again.') });
    } finally {
      setDeleting(false);
    }
  };

  const loadError = error ?? searchesError;
  const emptyText = activeId
    ? (active?.note ?? 'No leads in this search yet.')
    : 'No leads yet. Type what you are looking for and a city above, then press Find leads.';

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Leads dashboard</h1>
      {configError && <Notice n={{ kind: 'error', text: configError }} />}
      <TopSearchBar key={formKey} busy={busy} picks={picks} onSearch={onSearch} />
      {busy && (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-moss-dark">
          <Spinner /> Searching Google Maps and looking for emails. This can take up to two minutes.
        </p>
      )}
      <Notice n={notice} />
      {loadError && (
        <Notice n={{ kind: 'error', text: 'Unable to load your data. Please try again.',
          detail: `${loadError}. If this mentions a missing table or function, run supabase/schema.sql in the Supabase SQL Editor.` }} />
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <SearchHistory searches={searches} activeId={activeId} loading={searchesLoading} disabled={busy}
            onPick={openSearch}
            onDelete={(s) => setConfirm({ kind: 'one', search: s })} onResetAll={() => setConfirm({ kind: 'all' })} />
          <StageStats leads={leads} active={filter} onPick={setFilter} />
        </div>
        <LeadMap leads={visible} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {active && (
        <p className="text-sm text-ink/70">
          Showing <b>{visible.length}</b> {category?.label.toLowerCase()} leads for <b>{active.keyword}</b> in <b>{active.location}</b>.
        </p>
      )}
      <LeadTable leads={visible} category={category} loading={loading} emptyText={emptyText} selectedId={selectedId} onSelect={setSelectedId} />

      {selected && (
        <LeadDrawer key={selected.id} lead={selected} services={services} onUpdate={update}
          onSent={() => void refreshLeads()} onClose={() => setSelectedId(null)} />
      )}

      <ConfirmDialog
        open={!!confirm} busy={deleting} onCancel={() => setConfirm(null)} onConfirm={() => void doDelete()}
        title={confirm?.kind === 'all' ? 'Reset all searches?' : 'Delete this search?'}
        confirmLabel={confirm?.kind === 'all' ? 'Yes, delete everything' : 'Delete search'}
        body={confirm?.kind === 'all'
          ? <>This permanently deletes <b>all {searches.length} searches</b> and every lead found by them, including notes, stages and email drafts. This cannot be undone.</>
          : <>This deletes the search <b>{confirm?.kind === 'one' ? `${confirm.search.keyword} in ${confirm.search.location}` : ''}</b> and the leads that no other search contains. This cannot be undone.</>}
      />
    </div>
  );
}
