import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, ShieldCheck, UserCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Logo, ThemeToggle, Tooltip } from './ui';

const link = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-bold transition ${
    isActive ? 'bg-moss text-moss-fg shadow-sm' : 'text-ink/75 hover:bg-moss-light'}`;

/** Common frame for the signed-in areas. `area` decides which navigation is shown. */
export default function Shell({ area, children }: { area: 'customer' | 'admin'; children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const name = profile?.display_name || profile?.login_id || (area === 'admin' ? 'Administrator' : 'Account');

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[4000] focus:rounded-lg focus:bg-moss focus:px-4 focus:py-2 focus:text-moss-fg">
        Skip to content
      </a>
      <header className="sticky top-0 z-[1100] border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link to="/" aria-label="LeadForge home page"><Logo /></Link>
          {area === 'admin' && (
            <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-warn">Admin</span>
          )}
          <nav aria-label="Main" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:order-none sm:w-auto sm:flex-1">
            {area === 'customer' ? (
              <>
                <NavLink to="/app" end className={link}><LayoutDashboard className="h-4 w-4" aria-hidden="true" />Leads</NavLink>
                <NavLink to="/app/profile" className={link}><UserCircle className="h-4 w-4" aria-hidden="true" />Profile</NavLink>
              </>
            ) : (
              <NavLink to="/admin" end className={link}><ShieldCheck className="h-4 w-4" aria-hidden="true" />Admin panel</NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-ink/70 md:block" title={name}>{name}</span>
            <ThemeToggle />
            <Tooltip text="Sign out">
              <button type="button" onClick={() => void signOut()} aria-label="Sign out" className="btn-ghost h-10 w-10 !px-0">
                <LogOut className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
