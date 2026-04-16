import urllib.request, urllib.error, json, sys

TOKEN = "sbp_b08dede11cc03410747a60999556c2a3c7d3a4e7"
PROJECT_REF = "fxltjwqsveaukiivddaj"

SQL = """
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address TEXT;
CREATE INDEX IF NOT EXISTS contacts_client_code_idx ON contacts (client_code);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_settings ON settings;
CREATE POLICY allow_all_settings ON settings FOR ALL USING (true) WITH CHECK (true);
"""

url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
data = json.dumps({"query": SQL}).encode()

req = urllib.request.Request(url, data=data, method="POST")
req.add_header("Authorization", f"Bearer {TOKEN}")
req.add_header("Content-Type", "application/json")

try:
    with urllib.request.urlopen(req) as r:
        print("OK:", r.read().decode())
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTP {e.code}: {body}", file=sys.stderr)
    sys.exit(1)
