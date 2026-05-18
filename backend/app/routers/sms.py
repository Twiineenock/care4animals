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

from pydantic import BaseModel
from typing import Optional

class TextbeeIncomingSMS(BaseModel):
    smsId: Optional[str] = None
    sender: str
    message: str
    receivedAt: Optional[str] = None
    deviceId: Optional[str] = None
    webhookEvent: Optional[str] = None

def process_incoming_sms_message(db: Session, sender: str, text: str):
    keyword = text.strip().upper()

    # 1. Manage User Profile (Get or Create)
    # Using 'Farmer' model which is the correct one in this project
    user = db.query(models.Farmer).filter(models.Farmer.phone_number == sender).first()
    if not user:
        # Create a basic farmer profile for incoming SMS if not exists
        user = models.Farmer(
            phone_number=sender, 
            username=f"sms_{sender[-4:]}", # Auto-generate a basic username
            preferred_language="en"
        )
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
        send_and_log_sms(db, user.id, sender, reply_message)
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

    # Determine message content - use sms_text for brevity if available
    final_text = lesson.sms_text if lesson.sms_text else lesson.content
    
    # If the content is too long for a single SMS, we might want to truncate or split
    if len(final_text) > 320:
        final_text = final_text[:317] + "..."

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

@router.post("/incoming")
def handle_incoming_sms(
    from_: str = Form(None, alias="from"),
    text: str = Form(None, alias="text"),
    db: Session = Depends(get_db)
):
    # Basic validation for the Form data
    if not from_ or not text:
        raise HTTPException(status_code=422, detail="Missing Form data (from/text)")
    
    return process_incoming_sms_message(db, from_, text)

@router.post("/incoming-textbee")
def handle_incoming_textbee(
    payload: TextbeeIncomingSMS,
    db: Session = Depends(get_db)
):
    """
    Receives incoming SMS webhook notifications from Textbee.
    Extracts the sender and text from the JSON payload and routes the response.
    """
    sender = payload.sender
    text = payload.message
    
    if not sender or not text:
        raise HTTPException(status_code=422, detail="Missing sender or message in Textbee payload")
        
    return process_incoming_sms_message(db, sender, text)

@router.post("/send-lesson")
def send_lesson_to_phone(
    farmer_id: int,
    lesson_id: int,
    db: Session = Depends(get_db)
):
    """
    Manually push a lesson summary to a farmer's phone.
    Used by the 'Send to SMS' button in the dashboard.
    """
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    
    if not farmer or not lesson:
        raise HTTPException(status_code=404, detail="Farmer or Lesson not found")
        
    text = lesson.sms_text if lesson.sms_text else lesson.content
    if len(text) > 320:
        text = text[:317] + "..."
        
    # Trigger SMS
    sms_status = send_and_log_sms(db, farmer.id, farmer.phone_number, text)
    
    # Log to Analytics
    log_event(db, "manual_sms_push", {
        "farmer_id": farmer.id,
        "lesson_id": lesson.id,
        "phone": farmer.phone_number
    })
    return {"status": sms_status.status, "message_id": sms_status.provider_message_id}

@router.post("/send-daily-feed")
def send_daily_feed_sms(db: Session = Depends(get_db)):
    """
    Sends the next single educational lesson as an SMS to all opted-in farmers.
    Branded as '[Care4Animals]' so that it stands out professionally.
    Only queries farmers who explicitly subscribed to get SMS notifications.
    """
    # Fetch all farmers who deliberately subscribed to SMS notifications
    farmers_to_send = db.query(models.Farmer).filter(models.Farmer.is_subscribed_to_sms == True).all()
    
    if not farmers_to_send:
        return {
            "message": "No farmers are currently subscribed to SMS notifications. Opt-in via the farmer's portal first!",
            "farmers_attempted": [],
            "results": [],
            "errors": []
        }
    
    sent_count = 0
    errors = []
    results = []
    
    for farmer in farmers_to_send:
        if not farmer.phone_number:
            errors.append(f"Farmer {farmer.username} does not have a phone number.")
            continue
            
        language = farmer.preferred_language or "en"
        
        # Get all lessons for this language, ordered by theme/code
        lessons = (
            db.query(models.Lesson)
            .filter(models.Lesson.language == language)
            .order_by(models.Lesson.theme, models.Lesson.code)
            .all()
        )
        
        if not lessons:
            errors.append(f"No lessons found in the database for language: {language}")
            continue
            
        # Get completed lessons
        completed_ids = set(
            p.lesson_id for p in
            db.query(models.LessonProgress.lesson_id)
            .filter(models.LessonProgress.farmer_id == farmer.id)
            .all()
        )
        
        # Find the FIRST uncompleted lesson
        next_lesson = None
        for lesson in lessons:
            if lesson.id not in completed_ids:
                next_lesson = lesson
                break
                
        if not next_lesson:
            # All lessons completed! Send a congratulations message
            message = f"[Care4Animals] Congratulations {farmer.username}! You have successfully completed all animal care lessons in our curriculum. Keep up the amazing work!"
            lesson_code = "completed"
        else:
            # Build branded lesson SMS text
            lesson_title = next_lesson.title
            lesson_body = next_lesson.sms_text or next_lesson.content
            if len(lesson_body) > 300:
                lesson_body = lesson_body[:297] + "..."
                
            message = f"[Care4Animals] Lesson: {lesson_title}\n{lesson_body}\nReply with {next_lesson.code} to review or reply NEXT for the next lesson!"
            lesson_code = next_lesson.code
            
            # Automatically record this lesson progress so they advance next time!
            try:
                progress = models.LessonProgress(farmer_id=farmer.id, lesson_id=next_lesson.id)
                db.add(progress)
                # Invalidate cache
                cache.delete(f"farmer_stats:{farmer.id}")
                cache.delete(f"daily_feed:{farmer.id}:{language}")
            except Exception as pe:
                db.rollback()
                print(f"Error marking lesson progress: {pe}")
            
        try:
            sms_status = send_and_log_sms(db, farmer.id, farmer.phone_number, message)
            sent_count += 1
            results.append({
                "farmer": farmer.username,
                "phone": farmer.phone_number,
                "status": sms_status.status,
                "message_id": sms_status.provider_message_id
            })
            
            # Log to Analytics
            log_event(db, "single_lesson_sms_sent", {
                "farmer_id": farmer.id,
                "phone": farmer.phone_number,
                "lesson_code": lesson_code
            })
        except Exception as e:
            errors.append(f"Failed to send to {farmer.username}: {str(e)}")
            
    # Commit any progress updates
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        
    return {
        "message": f"Successfully broadcasted SMS lessons to {sent_count} subscribed farmer(s).",
        "farmers_attempted": [f.username for f in farmers_to_send],
        "results": results,
        "errors": errors
    }

def log_event(db: Session, event_type: str, metadata: dict):
    """Helper function to record analytics events"""
    new_event = models.Analytics(
        event_type=event_type,
        metadata_json=json.dumps(metadata)
    )
    db.add(new_event)
    db.commit()