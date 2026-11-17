import { Mail, Phone, Star } from 'lucide-react';
import type { Lead } from '../types';
import type { Category } from '../lib/categories';
import { STAGE_COLORS } from '../lib/constants';
import { Skeleton } from './ui';

interface Props {
  leads: Lead[];
  category: Category | null;
  loading: boolean;
  emptyText: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function StageBadge({ stage }: { stage: Lead['stage'] }) {
  return (
    <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: STAGE_COLORS[stage] }}>
      {stage}
    </span>
  );
}

/** Same icon for every row of a search, labelled with the search's category. */
function Business({ lead, category }: { lead: Lead; category: Category | null }) {
  const Icon = category?.icon;
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-moss-light text-moss" title={category.label}>
          <Icon className="h-4 w-4" aria-label={category.label} />
        </span>
      )}
      <div className="min-w-0">
        <div className="font-bold">{lead.name}</div>
        <div className="text-xs text-ink/60">{lead.category ?? category?.label ?? ''}{lead.category && lead.address ? ', ' : ''}{lead.address ?? ''}</div>
      </div>
    </div>
  );
}

export default function LeadTable({ leads, category, loading, emptyText, selectedId, onSelect }: Props) {
  if (loading) {
    return (
      <div className="card space-y-3 p-4" aria-busy="true" aria-label="Loading leads">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }
  if (!leads.length) {
    return <div className="card border-dashed p-10 text-center text-sm text-ink/65">{emptyText}</div>;
  }
  return (
    <>
      {/* Phones and small tablets: one card per lead */}
      <ul className="space-y-2 md:hidden">
        {leads.map((l) => (
          <li key={l.id}>
            <button type="button" onClick={() => onSelect(l.id)} aria-pressed={l.id === selectedId}
              className={`card w-full space-y-2 p-3 text-left transition active:scale-[.99] ${l.id === selectedId ? 'ring-2 ring-moss' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <Business lead={l} category={category} />
                <StageBadge stage={l.stage} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/70">
                {l.rating != null && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" aria-hidden="true" />{l.rating} ({l.reviews ?? 0})</span>}
                {l.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" aria-hidden="true" />{l.phone}</span>}
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" aria-hidden="true" />{l.email ?? 'no email found'}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Leads</caption>
          <thead className="border-b border-line bg-paper text-ink/70">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-bold">Business</th>
              <th scope="col" className="px-4 py-2.5 font-bold">Rating</th>
              <th scope="col" className="px-4 py-2.5 font-bold">Phone</th>
              <th scope="col" className="px-4 py-2.5 font-bold">Email</th>
              <th scope="col" className="px-4 py-2.5 font-bold">Stage</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className={`border-b border-line transition last:border-0 hover:bg-moss-light/60 ${l.id === selectedId ? 'bg-moss-light' : ''}`}>
                <td className="px-4 py-2.5">
                  <button type="button" onClick={() => onSelect(l.id)} className="w-full text-left"><Business lead={l} category={category} /></button>
                </td>
                <td className="px-4 py-2.5">{l.rating != null ? `${l.rating} (${l.reviews ?? 0})` : '-'}</td>
                <td className="px-4 py-2.5">{l.phone ?? '-'}</td>
                <td className="px-4 py-2.5">{l.email ?? <span className="text-ink/50">not found</span>}</td>
                <td className="px-4 py-2.5"><StageBadge stage={l.stage} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
