# backend/app/api/proxy.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx

router = APIRouter()


@router.get("/image")
async def proxy_image(url: str):
    """
    Проксирует изображения с TikTok CDN для обхода CORS
    """
    if not url or not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://www.tiktok.com/",
                }
            )

            if response.status_code == 200:
                return Response(
                    content=response.content,
                    media_type=response.headers.get("content-type", "image/jpeg"),
                    headers={
                        "Cache-Control": "public, max-age=86400",  # 24 hours
                    }
                )
            else:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch image")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")
