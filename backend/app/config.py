import os
from typing import List

class Settings:
    PROJECT_NAME: str = "Pwesto Backend API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database: Default SQLite for zero-config local dev, or PostgreSQL/PostGIS in production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pwesto.db")
    
    # Redis for live GPS coordinate pub/sub
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
