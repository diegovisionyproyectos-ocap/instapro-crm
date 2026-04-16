-- InstaPro CRM Schema
-- Run this in the Supabase SQL Editor

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text default '',
  company text default '',
  status text not null default 'lead' check (status in ('lead', 'prospect', 'customer', 'inactive')),
  created_at timestamptz default now()
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  contact_id uuid references contacts(id) on delete set null,
  contact_name text not null default '',
  stage text not null default 'prospecting' check (stage in ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost')),
  value numeric not null default 0,
  close_date date not null,
  notes text default '',
  created_at timestamptz default now()
);

-- Enable Row Level Security (public access for demo)
alter table contacts enable row level security;
alter table deals enable row level security;

create policy "Public contacts access" on contacts for all using (true) with check (true);
create policy "Public deals access" on deals for all using (true) with check (true);
