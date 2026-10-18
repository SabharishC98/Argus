"""
MongoDB connection and collection helpers using Motor (async driver).
Provides an in-memory fallback so the application runs seamlessly even if MongoDB is offline.
"""

from __future__ import annotations

import copy
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_client: Optional[Any] = None
_db: Optional[Any] = None


class InMemoryCursor:
    """Async cursor mimicking Motor cursor over an in-memory list of dicts."""

    def __init__(self, docs: List[Dict[str, Any]]):
        self._docs = list(docs)
        self._skip = 0
        self._limit = len(self._docs)

    def sort(self, key_or_list: Any, direction: int = 1) -> "InMemoryCursor":
        key = key_or_list if isinstance(key_or_list, str) else key_or_list[0]
        reverse = direction < 0
        self._docs.sort(key=lambda d: d.get(key, 0) or 0, reverse=reverse)
        return self

    def skip(self, n: int) -> "InMemoryCursor":
        self._skip = n
        return self

    def limit(self, n: int) -> "InMemoryCursor":
        self._limit = n
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        sliced = self._docs[self._skip : self._skip + (length or self._limit)]
        return [copy.deepcopy(d) for d in sliced]


class InMemoryCollection:
    """In-memory collection satisfying the Motor collection interface used by routes."""

    def __init__(self, name: str):
        self.name = name
        self._data: List[Dict[str, Any]] = []

    async def create_index(self, *args, **kwargs):
        pass

    def find(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> InMemoryCursor:
        query = query or {}
        matches = []
        for doc in self._data:
            match = True
            for k, v in query.items():
                if "." in k:
                    parts = k.split(".")
                    cur = doc
                    for p in parts:
                        cur = cur.get(p, {}) if isinstance(cur, dict) else None
                    if cur != v:
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                matches.append(doc)
        return InMemoryCursor(matches)

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        cursor = self.find(query, projection)
        results = await cursor.to_list(length=1)
        return results[0] if results else None

    async def insert_one(self, doc: Dict[str, Any]):
        self._data.append(copy.deepcopy(doc))
        class Result:
            inserted_id = doc.get("run_id") or doc.get("_id") or len(self._data)
        return Result()

    async def update_one(self, filter_q: Dict[str, Any], update: Dict[str, Any]):
        for doc in self._data:
            match = all(doc.get(k) == v for k, v in filter_q.items())
            if match:
                if "$set" in update:
                    doc.update(copy.deepcopy(update["$set"]))
                break


# Fallback singletons
_in_memory_runs = InMemoryCollection("pipeline_runs")
_in_memory_events = InMemoryCollection("observer_events")


async def connect_db():
    global _client, _db
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/shadowlens")
    db_name = os.getenv("MONGODB_DB", "shadowlens")
    from motor.motor_asyncio import AsyncIOMotorClient
    _client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)
    # Ping to verify reachability
    await _client.admin.command("ping")
    _db = _client[db_name]
    await _db["observer_events"].create_index("run_id")
    await _db["observer_events"].create_index("timestamp")
    await _db["pipeline_runs"].create_index("run_id", unique=True)
    await _db["pipeline_runs"].create_index("created_at")
    logger.info("MongoDB connected: %s / %s", uri, db_name)


async def disconnect_db():
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB disconnected.")


def get_db():
    return _db


def get_runs_collection():
    if _db is not None:
        return _db["pipeline_runs"]
    return _in_memory_runs


def get_events_collection():
    if _db is not None:
        return _db["observer_events"]
    return _in_memory_events
