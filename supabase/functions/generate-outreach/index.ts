import { authenticate, cors, isResponse, reply } from '../_shared/http.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Ctx { lead: any; services: any[]; sender: string }

const offerOf = (services: any[]) => {
  const s = services[0];
  return s ? `${s.name}${s.description ? ` (${s.description})` : ''}` : 'digital marketing and content support';
};

/** Fill {{placeholders}} in the customer's own template. Values are HTML-escaped. */
function fill(tpl: string, { lead, services, sender }: Ctx): string {
  const v: Record<string, string> = {
    business_name: lead.name ?? '', category: lead.category ?? 'your industry', address: lead.address ?? '',
    service: offerOf(services), sender_name: sender,
  };
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in v ? esc(v[k]) : m));
}

const toHtml = (text: string) =>
  /<(p|br|div)\b/i.test(text)
    ? text
    : text.split(/\n{2,}/).map((p) => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`).join('');

function defaultTemplate(ctx: Ctx) {
  const { lead, sender } = ctx;
  return {
    subject: `Quick idea for ${lead.name}`,
    body:
      `<p>Hi ${esc(lead.name)} team,</p>` +
      `<p>I came across ${esc(lead.name)}${lead.address ? ` in ${esc(lead.address)}` : ''} and thought I could help with ${esc(offerOf(ctx.services))}.</p>` +
      `<p>If it would be useful, I can send over a couple of specific ideas for your business. Just reply and let me know.</p>` +
      `<p>Best regards,<br>${esc(sender)}</p>`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const caller = await authenticate(req);
  if (isResponse(caller)) return caller;

  let lead: any = {}, services: any[] = [], mode = 'ai';
  try {
    const b = await req.json();
    lead = b.lead ?? {}; services = Array.isArray(b.services) ? b.services.slice(0, 10) : []; mode = b.mode === 'template' ? 'template' : 'ai';
  } catch (_) {
    return reply({ error: 'Invalid request body.' });
  }
  if (!lead.name) return reply({ error: 'lead.name is required.' });

  // Signature and template come from the caller's own saved profile, never from the request.
  const p = caller.profile;
  const sender = p.sender_name || p.display_name || 'The LeadForge team';
  const ctx: Ctx = { lead, services, sender };
  const customSubject = (p.email_subject_template ?? '').trim();
  const customBody = (p.email_body_template ?? '').trim();

  if (mode === 'template') {
    if (!customBody) return reply({ error: 'You have not saved an email template yet. Add one on your Profile page.' });
    return reply({
      subject: fill(customSubject || 'Quick idea for {{business_name}}', ctx),
      body: toHtml(fill(customBody, ctx)),
      source: 'your-template',
    });
  }

  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return reply({ ...defaultTemplate(ctx), source: 'template', note: 'ANTHROPIC_API_KEY not set, used a simple template.' });

  try {
    const svc = services.length
      ? services.map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ''}`).join('\n')
      : '- General digital marketing and content help';
    const style = customBody ? `\nMatch the tone and structure of this example written by the sender:\n"""\n${customBody.slice(0, 1500)}\n"""\n` : '';
    const prompt =
      `Write a short, personalised cold outreach email to a local business.\n\n` +
      `Business: ${lead.name}\nCategory: ${lead.category ?? 'n/a'}\nAddress: ${lead.address ?? 'n/a'}\n` +
      `Website: ${lead.website ?? 'n/a'}\nGoogle rating: ${lead.rating ?? 'n/a'} (${lead.reviews ?? 0} reviews)\n\n` +
      `Services I offer (pick the ONE best fit):\n${svc}\n${style}\n` +
      `Rules: 90-130 words, friendly and specific to this business, one soft call to action (reply to this email), ` +
      `no hype, no placeholders, no invented facts. Sign off as ${sender}.\n` +
      `Return ONLY JSON: {"subject":"...","body":"<p>...</p>"} where body is simple HTML paragraphs.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-4-5',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    const text: string = j.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    if (!parsed.subject || !parsed.body) throw new Error('Claude returned an unexpected format.');
    return reply({ subject: parsed.subject, body: parsed.body, source: 'claude' });
  } catch (e) {
    return reply({ ...defaultTemplate(ctx), source: 'template', note: `Claude unavailable (${(e as Error).message}); used a simple template.` });
  }
});
