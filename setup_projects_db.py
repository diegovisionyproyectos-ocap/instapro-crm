import urllib.request
import urllib.error
import json

TOKEN = "sbp_b08dede11cc03410747a60999556c2a3c7d3a4e7"
PROJECT = "fxltjwqsveaukiivddaj"
URL = f"https://api.supabase.com/v1/projects/{PROJECT}/database/query"

queries = [
    # Projects table
    """
    create table if not exists projects (
      id uuid primary key default uuid_generate_v4(),
      deal_id uuid references deals(id) on delete set null,
      contact_id uuid references contacts(id) on delete set null,
      contact_name text,
      name text not null,
      value numeric(12, 2) default 0,
      status text not null default 'active' check (status in ('active', 'completed', 'on_hold', 'cancelled')),
      address text,
      lat double precision,
      lng double precision,
      installer_name text,
      notes text,
      started_at date,
      created_at timestamptz not null default now()
    )
    """,
    # Project phases table
    """
    create table if not exists project_phases (
      id uuid primary key default uuid_generate_v4(),
      project_id uuid references projects(id) on delete cascade not null,
      phase_type text not null check (phase_type in ('pre_production', 'production', 'post_production')),
      status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
      phase_order int not null,
      started_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz not null default now()
    )
    """,
    # Checklist items table
    """
    create table if not exists checklist_items (
      id uuid primary key default uuid_generate_v4(),
      phase_id uuid references project_phases(id) on delete cascade not null,
      project_id uuid references projects(id) on delete cascade not null,
      text text not null,
      completed boolean not null default false,
      item_order int not null default 0,
      completed_at timestamptz,
      created_at timestamptz not null default now()
    )
    """,
    # Project events (calendar) table
    """
    create table if not exists project_events (
      id uuid primary key default uuid_generate_v4(),
      project_id uuid references projects(id) on delete cascade not null,
      title text not null,
      description text,
      event_date date not null,
      event_time time,
      event_type text not null default 'other' check (event_type in ('meeting', 'delivery', 'installation', 'visit', 'payment', 'other')),
      created_at timestamptz not null default now()
    )
    """,
    # RLS
    "alter table projects enable row level security",
    "alter table project_phases enable row level security",
    "alter table checklist_items enable row level security",
    "alter table project_events enable row level security",
    "drop policy if exists allow_all_projects on projects",
    "drop policy if exists allow_all_phases on project_phases",
    "drop policy if exists allow_all_checklist on checklist_items",
    "drop policy if exists allow_all_events on project_events",
    "create policy allow_all_projects on projects for all using (true) with check (true)",
    "create policy allow_all_phases on project_phases for all using (true) with check (true)",
    "create policy allow_all_checklist on checklist_items for all using (true) with check (true)",
    "create policy allow_all_events on project_events for all using (true) with check (true)",
    # Indexes
    "create index if not exists projects_status_idx on projects(status)",
    "create index if not exists projects_deal_id_idx on projects(deal_id)",
    "create index if not exists phases_project_id_idx on project_phases(project_id)",
    "create index if not exists checklist_phase_id_idx on checklist_items(phase_id)",
    "create index if not exists events_project_id_idx on project_events(project_id)",
    "create index if not exists events_date_idx on project_events(event_date)",
]

for q in queries:
    q = q.strip()
    data = json.dumps({"query": q}).encode()
    req = urllib.request.Request(URL, data=data, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "supabase-cli/2.75.0"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            result = resp.read().decode()
            print(f"OK: {q[:70].strip()}...")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code}: {q[:70].strip()}...\n  -> {body[:300]}")
    except Exception as e:
        print(f"ERR: {q[:70].strip()}...\n  -> {e}")

print("\nDone!")
