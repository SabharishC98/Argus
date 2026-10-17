"""
Centrality and Critical Path Identification Algorithm.
Calculates degree and betweenness centrality to spot critical security bottlenecks.
"""

from __future__ import annotations
from typing import Dict
from src.graph.graph_store import BaseGraphStore


def compute_centralities(store: BaseGraphStore) -> Dict[str, Dict[str, float]]:
    """Calculates degree and betweenness centrality across graph nodes."""
    return store.get_centrality_metrics()
