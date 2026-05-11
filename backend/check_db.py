from app import database, models

db = database.SessionLocal()
count = db.query(models.Lesson).count()
print(f"Total lessons in DB: {count}")
db.close()
