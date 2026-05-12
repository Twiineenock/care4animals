from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["content"])

@router.get("/languages")
def get_languages():
    return [
        {"code": "en", "name": "English"},
        {"code": "lg", "name": "Luganda"},
        {"code": "sw", "name": "Swahili"},
    ]

@router.get("/topics")
def get_topics():
    return [
        {"id": 1, "slug": "disease-management", "title": "Disease Management"},
        {"id": 2, "slug": "vaccination", "title": "Vaccination"},
        {"id": 3, "slug": "animal-welfare", "title": "Animal Welfare"},
        {"id": 4, "slug": "feeding-nutrition", "title": "Feeding & Nutrition"},
        {"id": 5, "slug": "transport-handling", "title": "Transport & Handling"},
    ]
