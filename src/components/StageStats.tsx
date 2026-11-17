import { STAGES } from '../types';
import type { Lead, Stage } from '../types';
import { STAGE_COLORS } from '../lib/constants';

interface Props {
  leads: Lead[];
  active: Stage | 'All';
  onPick: (s: Stage | 'All') => void;
}

export default function StageStats({ leads, active, onPick }: Props) {
  const count = (s: Stage) => leads.filter((l) => l.stage === s).length;
  const row = (on: boolean) =>
    `flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${on ? 'bg-moss-light' : 'hover:bg-paper'}`;
  return (
    <section className="card p-2" aria-label="Filter by stage">
      <button type="button" onClick={() => onPick('All')} aria-pressed={active === 'All'} className={row(active === 'All')}>
        <span className="text-sm font-bold">All leads</span>
        <span className="text-xl font-extrabold">{leads.length}</span>
      </button>
      {STAGES.map((s) => (
        <button key={s} type="button" onClick={() => onPick(s)} aria-pressed={active === s} className={row(active === s)}>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-3 w-3 rounded-full" style={{ background: STAGE_COLORS[s] }} aria-hidden="true" />
            {s}
          </span>
          <span className="text-xl font-extrabold">{count(s)}</span>
        </button>
      ))}
    </section>
  );
}
