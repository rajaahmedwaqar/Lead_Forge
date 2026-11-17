import { authenticate, cors, isResponse, reply } from '../_shared/http.ts';
import { ApifyError, scrapePlaces } from '../_shared/apify.ts';

const EMAIL_BUDGET_MS = 20_000;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}/g;
const BAD_EMAIL = /\.(png|jpe?g|gif|svg|webp|css|js|woff2?)$|sentry|wixpress|example\.|domain\.|yourname|@2x/i;

async function findEmail(website: string | null | undefined, deadline: number): Promise<string | null> {
  if (!website) return null;
  const base = website.startsWith('http') ? website : `https://${website}`;
  for (const path of ['', '/contact']) {
    const left = deadline - Date.now();
    if (left < 500) return null;
    try {
      const res = await fetch(new URL(path, base).toString(), {
        signal: AbortSignal.timeout(Math.min(4000, left)),
        headers: { 'User-Agent': 'Mozilla/5.0 (LeadForge)' },
      });
      if (!res.ok) continue;
      const html = (await res.text()).slice(0, 400000);
      const found = (html.match(EMAIL_RE) ?? []).filter((e) => !BAD_EMAIL.test(e));
      if (found.length) return found[0].toLowerCase();
    } catch (_) { /* try next path */ }
  }
  return null;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

// Stable identity for a business: Google place ID, else normalised name + address.
const keyOf = (p: any): string =>
  p.placeId ?? `${String(p.title).trim().toLowerCase()}|${String(p.address ?? '').trim().toLowerCase()}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await authenticate(req);
    if (isResponse(caller)) return caller;
    const { admin, userId: user_id } = caller;

    const body = await req.json().catch(() => ({}));
    const keyword = String(body.keyword ?? '').trim().slice(0, 120);
    const location = String(body.location ?? '').trim().slice(0, 120);
    if (!keyword || !location) return reply({ error: 'keyword and location are required.' });

    // Admin-controlled limits (Admin > Limits). Missing settings fall back to safe defaults.
    const { data: cfg } = await admin.from('app_settings').select('key, value')
      .in('key', ['max_results_per_search', 'daily_search_limit']);
    const setting = (k: string) => Number(cfg?.find((r: any) => r.key === k)?.value);
    const max = Math.min(Math.max(setting('max_results_per_search') || 20, 1), 40);
    const dailyLimit = setting('daily_search_limit') || 0; // 0 = unlimited
    if (dailyLimit > 0 && caller.role !== 'admin') {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await admin.from('lead_searches').select('id', { count: 'exact', head: true })
        .eq('user_id', user_id).gte('created_at', since);
      if ((count ?? 0) >= dailyLimit) {
        return reply({ error: `You have reached the limit of ${dailyLimit} searches per 24 hours. Try again later.` });
      }
    }

    const token = Deno.env.get('APIFY_TOKEN');
    if (!token) return reply({ error: 'APIFY_TOKEN secret is not set. Run: npx.cmd supabase secrets set APIFY_TOKEN=your_token' });

    let scraped;
    try {
      scraped = await scrapePlaces(token, keyword, location, max);
    } catch (e) {
      if (e instanceof ApifyError) return reply({ error: e.message });
      throw e;
    }

    const byKey = new Map<string, any>();
    for (const p of scraped.places) if (p && p.title && !p.permanentlyClosed) byKey.set(keyOf(p), p);
    const keys = [...byKey.keys()];

    // An empty result is still a search: it gets its own history entry, so the dashboard
    // switches to it instead of silently leaving the previous search's leads on screen.
    const note = keys.length === 0
      ? 'No businesses found. Try a broader keyword or a bigger city.'
      : scraped.partial ? 'Google Maps was slow, so only part of the results were collected. Search again for more.' : null;
    const status = keys.length === 0 ? 'empty' : scraped.partial ? 'partial' : 'complete';

    const { data: search, error: sErr } = await admin.from('lead_searches')
      .insert({ user_id, keyword, location, result_count: keys.length, status, note, apify_run_id: scraped.runId })
      .select('id').single();
    if (sErr) return reply({ error: `Could not create the search session (did you run supabase/schema.sql?): ${sErr.message}` });
    if (!keys.length) return reply({ search_id: search.id, found: 0, added: 0, status, note, apify_status: scraped.status });

    // Which of these businesses does THIS user already have? They are re-used, never duplicated.
    const { data: existing, error: eErr } = await admin
      .from('leads').select('id, place_id, email').eq('user_id', user_id).in('place_id', keys);
    if (eErr) return reply({ error: `Database error: ${eErr.message}` });
    const have = new Map<string, any>((existing ?? []).map((r: any) => [r.place_id, r]));

    // Only look for emails on new leads, or saved leads that still have none.
    const todo = keys.filter((k) => !have.get(k)?.email);
    const deadline = Date.now() + EMAIL_BUDGET_MS;
    const found = await mapLimit(todo, 10, (k) => findEmail(byKey.get(k).website, deadline));
    const emailFor = new Map<string, string | null>(todo.map((k, i) => [k, found[i]]));

    const fresh = keys.filter((k) => !have.has(k)).map((k) => {
      const p = byKey.get(k);
      return {
        user_id, search_id: search.id, place_id: k,
        name: p.title, category: p.categoryName ?? null, address: p.address ?? null,
        phone: p.phone ?? null, website: p.website ?? null, email: emailFor.get(k) ?? null,
        rating: p.totalScore ?? null, reviews: p.reviewsCount ?? null,
        lat: p.location?.lat ?? null, lng: p.location?.lng ?? null,
      };
    });
    let newIds: string[] = [];
    if (fresh.length) {
      const { data, error } = await admin.from('leads').insert(fresh).select('id');
      if (error) {
        await admin.from('lead_searches').delete().eq('id', search.id);
        return reply({ error: `Could not save leads: ${error.message}` });
      }
      newIds = (data ?? []).map((r: any) => r.id);
    }

    // Fill in an email on an already-saved lead only if it had none. Never overwrite.
    for (const k of todo) {
      const row = have.get(k);
      const email = emailFor.get(k);
      if (row && !row.email && email) await admin.from('leads').update({ email }).eq('id', row.id);
    }

    const ids = [...(existing ?? []).map((r: any) => r.id), ...newIds];
    const { error: lErr } = await admin
      .from('search_leads')
      .upsert(ids.map((lead_id) => ({ search_id: search.id, lead_id })), { onConflict: 'search_id,lead_id', ignoreDuplicates: true });
    if (lErr) return reply({ error: `Could not link leads to the search: ${lErr.message}` });

    return reply({ search_id: search.id, found: keys.length, added: fresh.length, status, note, apify_status: scraped.status });
  } catch (e) {
    return reply({ error: `search-leads crashed: ${(e as Error).message}` });
  }
});
