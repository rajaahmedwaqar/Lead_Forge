import { useState } from 'react';
import type { FormEvent } from 'react';
import { MapPin, Search } from 'lucide-react';
import { categoryFor } from '../lib/categories';
import { Spinner } from './ui';

interface Props {
  busy: boolean;
  picks: string[];
  onSearch: (keyword: string, location: string) => void;
  initialKeyword?: string;
  initialLocation?: string;
}

export default function TopSearchBar({ busy, picks, onSearch, initialKeyword = '', initialLocation = '' }: Props) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [location, setLocation] = useState(initialLocation);
  const cat = keyword.trim() ? categoryFor(keyword) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (keyword.trim() && location.trim() && !busy) onSearch(keyword.trim(), location.trim());
  };

  return (
    <form onSubmit={submit} className="card p-3 sm:p-4" role="search" aria-label="Find leads">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <div className="relative">
          <label htmlFor="kw" className="sr-only">Who are you looking for?</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" aria-hidden="true" />
          <input id="kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} maxLength={120} disabled={busy}
            placeholder="Who are you looking for?" className="input pl-9 pr-28" />
          {cat && (
            <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-moss-light px-2 py-0.5 text-xs font-bold text-moss-dark">
              <cat.icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{cat.label}</span>
            </span>
          )}
        </div>
        <div className="relative">
          <label htmlFor="loc" className="sr-only">Where?</label>
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" aria-hidden="true" />
          <input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} disabled={busy}
            placeholder="Where?" className="input pl-9" />
        </div>
        <button type="submit" disabled={busy || !keyword.trim() || !location.trim()} className="btn-primary min-h-[44px] px-6">
          {busy ? <Spinner /> : <Search className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Searching' : 'Find leads'}
        </button>
      </div>
      {picks.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink/60">From your active services:</span>
          {picks.map((p) => (
            <button key={p} type="button" onClick={() => setKeyword(p)} disabled={busy}
              className="min-h-[32px] rounded-full bg-moss-light px-3 py-1 font-semibold text-moss-dark transition hover:bg-moss hover:text-moss-fg disabled:opacity-50">
              {p}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
