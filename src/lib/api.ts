import { supabase } from './supabase';
import type { Lead, Service } from '../types';

/** An error with a plain-language message for the user and technical detail kept separately. */
export class FriendlyError extends Error {
  detail?: string;
  constructor(message: string, detail?: string) {
    super(message);
    this.detail = detail;
  }
}

/** Logs the full error to the console; returns the short message (and detail) to show. */
export function describeError(e: unknown, fallback: string): { text: string; detail?: string } {
  console.error('[LeadForge]', e);
  if (e instanceof FriendlyError) return { text: e.message, detail: e.detail };
  return { text: fallback, detail: (e as Error)?.message };
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** Calls an Edge Function with the signed-in user's token and turns every failure into a FriendlyError. */
async function invoke<T>(fn: string, body: Record<string, unknown>, friendly: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let detail = error.message;
    if (/Failed to send a request/i.test(detail)) {
      detail = `The "${fn}" Edge Function is not deployed to this Supabase project, or the URL in .env is wrong. Run deploy.ps1.`;
    } else {
      try {
        const ctx = (error as unknown as { context?: Response }).context;
        const j = ctx ? await ctx.json() : null;
        if (j?.error) detail = String(j.error);
        else if (j?.message) detail = String(j.message);
      } catch (_) { /* keep default */ }
    }
    throw new FriendlyError(friendly, detail);
  }
  const d = data && typeof data === 'object' ? (data as { error?: string; detail?: string }) : {};
  if (d.error) throw new FriendlyError(friendly, [d.error, d.detail].filter(Boolean).join(' '));
  return data as T;
}

export interface SearchResult {
  search_id: string; found: number; added: number; status: 'complete' | 'empty' | 'partial'; note?: string | null;
}

export function searchLeads(keyword: string, location: string) {
  return invoke<SearchResult>('search-leads', { keyword, location }, 'Unable to retrieve leads. Please try again.');
}

export interface Draft { subject: string; body: string; source: 'claude' | 'template' | 'your-template'; note?: string }

export function generateOutreach(lead: Lead, services: Service[], mode: 'ai' | 'template') {
  return invoke<Draft>('generate-outreach', {
    mode,
    lead: {
      name: lead.name, category: lead.category, address: lead.address,
      website: lead.website, rating: lead.rating, reviews: lead.reviews,
    },
    services: services.map((s) => ({ name: s.name, description: s.description })),
  }, 'Unable to generate the email draft. Please try again.');
}

export function sendOutreach(p: { lead_id: string; subject: string; html: string }) {
  return invoke<{ ok: true; to: string }>('send-outreach', p, 'Unable to send email. Please check your n8n connection.');
}

// ---- Admin only (the Edge Function re-checks the role; this is not the security boundary) ----
export interface Check { id: string; label: string; ok: boolean; message: string; detail?: string; ms?: number }

export function runDiagnostics(action: 'run_all' | 'test_n8n') {
  return invoke<{ checks: Check[] }>('admin-diagnostics', { action }, 'Diagnostics could not run.');
}

// ---- Customer actions backed by SQL functions (RLS applies) ----
export async function resetSearches() {
  const { data, error } = await supabase.rpc('reset_my_searches');
  if (error) throw new Error(error.message);
  return data as { searches_deleted: number; leads_deleted: number };
}

export async function deleteSearch(id: string) {
  const { data, error } = await supabase.rpc('delete_search', { p_search: id });
  if (error) throw new Error(error.message);
  return data as { leads_deleted: number };
}
