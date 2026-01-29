"""
ML Service - Microservice for Machine Learning operations
Handles CLIP embeddings, image analysis, and AI text generation
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os

from .services.clip_service import get_text_embedding, get_image_embedding
from .services.ai_service import generate_trend_summary

app = FastAPI(
    title="Risko.ai ML Service",
    version="1.0.0",
    description="Machine Learning microservice for Risko.ai"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В production укажите конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class TextEmbeddingRequest(BaseModel):
    text: str

class ImageEmbeddingRequest(BaseModel):
    image_url: str

class BatchImageEmbeddingRequest(BaseModel):
    image_urls: List[str]

class TrendSummaryRequest(BaseModel):
    description: str
    views: int
    cover_url: Optional[str] = None

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimension: int

class BatchEmbeddingResponse(BaseModel):
    embeddings: List[Optional[List[float]]]
    success_count: int
    failed_count: int

class SummaryResponse(BaseModel):
    summary: str


# Health Check
@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "ML Service",
        "version": "1.0.0",
        "models": {
            "clip": "openai/clip-vit-base-patch32",
            "llm": "claude-3-5-haiku-20241022"
        }
    }


# CLIP Embeddings
@app.post("/embeddings/text", response_model=EmbeddingResponse)
def create_text_embedding(request: TextEmbeddingRequest):
    """Generate CLIP embedding for text"""
    try:
        embedding = get_text_embedding(request.text)
        if embedding is None:
            raise HTTPException(status_code=500, detail="Failed to generate text embedding")

        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embeddings/image", response_model=EmbeddingResponse)
def create_image_embedding(request: ImageEmbeddingRequest):
    """Generate CLIP embedding for image"""
    try:
        embedding = get_image_embedding(request.image_url)
        if embedding is None:
            raise HTTPException(status_code=500, detail="Failed to generate image embedding")

        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embeddings/batch-images", response_model=BatchEmbeddingResponse)
def create_batch_image_embeddings(request: BatchImageEmbeddingRequest):
    """Generate CLIP embeddings for multiple images"""
    embeddings = []
    success_count = 0
    failed_count = 0

    for url in request.image_urls:
        try:
            embedding = get_image_embedding(url)
            if embedding:
                embeddings.append(embedding)
                success_count += 1
            else:
                embeddings.append(None)
                failed_count += 1
        except:
            embeddings.append(None)
            failed_count += 1

    return BatchEmbeddingResponse(
        embeddings=embeddings,
        success_count=success_count,
        failed_count=failed_count
    )


# AI Text Generation
@app.post("/ai/trend-summary", response_model=SummaryResponse)
def create_trend_summary(request: TrendSummaryRequest):
    """Generate AI summary for a trend"""
    try:
        summary = generate_trend_summary(
            description=request.description,
            views=request.views,
            cover_url=request.cover_url
        )

        return SummaryResponse(summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
