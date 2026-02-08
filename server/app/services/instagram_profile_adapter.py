# backend/app/services/instagram_profile_adapter.py

def adapt_instagram_profile_to_posts(profile_item: dict) -> list:
    """
    Adapter for Instagram profile data from apify/instagram-profile-scraper.
    Extracts posts from profile's latestPosts array and converts to standard format.

    Instagram profile structure:
    {
        "username": "nike",
        "fullName": "Nike",
        "followersCount": 298213346,
        "postsCount": 1663,
        "latestPosts": [
            {
                "id": "3823732431648645952",
                "type": "Video",
                "shortCode": "DUQoGM4juNA",
                "url": "https://www.instagram.com/p/DUQoGM4juNA/",
                "caption": "...",
                "videoUrl": "https://...",
                "displayUrl": "https://...",
                "likesCount": 23035,
                "commentsCount": 156,
                "timestamp": "2026-02-07T12:00:00.000Z"
            }
        ]
    }
    """
    try:
        # Check if it's a profile response
        if not profile_item.get("username"):
            print(f"⏭️  Skipping non-profile item")
            return []

        latest_posts = profile_item.get("latestPosts", [])
        if not latest_posts:
            print(f"⏭️  Profile {profile_item.get('username')} has no posts")
            return []

        print(f"📸 Extracting {len(latest_posts)} posts from @{profile_item.get('username')}")

        adapted_posts = []
        for post in latest_posts:
            adapted_post = adapt_instagram_post(post, profile_item)
            if adapted_post:
                adapted_posts.append(adapted_post)

        return adapted_posts

    except Exception as e:
        print(f"⚠️ Instagram profile adapter error: {e}")
        import traceback
        traceback.print_exc()
        return []


def adapt_instagram_post(post: dict, profile: dict = None) -> dict:
    """
    Convert single Instagram post to TikTok-compatible standard format.

    Args:
        post: Instagram post object from latestPosts array
        profile: Optional parent profile object for additional context
    """
    try:
        # Filter: Only videos
        is_video = post.get("type") == "Video" or post.get("videoUrl")
        if not is_video:
            return None  # Skip images

        # Extract author info from post or parent profile
        owner_username = post.get("ownerUsername", "") or (profile.get("username", "") if profile else "")
        owner_fullname = post.get("ownerFullName", "") or (profile.get("fullName", "") if profile else owner_username)
        owner_id = post.get("ownerId", "") or (profile.get("id", "") if profile else "")

        # Extract stats
        stats = {
            "playCount": post.get("videoViewCount", post.get("likesCount", 0)),  # Use likes as proxy if no views
            "diggCount": post.get("likesCount", 0),
            "commentCount": post.get("commentsCount", 0),
            "shareCount": 0,  # Instagram doesn't provide shares
        }

        # Extract author metadata (match TikTok field names)
        author_meta = {
            "id": owner_id,
            "uniqueId": owner_username,  # matches TikTok
            "nickname": owner_fullname,  # matches TikTok
            "fans": profile.get("followersCount", 0) if profile else 0,
            "avatar": profile.get("profilePicUrl", "") if profile else ""
        }

        # Extract video metadata (match TikTok field names)
        video_url = post.get("videoUrl", "")
        display_url = post.get("displayUrl", "")

        video_meta = {
            "cover": display_url,  # matches TikTok
            "url": video_url,
            "playAddr": video_url,  # for inline playback
            "duration": int(post.get("videoDuration", 0) * 1000) if post.get("videoDuration") else 0,  # milliseconds
            "downloadAddr": video_url
        }

        # Parse timestamp
        timestamp = post.get("timestamp", "")
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
            "id": post.get("shortCode", post.get("id", "")),
            "webVideoUrl": post.get("url", ""),
            "text": post.get("caption", ""),
            "createTime": create_time,
            "authorMeta": author_meta,
            "videoMeta": video_meta,
            "stats": stats,
            "playCount": stats["playCount"],
            "diggCount": stats["diggCount"],
            # Instagram-specific fields
            "platform": "instagram",
            "shortCode": post.get("shortCode", ""),
        }

    except Exception as e:
        print(f"⚠️ Instagram post adapter error: {e}")
        import traceback
        traceback.print_exc()
        return None
