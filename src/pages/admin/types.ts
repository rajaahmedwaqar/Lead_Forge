export interface AdminUser {
  id: string; role: 'admin' | 'customer'; login: string; name: string | null; is_active: boolean;
  created_at: string; last_sign_in_at: string | null; searches: number; leads: number; services: number;
}

export interface Overview {
  users: AdminUser[];
  legacy: { searches: number; leads: number; services: number };
  stats: {
    customers: number; active_customers: number; signups_7d: number;
    searches_7d: number; searches_30d: number; leads: number; contacted: number;
  };
}

export interface OverviewState { data: Overview | null; error: string | null; reload: () => Promise<void> }
