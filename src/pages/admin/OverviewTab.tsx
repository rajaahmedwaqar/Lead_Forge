import type { Overview } from './types';

export default function OverviewTab({ data }: { data: Overview }) {
  const s = data.stats;
  const cards: [string, number, string][] = [
    ['Customers', s.customers, `${s.active_customers} active`],
    ['New sign-ups', s.signups_7d, 'last 7 days'],
    ['Searches', s.searches_7d, `last 7 days, ${s.searches_30d} in 30 days`],
    ['Leads collected', s.leads, 'all customers'],
    ['Emails sent', s.contacted, 'leads moved to Contacted'],
  ];
  const recent = data.users.filter((u) => u.role === 'customer').slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="card p-4">
            <div className="text-sm font-semibold text-ink/65">{label}</div>
            <div className="mt-1 text-3xl font-extrabold">{value}</div>
            <div className="mt-0.5 text-xs text-ink/55">{hint}</div>
          </div>
        ))}
      </div>

      <section className="card p-4" aria-labelledby="newest">
        <h2 id="newest" className="font-extrabold">Newest customers</h2>
        <ul className="mt-3 divide-y divide-line">
          {recent.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="min-w-0"><b>{u.name || u.login}</b> <span className="text-ink/55">{u.login}</span></span>
              <span className="text-ink/60">Joined {new Date(u.created_at).toLocaleDateString()}, {u.searches} searches, {u.leads} leads</span>
            </li>
          ))}
          {!recent.length && <li className="py-3 text-sm text-ink/60">No customers yet.</li>}
        </ul>
      </section>
      <p className="text-xs text-ink/60">Only totals are shown. Customers&apos; lead details stay private and are not readable from the admin panel.</p>
    </div>
  );
}
