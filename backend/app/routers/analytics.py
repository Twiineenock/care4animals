from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, database # Using relative imports for consistency

router = APIRouter()

@router.get("/summary")
def get_analytics_summary(db: Session = Depends(database.get_db)):
    # 1. Language Distribution (EN, LG, SW)
    curriculum_stats = db.query(
        models.Lesson.language, 
        func.count(models.Lesson.id)
    ).group_by(models.Lesson.language).all()

    # 2. Topic Distribution (Focus areas)
    topic_query = db.query(
        models.Lesson.topic, 
        func.count(models.Lesson.id)
    ).group_by(models.Lesson.topic).all()

    # 3. FIX: Active Users (Unique farmers in UserProfile)
    active_users_count = db.query(models.UserProfile.id).count()

    # 4. FIX: Lesson Requests (Total successful or attempted interactions from SMSLog)
    total_requests = db.query(models.SMSLog.id).count()

    # Transform list of tuples into dictionaries
    # We use .get(None, "Unknown") to handle any empty topics gracefully
    stats_dict = {lang: count for lang, count in curriculum_stats}
    topic_dict = {topic if topic else "Uncategorized": count for topic, count in topic_query}

    return {
        "metrics": {
            "total_lessons": sum(stats_dict.values()),
            "active_users": active_users_count,
            "lesson_requests": total_requests
        },
        "language_stats": stats_dict,
        "topic_stats": topic_dict,
        "event_breakdown": {
            "sent": db.query(models.SMSLog).filter(models.SMSLog.status == "sent").count(),
            "failed": db.query(models.SMSLog).filter(models.SMSLog.status == "failed").count()
        },
        "trends": [] # Future: Can add daily counts here
    }