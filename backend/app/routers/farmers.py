from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from .. import cache

router = APIRouter(
    prefix="/farmers",
    tags=["Farmers"]
)

# Password hashing configuration
# Password hashing configuration - using pbkdf2_sha256 for maximum compatibility
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Pydantic schemas
class FarmerSignup(BaseModel):
    username: str
    email: EmailStr
    phone_number: str
    password: str
    profile_picture_url: Optional[str] = None

class FarmerLogin(BaseModel):
    username: str
    password: str

class FarmerResponse(BaseModel):
    id: int
    username: str
    email: str
    phone_number: str
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None
    is_subscribed_to_sms: bool = False

    class Config:
        from_attributes = True

@router.get("", response_model=List[FarmerResponse])
def get_all_farmers(db: Session = Depends(get_db)):
    return db.query(models.Farmer).order_by(models.Farmer.id.desc()).all()

# Helper functions
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

@router.post("/signup", response_model=FarmerResponse, status_code=status.HTTP_201_CREATED)
def signup(farmer_data: FarmerSignup, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(models.Farmer).filter(
            (models.Farmer.username == farmer_data.username) |
            (models.Farmer.email == farmer_data.email) |
            (models.Farmer.phone_number == farmer_data.phone_number)
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username, Email or Phone Number already registered"
            )

        new_farmer = models.Farmer(
            username=farmer_data.username,
            email=farmer_data.email,
            phone_number=farmer_data.phone_number,
            password_hash=get_password_hash(farmer_data.password),
            profile_picture_url=farmer_data.profile_picture_url
        )

        db.add(new_farmer)
        db.commit()
        db.refresh(new_farmer)
        return new_farmer
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        print(f"SIGNUP ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during signup: {str(e)}"
        )


@router.post("/login")
def login(credentials: FarmerLogin, db: Session = Depends(get_db)):
    farmer = db.query(models.Farmer).filter(models.Farmer.username == credentials.username).first()

    if not farmer or not verify_password(credentials.password, farmer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "message": "Login successful",
        "user": {
            "id": farmer.id,
            "username": farmer.username,
            "email": farmer.email,
            "phone_number": farmer.phone_number,
            "profile_picture_url": farmer.profile_picture_url,
            "bio": farmer.bio,
            "is_subscribed_to_sms": farmer.is_subscribed_to_sms
        }
    }


@router.put("/{farmer_id}/profile", response_model=FarmerResponse)
def update_farmer_profile(farmer_id: int, update_data: schemas.FarmerUpdateProfile, db: Session = Depends(get_db)):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    print(f"DEBUG: Updating profile for farmer {farmer_id}")
    print(f"DEBUG: Update data: {update_data.model_dump()}")

    if update_data.username:
        # Check if username is taken
        existing = db.query(models.Farmer).filter(models.Farmer.username == update_data.username, models.Farmer.id != farmer_id).first()
        if existing:
            print(f"DEBUG: Username {update_data.username} already taken")
            raise HTTPException(status_code=400, detail="Username already taken")
        farmer.username = update_data.username
    
    if update_data.email:
        # Check if email is taken
        existing = db.query(models.Farmer).filter(models.Farmer.email == update_data.email, models.Farmer.id != farmer_id).first()
        if existing:
            print(f"DEBUG: Email {update_data.email} already registered")
            raise HTTPException(status_code=400, detail="Email already registered")
        farmer.email = update_data.email
    
    if update_data.phone_number:
        # Check if phone is taken
        existing = db.query(models.Farmer).filter(models.Farmer.phone_number == update_data.phone_number, models.Farmer.id != farmer_id).first()
        if existing:
            print(f"DEBUG: Phone {update_data.phone_number} already registered")
            raise HTTPException(status_code=400, detail="Phone number already registered")
        farmer.phone_number = update_data.phone_number
    
    if update_data.bio is not None:
        farmer.bio = update_data.bio
        
    if update_data.profile_picture_url is not None:
        farmer.profile_picture_url = update_data.profile_picture_url

    try:
        db.commit()
        db.refresh(farmer)
        print(f"DEBUG: Profile updated successfully for farmer {farmer_id}")
    except Exception as e:
        db.rollback()
        print(f"ERROR: Database error during profile update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # Invalidate cache
    cache.delete(f"farmer_stats:{farmer_id}")
    
    return farmer


@router.put("/{farmer_id}/sms-subscription")
def update_sms_subscription(farmer_id: int, is_subscribed: bool, db: Session = Depends(get_db)):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer.is_subscribed_to_sms = is_subscribed
    try:
        db.commit()
        db.refresh(farmer)
        # Invalidate cache
        cache.delete(f"farmer_stats:{farmer_id}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    return {"message": "SMS Subscription updated successfully", "is_subscribed_to_sms": farmer.is_subscribed_to_sms}


@router.put("/{farmer_id}/animals")
def update_farmer_animals(farmer_id: int, animals_data: schemas.FarmerUpdateAnimals, db: Session = Depends(get_db)):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer.farmed_animals = animals_data.farmed_animals
    try:
        db.commit()
        db.refresh(farmer)
        # Invalidate cache
        cache.delete(f"farmer_stats:{farmer_id}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    return {"message": "Farmed animals updated successfully", "farmed_animals": farmer.farmed_animals}


@router.put("/{farmer_id}/language")
def update_farmer_language(farmer_id: int, language_data: schemas.FarmerUpdateLanguage, db: Session = Depends(get_db)):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer.preferred_language = language_data.preferred_language
    try:
        db.commit()
        db.refresh(farmer)
        # Invalidate cache
        cache.delete(f"farmer_stats:{farmer_id}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    return {"message": "Preferred language updated successfully", "preferred_language": farmer.preferred_language}


@router.get("/{farmer_id}/stats", response_model=schemas.FarmerDashboardStats)
def get_farmer_stats(farmer_id: int, db: Session = Depends(get_db)):
    cache_key = f"farmer_stats:{farmer_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    lang = farmer.preferred_language or "en"
    lessons_available = db.query(models.Lesson).filter(models.Lesson.language == lang).count()

    progress = db.query(models.LessonProgress).filter(
        models.LessonProgress.farmer_id == farmer_id
    ).all()
    completed_lesson_ids = [p.lesson_id for p in progress]
    lessons_completed = len(completed_lesson_ids)

    result = {
        "lessons_available": lessons_available,
        "lessons_completed": lessons_completed,
        "farmed_animals": farmer.farmed_animals,
        "preferred_language": farmer.preferred_language or "en",
        "profile_picture_url": farmer.profile_picture_url,
        "bio": farmer.bio,
        "last_activity": farmer.last_interaction,
        "completed_lesson_ids": completed_lesson_ids,
        "is_subscribed_to_sms": farmer.is_subscribed_to_sms
    }
    cache.set(cache_key, result, cache.TTL_FARMER)
    return result


@router.get("/{farmer_id}/daily-feed")
def get_daily_feed(farmer_id: int, language: str = "en", db: Session = Depends(get_db)):
    """
    Returns the farmer's current daily feed batch of 5 lessons.
    Cached per-farmer for 30 seconds. Optimised: fetches only IDs first,
    then fetches only the 5 needed lesson rows.
    """
    cache_key = f"daily_feed:{farmer_id}:{language}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    batch_size = 5

    # Step 1: Get only IDs + theme + code (lightweight — no content columns)
    id_rows = (
        db.query(models.Lesson.id, models.Lesson.theme, models.Lesson.code)
        .filter(models.Lesson.language == language)
        .order_by(models.Lesson.theme, models.Lesson.code)
        .all()
    )

    if not id_rows:
        return {
            "batch_number": 1, "batch_lessons": [], "all_complete": False,
            "current_module": None, "total_lessons": 0,
            "completed_count": 0, "curriculum_complete": False,
        }

    total_lessons = len(id_rows)

    # Step 2: Get completed IDs for this farmer (index-backed query, fast)
    completed_ids = set(
        p.lesson_id for p in
        db.query(models.LessonProgress.lesson_id)
        .filter(models.LessonProgress.farmer_id == farmer_id)
        .all()
    )

    # Step 3: Find the current batch offset without loading lesson content
    batches = [id_rows[i:i + batch_size] for i in range(0, total_lessons, batch_size)]

    current_batch_rows = None
    current_batch_number = 1
    for idx, batch in enumerate(batches):
        batch_ids = {r.id for r in batch}
        if not batch_ids.issubset(completed_ids):
            current_batch_rows = batch
            current_batch_number = idx + 1
            break

    if current_batch_rows is None:
        return {
            "batch_number": len(batches), "batch_lessons": [], "all_complete": True,
            "current_module": None, "total_lessons": total_lessons,
            "completed_count": len(completed_ids), "curriculum_complete": True,
        }

    # Step 4: Fetch ONLY the 5 lesson rows we actually need (full content)
    batch_ids_list = [r.id for r in current_batch_rows]
    batch_lessons_full = (
        db.query(models.Lesson)
        .filter(models.Lesson.id.in_(batch_ids_list))
        .all()
    )
    # Preserve curriculum order
    lesson_map = {l.id: l for l in batch_lessons_full}
    batch_lessons_ordered = [lesson_map[rid] for rid in batch_ids_list if rid in lesson_map]

    batch_ids_set = set(batch_ids_list)
    all_batch_complete = batch_ids_set.issubset(completed_ids)

    # Dominant module in this batch
    module_counts: dict = {}
    for r in current_batch_rows:
        m = r.theme or "General"
        module_counts[m] = module_counts.get(m, 0) + 1
    current_module = max(module_counts, key=module_counts.get)

    # Module progress — count from id_rows (no extra DB call)
    module_lesson_ids = [r.id for r in id_rows if (r.theme or "General") == current_module]
    module_completed = sum(1 for lid in module_lesson_ids if lid in completed_ids)

    result = {
        "batch_number": current_batch_number,
        "batch_lessons": [
            {
                "id": l.id,
                "code": l.code,
                "title": l.title,
                "theme": l.theme,
                "content": l.content,
                "sms_text": l.sms_text,
                "checklist": l.checklist,
                "language": l.language,
                "completed": l.id in completed_ids,
            }
            for l in batch_lessons_ordered
        ],
        "all_complete": all_batch_complete,
        "current_module": current_module,
        "module_total": len(module_lesson_ids),
        "module_completed": module_completed,
        "total_lessons": total_lessons,
        "completed_count": len(completed_ids),
        "curriculum_complete": False,
    }
    cache.set(cache_key, result, cache.TTL_FARMER)
    return result
