"""
/api/investigations — Endpoints for starting, tracking, and retrieving autonomous graph investigations.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from src.agent.agent import ShadowLensAgent, INVESTIGATIONS_STORE
from src.agent.state import InvestigationState
from src.graph.graph_store import get_graph_store

router = APIRouter(prefix="/api/investigations", tags=["investigations"])
logger = logging.getLogger(__name__)


class InvestigationRequest(BaseModel):
    query: str = Field(..., description="Investigation prompt or question")
    target_entity: Optional[str] = Field(None, description="Optional starting node ID")
    model: Optional[str] = Field(None, description="Optional LLM model override")


# Active WebSocket connection manager for live investigation updates
class InvestigationStreamManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, inv_id: str, ws: WebSocket):
        await ws.accept()
        if inv_id not in self.connections:
            self.connections[inv_id] = []
        self.connections[inv_id].append(ws)

    def disconnect(self, inv_id: str, ws: WebSocket):
        if inv_id in self.connections:
            self.connections[inv_id] = [c for c in self.connections[inv_id] if c != ws]

    async def broadcast_step(self, inv_id: str, event_data: Dict[str, Any]):
        if inv_id in self.connections:
            for ws in self.connections[inv_id]:
                try:
                    await ws.send_json({"type": "step_update", "event": event_data})
                except Exception:
                    pass


stream_manager = InvestigationStreamManager()


@router.post("")
async def create_investigation(req: InvestigationRequest):
    """
    Start a new autonomous graph-powered investigation.
    Runs multi-hop reasoning, tool selection through MCP, and autonomous remediation.
    """
    agent = ShadowLensAgent(model=req.model)

    def on_step(evt):
        asyncio.create_task(stream_manager.broadcast_step(
            evt.step_number,
            evt.model_dump() if hasattr(evt, "model_dump") else str(evt)
        ))

    state = await agent.start_investigation(
        query=req.query,
        target_entity=req.target_entity,
        on_step_callback=on_step,
    )
    return state.to_dict()


@router.get("")
async def list_investigations():
    """List all past and active investigations."""
    return ShadowLensAgent.list_investigations()


@router.get("/{inv_id}")
async def get_investigation(inv_id: str):
    """Retrieve full investigation state, evidence trail, risk score, and actions taken."""
    state = ShadowLensAgent.get_investigation(inv_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Investigation '{inv_id}' not found.")
    return state.to_dict()


@router.get("/{inv_id}/timeline")
async def get_investigation_timeline(inv_id: str):
    """Retrieve chronologically ordered agent execution timeline."""
    state = ShadowLensAgent.get_investigation(inv_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Investigation '{inv_id}' not found.")
    return {
        "investigation_id": inv_id,
        "step_count": len(state.timeline),
        "timeline": [t.model_dump() for t in state.timeline],
    }


@router.get("/{inv_id}/graph")
async def get_investigation_graph(inv_id: str):
    """
    Retrieve the investigation graph context:
    Includes all visited entities, discovered multi-hop paths, and relationship edges.
    """
    state = ShadowLensAgent.get_investigation(inv_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Investigation '{inv_id}' not found.")

    store = get_graph_store()
    visited_ids = set(state.visited_entities)

    # Add nodes from discovered paths
    for p in state.discovered_paths:
        for nid in p.get("path_node_ids", []):
            visited_ids.add(nid)

    nodes = []
    for nid in visited_ids:
        n = store.get_node(nid)
        if n:
            nodes.append(n.to_dict())

    # Collect edges between visited nodes
    edges = []
    for e in store.get_all_edges():
        if e.source in visited_ids and e.target in visited_ids:
            edges.append(e.to_dict())

    return {
        "investigation_id": inv_id,
        "target_entity": state.target_entity,
        "risk_level": state.risk_level,
        "discovered_paths": state.discovered_paths,
        "nodes": nodes,
        "edges": edges,
    }


@router.websocket("/ws/{inv_id}")
async def websocket_investigation_stream(websocket: WebSocket, inv_id: str):
    """Real-time WebSocket stream for agent timeline events."""
    await stream_manager.connect(inv_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        stream_manager.disconnect(inv_id, websocket)
