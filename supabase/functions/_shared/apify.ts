const ACTOR = 'compass~crawler-google-places';

export class ApifyError extends Error {}

export interface ScrapeOptions { base?: string; budgetMs?: number; pollMs?: number }

const FINISHED = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'];

/**
 * Start the Google Maps actor, wait for it, and read its dataset.
 * Unlike a single "run-sync" call this survives slow runs: if the run is still busy when our
 * time budget is used up, we keep whatever places were already scraped and abort the rest.
 */
export async function scrapePlaces(token: string, keyword: string, location: string, max: number, opts: ScrapeOptions = {}) {
  const base = opts.base ?? 'https://api.apify.com/v2';
  const budgetMs = opts.budgetMs ?? 100_000;
  const pollMs = opts.pollMs ?? 3000;
  const auth = { Authorization: `Bearer ${token}` };

  const start = await fetch(`${base}/acts/${ACTOR}/runs?timeout=${Math.round(budgetMs / 1000)}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchStringsArray: [keyword],
      locationQuery: location,
      maxCrawledPlacesPerSearch: max,
      language: 'en',
      skipClosedPlaces: true,
      maxImages: 0,
      maxReviews: 0,
    }),
  });
  if (!start.ok) {
    const t = (await start.text()).slice(0, 300);
    const hint = start.status === 401 || start.status === 403 ? ' (check the APIFY_TOKEN secret)'
      : start.status === 402 ? ' (Apify account is out of credit)' : '';
    throw new ApifyError(`Apify refused to start the search, HTTP ${start.status}${hint}: ${t}`);
  }
  const run = (await start.json()).data;
  const deadline = Date.now() + budgetMs;
  let status: string = run.status;
  let message = '';
  while (!FINISHED.includes(status) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    const r = await fetch(`${base}/actor-runs/${run.id}`, { headers: auth });
    if (!r.ok) continue;
    const d = (await r.json()).data;
    status = d.status;
    message = d.statusMessage ?? message;
  }
  let partial = false;
  if (!FINISHED.includes(status)) {
    partial = true;
    await fetch(`${base}/actor-runs/${run.id}/abort`, { method: 'POST', headers: auth }).catch(() => {});
  }
  const ds = await fetch(`${base}/datasets/${run.defaultDatasetId}/items?clean=true&format=json&limit=${max}`, { headers: auth });
  if (!ds.ok) throw new ApifyError(`Could not read the Apify results, HTTP ${ds.status}.`);
  const items = await ds.json();
  const places: any[] = Array.isArray(items) ? items : [];
  if (!places.length && (status === 'FAILED' || status === 'ABORTED')) {
    throw new ApifyError(`The Apify run ${status.toLowerCase()}${message ? `: ${message}` : ''}.`);
  }
  return { places, runId: run.id as string, status, partial: partial || status === 'TIMED-OUT' };
}
