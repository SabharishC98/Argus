"""
Impact Analysis and Blast Radius Algorithm.
Determines what downstream systems, databases, and endpoints are reachable if an entity is breached.
"""

from __future__ import annotations
from typing import Any, Dict
from src.graph.graph_store import BaseGraphStore


def compute_blast_radius(store: BaseGraphStore, entity_id: str, max_depth: int = 4) -> Dict[str, Any]:
    """Computes downstream blast radius and affected asset list."""
    return store.get_blast_radius(entity_id=entity_id, max_depth=max_depth)
