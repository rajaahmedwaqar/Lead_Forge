import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Send, Sparkles, X } from 'lucide-react';
import { STAGES } from '../types';
import type { Lead, Service, Stage } from '../types';
import { describeError, generateOutreach, isValidEmail, sendOutreach } from '../lib/api';
import { sanitizeHtml } from '../lib/sanitize';
import { Notice, Spinner } from './ui';
import type { NoticeData } from './ui';

interface Props {
  lead: Lead;
  services: Service[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Lead>) => Promise<void>;
  onSent: () => void;
}

type Busy = '' | 'email' | 'notes' | 'stage' | 'draft' | 'template' | 'send';
const SAVE_FAIL = 'Unable to save the lead. Please try again.';

export default function LeadDrawer({ lead, services, onClose, onUpdate, onSent }: Props) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [subject, setSubject] = useState(lead.draft_subject ?? '');
  const [body, setBody] = useState(lead.draft_body ?? '');
  const [busy, setBusy] = useState<Busy>('');
  const [msg, setMsg] = useState<NoticeData | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const preview = useMemo(() => sanitizeHtml(body), [body]);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // One operation at a time: blocks double clicks and shows a single loading state.
  const run = async (which: Busy, fallback: string, fn: () => Promise<NoticeData | void>) => {
    if (busy) return;
    setBusy(which);
    setMsg(null);
    try {
      const r = await fn();
      if (r) setMsg(r);
    } catch (e) {
      setMsg({ kind: 'error', ...describeError(e, fallback) });
    } finally {
      setBusy('');
    }
  };

  const saveEmail = () => run('email', SAVE_FAIL, async () => {
    const v = email.trim();
    if (!isValidEmail(v)) return { kind: 'error', text: 'Please enter a valid email address.' };
    await onUpdate(lead.id, { email: v });
    setEditing(false);
    return { kind: 'ok', text: 'Email saved.' };
  });

  const saveNotes = () => run('notes', SAVE_FAIL, async () => {
    await onUpdate(lead.id, { notes: notes.trim() || null });
    return { kind: 'ok', text: 'Notes saved.' };
  });

  const setStage = (s: Stage) => run('stage', SAVE_FAIL, () => onUpdate(lead.id, { stage: s }));

  const draft = (mode: 'ai' | 'template') => run(mode === 'ai' ? 'draft' : 'template', 'Unable to generate the email draft. Please try again.', async () => {
    const d = await generateOutreach(lead, services.filter((s) => s.is_active), mode);
    setSubject(d.subject);
    setBody(d.body);
    await onUpdate(lead.id, { draft_subject: d.subject, draft_body: d.body });
    if (d.source === 'claude') return { kind: 'ok', text: 'Draft written by Claude.' };
    if (d.source === 'your-template') return { kind: 'ok', text: 'Draft created from your saved template.' };
    return { kind: 'info', text: 'Draft created from the simple template (Claude is not configured).', detail: d.note };
  });

  const send = () => run('send', 'Unable to send email. Please check your n8n connection.', async () => {
    if (!lead.email) return { kind: 'error', text: 'Add an email address for this lead first.' };
    if (!subject.trim() || !body.trim()) return { kind: 'error', text: 'Write or generate a subject and message first.' };
    // The server verifies ownership, sends via n8n, and only moves the stage if n8n confirmed.
    const r = await sendOutreach({ lead_id: lead.id, subject: subject.trim(), html: body });
    onSent();
    return { kind: 'ok', text: `Email request sent successfully to ${r.to}. Stage moved to Contacted.` };
  });

  return (
    <>
      <div className="fixed inset-0 z-[1900] bg-black/40 animate-fade-up" onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label={`Lead: ${lead.name}`}
        className="fixed inset-y-0 right-0 z-[2000] flex w-full max-w-xl animate-slide-in flex-col border-l border-line bg-surface shadow-pop">
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-extrabold">{lead.name}</h2>
            <p className="text-sm text-ink/65">{lead.category ?? ''}{lead.category && lead.address ? ', ' : ''}{lead.address ?? ''}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close lead panel" className="btn-ghost h-10 w-10 shrink-0 !px-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {lead.phone && <span>Phone: <a className="font-bold underline" href={`tel:${lead.phone}`}>{lead.phone}</a></span>}
            {lead.rating != null && <span>Rating: <b>{lead.rating}</b> ({lead.reviews ?? 0} reviews)</span>}
            {lead.website && <a className="font-bold text-moss underline" href={lead.website} target="_blank" rel="noreferrer noopener">Website</a>}
          </div>

          <div>
            <label htmlFor="stage" className="label">Stage</label>
            <select id="stage" value={lead.stage} disabled={busy !== ''} onChange={(e) => void setStage(e.target.value as Stage)} className="input">
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <span className="label">Email</span>
            {editing ? (
              <div className="space-y-2">
                <label className="sr-only" htmlFor="lead-email">Email address</label>
                <input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@business.com" className="input" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => void saveEmail()} disabled={busy !== ''} className="btn-primary">
                    {busy === 'email' && <Spinner />} Save email
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setMsg(null); }} disabled={busy !== ''} className="btn-outline">Cancel</button>
                </div>
              </div>
            ) : lead.email ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                <span className="min-w-0 break-all font-semibold">{lead.email}</span>
                <button type="button" onClick={() => { setEmail(lead.email ?? ''); setMsg(null); setEditing(true); }} disabled={busy !== ''}
                  className="font-bold text-moss underline disabled:opacity-50">Change</button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-line px-3 py-2">
                <span className="text-ink/65">No email found</span>
                <button type="button" onClick={() => { setEmail(''); setMsg(null); setEditing(true); }} disabled={busy !== ''} className="btn-primary !min-h-[36px] !py-1">Add email</button>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="label">Notes</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" />
            <button type="button" onClick={() => void saveNotes()} disabled={busy !== ''} className="btn-outline mt-1.5 !min-h-[36px] !py-1">
              {busy === 'notes' && <Spinner />} Save notes
            </button>
          </div>

          <div className="space-y-3 rounded-xl bg-paper p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-extrabold">Outreach email</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void draft('template')} disabled={busy !== ''} className="btn-outline !min-h-[36px] !py-1">
                  {busy === 'template' ? <Spinner /> : <FileText className="h-4 w-4" aria-hidden="true" />} My template
                </button>
                <button type="button" onClick={() => void draft('ai')} disabled={busy !== ''} className="btn-primary !min-h-[36px] !py-1">
                  {busy === 'draft' ? <Spinner /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                  {busy === 'draft' ? 'Writing...' : 'Write draft'}
                </button>
              </div>
            </div>
            <label className="sr-only" htmlFor="subject">Subject</label>
            <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="input" />
            <label className="sr-only" htmlFor="body">Message (HTML)</label>
            <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="Message (HTML)" className="input font-mono text-xs" />
            {body && (
              <div className="rounded-lg border border-line bg-surface p-3">
                <div className="mb-1 text-xs font-bold text-ink/55">Preview</div>
                <div className="text-sm [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: preview }} />
              </div>
            )}
            <button type="button" onClick={() => void send()} disabled={busy !== '' || !lead.email}
              className="btn w-full bg-ink text-paper hover:opacity-90">
              {busy === 'send' ? <Spinner /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {busy === 'send' ? 'Sending email...' : 'Send email'}
            </button>
            {!lead.email && <p className="text-xs text-ink/65">Add an email address above to enable sending.</p>}
          </div>

          <Notice n={msg} />
        </div>
      </aside>
    </>
  );
}
