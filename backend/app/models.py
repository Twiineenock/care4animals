from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    password_hash = Column(String)
    preferred_language = Column(String, default="en")
    farmed_animals = Column(String, default="cow") # Comma-separated list like "cow,dog"
    profile_picture_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    last_interaction = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship to track this user's SMS history
    sms_history = relationship("SMSLog", back_populates="recipient")
    progress = relationship("LessonProgress", back_populates="farmer")


class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, index=True) # e.g., 'COW1'
    title = Column(String)           # Used for the main display name
    topic = Column(String, nullable=True) # ADDED: Matches your analytics router expectation
    content = Column(Text)
    language = Column(String, index=True)
    theme = Column(String, nullable=True)
    sms_text = Column(String, nullable=True)
    target_animals = Column(String, default="cow") # Comma-separated list like "cow,dog"
    checklist = Column(Text, nullable=True) # JSON string of checklist items
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SMSLog(Base):
    """
    Tracks all outgoing SMS for Issue #10.
    Meets Acceptance Criteria: 'Messages are logged in the database'
    """
    __tablename__ = "sms_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("farmers.id"))
    phone_number = Column(String, index=True)
    message_body = Column(Text)
    
    # Status can be: 'sent', 'delivered', 'failed', or 'retry_pending'
    status = Column(String, default="pending")
    
    # Stores the unique ID returned by Africa's Talking/Twilio for tracking
    provider_message_id = Column(String, nullable=True) 
    
    # Error message if the API call fails
    error_log = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    recipient = relationship("Farmer", back_populates="sms_history")

class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"))
    lesson_id = Column(Integer, ForeignKey("lessons.id"))
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    farmer = relationship("Farmer", back_populates="progress")
    lesson = relationship("Lesson")

class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String)  # e.g., 'lesson_request', 'sms_sent'
    metadata_json = Column(Text) # To store JSON data
    timestamp = Column(DateTime(timezone=True), server_default=func.now())