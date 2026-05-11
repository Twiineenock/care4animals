import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Raw credentials
params = {
    "host": "aws-0-eu-west-1.pooler.supabase.com",
    "port": 6543,
    "user": "postgres.nyidwpimwxpbncdjkgka",
    "password": "knR#wpydc*8eDyB",
    "dbname": "postgres",
    "sslmode": "require"
}

print(f"Attempting direct psycopg3 connection to {params['host']}...")
print(f"Username: {params['user']}")

try:
    with psycopg.connect(**params) as conn:
        print("✅ SUCCESS! Raw connection worked.")
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            print(f"DB Version: {cur.fetchone()[0]}")
except Exception as e:
    print(f"❌ Failed: {e}")

# Try variation: Session mode port
print("\nAttempting variation: Port 5432 (Session mode)...")
params["port"] = 5432
try:
    with psycopg.connect(**params) as conn:
        print("✅ SUCCESS! Session mode worked.")
except Exception as e:
    print(f"❌ Failed: {e}")
