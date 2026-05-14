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

class FarmerLogin(BaseModel):
    username: str
    password: str

class FarmerResponse(BaseModel):
    id: int
    username: str
    email: str
    phone_number: str

    class Config:
        from_attributes = True

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
            password_hash=get_password_hash(farmer_data.password)
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
            "farmed_animals": farmer.farmed_animals
        }
    }


@router.put("/{farmer_id}/animals")
def update_farmer_animals(farmer_id: int, update_data: schemas.FarmerUpdateAnimals, db: Session = Depends(get_db)):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    farmer.farmed_animals = update_data.farmed_animals
    db.commit()
    db.refresh(farmer)
    return {"message": "Animal settings updated", "farmed_animals": farmer.farmed_animals}


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
        "last_activity": farmer.last_interaction,
        "completed_lesson_ids": completed_lesson_ids
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
