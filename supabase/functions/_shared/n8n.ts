import type { serviceClient } from './http.ts';

/** The webhook URL is kept server-side: admin-set value in app_settings, else the N8N_WEBHOOK_URL secret. */
export async function webhookUrl(admin: ReturnType<typeof serviceClient>): Promise<string | null> {
  const { data } = await admin.from('app_settings').select('value').eq('key', 'n8n_webhook_url').maybeSingle();
  return (data?.value || Deno.env.get('N8N_WEBHOOK_URL') || '').trim() || null;
}

export interface N8nResult { ok: boolean; message: string; status?: number; ms?: number; detail?: string }

/** POST to the n8n webhook and translate every failure mode into a plain-language result. */
export async function callN8n(url: string, payload: Record<string, unknown>): Promise<N8nResult> {
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    const timeout = (e as Error).name === 'TimeoutError' || (e as Error).name === 'AbortError';
    return timeout
      ? { ok: false, message: 'n8n took too long to respond.', detail: 'No reply within 30s. Check n8n > Executions.' }
      : { ok: false, message: 'Unable to connect to n8n.',
          detail: `The request failed before any reply (${(e as Error).message}). n8n may be offline, or the URL is not reachable from the internet (localhost URLs only work for local development).` };
  }
  const ms = Date.now() - started;
  const text = await res.text();
  let json: { ok?: boolean; error?: string } | null = null;
  try { json = JSON.parse(text); } catch (_) { /* not JSON */ }

  if (res.status === 404) {
    return { ok: false, status: 404, ms, message: 'n8n could not find the webhook.',
      detail: 'The workflow is not Active, or the URL is wrong. Use the Production URL (contains /webhook/, not /webhook-test/).' };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, ms, message: 'n8n received the request, but the workflow failed.',
      detail: `HTTP ${res.status}. Open n8n > Executions to see which node failed. ${text.slice(0, 200)}` };
  }
  if (json && json.ok === false) {
    return { ok: false, status: res.status, ms, message: 'n8n received the request, but Gmail could not send the email.',
      detail: `Check the Gmail credential on the "Send via Gmail" node. ${json.error ?? ''}` };
  }
  if (!json || json.ok !== true) {
    return { ok: false, status: res.status, ms, message: 'n8n answered, but did not confirm the request.',
      detail: `Re-import n8n/leadforge-send-outreach.json (it must reply {"ok": true}). Reply was: ${text.slice(0, 200)}` };
  }
  return { ok: true, status: res.status, ms, message: 'n8n confirmed the request.' };
}
