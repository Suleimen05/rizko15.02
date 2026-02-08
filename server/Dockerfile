FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for yt-dlp and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use $PORT from Railway (default 8000)
ENV PORT=8000

# Run migrations then start server
CMD sh -c "echo '=== Starting Rizko.ai ===' && alembic upgrade head && echo '=== Migrations done ===' && uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level info"
