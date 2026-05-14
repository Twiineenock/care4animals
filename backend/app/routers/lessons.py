from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from .. import cache

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.post("/", response_model=schemas.LessonResponse, status_code=201)
def create_lesson(lesson: schemas.LessonCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Lesson).filter(
        models.Lesson.code == lesson.code,
        models.Lesson.language == lesson.language
    ).first()
    if existing:
        return existing
    db_lesson = models.Lesson(**lesson.model_dump())
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    # Invalidate module cache for this language
    cache.invalidate(f"modules:{lesson.language}")
    cache.invalidate(f"by_module:{lesson.language}:")
    return db_lesson


@router.get("/modules")
def get_modules(language: str = "en", db: Session = Depends(get_db)):
    """
    Lightweight module list with lesson counts.
    Cached for 5 minutes — lesson data never changes at runtime.
    """
    cache_key = f"modules:{language}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    rows = (
        db.query(models.Lesson.theme, func.count(models.Lesson.id))
        .filter(models.Lesson.language == language)
        .group_by(models.Lesson.theme)
        .order_by(models.Lesson.theme)
        .all()
    )
    result = [{"module": theme or "General", "lesson_count": count} for theme, count in rows]
    cache.set(cache_key, result, cache.TTL_STATIC)
    return result


@router.get("/by-module")
def get_lessons_by_module(
    module: str,
    language: str = "en",
    db: Session = Depends(get_db)
):
    """
    Full lesson data for a single module.
    Cached for 5 minutes — content never changes at runtime.
    """
    cache_key = f"by_module:{language}:{module}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    lessons = (
        db.query(models.Lesson)
        .filter(models.Lesson.language == language, models.Lesson.theme == module)
        .order_by(models.Lesson.code)
        .all()
    )
    # Serialize to dicts so we can store in cache (ORM objects can't be reused across sessions)
    result = [
        {
            "id": l.id,
            "code": l.code,
            "title": l.title,
            "topic": l.topic,
            "content": l.content,
            "language": l.language,
            "theme": l.theme,
            "sms_text": l.sms_text,
            "target_animals": l.target_animals,
            "checklist": l.checklist,
        }
        for l in lessons
    ]
    cache.set(cache_key, result, cache.TTL_STATIC)
    return result


@router.get("", response_model=List[schemas.LessonResponse])
def get_lessons(language: Optional[str] = None, animal_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Lesson)
    if language:
        query = query.filter(models.Lesson.language == language)
    if animal_type:
        query = query.filter(models.Lesson.target_animals.contains(animal_type))
    return query.all()
