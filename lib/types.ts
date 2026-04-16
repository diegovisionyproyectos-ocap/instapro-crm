export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'inactive';

export interface Contact {
  id: string;
  client_code: string | null;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: ContactStatus;
  city: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export type DealStage = 'following' | 'won' | 'lost';

export interface Deal {
  id: string;
  title: string;
  contact_id: string;
  contact_name: string;
  client_code?: string | null;
  stage: DealStage;
  value: number;
  close_date: string;
  created_at: string;
}

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled';
export type PhaseType = 'pre_production' | 'production' | 'post_production';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed';
export type EventType = 'meeting' | 'delivery' | 'installation' | 'visit' | 'payment' | 'other';

export interface ChecklistItem {
  id: string;
  phase_id: string;
  project_id: string;
  text: string;
  completed: boolean;
  item_order: number;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_type: PhaseType;
  status: PhaseStatus;
  phase_order: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  checklist_items?: ChecklistItem[];
}

export interface Project {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  contact_name: string | null;
  client_code?: string | null;
  name: string;
  value: number;
  status: ProjectStatus;
  address: string | null;
  lat: number | null;
  lng: number | null;
  installer_name: string | null;
  notes: string | null;
  started_at: string | null;
  created_at: string;
  phases?: ProjectPhase[];
}

export interface ProjectEvent {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: EventType;
  created_at: string;
  project?: {
    id?: string;
    contact_id?: string | null;
    name: string;
    contact_name: string | null;
    client_code?: string | null;
    lat: number | null;
    lng: number | null;
  };
}
