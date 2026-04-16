"""
Migration: Add client_code + address to contacts; create settings table; enable auth user
Run: python scripts/migrate_client_code.py
"""
import urllib.request, urllib.error, json, os

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "sbp_b08dede11cc03410747a60999556c2a3c7d3a4e7")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "")

if not PROJECT_REF:
    print("ERROR: Set SUPABASE_PROJECT_REF env variable (e.g. abcdefghijklmnop)")
    print("Find it in: Supabase Dashboard > Project Settings > General")
    PROJECT_REF = input("Enter project ref: ").strip()

SQL = """
-- Add client_code column to contacts (unique expediente identifier)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index for fast lookup by client_code
CREATE INDEX IF NOT EXISTS contacts_client_code_idx ON contacts (client_code);

-- Create settings table for company configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for settings (public read/write for now - single admin system)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_settings" ON settings;
CREATE POLICY "allow_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for assets (logo, etc.)
-- Note: bucket must be created via dashboard or storage API
"""

url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
data = json.dumps({"query": SQL}).encode()

req = urllib.request.Request(
    url,
    data=data,
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req) as r:
        print("✓ Migration successful:", r.read().decode())
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"✗ HTTP {e.code}: {body}")
except Exception as e:
    print(f"✗ Error: {e}")

print("\nNext steps:")
print("1. Go to Supabase Dashboard > Storage > Create bucket named 'assets' (public)")
print("2. Run: python scripts/create_admin_user.py")
