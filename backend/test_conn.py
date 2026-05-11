import os
import urllib.parse
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# We'll try a few variations of the connection string
password = "knR#wpydc*8eDyB"
encoded_password = urllib.parse.quote_plus(password)
project_ref = "nyidwpimwxpbncdjkgka"
host = "aws-0-eu-west-1.pooler.supabase.com"
port = "6543"

variations = [
    # 1. Modern username format
    f"postgresql+psycopg://postgres.{project_ref}:{encoded_password}@{host}:{port}/postgres",
    # 2. Plain username format
    f"postgresql+psycopg://postgres:{encoded_password}@{host}:{port}/postgres"
]

for url in variations:
    print(f"Testing variation: {url.replace(encoded_password, '****')}")
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("SUCCESS! This connection works.")
            print(f"URL that worked: {url}")
            break
    except Exception as e:
        print(f"Failed: {str(e)[:150]}...")
