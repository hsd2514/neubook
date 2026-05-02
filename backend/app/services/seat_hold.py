"""Temporary seat holds using Redis (with in-memory fallback).

When a customer selects seats, they're held for HOLD_TTL seconds so nobody
else can grab them mid-checkout. Holds are keyed by:
  seat_hold:{appointment_type_id}:{slot_start_iso}:{seat_id}
Value is the user_id that holds it.
"""

from __future__ import annotations

import threading
import time
from app.config import settings

try:
    from redis import Redis
    from redis.exceptions import RedisError
except Exception:
    Redis = None
    RedisError = Exception

HOLD_TTL = 300  # 5 minutes

_local_holds: dict[str, tuple[int, float]] = {}  # key -> (user_id, expire_ts)
_local_guard = threading.Lock()


def _get_redis() -> Redis | None:
    url = settings.lock_redis_url
    if not url or Redis is None:
        return None
    try:
        client = Redis.from_url(url, decode_responses=True)
        client.ping()
        return client
    except (RedisError, Exception):
        return None


def _key(appointment_type_id: int, slot_start: str, seat_id: int) -> str:
    return f"seat_hold:{appointment_type_id}:{slot_start}:{seat_id}"


def hold_seats(
    appointment_type_id: int,
    slot_start: str,
    seat_ids: list[int],
    user_id: int,
) -> dict:
    """Try to hold seats for user. Returns {held: [...], failed: [...]}."""
    redis = _get_redis()
    held = []
    failed = []

    for sid in seat_ids:
        k = _key(appointment_type_id, slot_start, sid)
        if redis:
            try:
                existing = redis.get(k)
                if existing and int(existing) != user_id:
                    failed.append(sid)
                    continue
                redis.set(k, str(user_id), ex=HOLD_TTL)
                held.append(sid)
            except RedisError:
                _hold_local(k, user_id, held, failed, sid)
        else:
            _hold_local(k, user_id, held, failed, sid)

    return {"held": held, "failed": failed}


def _hold_local(k: str, user_id: int, held: list, failed: list, sid: int):
    now = time.time()
    with _local_guard:
        entry = _local_holds.get(k)
        if entry and entry[0] != user_id and entry[1] > now:
            failed.append(sid)
        else:
            _local_holds[k] = (user_id, now + HOLD_TTL)
            held.append(sid)


def release_seats(
    appointment_type_id: int,
    slot_start: str,
    seat_ids: list[int],
    user_id: int,
) -> int:
    """Release holds owned by user_id. Returns count released."""
    redis = _get_redis()
    count = 0
    for sid in seat_ids:
        k = _key(appointment_type_id, slot_start, sid)
        if redis:
            try:
                script = """
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
"""
                result = redis.eval(script, 1, k, str(user_id))
                if result:
                    count += 1
            except RedisError:
                count += _release_local(k, user_id)
        else:
            count += _release_local(k, user_id)
    return count


def _release_local(k: str, user_id: int) -> int:
    with _local_guard:
        entry = _local_holds.get(k)
        if entry and entry[0] == user_id:
            del _local_holds[k]
            return 1
    return 0


def get_held_seat_ids(
    appointment_type_id: int,
    slot_start: str,
    seat_ids: list[int],
    exclude_user_id: int | None = None,
) -> list[int]:
    """Return seat IDs that are currently held by OTHER users."""
    redis = _get_redis()
    held = []
    now = time.time()

    for sid in seat_ids:
        k = _key(appointment_type_id, slot_start, sid)
        if redis:
            try:
                val = redis.get(k)
                if val:
                    owner = int(val)
                    if exclude_user_id is None or owner != exclude_user_id:
                        held.append(sid)
            except RedisError:
                held += _check_local(k, exclude_user_id, now, sid)
        else:
            held += _check_local(k, exclude_user_id, now, sid)

    return held


def _check_local(k: str, exclude_user_id: int | None, now: float, sid: int) -> list[int]:
    with _local_guard:
        entry = _local_holds.get(k)
        if entry and entry[1] > now:
            if exclude_user_id is None or entry[0] != exclude_user_id:
                return [sid]
        elif entry:
            del _local_holds[k]
    return []
