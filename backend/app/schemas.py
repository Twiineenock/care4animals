from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# --- SMS Schemas ---
# For Phase 2: Handles the logic of parsing incoming messages
class SMSRequest(BaseModel):
    sender: str   # The phone number (e.g., "256700000000")
    message: str  # The keyword or content (e.g., "L91")

class SMSResponse(BaseModel):
    recipient: str
    message: str
    language_detected: str
    status: str = "success"

# Legacy/Webhook Schema (Keep for future external integration)
class SmsWebhookIn(BaseModel):
    from_number: str
    to_number: str
    body: str

# --- Analytics Schemas ---
class AnalyticsBase(BaseModel):
    farmer_id: Optional[int] = None
    event_type: str
    metadata_json: Optional[str] = None

class AnalyticsCreate(AnalyticsBase):
    pass

class Analytics(AnalyticsBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# --- Lesson Schemas ---
class LessonBase(BaseModel):
    code: str
    title: str
    content: str
    language: str
    theme: Optional[str] = None
    topic: Optional[str] = None
    sms_text: Optional[str] = None
    target_animals: Optional[str] = "cow"
    checklist: Optional[str] = None

class LessonCreate(LessonBase):
    pass

class LessonResponse(LessonBase):
    id: int
    
    class Config:
        from_attributes = True

# --- Topic Schemas ---
class TopicBase(BaseModel):
    title: str

class TopicResponse(TopicBase):
    id: int
    lessons: List[LessonResponse] = []

    class Config:
        from_attributes = True

# --- Progress & Stats Schemas ---
class LessonProgressBase(BaseModel):
    lesson_id: int

class LessonProgressCreate(LessonProgressBase):
    pass

class LessonProgressResponse(LessonProgressBase):
    id: int
    completed_at: datetime

    class Config:
        from_attributes = True

class FarmerUpdateAnimals(BaseModel):
    farmed_animals: str

class FarmerUpdateLanguage(BaseModel):
    preferred_language: str

class FarmerUpdateProfile(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    profile_picture_url: Optional[str] = None

class FarmerDashboardStats(BaseModel):
    lessons_available: int
    lessons_completed: int
    farmed_animals: Optional[str] = "cow"
    preferred_language: Optional[str] = "en"
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None
    last_activity: Optional[datetime] = None
    completed_lesson_ids: List[int] = []
    is_subscribed_to_sms: bool = False