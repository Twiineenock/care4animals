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
    Sends the daily feed notification SMS to farmers.
    Under testing conditions, this only sends to the FIRST farmer (or one farmer)
    in the database to save Textbee credits.
    """
    farmers = db.query(models.Farmer).all()
    if not farmers:
        raise HTTPException(status_code=404, detail="No farmers found in the database")
    
    # Under testing condition, we limit sending to the FIRST farmer ONLY as requested
    farmers_to_send = [farmers[0]]
    
    sent_count = 0
    errors = []
    results = []
    
    for farmer in farmers_to_send:
        language = farmer.preferred_language or "en"
        
        # Get id rows (lessons) for this language
        id_rows = (
            db.query(models.Lesson.id, models.Lesson.theme, models.Lesson.code, models.Lesson.title)
            .filter(models.Lesson.language == language)
            .order_by(models.Lesson.theme, models.Lesson.code)
            .all()
        )
        
        if not id_rows:
            errors.append(f"No lessons found for language {language} for farmer {farmer.username}.")
            continue
            
        completed_ids = set(
            p.lesson_id for p in
            db.query(models.LessonProgress.lesson_id)
            .filter(models.LessonProgress.farmer_id == farmer.id)
            .all()
        )
        
        batch_size = 5
        batches = [id_rows[i:i + batch_size] for i in range(0, len(id_rows), batch_size)]
        
        current_batch_rows = None
        for batch in batches:
            batch_ids = {r.id for r in batch}
            if not batch_ids.issubset(completed_ids):
                current_batch_rows = batch
                break
                
        if not current_batch_rows:
            message = "Care4Animals: Congratulations! You have completed all lessons in our curriculum. Keep up the great work!"
        else:
            lines = []
            for r in current_batch_rows:
                lines.append(f"- {r.title} (Reply {r.code})")
            
            lessons_text = "\n".join(lines)
            message = f"Care4Animals Daily Feed:\n{lessons_text}\nReply with a code to receive the full lesson!"

        if not farmer.phone_number:
            errors.append(f"Farmer {farmer.username} does not have a phone number.")
            continue
            
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
            log_event(db, "daily_feed_sms_sent", {
                "farmer_id": farmer.id,
                "phone": farmer.phone_number,
                "batch_number": current_batch_rows[0].theme if current_batch_rows else "completed"
            })
        except Exception as e:
            errors.append(f"Failed to send to {farmer.username}: {str(e)}")
            
    return {
        "message": f"Successfully sent daily feed SMS to {sent_count} farmer(s). (Testing Mode)",
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