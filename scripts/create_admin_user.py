"""
Create the super admin user in Supabase Auth.
Run: python scripts/create_admin_user.py
"""
import urllib.request, urllib.error, json, os

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "sbp_b08dede11cc03410747a60999556c2a3c7d3a4e7")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "")

if not PROJECT_REF:
    print("ERROR: Set SUPABASE_PROJECT_REF env variable")
    PROJECT_REF = input("Enter project ref: ").strip()

EMAIL = "diego.visionyproyectos@gmail.com"
PASSWORD = input(f"Set password for {EMAIL}: ").strip()

if len(PASSWORD) < 8:
    print("Password must be at least 8 characters")
    exit(1)

# Create user via Admin API
url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/auth/users"
payload = {
    "email": EMAIL,
    "password": PASSWORD,
    "email_confirm": True,
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
        print(f"✓ Admin user created!")
        print(f"  Email: {result.get('email')}")
        print(f"  ID: {result.get('id')}")
        print(f"\nLogin at /login with:")
        print(f"  Email: {EMAIL}")
        print(f"  Password: (what you just entered)")
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
