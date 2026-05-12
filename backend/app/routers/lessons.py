from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional  # <--- Ensure 'List' is added here
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

@router.get("", response_model=List[schemas.LessonResponse])
def get_lessons(language: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Lesson)
    if language:
        query = query.filter(models.Lesson.language == language)
    return query.all()