from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine
from . import models

# Import routers
from .routers.health import router as health_router
from .routers.content import router as content_router
from .routers.sms import router as sms_router
from .routers.analytics import router as analytics_router
from .routers.lessons import router as lessons_router

# 1. Initialize the FastAPI instance
app = FastAPI(
    title=settings.app_name,
    version="2.0.0"
)

# 2. Ensure Database Tables are created
models.Base.metadata.create_all(bind=engine)

# 3. Configure CORS for the React Dashboard
# We include both localhost and 127.0.0.1 for all common Vite ports
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add the specific frontend_url from settings if it exists
if hasattr(settings, "frontend_url"):
    origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Register Routers
app.include_router(health_router)
app.include_router(content_router)
app.include_router(sms_router) 
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(lessons_router, prefix="/api/v1/lessons", tags=["Lessons"])

# 5. Root Endpoint
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Care4Animals API is live",
        "version": "2.0.0",
        "partners": ["Bugema University", "WTS Foundation"]
    }