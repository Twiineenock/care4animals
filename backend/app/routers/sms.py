from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..services.sms_service import send_and_log_sms
import json
from typing import List

router = APIRouter(prefix="/sms", tags=["sms"])

@router.get("/logs")
def get_sms_logs(db: Session = Depends(get_db), limit: int = 20):
    """
    Fetches the most recent SMS logs for the frontend dashboard.
    """
    return db.query(models.SMSLog).order_by(models.SMSLog.id.desc()).limit(limit).all()

@router.post("/incoming")
def handle_incoming_sms(
    from_: str = Form(None, alias="from"),
    text: str = Form(None, alias="text"),
    db: Session = Depends(get_db)
):
    # Basic validation for the Form data
    if not from_ or not text:
        raise HTTPException(status_code=422, detail="Missing Form data (from/text)")

    sender = from_
    keyword = text.strip().upper()

    # 1. Manage User Profile (Get or Create)
    user = db.query(models.UserProfile).filter(models.UserProfile.phone_number == sender).first()
    if not user:
        user = models.UserProfile(phone_number=sender, preferred_language="en")
        db.add(user)
        db.commit()
        db.refresh(user)

    # 2. Handle Language Switch Commands
    reply_message = ""
    lang_detected = user.preferred_language

    if keyword in ["LG", "LUGANDA"]:
        user.preferred_language = "lg"
        reply_message = "Okyusiddwa okukozesa Oluganda."
        lang_detected = "lg"
    elif keyword in ["SW", "SWAHILI"]:
        user.preferred_language = "sw"
        reply_message = "Umebadilisha lugha kuwa Kiswahili."
        lang_detected = "sw"
    elif keyword in ["EN", "ENGLISH"]:
        user.preferred_language = "en"
        reply_message = "Language changed to English."
        lang_detected = "en"

    if reply_message:
        db.commit()
        log_event(db, "language_change", {"sender": sender, "to": lang_detected})
        sms_status = send_and_log_sms(db, user.id, sender, reply_message)
        return {"status": "success", "action": "language_change"}

    # 3. Lookup Lesson
    lesson = db.query(models.Lesson).filter(
        models.Lesson.code == keyword,
        models.Lesson.language == user.preferred_language
    ).first()

    # Fallback to English if not found in preferred language
    if not lesson:
        lesson = db.query(models.Lesson).filter(
            models.Lesson.code == keyword,
            models.Lesson.language == "en"
        ).first()

    # 4. Final Processing & Trigger Outbound
    if not lesson:
        error_msg = "Keyword not found. Text LG for Luganda, SW for Swahili, or EN for English."
        log_event(db, "keyword_error", {"sender": sender, "keyword": keyword})
        send_and_log_sms(db, user.id, sender, error_msg)
        return {"status": "error", "message": "Keyword not found"}

    # Determine message content
    final_text = lesson.content

    # Log to Analytics
    log_event(db, "lesson_request", {
        "sender": sender, 
        "keyword": keyword, 
        "language": user.preferred_language
    })

    # TRIGGER OUTBOUND SMS
    sms_status = send_and_log_sms(db, user.id, sender, final_text)

    return {
        "recipient": sender,
        "status": sms_status.status,
        "message_id": sms_status.provider_message_id
    }

def log_event(db: Session, event_type: str, metadata: dict):
    """Helper function to record analytics events"""
    new_event = models.Analytics(
        event_type=event_type,
        metadata_json=json.dumps(metadata)
    )
    db.add(new_event)
    db.commit()