"""
Multi-hop Shortest Path and All Paths Algorithms.
"""

from __future__ import annotations
from typing import List, Optional
from src.graph.graph_store import BaseGraphStore
from src.graph.schema import GraphPath


def find_shortest_path(store: BaseGraphStore, source_id: str, target_id: str, max_hops: int = 6) -> Optional[GraphPath]:
    """Finds the shortest relationship path between two entities up to max_hops."""
    return store.find_shortest_path(source_id, target_id, max_hops=max_hops)


def find_all_paths(store: BaseGraphStore, source_id: str, target_id: str, max_hops: int = 6, limit: int = 5) -> List[GraphPath]:
    """Finds up to `limit` simple paths between source and target entities."""
    return store.find_all_paths(source_id, target_id, max_hops=max_hops, limit=limit)
