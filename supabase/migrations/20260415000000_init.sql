-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Contacts table
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'lead' check (status in ('lead', 'prospect', 'customer', 'inactive')),
  city text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- Deals table
create table if not exists deals (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  contact_id uuid references contacts(id) on delete set null,
  contact_name text,
  stage text not null default 'prospecting' check (stage in ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost')),
  value numeric(12, 2) not null default 0,
  close_date date,
  created_at timestamptz not null default now()
);

-- RLS policies
alter table contacts enable row level security;
alter table deals enable row level security;

-- Allow public read/write (anon key) for now — tighten later with auth
create policy "allow_all_contacts" on contacts for all using (true) with check (true);
create policy "allow_all_deals" on deals for all using (true) with check (true);

-- Indexes
create index if not exists contacts_status_idx on contacts(status);
create index if not exists deals_stage_idx on deals(stage);
create index if not exists deals_contact_id_idx on deals(contact_id);
