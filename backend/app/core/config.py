from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # Application Base
    PROJECT_NAME: str = "Echelon Phishing URL Detection Gateway"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    # We define this as a list. Pydantic will automatically parse a comma-separated string 
    # from the .env file into a Python list.
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Threat Intelligence API Keys
    # By omitting a default value, these become implicitly optional or required depending on type hinting.
    # We make them optional (None) so the app can still run in "fail-open" mode locally without keys.
    GOOGLE_SAFE_BROWSING_KEY: str | None = None
    PHISHTANK_API_KEY: str | None = None
    
    # Engine Tuning Parameters
    CRITICAL_DOMAIN_AGE_DAYS: int = 30
    SUSPICIOUS_DOMAIN_AGE_DAYS: int = 90

    # Model configuration tells Pydantic to look for a file named '.env'
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)

# Instantiate the settings once so it can be imported cleanly across the app
settings = Settings()