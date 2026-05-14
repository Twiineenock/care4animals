from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from .. import cache

router = APIRouter(
    prefix="/progress",
    tags=["Progress"]
)

@router.post("/complete/{lesson_id}", response_model=schemas.LessonProgressResponse)
def complete_lesson(lesson_id: int, farmer_id: int, db: Session = Depends(get_db)):
    # Verify lesson exists
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Check if already completed
    existing = db.query(models.LessonProgress).filter(
        models.LessonProgress.farmer_id == farmer_id,
        models.LessonProgress.lesson_id == lesson_id
    ).first()

    if existing:
        return existing

    new_progress = models.LessonProgress(farmer_id=farmer_id, lesson_id=lesson_id)
    db.add(new_progress)
    db.commit()
    db.refresh(new_progress)

    # Invalidate this farmer's cached stats and daily feed so next request is fresh
    cache.invalidate(f"farmer_stats:{farmer_id}")
    cache.invalidate(f"daily_feed:{farmer_id}:")

    return new_progress

@router.get("/summary/{farmer_id}", response_model=List[schemas.LessonProgressResponse])
def get_progress_summary(farmer_id: int, db: Session = Depends(get_db)):
    return db.query(models.LessonProgress).filter(models.LessonProgress.farmer_id == farmer_id).all()
