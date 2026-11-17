import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { useServices } from '../hooks/useServices';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { describeError, resetSearches } from '../lib/api';
import { useSeo } from '../lib/seo';
import { ConfirmDialog, Notice, Skeleton, Spinner, Switch, Tooltip, useToast } from '../components/ui';
import type { Lead } from '../types';

const PLACEHOLDERS = ['{{business_name}}', '{{category}}', '{{address}}', '{{service}}', '{{sender_name}}'];

export default function ProfilePage() {
  useSeo({ title: 'Profile | LeadForge', noindex: true });
  const toast = useToast();
  const { profile, session, saveProfile } = useAuth();
  const { services, loading: servicesLoading, error, add, toggle, remove } = useServices();
  const [leadCount, setLeadCount] = useState<number | null>(null);

  const [name, setName] = useState(profile?.display_name ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [sender, setSender] = useState(profile?.sender_name ?? '');
  const [subjectTpl, setSubjectTpl] = useState(profile?.email_subject_template ?? '');
  const [bodyTpl, setBodyTpl] = useState(profile?.email_body_template ?? '');
  const [saving, setSaving] = useState<'' | 'profile' | 'template'>('');

  const [svcName, setSvcName] = useState('');
  const [desc, setDesc] = useState('');
  const [target, setTarget] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void supabase.from('leads').select('id', { count: 'exact', head: true })
      .then(({ count }) => setLeadCount(count ?? 0));
  }, []);

  const guard = async (fn: () => Promise<void>) => {
    setErr(null);
    try { await fn(); } catch (e) { setErr((e as Error).message); }
  };

  const submitService = (e: FormEvent) => {
    e.preventDefault();
    if (!svcName.trim()) return;
    void guard(async () => {
      await add(svcName.trim(), desc.trim(), target.trim());
      setSvcName(''); setDesc(''); setTarget('');
      toast({ kind: 'ok', text: 'Service added.' });
    });
  };

  const save = async (which: 'profile' | 'template', e: FormEvent) => {
    e.preventDefault();
    setSaving(which);
    try {
      await saveProfile(which === 'profile'
        ? { display_name: name.trim() || null, company: company.trim() || null, sender_name: sender.trim() || null }
        : { email_subject_template: subjectTpl.trim() || null, email_body_template: bodyTpl.trim() || null });
      toast({ kind: 'ok', text: which === 'profile' ? 'Profile saved.' : 'Email template saved.' });
    } catch (e2) {
      toast({ kind: 'error', ...describeError(e2, 'Could not save. Please try again.') });
    } finally {
      setSaving('');
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      // The spreadsheet library is only downloaded when someone actually exports.
      const [XLSX, { data, error: qErr }] = await Promise.all([
        import('xlsx'),
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
      ]);
      if (qErr) throw new Error(qErr.message);
      const rows = ((data ?? []) as Lead[]).map((l) => ({
        Name: l.name, Category: l.category, Address: l.address, Phone: l.phone, Email: l.email,
        Website: l.website, Rating: l.rating, Reviews: l.reviews, Stage: l.stage, Notes: l.notes,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Leads');
      XLSX.writeFile(wb, 'leadforge-leads.xlsx');
    } catch (e) {
      toast({ kind: 'error', ...describeError(e, 'Export failed. Please try again.') });
    } finally {
      setExporting(false);
    }
  };

  const doReset = async () => {
    setResetting(true);
    try {
      const r = await resetSearches();
      setLeadCount(0);
      setConfirmReset(false);
      toast({ kind: 'ok', text: `Deleted ${r.searches_deleted} searches and ${r.leads_deleted} leads.` });
    } catch (e) {
      toast({ kind: 'error', ...describeError(e, 'Could not reset your search history.') });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Profile</h1>
        <p className="mt-1 text-sm text-ink/70">Signed in as {session?.user.email}</p>
      </header>

      <section className="card p-4 sm:p-5" aria-labelledby="p-details">
        <h2 id="p-details" className="font-extrabold">Your details</h2>
        <form onSubmit={(e) => void save('profile', e)} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="pn" className="label">Name</label><input id="pn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
          <div><label htmlFor="pc" className="label">Company</label><input id="pc" className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} /></div>
          <div className="sm:col-span-2">
            <label htmlFor="ps" className="label">Email signature name</label>
            <input id="ps" className="input" value={sender} onChange={(e) => setSender(e.target.value)} maxLength={80} placeholder="Used to sign your outreach emails" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={saving !== ''}>{saving === 'profile' && <Spinner />} Save details</button>
          </div>
        </form>
      </section>

      <section aria-labelledby="p-services" className="space-y-3">
        <div>
          <h2 id="p-services" className="text-lg font-extrabold">Services you offer</h2>
          <p className="mt-1 text-sm text-ink/70">
            Active services appear as quick picks in the search bar and are the only ones considered when a draft email is written.
          </p>
        </div>
        {(err || error) && <Notice n={{ kind: 'error', text: err ?? error ?? '' }} />}

        <form onSubmit={submitService} className="card grid gap-2 p-4 md:grid-cols-2">
          <div><label htmlFor="sn" className="sr-only">Service name</label><input id="sn" value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="Service name" className="input" /></div>
          <div><label htmlFor="st" className="sr-only">Who to search for</label><input id="st" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Who to search for" className="input" /></div>
          <div className="md:col-span-2"><label htmlFor="sd" className="sr-only">Description</label><input id="sd" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="One line on what you deliver" className="input" /></div>
          <button type="submit" disabled={!svcName.trim()} className="btn-primary md:col-span-2">Add service</button>
        </form>

        <ul className="space-y-2">
          {servicesLoading && [0, 1].map((i) => <li key={i}><Skeleton className="h-16" /></li>)}
          {services.map((s) => (
            <li key={s.id} className="card flex items-center justify-between gap-3 p-3">
              <div className={`min-w-0 transition-opacity ${s.is_active ? '' : 'opacity-50'}`}>
                <div className="font-bold">{s.name}</div>
                <div className="text-sm text-ink/70">
                  {s.description}{s.description && s.target_keyword ? ' | ' : ''}{s.target_keyword ? `Targets: ${s.target_keyword}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch checked={s.is_active} label={`${s.name} is ${s.is_active ? 'on' : 'off'}`} onChange={() => void guard(() => toggle(s))} />
                <Tooltip text="Delete service">
                  <button type="button" onClick={() => void guard(() => remove(s.id))} aria-label={`Delete ${s.name}`}
                    className="grid h-10 w-10 place-items-center rounded-lg text-ink/50 hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            </li>
          ))}
          {!servicesLoading && !services.length && <li className="text-sm text-ink/65">No services yet. Add the first one above.</li>}
        </ul>
      </section>

      <section className="card p-4 sm:p-5" aria-labelledby="p-template">
        <h2 id="p-template" className="font-extrabold">Email template</h2>
        <p className="mt-1 text-sm text-ink/70">
          Used by the &quot;My template&quot; button on a lead, and as a style guide for AI drafts. Placeholders:{' '}
          {PLACEHOLDERS.map((p) => <code key={p} className="mr-1 rounded bg-moss-light px-1 py-0.5 text-xs">{p}</code>)}
        </p>
        <form onSubmit={(e) => void save('template', e)} className="mt-3 space-y-3">
          <div><label htmlFor="ts" className="label">Subject</label><input id="ts" className="input" value={subjectTpl} onChange={(e) => setSubjectTpl(e.target.value)} maxLength={200} placeholder="Quick idea for {{business_name}}" /></div>
          <div><label htmlFor="tb" className="label">Message</label><textarea id="tb" className="input" rows={8} value={bodyTpl} onChange={(e) => setBodyTpl(e.target.value)} maxLength={4000}
            placeholder={'Hi {{business_name}} team,\n\nI help {{category}} businesses with {{service}}...\n\nBest,\n{{sender_name}}'} /></div>
          <button type="submit" className="btn-primary" disabled={saving !== ''}>{saving === 'template' && <Spinner />} Save template</button>
        </form>
      </section>

      <section className="card p-4 sm:p-5" aria-labelledby="p-data">
        <h2 id="p-data" className="font-extrabold">Your data</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line p-3">
            <h3 className="font-bold">Export</h3>
            <p className="mb-3 text-sm text-ink/70">Download all {leadCount ?? '...'} leads as an Excel file.</p>
            <button type="button" onClick={() => void exportExcel()} disabled={!leadCount || exporting} className="btn-outline">
              {exporting ? <Spinner /> : <Download className="h-4 w-4" aria-hidden="true" />} Export to Excel
            </button>
          </div>
          <div className="rounded-lg border border-danger/40 p-3">
            <h3 className="font-bold text-danger">Reset search history</h3>
            <p className="mb-3 text-sm text-ink/70">Deletes every search and all of its leads. This cannot be undone.</p>
            <button type="button" onClick={() => setConfirmReset(true)} disabled={!leadCount && leadCount !== null} className="btn-danger">Reset all searches</button>
          </div>
        </div>
      </section>

      <ConfirmDialog open={confirmReset} busy={resetting} onCancel={() => setConfirmReset(false)} onConfirm={() => void doReset()}
        title="Reset all searches?" confirmLabel="Yes, delete everything"
        body={<>This permanently deletes <b>all your searches and {leadCount ?? 'all'} leads</b>, including notes, stages and drafts.</>} />
    </div>
  );
}
