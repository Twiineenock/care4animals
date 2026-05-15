from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import settings
from .database import engine, warm_up_pool
from . import models, cache

# Import routers
from .routers.health import router as health_router
from .routers.content import router as content_router
from .routers.sms import router as sms_router
from .routers.analytics import router as analytics_router
from .routers.lessons import router as lessons_router
from .routers.farmers import router as farmers_router
from .routers.progress import router as progress_router


def _prime_cache():
    """
    Pre-populate the in-memory cache with static lesson data.
    Runs in a background thread so it never blocks server startup.
    """
    import threading

    def _run():
        from .database import SessionLocal
        from sqlalchemy import func
        db = SessionLocal()
        try:
            for lang in ("en", "lg", "sw"):
                rows = (
                    db.query(models.Lesson.theme, func.count(models.Lesson.id))
                    .filter(models.Lesson.language == lang)
                    .group_by(models.Lesson.theme)
                    .order_by(models.Lesson.theme)
                    .all()
                )
                modules = [{"module": t or "General", "lesson_count": c} for t, c in rows]
                cache.set(f"modules:{lang}", modules, cache.TTL_STATIC)

                for item in modules:
                    mod = item["module"]
                    lessons = (
                        db.query(models.Lesson)
                        .filter(models.Lesson.language == lang, models.Lesson.theme == mod)
                        .order_by(models.Lesson.code)
                        .all()
                    )
                    result = [
                        {
                            "id": l.id, "code": l.code, "title": l.title,
                            "topic": l.topic, "content": l.content,
                            "language": l.language, "theme": l.theme,
                            "sms_text": l.sms_text, "target_animals": l.target_animals,
                            "checklist": l.checklist,
                        }
                        for l in lessons
                    ]
                    cache.set(f"by_module:{lang}:{mod}", result, cache.TTL_STATIC)

            print("INFO: Background cache priming complete.")
        except Exception as e:
            print(f"WARNING: Background cache priming failed (non-fatal): {e}")
        finally:
            db.close()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    print("INFO: Background cache priming started.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    print("INFO: Synchronizing database schema...")
    try:
        models.Base.metadata.create_all(bind=engine)
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM farmers LIMIT 1"))
        print("INFO: Database schema synchronized and verified.")
    except Exception as e:
        print(f"ERROR: Database verification failed: {e}")

    warm_up_pool()
    _prime_cache()

    yield  # ── App runs ──

    # ── Shutdown ──
    cache.clear()
    print("INFO: Cache cleared on shutdown.")


# 1. Initialize the FastAPI instance
app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    lifespan=lifespan
)


# 3. Configure CORS for the React Dashboard
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://care4animals.vercel.app",
]

# Add specific frontend URL from settings
if settings.frontend_url and settings.frontend_url != "*" and settings.frontend_url not in origins:
    origins.append(settings.frontend_url)

print(f"INFO: CORS Origins configured: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if settings.frontend_url != "*" else ["*"],
    allow_credentials=True if settings.frontend_url != "*" else False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from fastapi.responses import JSONResponse
from fastapi import Request

@app.middleware("http")
async def error_logging_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        import traceback
        print(f"DEBUG: Internal Server Error occurred: {str(e)}")
        traceback.print_exc()
        
        # Ensure CORS headers are included even on unhandled exceptions
        origin = request.headers.get("origin")
        headers = {}
        if origin:
            # Check if origin is allowed
            if settings.frontend_url == "*" or origin in origins:
                headers["Access-Control-Allow-Origin"] = origin
                headers["Access-Control-Allow-Credentials"] = "true"
            
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(e)}"},
            headers=headers
        )



# 4. Register Routers
app.include_router(health_router)
app.include_router(content_router)
app.include_router(sms_router) 
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(lessons_router, prefix="/api/v1", tags=["Lessons"])
app.include_router(farmers_router)
app.include_router(progress_router)

# 5. Root Endpoint
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Care4Animals API is live",
        "version": "2.0.0",
        "partners": ["Bugema University", "WTS Foundation"]
    }

@app.get("/_cache_status")
async def cache_status():
    """Internal health check — shows cache key count."""
    from . import cache as c
    return {"total_keys": len(c._store), "status": "ok"}