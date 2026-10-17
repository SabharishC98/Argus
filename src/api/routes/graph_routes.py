"""
/api/graph — Graph inspection and direct algorithm execution endpoints.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.graph.graph_store import get_graph_store
from src.graph.seed_data import seed_security_graph

router = APIRouter(prefix="/api/graph", tags=["graph"])


class GraphQueryRequest(BaseModel):
    algorithm: str = Field(..., description="shortest_path, blast_radius, risk_propagation, or centrality")
    source_id: Optional[str] = None
    target_id: Optional[str] = None
    max_hops: int = 6
    decay: float = 0.75


@router.get("/overview")
async def get_graph_overview():
    """Returns top-level knowledge graph statistics and node/edge topology."""
    store = get_graph_store()
    nodes = store.get_all_nodes()
    edges = store.get_all_edges()

    type_counts: Dict[str, int] = {}
    risk_counts: Dict[str, int] = {}

    for n in nodes:
        t = n.type.value if hasattr(n.type, "value") else str(n.type)
        type_counts[t] = type_counts.get(t, 0) + 1
        r = n.risk_level
        risk_counts[r] = risk_counts.get(r, 0) + 1

    return {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "node_types": type_counts,
        "risk_distribution": risk_counts,
        "nodes": [n.to_dict() for n in nodes],
        "edges": [e.to_dict() for e in edges],
    }


@router.get("/subgraph")
async def get_subgraph(entity_id: str = Query(...), depth: int = Query(2, ge=1, le=4)):
    """Retrieve an ego-subgraph centered around an entity."""
    store = get_graph_store()
    sg = store.get_subgraph(entity_id, depth)
    return sg.to_dict()


@router.post("/query")
async def execute_graph_query(req: GraphQueryRequest):
    """Execute a graph algorithm directly on the knowledge graph."""
    store = get_graph_store()

    if req.algorithm == "shortest_path":
        if not req.source_id or not req.target_id:
            raise HTTPException(status_code=400, detail="source_id and target_id required for shortest_path")
        path = store.find_shortest_path(req.source_id, req.target_id, max_hops=req.max_hops)
        if not path:
            return {"found": False, "message": "No path found"}
        return {"found": True, "path": path.to_dict()}

    elif req.algorithm == "blast_radius":
        if not req.source_id:
            raise HTTPException(status_code=400, detail="source_id required for blast_radius")
        return store.get_blast_radius(req.source_id, max_depth=req.max_hops)

    elif req.algorithm == "risk_propagation":
        if not req.source_id:
            raise HTTPException(status_code=400, detail="source_id required for risk_propagation")
        return store.calculate_risk_propagation(req.source_id, decay=req.decay)

    elif req.algorithm == "centrality":
        return store.get_centrality_metrics()

    else:
        raise HTTPException(status_code=400, detail=f"Unknown algorithm: '{req.algorithm}'")


@router.post("/seed")
async def reseed_graph():
    """Reset and re-seed the default security knowledge graph."""
    store = get_graph_store()
    seed_security_graph(store)
    return {"status": "success", "message": "Graph successfully seeded with demo topologies"}
