from __future__ import annotations

import threading
import uuid
from contextlib import contextmanager

from app.config import settings

try:
    from redis import Redis
    from redis.exceptions import RedisError
except Exception:  # pragma: no cover - optional dependency at import time
    Redis = None
    RedisError = Exception


_LOCAL_LOCKS: dict[str, threading.Lock] = {}
_LOCAL_GUARD = threading.Lock()


def _slot_key(appointment_type_id: int, resource_id: int | None, start_time_iso: str) -> str:
    return f"slot:{appointment_type_id}:{resource_id if resource_id is not None else 'none'}:{start_time_iso}"


class SlotLockManager:
    def __init__(self) -> None:
        self.redis_url = settings.lock_redis_url
        self.ttl_seconds = settings.slot_lock_ttl_seconds
        self._redis_client: Redis | None = None
        self._redis_disabled = False

    def _get_redis(self):
        if self._redis_disabled or not self.redis_url or Redis is None:
            return None
        if self._redis_client is None:
            try:
                self._redis_client = Redis.from_url(self.redis_url, decode_responses=True)
                self._redis_client.ping()
            except RedisError:
                self._redis_disabled = True
                self._redis_client = None
        return self._redis_client

    def acquire(self, key: str):
        redis_client = self._get_redis()
        if redis_client is not None:
            token = str(uuid.uuid4())
            try:
                ok = redis_client.set(key, token, nx=True, ex=self.ttl_seconds)
            except RedisError:
                ok = False
            if ok:
                return ("redis", token)
        with _LOCAL_GUARD:
            lock = _LOCAL_LOCKS.get(key)
            if lock is None:
                lock = threading.Lock()
                _LOCAL_LOCKS[key] = lock
        if lock.acquire(blocking=False):
            return ("local", lock)
        return (None, None)

    def release(self, key: str, handle) -> None:
        backend, token_or_lock = handle
        if backend == "redis":
            redis_client = self._get_redis()
            if redis_client is None:
                return
            script = """
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
"""
            try:
                redis_client.eval(script, 1, key, token_or_lock)
            except RedisError:
                return
        if backend == "local" and token_or_lock is not None:
            token_or_lock.release()


slot_lock_manager = SlotLockManager()


@contextmanager
def slot_lock(appointment_type_id: int, resource_id: int | None, start_time_iso: str):
    key = _slot_key(appointment_type_id, resource_id, start_time_iso)
    handle = slot_lock_manager.acquire(key)
    if handle[0] is None:
        raise ValueError("Slot is being booked right now. Please retry.")
    try:
        yield
    finally:
        slot_lock_manager.release(key, handle)
