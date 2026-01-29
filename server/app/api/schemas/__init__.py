"""
Pydantic Schemas for API Request/Response Validation.

All schemas are organized by domain:
- auth: Authentication & user management
- trends: Trend search & analysis
- favorites: User favorites/bookmarks
- scripts: AI-generated scripts
- chat: AI chat history
- competitors: Competitor tracking
"""

from .auth import *
from .trends import *
from .favorites import *
from .scripts import *
from .chat import *
from .competitors import *
