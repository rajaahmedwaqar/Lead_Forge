import { Trash2 } from 'lucide-react';
import type { Search } from '../types';
import { categoryFor } from '../lib/categories';
import { Skeleton, Tooltip } from './ui';

interface Props {
  searches: Search[];
  activeId: string | null;
  loading: boolean;
  disabled: boolean;
  onPick: (id: string) => void;
  onDelete: (s: Search) => void;
  onResetAll: () => void;
}

const STATUS_LABEL: Record<string, string> = { empty: 'No results', partial: 'Partial' };

export default function SearchHistory({ searches, activeId, loading, disabled, onPick, onDelete, onResetAll }: Props) {
  return (
    <section className="card p-2" aria-labelledby="history-title">
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <h2 id="history-title" className="text-sm font-extrabold">Search history</h2>
        {searches.length > 0 && (
          <button type="button" onClick={onResetAll} disabled={disabled}
            className="rounded-md px-2 py-1 text-xs font-bold text-danger hover:bg-danger-soft disabled:opacity-50">
            Reset all
          </button>
        )}
      </div>
      <ul className="max-h-72 space-y-0.5 overflow-y-auto">
        {loading && [0, 1, 2].map((i) => <li key={i} className="px-3 py-2"><Skeleton className="h-9" /></li>)}
        {!loading && !searches.length && <li className="px-3 py-3 text-sm text-ink/60">No searches yet. Your searches will appear here.</li>}
        {searches.map((s) => {
          const cat = categoryFor(s.keyword);
          const active = s.id === activeId;
          return (
            <li key={s.id} className={`group flex items-center rounded-lg transition ${active ? 'bg-moss-light' : 'hover:bg-paper'}`}>
              <button type="button" onClick={() => onPick(s.id)} disabled={disabled} aria-current={active}
                className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left text-sm disabled:opacity-50">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-moss"><cat.icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{s.keyword} <span className="font-medium text-ink/60">in {s.location}</span></span>
                  <span className="block text-xs text-ink/60">
                    {new Date(s.created_at).toLocaleDateString()}
                    {STATUS_LABEL[s.status] && <span className="ml-1.5 font-bold text-warn">{STATUS_LABEL[s.status]}</span>}
                  </span>
                </span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold">{s.result_count}</span>
              </button>
              <Tooltip text="Delete this search">
                <button type="button" onClick={() => onDelete(s)} disabled={disabled} aria-label={`Delete search ${s.keyword} in ${s.location}`}
                  className="mr-1 grid h-9 w-9 place-items-center rounded-md text-ink/45 hover:bg-danger-soft hover:text-danger focus:opacity-100 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
