"""
Image Proxy API
Proxies images from TikTok/Instagram CDN to bypass CORS and referrer restrictions.
"""

import logging
import requests
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/proxy")
async def proxy_image(url: str = Query(..., description="Image URL to proxy")):
    """
    Proxy an image from external CDN (TikTok/Instagram).

    This endpoint:
    1. Downloads the image from the provided URL with proper headers
    2. Returns the image data to the client
    3. Bypasses CORS and referrer restrictions

    Args:
        url: The image URL to proxy (from TikTok CDN, Instagram CDN, etc.)

    Returns:
        Image binary data with appropriate content-type header
    """
    try:
        # Headers to bypass TikTok/Instagram restrictions
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.tiktok.com/',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site'
        }

        # Download image
        logger.info(f"📥 Proxying image: {url[:100]}...")
        response = requests.get(url, headers=headers, timeout=10, stream=True)
        response.raise_for_status()

        # Get content type
        content_type = response.headers.get('content-type', 'image/jpeg')

        # Return image
        return Response(
            content=response.content,
            media_type=content_type,
            headers={
                'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
                'Access-Control-Allow-Origin': '*',  # Allow CORS
            }
        )

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to proxy image {url}: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch image from source: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error proxying image: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
