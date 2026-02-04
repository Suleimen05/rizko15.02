<div align="center">
  <img src="client/public/logo192.png" alt="Rizko.ai Logo" width="120" height="120" />
  <h1>Rizko.ai</h1>
  <p><strong>TikTok Trend Analysis Platform</strong></p>
  <p>Fullstack SaaS приложение для анализа трендов социальных сетей с AI-генерацией скриптов, машинным обучением и отслеживанием конкурентов.</p>
</div>

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6)

---

## 📅 Changelog

### 2025-01-29
- ✅ **NEW**: Workflow Builder - визуальный конструктор скриптов (n8n-style)
- ✅ **NEW**: Dev Mode Subscription Upgrade - смена тарифа без Stripe
- ✅ **NEW**: `refreshUser()` функция в AuthContext
- ✅ Fix: Full-width layout для AI pages
- ✅ Fix: Кнопка "Save Video" теперь показывает понятное сообщение для Light mode
- ✅ Fix: Исправлен маппинг `trend_id` для сохранения в избранное

### 2025-01-28
- ✅ Add: Deep Analyze progress component
- ✅ Add: Upgrade modal для PRO features
- ✅ Add: Competitors functionality

### 2025-01-26
- ✅ Add: Unified sidebar with tabs
- ✅ Add: Google OAuth authentication

---

## 🏗️ Архитектура проекта

```
rizko-ai/
├── client/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/        # UI компоненты
│   │   │   └── ui/           # shadcn/ui компоненты
│   │   ├── contexts/         # React contexts (Auth, Theme)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Страницы приложения
│   │   ├── services/         # API клиент
│   │   ├── lib/              # Утилиты
│   │   └── types/            # TypeScript типы
│   ├── public/               # Статические файлы
│   └── package.json
│
├── server/                    # Backend (FastAPI + PostgreSQL)
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   │   ├── routes/       # Роуты (auth, trends, etc.)
│   │   │   └── schemas/      # Pydantic schemas
│   │   ├── core/             # Конфигурация, security
│   │   ├── db/               # Database models
│   │   └── services/         # Business logic
│   ├── alembic/              # Database migrations
│   └── requirements.txt
│
├── ml-service/                # ML Service (CLIP + Claude)
│   ├── app/
│   │   ├── services/         # ML логика
│   │   └── main.py
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Быстрый старт

### Требования
- **Node.js** 18+
- **Python** 3.11+
- **PostgreSQL** 15+ (с pgvector extension)
- **Redis** (опционально, для кэширования)

### 1. Клонирование репозитория

```bash
git clone https://github.com/akyline-ai/trendscout.git
cd trendscout
```

### 2. Настройка Backend (порт 8000)

```bash
cd server

# Создание виртуального окружения
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# или: venv\Scripts\activate  # Windows

# Установка зависимостей
pip install -r requirements.txt

# Создание .env файла
cp .env.example .env
# Отредактируйте .env (см. раздел Environment Variables)

# Миграции базы данных
alembic upgrade head

# Запуск сервера
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Настройка Frontend (порт 5173)

```bash
cd client

# Установка зависимостей
npm install

# Создание .env файла
echo "VITE_API_URL=http://localhost:8000/api" > .env

# Запуск dev сервера
npm run dev
```

### 4. (Опционально) ML Service (порт 8001)

```bash
cd ml-service

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Создание .env
echo "ANTHROPIC_API_KEY=sk-ant-xxx" > .env

python -m app.main
```

**Откройте**: http://localhost:5173

---

## 📦 Ключевые страницы и компоненты

### Frontend Routes

| Route | Компонент | Описание |
|-------|-----------|----------|
| `/dashboard` | `Dashboard.tsx` | Главная страница с метриками |
| `/dashboard/trending` | `Trending.tsx` | Trending видео |
| `/dashboard/discover` | `Discover.tsx` | Поиск по ключевым словам |
| `/dashboard/saved` | `Saved.tsx` | Сохраненные видео |
| `/dashboard/ai-scripts` | `WorkflowBuilder.tsx` | **NEW** Визуальный конструктор скриптов |
| `/dashboard/ai-workspace` | `AIWorkspace.tsx` | AI чат для скриптов |
| `/dashboard/analytics` | `DeepAnalysis.tsx` | Глубокий анализ (PRO) |
| `/dashboard/competitors` | `Competitors.tsx` | Отслеживание конкурентов |
| `/dashboard/pricing` | `Pricing.tsx` | Тарифные планы |
| `/dashboard/settings` | `Settings.tsx` | Настройки пользователя |

### Основные компоненты

```
components/
├── ui/                    # shadcn/ui (Button, Card, Dialog, etc.)
├── Header.tsx             # Верхняя панель (только mobile)
├── UnifiedSidebar.tsx     # Боковая навигация
├── MobileSidebar.tsx      # Мобильное меню
├── DevAccessGate.tsx      # Gate для dev-only страниц
└── VideoCard.tsx          # Карточка видео
```

---

## 🔐 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/register` | Регистрация |
| POST | `/login` | Авторизация |
| POST | `/refresh` | Обновление токена |
| GET | `/me` | Текущий пользователь |
| POST | `/oauth/sync` | Синхронизация OAuth (Google) |
| POST | `/dev/upgrade` | **NEW** Dev mode смена тарифа |

### Trends (`/api/trends`)

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/search` | Поиск трендов |
| GET | `/results` | Результаты поиска |
| GET | `/my-trends` | Тренды пользователя |
| GET | `/limits` | Лимиты пользователя |

### Favorites (`/api/favorites`)

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/` | Список избранного |
| POST | `/` | Добавить в избранное |
| DELETE | `/:id` | Удалить из избранного |
| GET | `/check/:trendId` | Проверить статус |

### AI Scripts (`/api/ai-scripts`)

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/generate` | Генерация скрипта |
| POST | `/chat` | AI чат (Gemini) |

---

## 🔧 Dev Mode: Subscription Upgrade

**Временное решение для смены тарифа без Stripe.**

### Как использовать:

1. Зайдите на `/dashboard/pricing`
2. Нажмите на любой тариф (Creator, Pro, Agency)
3. В модальном окне введите dev-код: **`888`**
4. Нажмите "Upgrade"

### API Endpoint:

```bash
POST /api/auth/dev/upgrade
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "pro",        # free | creator | pro | agency
  "dev_code": "888"
}
```

### Изменение dev-кода:

```python
# server/app/api/routes/auth.py (строка ~378)
DEV_UPGRADE_CODE = "888"  # Измените на свой код
```

⚠️ **В продакшене отключите этот endpoint или используйте сложный код!**

---

## 💎 Subscription Tiers

| Tier | Цена | Rate Limit | Deep Analyze | AI Scripts | Competitors |
|------|------|------------|--------------|------------|-------------|
| **FREE** | $0 | 10 req/min | ❌ | 5/мес | 3 |
| **CREATOR** | $19/мес | 30 req/min | ❌ | 50/мес | 10 |
| **PRO** | $49/мес | 100 req/min | ✅ 20/день | ∞ | 25 |
| **AGENCY** | $149/мес | 500 req/min | ✅ 100/день | ∞ | 100 |

---

## 🔑 Environment Variables

### Backend (`server/.env`)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rizko_db

# Security
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# External APIs
APIFY_API_TOKEN=apify_api_xxx
ML_SERVICE_URL=http://localhost:8001

# Optional
GOOGLE_GEMINI_API_KEY=xxx
REDIS_URL=redis://localhost:6379
```

### Frontend (`client/.env`)

```env
VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
```

### ML Service (`ml-service/.env`)

```env
ANTHROPIC_API_KEY=sk-ant-xxx
PORT=8001
```

---

## 🛠 Технологический стек

### Frontend
- **Vite 6** - Build tool
- **React 19** - UI library
- **TypeScript 5.6** - Type safety
- **Tailwind CSS 3.4** - Styling
- **shadcn/ui** - UI components
- **React Router 7** - Routing
- **Recharts** - Charts
- **Framer Motion** - Animations
- **Sonner** - Toast notifications

### Backend
- **FastAPI** - Web framework
- **SQLAlchemy 2.0** - ORM
- **PostgreSQL 15** + **pgvector** - Database
- **Alembic** - Migrations
- **Pydantic v2** - Validation
- **python-jose** - JWT
- **bcrypt** - Password hashing

### ML Service
- **PyTorch** - Deep learning
- **Transformers** - CLIP model
- **Anthropic Claude** - AI generation
- **scikit-learn** - Clustering

---

## 📁 Важные файлы

### Frontend

```
client/src/
├── App.tsx                    # Роутинг, layouts
├── contexts/AuthContext.tsx   # Аутентификация
├── services/api.ts            # API клиент
├── pages/WorkflowBuilder.tsx  # Workflow Builder (NEW)
├── pages/Pricing.tsx          # Тарифы + Dev upgrade modal
└── types/index.ts             # TypeScript типы
```

### Backend

```
server/app/
├── main.py                    # FastAPI app, CORS
├── api/routes/auth.py         # Auth + Dev upgrade endpoint
├── api/dependencies.py        # get_current_user
├── core/security.py           # JWT, password hashing
├── core/database.py           # DB connection
└── db/models.py               # SQLAlchemy models
```

---

## 🧪 Тестирование

### Backend

```bash
cd server
pytest tests/ -v
```

### Frontend

```bash
cd client
npm run test
npm run lint
npm run build  # Check for build errors
```

---

## 🚢 Production Deployment

### Рекомендуемая конфигурация:

| Сервис | Платформа | Стоимость |
|--------|-----------|-----------|
| Frontend | Cloudflare Pages | Free |
| Backend | Railway / Render | $5-10/мес |
| ML Service | Railway | $5-10/мес |
| Database | Supabase / Neon | Free-$25/мес |

### Cloudflare Pages (Frontend)

```bash
cd client
npm run build
# Деплой dist/ папки через Cloudflare dashboard
```

### Railway (Backend)

```bash
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

---

## 🤝 Команда разработки

### Workflow для разработчиков:

1. **Создайте ветку** от `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Разрабатывайте** и тестируйте локально

3. **Создайте PR** с описанием изменений

4. **Code review** → Merge в `main`

### Код-стайл:

- **Frontend**: ESLint + Prettier
- **Backend**: Black + isort
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`)

---

## 📞 Поддержка

- **Issues**: GitHub Issues
- **Email**: support@rizko.ai

---

**Built with ❤️ by Akyline AI Team**
