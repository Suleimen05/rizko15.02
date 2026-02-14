<div align="center">
  <h1>Rizko.ai — TrendScout</h1>
  <p><strong>AI-powered TikTok Trend Analysis & Script Generation Platform</strong></p>
</div>

## Quick Start

### Requirements

- **Node.js** 18+
- **Python** 3.11+
- **PostgreSQL** (Supabase recommended)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/Suleimen05/rizko15.02.git
cd rizko15.02
```

Create `.env` in the project root:

```env
# Database (Supabase connection pooling)
DATABASE_URL=postgresql://user:password@host:6543/postgres

# Security
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# API Keys
GEMINI_API_KEY=your-gemini-api-key
APIFY_API_TOKEN=your-apify-token
ANTHROPIC_API_KEY=your-anthropic-key        # optional
OPENAI_API_KEY=your-openai-key              # optional

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Frontend
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_DEV_ACCESS=true
VITE_DEV_PASSWORD=888
```

### 2. Backend (port 8000)

```bash
cd server
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server starts at `http://localhost:8000`. API docs: `http://localhost:8000/docs`

### 3. Frontend (port 5173)

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`

### 4. ML Service (optional, port 8001)

```bash
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind + shadcn/ui |
| Backend | FastAPI + SQLAlchemy 2.0 + Pydantic v2 |
| Database | PostgreSQL (Supabase) |
| AI | Google Gemini 2.0 Flash, Claude 3.5, GPT-4o |
| Auth | JWT + Google OAuth |
| i18n | react-i18next (EN + RU) |

## Project Structure

```
trendscout/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # UI components + workflow
│   │   ├── contexts/        # Auth, Chat, Workflow contexts
│   │   ├── hooks/           # useLanguage, useTikTok
│   │   ├── lib/             # i18n, config, utils
│   │   ├── pages/           # 28 page components
│   │   └── services/        # API client (api.ts)
│   └── public/locales/      # EN/RU translation files
│
├── server/                  # Python backend
│   └── app/
│       ├── api/             # REST endpoints
│       ├── core/            # DB, security, config
│       ├── db/              # SQLAlchemy models
│       └── services/        # Business logic, AI, collectors
│
└── ml-service/              # ML microservice (CLIP)
```

## Key Features

- **Trend Discovery** — search TikTok trends by keyword, hashtag, region
- **Deep Analysis** — AI-powered video analysis with UTS scoring
- **Workflow Builder** — visual node-based script generation pipeline (n8n-style)
- **AI Video Analyst** — chat with AI about any video (credit system)
- **AI Script Writer** — generate viral scripts with Gemini/Claude/GPT-4o
- **Competitor Tracking** — monitor competitor accounts
- **Credit System** — monthly credits + rollover + bonus, per-model pricing
- **i18n** — full English + Russian localization
- **PWA** — installable progressive web app

## API Overview

| Group | Prefix | Key Endpoints |
|-------|--------|--------------|
| Auth | `/api/auth` | register, login, refresh, oauth/sync |
| Trends | `/api/trends` | search, results, limits |
| Favorites | `/api/favorites` | CRUD, save-video, tags |
| AI Scripts | `/api/ai-scripts` | generate, chat |
| Workflows | `/api/workflows` | CRUD, execute, upload-video-file |
| Competitors | `/api/competitors` | CRUD, spy, refresh |
| Chat Sessions | `/api/chat-sessions` | sessions, messages, credits |

## Subscription Tiers

| Tier | Credits/mo | Deep Analyze | AI Scripts | Competitors |
|------|-----------|--------------|------------|-------------|
| Free | 100 | — | 5/mo | 3 |
| Creator ($19) | 1,000 | — | 50/mo | 10 |
| Pro ($49) | 5,000 | 20/day | Unlimited | 25 |
| Agency ($149) | 10,000 | 100/day | Unlimited | 100 |

Dev upgrade: go to Pricing → enter code `888`

## Deployment

| Service | Platform | Cost |
|---------|----------|------|
| Frontend | Cloudflare Pages | Free |
| Backend | Railway | ~$5/mo |
| Database | Supabase | Free tier |

```bash
# Build frontend
cd client && npm run build
# Deploy dist/ to Cloudflare Pages

# Backend on Railway
# Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
