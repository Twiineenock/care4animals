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

    # 3. FIX: Active Users (Unique farmers in Farmer table)
    active_users_count = db.query(models.Farmer.id).count()

    # 4. FIX: Lesson Requests (Total successful or attempted interactions from SMSLog)
    total_requests = db.query(models.SMSLog.id).count()

    # 5. NEW: Total Completions
    total_completions = db.query(models.LessonProgress.id).count()

    # 6. NEW: Recent Activity (Latest completions)
    recent_activity = db.query(
        models.LessonProgress, 
        models.Farmer.username, 
        models.Lesson.title
    ).join(models.Farmer, models.LessonProgress.farmer_id == models.Farmer.id)\
     .join(models.Lesson, models.LessonProgress.lesson_id == models.Lesson.id)\
     .order_by(models.LessonProgress.completed_at.desc())\
     .limit(5).all()

    recent_completions = [
        {
            "username": activity[1],
            "lesson_title": activity[2],
            "completed_at": activity[0].completed_at
        } for activity in recent_activity
    ]

    # Transform list of tuples into dictionaries
    # We use .get(None, "Unknown") to handle any empty topics gracefully
    stats_dict = {lang: count for lang, count in curriculum_stats}
    topic_dict = {topic if topic else "Uncategorized": count for topic, count in topic_query}

    return {
        "metrics": {
            "total_lessons": sum(stats_dict.values()),
            "active_users": active_users_count,
            "lesson_requests": total_requests,
            "total_completions": total_completions
        },
        "language_stats": stats_dict,
        "topic_stats": topic_dict,
        "event_breakdown": {
            "sent": db.query(models.SMSLog).filter(models.SMSLog.status == "sent").count(),
            "failed": db.query(models.SMSLog).filter(models.SMSLog.status == "failed").count(),
            "completions": total_completions
        },
        "recent_completions": recent_completions,
        "trends": [] # Future: Can add daily counts here
    }

@router.get("/live")
def get_live_activity(db: Session = Depends(database.get_db)):
    """Lightweight endpoint for high-frequency polling of recent activity."""
    recent_activity = db.query(
        models.LessonProgress, 
        models.Farmer.username, 
        models.Lesson.title
    ).join(models.Farmer, models.LessonProgress.farmer_id == models.Farmer.id)\
     .join(models.Lesson, models.LessonProgress.lesson_id == models.Lesson.id)\
     .order_by(models.LessonProgress.completed_at.desc())\
     .limit(5).all()

    return [
        {
            "username": activity[1],
            "lesson_title": activity[2],
            "completed_at": activity[0].completed_at
        } for activity in recent_activity
    ]