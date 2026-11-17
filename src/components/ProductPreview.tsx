import { Suspense, lazy } from 'react';
import { Send, Sparkles } from 'lucide-react';
import TopSearchBar from './TopSearchBar';
import StageStats from './StageStats';
import LeadTable from './LeadTable';
import { Skeleton } from './ui';
import { categoryFor } from '../lib/categories';
import type { Lead } from '../types';

const LeadMap = lazy(() => import('./LeadMap'));

const base = { search_id: null, category: 'Dentist', notes: null, draft_subject: null, draft_body: null, contacted_at: null, created_at: '2026-01-01' };
// Illustrative sample rows for the public preview only. The real app shows each customer's own search results.
const SAMPLE: Lead[] = [
  { ...base, id: 's1', place_id: 's1', name: 'Brightside Dental', address: '214 Congress Ave, Austin', phone: '(512) 555-0142', website: null, email: 'hello@brightside.example', rating: 4.9, reviews: 212, lat: 30.2672, lng: -97.7431, stage: 'Interested' },
  { ...base, id: 's2', place_id: 's2', name: 'Lakeview Family Dentistry', address: '88 Lamar Blvd, Austin', phone: '(512) 555-0177', website: null, email: 'office@lakeview.example', rating: 4.7, reviews: 148, lat: 30.2711, lng: -97.7545, stage: 'Contacted' },
  { ...base, id: 's3', place_id: 's3', name: 'Oak Hill Orthodontics', address: '1702 S 1st St, Austin', phone: '(512) 555-0109', website: null, email: null, rating: 4.8, reviews: 96, lat: 30.2468, lng: -97.7566, stage: 'New' },
  { ...base, id: 's4', place_id: 's4', name: 'Capital City Smiles', address: '600 E 6th St, Austin', phone: '(512) 555-0161', website: null, email: 'team@capitalsmiles.example', rating: 4.6, reviews: 320, lat: 30.2679, lng: -97.7391, stage: 'New' },
  { ...base, id: 's5', place_id: 's5', name: 'Barton Springs Dental', address: '2201 Barton Springs Rd', phone: '(512) 555-0133', website: null, email: null, rating: 4.5, reviews: 74, lat: 30.2644, lng: -97.7701, stage: 'Closed Won' },
  { ...base, id: 's6', place_id: 's6', name: 'North Loop Dental Care', address: '5400 N Lamar, Austin', phone: '(512) 555-0188', website: null, email: 'info@northloop.example', rating: 4.4, reviews: 58, lat: 30.3178, lng: -97.7413, stage: 'New' },
];

const noop = () => {};

/**
 * The real search bar, stage filters, map and lead table, fed with sample data and made
 * non-interactive. Keeping the actual components means the preview can never drift from the app.
 */
export default function ProductPreview() {
  const category = categoryFor('dentists');
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
      <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink/20" /><span className="h-2.5 w-2.5 rounded-full bg-ink/20" /><span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
        <span className="ml-3 truncate text-xs font-semibold text-ink/55">LeadForge &middot; sample data</span>
      </div>

      <div
        role="img" aria-label="Preview of the LeadForge dashboard: a search for dentists in Austin with a map, pipeline stages, a lead table and an outreach email"
        className="pointer-events-none select-none space-y-4 p-3 text-left sm:p-5"
        {...{ inert: '' }}
      >
        <TopSearchBar busy={false} picks={[]} onSearch={noop} initialKeyword="dentists" initialLocation="Austin, TX" />
        <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">
          <div className="hidden lg:block"><StageStats leads={SAMPLE} active="All" onPick={noop} /></div>
          <Suspense fallback={<Skeleton className="h-[300px]" />}>
            <LeadMap leads={SAMPLE} selectedId="s1" onSelect={noop} />
          </Suspense>
          <div className="card hidden space-y-2 p-4 text-sm lg:block">
            <div className="flex items-center gap-2 font-extrabold"><Sparkles className="h-4 w-4 text-moss" aria-hidden="true" />Outreach email</div>
            <div className="rounded-lg border border-line px-3 py-2 text-xs"><span className="text-ink/55">To </span>hello@brightside.example</div>
            <div className="rounded-lg border border-line px-3 py-2 text-xs font-semibold">Quick idea for Brightside Dental</div>
            <div className="space-y-2 rounded-lg border border-line bg-paper p-3 text-xs leading-relaxed text-ink/80">
              <p>Hi Brightside team,</p>
              <p>I noticed your 4.9 rating from 212 reviews. I help dental practices turn that reputation into new bookings.</p>
              <p>Happy to share two ideas if useful.</p>
            </div>
            <div className="btn-primary w-full text-xs"><Send className="h-3.5 w-3.5" aria-hidden="true" />Send email</div>
          </div>
        </div>
        <LeadTable leads={SAMPLE.slice(0, 4)} category={category} loading={false} emptyText="" selectedId="s1" onSelect={noop} />
      </div>
    </div>
  );
}
