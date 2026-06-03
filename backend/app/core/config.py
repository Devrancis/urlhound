from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Echelon Phishing URL Detection Gateway"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    GOOGLE_SAFE_BROWSING_KEY: str | None = None
    PHISHTANK_API_KEY: str | None = None

    CRITICAL_DOMAIN_AGE_DAYS: int = 30
    SUSPICIOUS_DOMAIN_AGE_DAYS: int = 90

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)

settings = Settings()