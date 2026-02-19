<div align="center">
  <h1>Rizko.ai</h1>
  <p><strong>AI-powered Content Intelligence Platform for TikTok Creators</strong></p>
  <p>Trend discovery, competitor analysis, AI scriptwriting, automated video curation with Gemini Vision</p>
</div>

---

## Architecture

```
┌─────────────────┐
│  Cloudflare     │
│  Pages          │  Frontend (React 19 + TypeScript)
│  Port: 443      │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐  ┌────▼──────────┐
│  Railway.app    │  │  Railway.app  │
│  Backend API    │  │  ML Service   │
│  Port: 8000     │  │  Port: 8001   │
└────────┬────────┘  └───────────────┘
         │
┌────────▼────────┐
│  Supabase       │
│  PostgreSQL     │
│  + pgvector     │
└─────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind CSS + Radix/Shadcn UI |
| Backend | FastAPI + SQLAlchemy 2.0 + Pydantic v2 |
| Database | PostgreSQL (Supabase) + pgvector |
| AI Models | Gemini 2.5 Flash (text + vision + image gen), Claude 3.5, GPT-4o |
| Scraping | Apify Client (TikTok, Instagram) |
| Auth | JWT + Google OAuth2 |
| Payments | Stripe |
| Scheduler | APScheduler |
| i18n | react-i18next (EN + RU) |
| Media | yt-dlp + Pillow + pillow-heif |

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Analytics overview, UTS scores, project activity stats |
| **Trending** | Real-time TikTok trend discovery with keyword/hashtag/region filters |
| **Discover** | AI-powered video discovery filtered by project niche profile |
| **Super Vision** | Automated AI-curated video search: scrapes TikTok, scores with Gemini text + Vision, runs on schedule (PRO+) |
| **Deep Analysis** | In-depth video analysis — Gemini Vision watches the video and provides detailed breakdown |
| **AI Workspace** | Multi-model AI chat: GPT-4o, Claude 3.5, Gemini 2.5, **Nano Bana** (AI image generation) |
| **AI Scripts** | Auto-generated viral content scripts based on trending videos and project profile |
| **Competitors** | Competitor account monitoring, tracking, stats comparison |
| **Competitor Feed** | Live feed of competitor content with AI analysis |
| **Account Search** | TikTok/Instagram account search and analytics |
| **Projects** | Multi-project management with niche profiles (keywords, anti-keywords, tone, audience) |
| **Workflow Builder** | Visual drag-and-drop automation workflows (n8n-style) |
| **Marketplace** | Template and workflow marketplace |
| **Saved / My Videos** | Bookmarked videos and personal collection |
| **Credit System** | Per-action credits with monthly allocation, rollover, and bonus |

## Super Vision Pipeline

6-step automated video discovery (PRO/Agency only):

```
1. Scrape        → Apify TikTok search by project keywords (up to 200 videos)
2. Views Filter  → Remove videos below min_views threshold
3. Metadata      → Remove anti-keyword matches
4. AI Text Score → Gemini Flash evaluates metadata relevance (0-100)
5. Gemini Vision → Top N videos downloaded & analyzed visually (0-100)
6. Store Results → final_score = 40% text + 60% vision, deduplicated
```

Runs automatically every 8-24 hours per project via APScheduler.

## Project Structure

```
trendscout/
├── client/                     # React Frontend
│   ├── public/
│   │   └── locales/            # i18n translations (en/, ru/)
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── ui/             # Shadcn/ui library (50+ components)
│   │   │   ├── VideoCard.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── AIScriptGenerator.tsx
│   │   │   └── ...
│   │   ├── contexts/           # React contexts (Auth, Chat, Project, Workflow)
│   │   ├── hooks/              # Custom hooks (useLanguage, useTikTok, etc.)
│   │   ├── lib/                # Utilities, i18n config
│   │   ├── pages/              # 32 page components
│   │   ├── services/           # API client (api.ts)
│   │   └── types/              # TypeScript interfaces
│   └── vite.config.ts
│
├── server/                     # FastAPI Backend
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   ├── routes/         # Auth, OAuth, Stripe, Feedback, Insights, Usage
│   │   │   ├── schemas/        # Pydantic request/response models
│   │   │   ├── trends.py
│   │   │   ├── projects.py
│   │   │   ├── competitors.py
│   │   │   ├── chat_sessions.py
│   │   │   ├── super_vision.py
│   │   │   └── ...
│   │   ├── db/                 # SQLAlchemy models
│   │   ├── services/           # Business logic
│   │   │   ├── collector.py            # Apify TikTok scraping
│   │   │   ├── video_analyzer.py       # Gemini Vision analysis
│   │   │   ├── project_filter.py       # AI-powered video filtering
│   │   │   ├── super_vision_pipeline.py # Super Vision 6-step pipeline
│   │   │   ├── scheduler.py            # APScheduler integration
│   │   │   ├── storage.py              # File upload/storage
│   │   │   └── ...
│   │   └── main.py             # App entry, migrations, startup
│   ├── uploads/                # Generated images, thumbnails
│   ├── Dockerfile
│   └── requirements.txt
│
└── ml-service/                 # ML microservice
    ├── app/
    ├── Dockerfile
    └── requirements.txt
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (or Supabase account)

### 1. Environment

Create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@host:6543/postgres
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GEMINI_API_KEY=your-gemini-api-key
APIFY_API_TOKEN=your-apify-token
ANTHROPIC_API_KEY=your-anthropic-key        # optional
OPENAI_API_KEY=your-openai-key              # optional
ENVIRONMENT=development
DEV_UPGRADE_CODE=888
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Rizko.ai
VITE_APP_VERSION=1.0.0
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 2. Backend (port 8000)

```bash
cd server
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend (port 5173)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

### 4. ML Service (optional, port 8001)

```bash
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

## API Endpoints

| Prefix | Router | Description |
|--------|--------|-------------|
| `/api/auth` | `routes/auth.py` | Registration, login, JWT, refresh |
| `/api/oauth` | `routes/oauth.py` | Google OAuth2 flow |
| `/api/trends` | `trends.py` | TikTok trend scraping & filtering |
| `/api/projects` | `projects.py` | Project CRUD, niche profiles |
| `/api/competitors` | `competitors.py` | Competitor account monitoring |
| `/api/super-vision` | `super_vision.py` | Super Vision config, results, triggers |
| `/api/chat-sessions` | `chat_sessions.py` | Multi-model AI chat (GPT-4o, Claude, Gemini, Nano Bana) |
| `/api/ai-scripts` | `ai_scripts.py` | AI script generation |
| `/api/favorites` | `favorites.py` | Video bookmarks |
| `/api/profiles` | `profiles.py` | User profiles |
| `/api/workflows` | `workflows.py` | Workflow CRUD and execution |
| `/api/stripe` | `routes/stripe.py` | Subscription payments |
| `/api/usage` | `routes/usage.py` | Credit usage tracking |
| `/api/feedback` | `routes/feedback.py` | User feedback |
| `/api/insights` | `routes/insights.py` | Analytics insights |

## Subscription Tiers

| Feature | Free | Creator ($19) | Pro ($49) | Agency ($149) |
|---------|------|---------------|-----------|---------------|
| Credits/mo | 100 | 1,000 | 5,000 | 10,000 |
| Trending videos | 50/day | 200/day | Unlimited | Unlimited |
| AI Scripts | 5/mo | 50/mo | Unlimited | Unlimited |
| Deep Analysis | — | — | 20/day | 100/day |
| Super Vision | — | — | 2 configs | 10 configs |
| AI Chat | 10 msg/day | 50 msg/day | Unlimited | Unlimited |
| Projects | 1 | 3 | 10 | Unlimited |
| Competitors | 3 | 10 | 25 | 100 |

Dev upgrade: Pricing page → enter code `888`

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Cloudflare Pages | `npm run build` → deploy `dist/` |
| Backend | Railway | Docker, auto-deploy from git |
| ML Service | Railway | Separate service, port 8001 |
| Database | Supabase | PostgreSQL + pgvector, free tier |

## i18n

- **Languages**: English (default), Russian
- **Stack**: react-i18next + i18next-browser-languagedetector
- **Config**: `src/lib/i18n.ts`
- **Translations**: `public/locales/{en,ru}/*.json`
- **Pattern**: `useTranslation('namespace')` in components
