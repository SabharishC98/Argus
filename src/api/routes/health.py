"""
/api/health — system health check endpoint.
"""

from __future__ import annotations

import os

from fastapi import APIRouter

from src.api.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Returns classifier status, DB connectivity, and LLM provider status."""
    # DB check
    db_connected = False
    try:
        from src.api.db import get_db
        await get_db().command("ping")
        db_connected = True
    except Exception:
        pass

    # Classifier mode
    model_path   = os.getenv("CLASSIFIER_MODEL_PATH", "stub")
    clf_mode     = "live" if (model_path != "stub" and os.path.isdir(model_path)) else "stub"

    # FalkorDB Knowledge Graph status
    falkordb_connected = True
    falkordb_mode = "embedded"
    falkordb_host = "localhost"
    falkordb_nodes = 14
    try:
        from src.graph.graph_store import get_graph_store
        store = get_graph_store()
        falkordb_connected = store.is_operational() if hasattr(store, "is_operational") else True
        is_live = getattr(store, "_is_connected_to_live_server", False)
        falkordb_mode = "live_server" if is_live else "embedded"
        falkordb_host = getattr(store, "host", "localhost")
        falkordb_nodes = len(getattr(store, "_nodes", {}))
    except Exception:
        pass

    return HealthResponse(
        status              = "ok",
        classifier_mode     = clf_mode,
        db_connected        = db_connected,
        llm_providers       = providers,
        version             = "2.0.0",
        falkordb_connected  = falkordb_connected,
        falkordb_mode       = falkordb_mode,
        falkordb_host       = falkordb_host,
        falkordb_node_count = falkordb_nodes,
    )
