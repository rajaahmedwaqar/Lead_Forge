import { authenticate, cors, isResponse, reply } from '../_shared/http.ts';
import { callN8n, webhookUrl } from '../_shared/n8n.ts';

interface Check { id: string; label: string; ok: boolean; message: string; detail?: string; ms?: number }

// Administrator only (enforced by authenticate(adminOnly) from the verified JWT + profiles.role).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await authenticate(req, { adminOnly: true });
    if (isResponse(caller)) return caller;
    const { admin } = caller;
    const { action } = await req.json().catch(() => ({ action: 'run_all' }));

    const n8n = async (): Promise<Check> => {
      const url = await webhookUrl(admin);
      if (!url) return { id: 'n8n', label: 'n8n webhook', ok: false, message: 'No webhook URL configured.',
        detail: 'Set it in Admin > Settings, or run: supabase secrets set N8N_WEBHOOK_URL=...' };
      const r = await callN8n(url, { type: 'leadforge_test', source: 'LeadForge', timestamp: new Date().toISOString() });
      return { id: 'n8n', label: 'n8n webhook', ok: r.ok, message: r.ok ? 'n8n answered. No email was sent.' : r.message, detail: r.detail, ms: r.ms };
    };
    if (action === 'test_n8n') return reply({ checks: [await n8n()] });

    const checks: Check[] = [];

    let t = Date.now();
    const { error: dbErr } = await admin.from('profiles').select('id', { count: 'exact', head: true });
    checks.push({ id: 'db', label: 'Supabase database', ok: !dbErr, ms: Date.now() - t,
      message: dbErr ? 'Database query failed.' : 'Database reachable and schema installed.',
      detail: dbErr ? `${dbErr.message}. Run supabase/schema.sql in the SQL Editor.` : undefined });

    const token = Deno.env.get('APIFY_TOKEN');
    if (!token) {
      checks.push({ id: 'apify', label: 'Apify', ok: false, message: 'APIFY_TOKEN secret is not set.',
        detail: 'Run: npx.cmd supabase secrets set APIFY_TOKEN=your_token' });
    } else {
      t = Date.now();
      try {
        const r = await fetch('https://api.apify.com/v2/users/me', {
          headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000),
        });
        const j = r.ok ? (await r.json()).data : null;
        checks.push({ id: 'apify', label: 'Apify', ok: r.ok, ms: Date.now() - t,
          message: r.ok ? `Token valid (account: ${j?.username ?? 'unknown'}).` : `Apify rejected the token (HTTP ${r.status}).`,
          detail: r.ok ? undefined : 'Create a new token at console.apify.com and set it again.' });
      } catch (e) {
        checks.push({ id: 'apify', label: 'Apify', ok: false, message: 'Could not reach Apify.', detail: (e as Error).message });
      }
    }

    checks.push(Deno.env.get('ANTHROPIC_API_KEY')
      ? { id: 'claude', label: 'Claude drafts', ok: true, message: 'ANTHROPIC_API_KEY is set.' }
      : { id: 'claude', label: 'Claude drafts', ok: false, message: 'ANTHROPIC_API_KEY is not set.',
          detail: 'Optional. Without it, drafts use the built-in template.' });

    checks.push(await n8n());
    return reply({ checks });
  } catch (e) {
    return reply({ error: `admin-diagnostics crashed: ${(e as Error).message}` });
  }
});
