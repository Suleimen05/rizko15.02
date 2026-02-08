# backend/app/services/instagram_adapter.py

def adapt_instagram_to_standard(item: dict) -> dict:
    """
    Adapter for Instagram data from Apify (apify/instagram-scraper).
    Converts raw Instagram JSON to our standard format compatible with TikTok structure.

    Instagram post structure:
    {
        "id": "post_id",
        "shortCode": "ABC123",
        "url": "https://www.instagram.com/p/ABC123/",
        "caption": "Post caption text...",
        "displayUrl": "https://...", # Main image/video thumbnail
        "videoUrl": "https://...",   # Video URL if it's a video post
        "likesCount": 1234,
        "commentsCount": 56,
        "timestamp": "2024-01-01T12:00:00.000Z",
        "ownerUsername": "username",
        "ownerFullName": "Full Name",
        "ownerId": "12345",
        "type": "Video" or "Image"
    }
    """
    try:
        # Check if it's Instagram data
        if not item.get("shortCode") and not item.get("url"):
            return None

        # Determine if it's a video or image
        is_video = item.get("type") == "Video" or item.get("videoUrl")

        # For images, we skip them or treat them as zero-duration videos
        if not is_video:
            print(f"⏭️  Skipping Instagram image post: {item.get('shortCode')}")
            return None  # We only want videos for now

        # Extract stats
        stats = {
            "playCount": item.get("videoViewCount", item.get("likesCount", 0)),  # Use likes as proxy if no views
            "diggCount": item.get("likesCount", 0),
            "commentCount": item.get("commentsCount", 0),
            "shareCount": 0,  # Instagram API doesn't provide shares
        }

        # Extract author info (match TikTok field names)
        author_meta = {
            "id": item.get("ownerId", ""),
            "uniqueId": item.get("ownerUsername", ""),  # Changed from "name" to match TikTok
            "nickname": item.get("ownerFullName", item.get("ownerUsername", "")),  # Changed from "nickName" to match TikTok
            "fans": 0,  # Not provided by scraper
            "avatar": ""  # Not provided by scraper
        }

        # Extract video metadata (match TikTok field names)
        video_url = item.get("videoUrl", "")
        display_url = item.get("displayUrl", "")  # Thumbnail

        video_meta = {
            "cover": display_url,  # Changed from "coverUrl" to match TikTok
            "url": video_url,  # Direct video URL for playback
            "playAddr": video_url,  # Add playAddr field for inline playback
            "duration": int(item.get("videoDuration", 0) * 1000) if item.get("videoDuration") else 0,  # Convert to milliseconds
            "downloadAddr": video_url
        }

        # Parse timestamp
        timestamp = item.get("timestamp", "")
        create_time = 0
        if timestamp:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                create_time = int(dt.timestamp())
            except:
                create_time = 0

        # Build standardized structure
        return {
            "id": item.get("shortCode", item.get("id", "")),
            "webVideoUrl": item.get("url", ""),
            "text": item.get("caption", ""),
            "createTime": create_time,
            "authorMeta": author_meta,
            "videoMeta": video_meta,
            "stats": stats,
            "playCount": stats["playCount"],
            "diggCount": stats["diggCount"],
            # Instagram-specific fields
            "platform": "instagram",
            "shortCode": item.get("shortCode", ""),
        }

    except Exception as e:
        print(f"⚠️ Instagram adapter error: {e}")
        import traceback
        traceback.print_exc()
        return None
