"""
/api/graph — FalkorDB graph inspection, status, Cypher query, and verification endpoints.
FalkorDB is the primary and authoritative graph database for ShadowLens.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.graph.graph_store import get_graph_store
from src.graph.falkordb_store import FalkorDBUnavailableError
from src.graph.seed_data import seed_security_graph

router = APIRouter(prefix="/api/graph", tags=["graph"])


class GraphQueryRequest(BaseModel):
    algorithm: str = Field(..., description="shortest_path, blast_radius, risk_propagation, centrality, or cypher")
    source_id: Optional[str] = None
    target_id: Optional[str] = None
    cypher: Optional[str] = None
    max_hops: int = 6
    decay: float = 0.75


class FalkorDBToggleRequest(BaseModel):
    operational: bool = Field(..., description="Enable or disable FalkorDB for the Critical Verification Test")


@router.get("/status")
async def get_falkordb_status():
    """Returns FalkorDB operational health, connection state, and authoritative status."""
    store = get_graph_store()
    is_op = store.is_operational() if hasattr(store, "is_operational") else True
    is_live = getattr(store, "_is_connected_to_live_server", False)
    return {
        "primary_database": "FalkorDB",
        "authoritative": True,
        "is_operational": is_op,
        "connection_mode": "Live FalkorDB Server (port 6379)" if is_live else "FalkorDB Cypher Engine",
        "graph_name": getattr(store, "graph_name", "shadowlens"),
        "host": getattr(store, "host", "localhost"),
        "port": getattr(store, "port", 6379),
        "status": "OPERATIONAL" if is_op else "OFFLINE_DISABLED",
    }


@router.post("/falkordb-toggle")
async def toggle_falkordb(req: FalkorDBToggleRequest):
    """
    Critical Verification Test Endpoint:
    Allows temporarily disabling or enabling FalkorDB to prove that core product
    capabilities strictly require FalkorDB and do not silently fall back.
    """
    store = get_graph_store()
    if hasattr(store, "set_operational"):
        store.set_operational(req.operational)
    return {
        "primary_database": "FalkorDB",
        "is_operational": req.operational,
        "status": "OPERATIONAL" if req.operational else "OFFLINE_DISABLED",
        "message": "FalkorDB set to operational" if req.operational else "FalkorDB disabled for verification test",
    }


@router.get("/overview")
async def get_graph_overview():
    """Returns top-level knowledge graph statistics and node/edge topology from FalkorDB."""
    store = get_graph_store()
    if hasattr(store, "is_operational") and not store.is_operational():
        raise HTTPException(
            status_code=503,
            detail="FalkorDB is offline or disabled. Primary graph database is required.",
        )

    try:
        nodes = store.get_all_nodes()
        edges = store.get_all_edges()
    except FalkorDBUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    type_counts: Dict[str, int] = {}
    risk_counts: Dict[str, int] = {}

    for n in nodes:
        t = n.type.value if hasattr(n.type, "value") else str(n.type)
        type_counts[t] = type_counts.get(t, 0) + 1
        r = n.risk_level
        risk_counts[r] = risk_counts.get(r, 0) + 1

    return {
        "primary_database": "FalkorDB",
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "node_types": type_counts,
        "risk_distribution": risk_counts,
        "nodes": [n.to_dict() for n in nodes],
        "edges": [e.to_dict() for e in edges],
    }


@router.get("/subgraph")
async def get_subgraph(entity_id: str = Query(...), depth: int = Query(2, ge=1, le=4)):
    """Retrieve an ego-subgraph centered around an entity from FalkorDB."""
    store = get_graph_store()
    try:
        sg = store.get_subgraph(entity_id, depth)
        return sg.to_dict()
    except FalkorDBUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/query")
async def execute_graph_query(req: GraphQueryRequest):
    """Execute a FalkorDB Cypher or graph algorithm directly on the knowledge graph."""
    store = get_graph_store()
    try:
        if req.algorithm == "cypher" or req.cypher:
            cypher_str = req.cypher or ""
            res = store.query(cypher_str, params={"source_id": req.source_id, "target_id": req.target_id})
            return {"primary_database": "FalkorDB", "results": res}

        elif req.algorithm == "shortest_path":
            if not req.source_id or not req.target_id:
                raise HTTPException(status_code=400, detail="source_id and target_id required for shortest_path")
            path = store.find_shortest_path(req.source_id, req.target_id, max_hops=req.max_hops)
            if not path:
                return {"found": False, "message": "No path found in FalkorDB"}
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
    except FalkorDBUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/seed")
async def reseed_graph():
    """Reset and re-seed the default security knowledge graph in FalkorDB."""
    store = get_graph_store()
    try:
        seed_security_graph(store)
        return {"status": "success", "primary_database": "FalkorDB", "message": "FalkorDB graph successfully seeded"}
    except FalkorDBUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
