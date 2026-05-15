import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env")
db_url = os.getenv("DATABASE_URL")

if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)

engine = create_engine(db_url)

def check_user():
    try:
        with engine.connect() as conn:
            user = conn.execute(text("SELECT id, username FROM farmers WHERE username = 'twiine'")).fetchone()
            if user:
                print(f"User: {user.username}, ID: {user.id}")
            else:
                print("User not found")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_user()
