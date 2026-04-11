export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'inactive';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: ContactStatus;
  created_at: string;
}

export type DealStage =
  | 'prospecting'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed-won'
  | 'closed-lost';

export interface Deal {
  id: string;
  title: string;
  contact_id: string;
  contact_name: string;
  stage: DealStage;
  value: number;
  close_date: string;
  created_at: string;
}
