# backend/app/services/instagram_collector.py
import os
from typing import List
from apify_client import ApifyClient

class InstagramCollector:
    """
    Instagram content collector using Apify actor.

    Supports multiple modes:
    - "search": Search by hashtags or keywords
    - "profile": Get posts from specific user profiles
    - "urls": Fetch specific posts by URL (for rescan)
    """

    def __init__(self):
        token = os.getenv("APIFY_API_TOKEN")
        if not token:
            print("⚠️ WARNING: APIFY_API_TOKEN not found in .env")
            self.client = None
        else:
            self.client = ApifyClient(token)

        # Using apify/instagram-profile-scraper actor (WORKING - 57M+ runs)
        # Old apify/instagram-scraper returns errors
        # https://apify.com/apify/instagram-profile-scraper
        self.actor_id = "apify/instagram-profile-scraper"

    def collect(self, targets: List[str], limit: int = 30, mode: str = "search", is_deep: bool = False):
        """
        Collect Instagram content.

        Args:
            targets: List of usernames, hashtags, or URLs depending on mode
            limit: Maximum number of items to collect
            mode: Collection mode - "search", "profile", or "urls"
            is_deep: Whether to collect additional metadata (not used yet)

        Returns:
            List of raw Instagram post data from Apify
        """
        if not self.client or not targets:
            return []

        # Adjust limit for URL mode
        final_limit = len(targets) if mode == "urls" else limit

        print(f"📸 Instagram Collector: Mode '{mode}', Deep: {is_deep}. Targets: {len(targets)}. Limit: {final_limit}")

        # Base configuration
        run_input = {
            "resultsLimit": final_limit,
        }

        # Mode-specific configuration
        if mode == "urls":
            # Direct URLs mode - fetch specific posts
            print(f"🤖 Instagram: Fetching {len(targets)} specific posts...")
            run_input["directUrls"] = targets

        elif mode == "profile":
            # Profile mode - get posts from user profiles
            usernames = []
            for t in targets:
                # Clean username (remove @ and URL parts)
                clean_username = t.strip().replace("@", "").replace("https://www.instagram.com/", "").strip("/")
                usernames.append(clean_username)

            print(f"🤖 Instagram: Fetching posts from {len(usernames)} profiles...")
            run_input["usernames"] = usernames
            # Note: instagram-profile-scraper returns profile with latestPosts array

        else:
            # Search mode - treat as profile mode for instagram-profile-scraper
            # Convert hashtags/keywords to popular brand profiles as workaround
            # Instagram doesn't support hashtag search without login
            usernames = []
            for t in targets:
                # Map common keywords to popular profiles
                keyword_to_profile = {
                    'fitness': 'nike',
                    'fashion': 'zara',
                    'food': 'foodnetwork',
                    'travel': 'natgeo',
                    'beauty': 'sephora',
                    'sports': 'espn',
                    'tech': 'apple',
                    'music': 'spotify'
                }

                clean = t.strip().lower().replace("#", "")
                username = keyword_to_profile.get(clean, t.strip().replace("#", ""))
                usernames.append(username)

            print(f"🤖 Instagram: Mapping keywords to profiles: {usernames}")
            run_input["usernames"] = usernames

        try:
            # Run the actor
            print(f"🚀 Starting Instagram actor: {self.actor_id}")
            run = self.client.actor(self.actor_id).call(run_input=run_input)

            if not run:
                print("❌ Instagram actor run failed")
                return []

            # Get results from dataset
            dataset = self.client.dataset(run["defaultDatasetId"])
            raw_items = list(dataset.iterate_items())
            print(f"📦 Instagram: Received {len(raw_items)} raw items.")

            # Debug: Print first item structure
            if raw_items:
                import json
                first = raw_items[0]
                print("🔍 DEBUG: First Instagram item keys:", list(first.keys())[:20])

                # Check for common Instagram fields
                debug_fields = ['url', 'shortCode', 'caption', 'displayUrl', 'videoUrl', 'likesCount', 'commentsCount']
                found_fields = {k: str(first.get(k, 'N/A'))[:50] for k in debug_fields if k in first}
                print(f"🔍 DEBUG: Instagram fields found: {found_fields}")

            return raw_items

        except Exception as exc:
            print(f"⚠️ Instagram Apify error: {exc}")
            import traceback
            traceback.print_exc()
            return []
