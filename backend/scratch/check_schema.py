from sqlalchemy import text
from app.database import engine

def check_columns(table_name):
    print(f"Checking columns for {table_name}:")
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'"))
        for row in result:
            print(f" - {row[0]}")

if __name__ == "__main__":
    check_columns('farmers')
    check_columns('lessons')
