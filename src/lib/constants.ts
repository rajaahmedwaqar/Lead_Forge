import type { Stage } from '../types';

export const STAGE_COLORS: Record<Stage, string> = {
  New: '#64748b',
  Contacted: '#2563eb',
  'Interested': '#d97706',
  'Closed Won': '#16a34a',
  'Closed Lost': '#dc2626',
};

/** Supabase Auth needs an email, so the admin's login ID (admin123) maps to a reserved internal address. */
export const ADMIN_EMAIL_DOMAIN = (import.meta.env.VITE_ADMIN_EMAIL_DOMAIN as string | undefined) || 'admin.leadforge.invalid';
