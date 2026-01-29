# backend/app/core/config.py
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Risko.ai API"
    VERSION: str = "2.0.0"
    
    # База данных
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/trendscout_db")
    
    # Ключи API
    APIFY_API_TOKEN: str = os.getenv("APIFY_API_TOKEN", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Security - берём из переменной окружения для безопасности
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-in-production-please")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Настройки CORS
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:3000",  # Next.js default
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:5173",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        # Добавляем, чтобы он не ругался на лишние переменные в .env
        extra = "ignore" 

settings = Settings()