import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, CheckCircle2, PlugZap, XCircle } from 'lucide-react';
import { describeError, runDiagnostics } from '../../lib/api';
import type { Check } from '../../lib/api';
import { getSettings, saveSettings } from '../../lib/settings';
import { Notice, Spinner, useToast } from '../../components/ui';

function CheckRow({ c }: { c: Check }) {
  return (
    <li className="flex gap-3 rounded-lg border border-line p-3">
      {c.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-moss" aria-label="Passed" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-label="Failed" />}
      <div className="min-w-0">
        <div className="font-bold">{c.label}{c.ms != null && <span className="ml-2 text-xs font-medium text-ink/55">{c.ms} ms</span>}</div>
        <div className="text-sm">{c.message}</div>
        {c.detail && <div className="mt-0.5 break-words text-xs text-ink/65">{c.detail}</div>}
      </div>
    </li>
  );
}

export default function IntegrationsTab() {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<'' | 'n8n' | 'all'>('');
  const [n8nResult, setN8nResult] = useState<Check | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [err, setErr] = useState<ReturnType<typeof describeError> | null>(null);

  useEffect(() => {
    getSettings(['n8n_webhook_url']).then((s) => setUrl(s.n8n_webhook_url ?? '')).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const v = url.trim();
    if (v && !/^https?:\/\//i.test(v)) { toast({ kind: 'error', text: 'The webhook URL must start with http:// or https://' }); return; }
    setSaving(true);
    try { await saveSettings({ n8n_webhook_url: v }); toast({ kind: 'ok', text: 'Webhook URL saved. Now press Test webhook.' }); }
    catch (e2) { toast({ kind: 'error', text: 'Could not save the URL.', detail: (e2 as Error).message }); }
    finally { setSaving(false); }
  };

  const run = async (which: 'n8n' | 'all') => {
    if (busy) return;
    setBusy(which);
    setErr(null);
    try {
      const r = await runDiagnostics(which === 'all' ? 'run_all' : 'test_n8n');
      if (which === 'n8n') setN8nResult(r.checks[0] ?? null); else setChecks(r.checks);
    } catch (e) {
      setErr(describeError(e, 'Diagnostics could not run.'));
    } finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      {err && <Notice n={{ kind: 'error', text: err.text, detail: err.detail }} />}
      <div className="grid gap-5 lg:grid-cols-2">
      <section className="card space-y-3 p-4 sm:p-5" aria-labelledby="n8n-title">
        <h2 id="n8n-title" className="font-extrabold">Email sending (n8n webhook)</h2>
        <p className="text-sm text-ink/70">
          Customers send email through this n8n workflow. Use the <b>Production</b> URL (contains <code>/webhook/</code>) of an
          <b> Active</b> workflow. It must be reachable from the internet, and is never sent to customers&apos; browsers.
        </p>
        <form onSubmit={(e) => void save(e)} className="space-y-3">
          <div>
            <label htmlFor="wh" className="label">Webhook URL</label>
            <input id="wh" className="input" value={url} onChange={(e) => setUrl(e.target.value)} disabled={!loaded}
              placeholder="https://your-n8n.example.com/webhook/leadforge-send" inputMode="url" autoComplete="off" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={saving || !loaded}>{saving && <Spinner />} Save URL</button>
            <button type="button" className="btn-outline" onClick={() => void run('n8n')} disabled={busy !== ''}>
              {busy === 'n8n' ? <Spinner /> : <PlugZap className="h-4 w-4" aria-hidden="true" />} Test webhook
            </button>
          </div>
        </form>
        <p className="text-xs text-ink/60">The test sends a harmless ping. No email is sent. Save the URL first.</p>
        {n8nResult && <ul><CheckRow c={n8nResult} /></ul>}
        <p className="text-xs text-ink/60">Workflow file: <code>n8n/leadforge-send-outreach.json</code> (import it into n8n, attach a Gmail credential, activate it).</p>
      </section>

      <section className="card space-y-3 p-4 sm:p-5" aria-labelledby="health-title">
        <h2 id="health-title" className="font-extrabold">Service health</h2>
        <p className="text-sm text-ink/70">Checks the database, the Apify token, the Claude key and the n8n webhook from the server.</p>
        <button type="button" className="btn-primary" onClick={() => void run('all')} disabled={busy !== ''}>
          {busy === 'all' ? <Spinner /> : <Activity className="h-4 w-4" aria-hidden="true" />} Run all checks
        </button>
        <ul className="space-y-2">
          {checks?.map((c) => <CheckRow key={c.id} c={c} />)}
          {!checks && <li className="text-sm text-ink/60">Not run yet.</li>}
        </ul>
        <p className="text-xs text-ink/60">
          Secrets (<code>APIFY_TOKEN</code>, <code>ANTHROPIC_API_KEY</code>) are set with <code>supabase secrets set</code>, never in this panel.
        </p>
      </section>
      </div>
    </div>
  );
}
