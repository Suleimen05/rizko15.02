# backend/app/api/proxy.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/image")
async def proxy_image(url: str):
    """
    Проксирует изображения с TikTok CDN для обхода CORS
    """
    if not url or not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL")

    try:
        # Extended headers to bypass TikTok CDN restrictions
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://www.tiktok.com/",
            "Origin": "https://www.tiktok.com",
            "Sec-Fetch-Dest": "image",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site",
            "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
        }

        async with httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            verify=False  # Bypass SSL verification for CDN
        ) as client:
            response = await client.get(url, headers=headers)

            if response.status_code == 200:
                return Response(
                    content=response.content,
                    media_type=response.headers.get("content-type", "image/jpeg"),
                    headers={
                        "Cache-Control": "public, max-age=86400",  # 24 hours
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET",
                    }
                )
            else:
                logger.error(f"Proxy failed: {response.status_code} for {url}")
                # Return placeholder on failure instead of error
                raise HTTPException(status_code=response.status_code, detail="Image not available")

    except httpx.TimeoutException:
        logger.error(f"Proxy timeout for {url}")
        raise HTTPException(status_code=504, detail="Image fetch timeout")
    except Exception as e:
        logger.error(f"Proxy error for {url}: {str(e)}")
        raise HTTPException(status_code=500, detail="Image proxy failed")
