"""
Create the super admin user in Supabase Auth.
Run: python scripts/create_admin_user.py
"""
import urllib.request, urllib.error, json, os

# For InstaPro: project ref is fxltjwqsveaukiivddaj
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "sbp_b08dede11cc03410747a60999556c2a3c7d3a4e7")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "fxltjwqsveaukiivddaj")

USERNAME = "diego_sv"
EMAIL = f"{USERNAME}@instapro-crm.local"
PASSWORD = "InstD37%"

print(f"Creating super admin user...")
print(f"  Username: {USERNAME}")
print(f"  Email: {EMAIL}")
print(f"  Password: {'*' * len(PASSWORD)}")

if len(PASSWORD) < 8:
    print("Password must be at least 8 characters")
    exit(1)

# Create user via Admin API
url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/auth/users"
payload = {
    "email": EMAIL,
    "password": PASSWORD,
    "email_confirm": True,
    "user_metadata": {
        "username": USERNAME,
        "role": "super_admin"
    }
}

data = json.dumps(payload).encode()
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
        result = json.loads(r.read().decode())
        print(f"\n✅ Admin user created successfully!")
        print(f"  ID: {result.get('id')}")
        print(f"  Email: {result.get('email')}")
        print(f"\n🔐 Login credentials:")
        print(f"  Username (for reference): {USERNAME}")
        print(f"  Email: {EMAIL}")
        print(f"  Password: InstD37%")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"✗ HTTP {e.code}: {body}")
    if "already" in body.lower() or "exists" in body.lower():
        print("\nUser may already exist. Try updating the password instead.")
        # Update password
        update_url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/auth/users"
        # List users first
        list_req = urllib.request.Request(
            update_url + "?email=" + EMAIL,
            headers={"Authorization": f"Bearer {TOKEN}"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(list_req) as r2:
                users = json.loads(r2.read().decode())
                print("Existing users:", users)
        except Exception as e2:
            print("Could not list users:", e2)
except Exception as e:
    print(f"✗ Error: {e}")
