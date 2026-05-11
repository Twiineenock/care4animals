import requests
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

def create_admin(username, password):
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("Error: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env")
        return

    url = f"{SUPABASE_URL}/auth/v1/signup"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    
    # Map to our virtual email format
    email = f"{username.lower().strip()}@care4animals.org"
    
    payload = {
        "email": email,
        "password": password,
        "data": {
            "username": username,
            "role": "admin"
        }
    }

    print(f"Creating admin account for: {username}...")
    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200 or response.status_code == 201:
        print(f"✅ Success! Admin '{username}' created.")
        print(f"Login at the portal with username: {username}")
    else:
        print(f"❌ Failed: {response.text}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/create_admin.py <username> <password>")
    else:
        create_admin(sys.argv[1], sys.argv[2])
