"""
Simple in-memory TTL cache for the Care4Animals API.

Why: Supabase free tier has ~3-5s cold-start latency per connection.
Caching static/semi-static data eliminates repeated round-trips.

Cache TTLs:
  - modules list, all lessons by module: 5 minutes (data never changes at runtime)
  - farmer stats, daily feed: 30 seconds (changes after lesson completion)
"""

import time
from typing import Any, Optional

_store: dict[str, tuple[Any, float]] = {}  # key -> (value, expires_at)


def get(key: str) -> Optional[Any]:
    entry = _store.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        del _store[key]
        return None
    return value


def set(key: str, value: Any, ttl: int) -> None:
    _store[key] = (value, time.time() + ttl)


def invalidate(prefix: str) -> None:
    """Remove all keys that start with the given prefix."""
    keys_to_delete = [k for k in _store if k.startswith(prefix)]
    for k in keys_to_delete:
        del _store[k]


def clear() -> None:
    _store.clear()


# TTL constants (seconds)
TTL_STATIC = 300   # 5 min — modules list, lesson content (never changes)
TTL_FARMER = 30    # 30 sec — per-farmer stats and daily feed
