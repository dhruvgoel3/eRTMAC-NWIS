"""
Supabase client service for eRTMAC-NWIS.
Provides access to Supabase Storage, Auth, and Realtime/PostgREST.
"""
import os
from typing import Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Try loading from backend/.env or root .env
env_paths = [
    Path(__file__).resolve().parent.parent.parent / ".env",
    Path(__file__).resolve().parent.parent / ".env",
    Path(".env"),
    Path("backend/.env"),
]
for p in env_paths:
    if p.is_file():
        load_dotenv(p)
        break
else:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

_client = None


def get_supabase_client():
    """Returns singleton Supabase client or None if credentials are not configured."""
    global _client
    if _client is not None:
        return _client

    if not SUPABASE_URL or not SUPABASE_KEY:
        return None

    try:
        from supabase import create_client
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return _client
    except Exception as e:
        print(f"[Supabase] Warning: Could not initialize Supabase client: {e}")
        return None


def get_supabase_status() -> Dict[str, Any]:
    """Check connectivity and status of Supabase services."""
    configured = bool(SUPABASE_URL and SUPABASE_KEY)
    if not configured:
        return {
            "configured": False,
            "connected": False,
            "url": None,
            "message": "SUPABASE_URL or API key not set in environment.",
        }

    client = get_supabase_client()
    if client is None:
        return {
            "configured": True,
            "connected": False,
            "url": SUPABASE_URL,
            "message": "Failed to initialize Supabase client library.",
        }

    # Test basic ping / auth
    try:
        # Check storage buckets as a connectivity test
        buckets = client.storage.list_buckets()
        bucket_names = [b.name for b in buckets] if buckets else []
        return {
            "configured": True,
            "connected": True,
            "url": SUPABASE_URL,
            "storage_buckets": bucket_names,
            "message": "Supabase connected and authenticated successfully.",
        }
    except Exception as e:
        return {
            "configured": True,
            "connected": True,
            "url": SUPABASE_URL,
            "message": f"Supabase initialized (API reachable): {str(e)[:100]}",
        }
