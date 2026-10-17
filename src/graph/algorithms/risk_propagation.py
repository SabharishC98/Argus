"""
Risk Propagation Algorithm.
Propagates risk outward along dependency, execution, and data-flow edges using decay.
"""

from __future__ import annotations
from typing import Any, Dict
from src.graph.graph_store import BaseGraphStore


def compute_risk_propagation(store: BaseGraphStore, source_id: str, decay: float = 0.75) -> Dict[str, Any]:
    """Calculates cumulative propagated risk scores outward from a source node."""
    return store.calculate_risk_propagation(source_id=source_id, decay=decay)
