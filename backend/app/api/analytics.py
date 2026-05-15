from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, database

router = APIRouter()

@router.get("/summary")
def get_analytics_summary(db: Session = Depends(database.get_db)):
    # 1. Language Distribution
    curriculum_stats = db.query(
        models.Lesson.language, 
        func.count(models.Lesson.id)
    ).group_by(models.Lesson.language).all()

    # 2. Theme Distribution (Corrected from 'topic' to 'theme')
    theme_query = db.query(
        models.Lesson.theme, 
        func.count(models.Lesson.id)
    ).group_by(models.Lesson.theme).all()

    # Transform results into clean dictionaries
    stats_dict = {lang: count for lang, count in curriculum_stats}
    # Filter out None values if any themes are empty
    theme_dict = {theme if theme else "Uncategorized": count for theme, count in theme_query}

    return {
        "metrics": {
            "total_lessons": sum(stats_dict.values()),
            "active_users": 0,
            "lesson_requests": 0
        },
        "language_stats": stats_dict,
        "theme_stats": theme_dict,  # Successfully mapped to the 'theme' column
        "event_breakdown": {},
        "trends": []
    }