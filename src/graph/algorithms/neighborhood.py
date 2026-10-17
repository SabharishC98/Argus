"""
Neighborhood analysis algorithm.
Explores N-hop neighbors with directional and relationship filters.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from src.graph.graph_store import BaseGraphStore


def get_neighborhood(
    store: BaseGraphStore,
    node_id: str,
    direction: str = "both",
    relation_type: Optional[str] = None,
    max_depth: int = 1,
) -> List[Dict[str, Any]]:
    """Traverses graph outwards/inwards from node_id up to max_depth."""
    return store.get_neighbors(
        node_id=node_id,
        direction=direction,
        relation_type=relation_type,
        max_depth=max_depth,
    )
