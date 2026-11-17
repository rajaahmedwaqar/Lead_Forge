import { authenticate, cors, isResponse, reply } from '../_shared/http.ts';
import { callN8n, webhookUrl } from '../_shared/n8n.ts';

// Customers send mail only through this function: it checks the lead belongs to the caller and
// that the recipient is that lead's saved address, so it cannot be used as an open mail relay.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await authenticate(req);
    if (isResponse(caller)) return caller;
    const { admin, userId } = caller;

    const b = await req.json().catch(() => ({}));
    const subject = String(b.subject ?? '').trim().slice(0, 300);
    const html = String(b.html ?? '').trim().slice(0, 20000);
    if (!b.lead_id || !subject || !html) return reply({ error: 'lead_id, subject and html are required.' });

    const { data: lead } = await admin.from('leads').select('id, name, email').eq('id', b.lead_id).eq('user_id', userId).maybeSingle();
    if (!lead) return reply({ error: 'Lead not found.' });
    if (!lead.email) return reply({ error: 'This lead has no email address.' });

    const url = await webhookUrl(admin);
    if (!url) return reply({ error: 'Email sending is not configured yet. Ask the administrator to set the n8n webhook URL.' });

    const r = await callN8n(url, {
      type: 'send_outreach', source: 'LeadForge', timestamp: new Date().toISOString(),
      to: lead.email, subject, html, lead_id: lead.id, lead_name: lead.name,
    });
    if (!r.ok) return reply({ error: r.message, detail: r.detail });

    await admin.from('leads').update({ stage: 'Contacted', contacted_at: new Date().toISOString() }).eq('id', lead.id);
    return reply({ ok: true, to: lead.email });
  } catch (e) {
    return reply({ error: `send-outreach crashed: ${(e as Error).message}` });
  }
});
