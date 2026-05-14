from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/lessons", tags=["lessons"])

@router.post("/", response_model=schemas.LessonResponse, status_code=201)
def create_lesson(lesson: schemas.LessonCreate, db: Session = Depends(get_db)):
    # Check for existing lesson with same code and language to prevent duplicates
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
    return db_lesson


@router.get("/modules")
def get_modules(language: str = "en", db: Session = Depends(get_db)):
    """
    Returns a lightweight list of modules with lesson counts only.
    Used for the initial dashboard load — no lesson content is transferred.
    """
    rows = (
        db.query(models.Lesson.theme, func.count(models.Lesson.id))
        .filter(models.Lesson.language == language)
        .group_by(models.Lesson.theme)
        .order_by(models.Lesson.theme)
        .all()
    )
    return [{"module": theme or "General", "lesson_count": count} for theme, count in rows]


@router.get("/by-module")
def get_lessons_by_module(
    module: str,
    language: str = "en",
    db: Session = Depends(get_db)
):
    """
    Returns full lesson data for a single module only.
    Called lazily when a farmer opens a module accordion.
    """
    lessons = (
        db.query(models.Lesson)
        .filter(models.Lesson.language == language, models.Lesson.theme == module)
        .order_by(models.Lesson.code)
        .all()
    )
    return lessons


@router.get("", response_model=List[schemas.LessonResponse])
def get_lessons(language: Optional[str] = None, animal_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Lesson)
    if language:
        query = query.filter(models.Lesson.language == language)

    if animal_type:
        query = query.filter(models.Lesson.target_animals.contains(animal_type))

    return query.all()