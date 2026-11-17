export const STAGES = ['New', 'Contacted', 'Interested', 'Closed Won', 'Closed Lost'] as const;
export type Stage = (typeof STAGES)[number];

export type Role = 'admin' | 'customer';

export interface Profile {
  id: string;
  role: Role;
  login_id: string | null;
  display_name: string | null;
  company: string | null;
  sender_name: string | null;
  email_subject_template: string | null;
  email_body_template: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  search_id: string | null;
  place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  reviews: number | null;
  lat: number | null;
  lng: number | null;
  stage: Stage;
  notes: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  contacted_at: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  target_keyword: string | null;
  is_active: boolean;
}

export interface Search {
  id: string;
  keyword: string;
  location: string;
  result_count: number;
  status: 'complete' | 'empty' | 'partial' | string;
  note: string | null;
  created_at: string;
}
