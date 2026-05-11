from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from ..database import get_db
from ..models import Farmer

router = APIRouter(
    prefix="/farmers",
    tags=["Farmers"]
)

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    # Check if username, email or phone already exists
    existing_user = db.query(Farmer).filter(
        (Farmer.username == farmer_data.username) | 
        (Farmer.email == farmer_data.email) |
        (Farmer.phone_number == farmer_data.phone_number)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, Email or Phone Number already registered"
        )
    
    # Create new farmer
    new_farmer = Farmer(
        username=farmer_data.username,
        email=farmer_data.email,
        phone_number=farmer_data.phone_number,
        password_hash=get_password_hash(farmer_data.password)
    )
    
    db.add(new_farmer)
    db.commit()
    db.refresh(new_farmer)
    return new_farmer

@router.post("/login")
def login(credentials: FarmerLogin, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.username == credentials.username).first()
    
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
            "email": farmer.email
        }
    }
