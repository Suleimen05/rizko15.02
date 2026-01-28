# backend/app/db/models.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
from ..core.database import Base

class User(Base):
    """
    User authentication and profile table.
    Stores user credentials and basic profile information.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)

    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # OAuth fields (for future Google OAuth)
    oauth_provider = Column(String, nullable=True)  # 'google', 'github', etc.
    oauth_id = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    favorites = relationship("UserFavorite", back_populates="user", cascade="all, delete-orphan")
    searches = relationship("UserSearch", back_populates="user", cascade="all, delete-orphan")
    scripts = relationship("UserScript", back_populates="user", cascade="all, delete-orphan")


class UserSettings(Base):
    """
    User-specific settings and preferences.
    One-to-one relationship with User.
    """
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Preferences
    dark_mode = Column(Boolean, default=False)
    language = Column(String, default="en")
    region = Column(String, default="US")
    auto_generate_scripts = Column(Boolean, default=True)

    # Notifications
    notifications_trends = Column(Boolean, default=True)
    notifications_competitors = Column(Boolean, default=True)
    notifications_new_videos = Column(Boolean, default=False)
    notifications_weekly_report = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="settings")


class UserFavorite(Base):
    """
    User's favorite trends/videos.
    Allows users to bookmark interesting content.
    """
    __tablename__ = "user_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trend_id = Column(Integer, ForeignKey("trends.id", ondelete="CASCADE"), nullable=False, index=True)

    # Metadata
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="favorites")


class UserSearch(Base):
    """
    User's search history.
    Track what users are searching for analytics.
    """
    __tablename__ = "user_searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Search data
    query = Column(String, nullable=False)
    filters = Column(JSONB, default={})
    results_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="searches")


class UserScript(Base):
    """
    AI-generated scripts saved by users.
    Stores custom scripts created from trending content.
    """
    __tablename__ = "user_scripts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Script data
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    trend_id = Column(Integer, ForeignKey("trends.id", ondelete="SET NULL"), nullable=True)

    # Metadata
    language = Column(String, default="en")
    tone = Column(String, nullable=True)  # 'casual', 'professional', etc.
    tags = Column(JSONB, default=[])

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="scripts")


class Trend(Base):
    """
    Таблица найденных трендов.
    Сюда пишем всё, что нашли через поиск и Deep Scan.
    """
    __tablename__ = "trends"

    id = Column(Integer, primary_key=True, index=True)
    platform_id = Column(String, index=True)       # ID видео из TikTok
    url = Column(String, unique=True, index=True)  # Ссылка на видео
    
    # Контент
    description = Column(Text)
    cover_url = Column(String)                     # Обложка
    vertical = Column(String, index=True)          # Тема поиска (bmw, crypto...)
    
    # --- 🎵 ДОБАВЛЕНО ДЛЯ DEEP SCAN ---
    music_id = Column(String, index=True, nullable=True)    # ID звука
    music_title = Column(String, nullable=True)             # Название звука
    
    # Автор
    author_username = Column(String, index=True)
    author_followers = Column(Integer, default=0)
    
    # --- 📊 КОГОРТНЫЙ АНАЛИЗ (Time-based) ---
    # stats = Текущие данные (обновляются при каждом скане)
    stats = Column(JSONB, default={}) 
    # initial_stats = Данные ПЕРВОГО парсинга (Точка А). Не меняются.
    initial_stats = Column(JSONB, default={}) 
    # last_scanned_at = Время последнего обновления
    last_scanned_at = Column(DateTime, default=datetime.utcnow)
    
    # --- 🧠 DEEP SCAN & CLUSTERING ---
    uts_score = Column(Float, default=0.0)         # Главный балл
    # ID визуальной группы (например: 1="Черные гелики", 2="Салон авто")
    cluster_id = Column(Integer, nullable=True, index=True) 
    
    similarity_score = Column(Float, default=0.0)  # Насколько похоже на нас
    reach_score = Column(Float, default=0.0)       # Normalized Reach
    uplift_score = Column(Float, default=0.0)      # Эффективность (L3)
    
    # AI Поля
    ai_summary = Column(Text)                      # Суть тренда
    embedding = Column(Vector(512))                # Вектор CLIP
    
    created_at = Column(DateTime, default=datetime.utcnow)


class ProfileData(Base):
    """
    Таблица для аналитики профилей (Audit & Spy Mode).
    """
    __tablename__ = "profile_data"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    
    # Инфо о канале
    channel_data = Column(JSONB, default={})
    
    # Список последних видео
    recent_videos_data = Column(JSONB, default=[])
    
    # Метрики для быстрой сортировки
    total_videos = Column(Integer, default=0)
    avg_views = Column(Float, default=0.0)
    engagement_rate = Column(Float, default=0.0) # Добавлено для аналитики
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Competitor(Base):
    """
    Таблица для отслеживания конкурентов.
    Сюда добавляются TikTok профили конкурентов для анализа.
    Каждый пользователь имеет свой список competitors.
    """
    __tablename__ = "competitors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # User ID from auth
    username = Column(String, index=True)  # TikTok username

    # Основная информация
    display_name = Column(String)                       # Отображаемое имя
    avatar_url = Column(String)                         # Аватар профиля
    bio = Column(Text)                                  # Описание профиля

    # Метрики профиля
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    total_likes = Column(Integer, default=0)
    total_videos = Column(Integer, default=0)

    # Аналитика
    avg_views = Column(Float, default=0.0)              # Средние просмотры
    engagement_rate = Column(Float, default=0.0)        # % вовлеченности
    posting_frequency = Column(Float, default=0.0)      # Видео в неделю

    # Данные для анализа
    recent_videos = Column(JSONB, default=[])           # Последние видео
    top_hashtags = Column(JSONB, default=[])            # Популярные хэштеги
    content_categories = Column(JSONB, default={})      # Категории контента

    # Статус отслеживания
    is_active = Column(Boolean, default=True)           # Активен ли мониторинг
    last_analyzed_at = Column(DateTime, nullable=True)  # Последний анализ

    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text)                                # Заметки о конкуренте
    
    # Unique constraint: каждый пользователь может добавить канал только один раз
    __table_args__ = (
        UniqueConstraint('user_id', 'username', name='uix_user_username'),
    )