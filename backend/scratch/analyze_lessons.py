from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Lesson
from app.database import SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    total = db.query(Lesson).count()
    print(f"Total Lessons: {total}")
    
    topics = db.query(Lesson.topic).distinct().all()
    print(f"\nTopics: {[t[0] for t in topics if t[0]]}")
    
    themes = db.query(Lesson.theme).distinct().all()
    print(f"Themes: {[t[0] for t in themes if t[0]]}")
    
    animals = db.query(Lesson.target_animals).distinct().all()
    print(f"Target Animals: {[a[0] for a in animals if a[0]]}")
    
    languages = db.query(Lesson.language).distinct().all()
    print(f"Languages: {[l[0] for l in languages if l[0]]}")
    
    print("\nSample Lessons (First 10):")
    samples = db.query(Lesson).limit(10).all()
    for s in samples:
        print(f"- [{s.code}] {s.title} ({s.language}) | Animal: {s.target_animals}")

finally:
    db.close()
