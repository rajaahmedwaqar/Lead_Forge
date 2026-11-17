import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Info, Loader2, Moon, Sun, XCircle } from 'lucide-react';
import { useTheme } from '../lib/theme';

export const Spinner = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
);

/** Loading placeholder that keeps the layout stable while data loads. */
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div aria-hidden="true" className={`animate-pulse rounded-md bg-ink/10 ${className}`} />
);

/** CSS-only tooltip: shows on hover and on keyboard focus, never blocks the control. */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-semibold text-paper opacity-0 shadow-pop transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <Tooltip text={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <button type="button" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="btn-ghost h-10 w-10 !px-0">
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    </Tooltip>
  );
}

export const Logo = ({ className = '' }: { className?: string }) => (
  <span className={`inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-moss-dark ${className}`}>
    <span aria-hidden="true" className="bg-brand-gradient grid h-8 w-8 place-items-center rounded-lg text-lg text-white shadow-md shadow-moss/30">L</span>
    LeadForge
  </span>
);

export function Switch({ checked, onChange, label, disabled }:
  { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-moss' : 'bg-ink/25'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

// ---- inline notice -------------------------------------------------------------------------
export interface NoticeData { kind: 'ok' | 'error' | 'info'; text: string; detail?: string }

export function Notice({ n }: { n: NoticeData | null }) {
  if (!n) return null;
  const tone = n.kind === 'ok' ? 'bg-moss-light text-moss-dark'
    : n.kind === 'info' ? 'bg-warn-soft text-warn' : 'bg-danger-soft text-danger';
  const Icon = n.kind === 'ok' ? CheckCircle2 : n.kind === 'info' ? Info : XCircle;
  return (
    <div role={n.kind === 'error' ? 'alert' : 'status'} className={`flex animate-fade-up gap-2 rounded-lg px-3 py-2.5 text-sm ${tone}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold">{n.text}</p>
        {n.detail && <p className="mt-1 break-words text-xs opacity-90">Details: {n.detail}</p>}
      </div>
    </div>
  );
}

// ---- toasts ---------------------------------------------------------------------------------
interface Toast extends NoticeData { id: number }
const ToastCtx = createContext<((t: NoticeData) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((t: NoticeData) => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-3), { ...t, id }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.kind === 'error' ? 8000 : 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[3000] flex flex-col items-center gap-2 p-4 sm:items-end">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm shadow-pop">
            <Notice n={t} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) throw new Error('useToast must be used inside ToastProvider');
  return v;
}

// ---- confirmation dialog ----------------------------------------------------------------------
interface ConfirmProps {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; busy?: boolean;
  onConfirm: () => void; onCancel: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel, busy, onConfirm, onCancel }: ConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2500] grid place-items-center bg-black/50 p-4" onMouseDown={() => !busy && onCancel()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body"
        onMouseDown={(e) => e.stopPropagation()} className="card w-full max-w-md animate-fade-up p-5">
        <h2 id="confirm-title" className="text-lg font-extrabold">{title}</h2>
        <div id="confirm-body" className="mt-2 text-sm text-ink/75">{body}</div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" className="btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy && <Spinner />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function IconButton({ label, onClick, children, className = '' }:
  { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <Tooltip text={label}>
      <button type="button" aria-label={label} onClick={onClick} className={`btn-ghost h-10 w-10 !px-0 ${className}`}>{children}</button>
    </Tooltip>
  );
}
