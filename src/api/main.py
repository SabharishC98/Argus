"""
FastAPI application entry point for ShadowLens-Agent.
Autonomous graph-powered investigation agent that acts on connected data.

Initialises on startup:
  - Connected Knowledge Graph (Neo4j or InMemory NetworkX)
  - Pre-seeded security graph topologies & scenarios
  - Model Context Protocol (MCP) tool registry
  - MongoDB connection (optional)
  - Real-time WebSockets for live investigation & attack graphs
"""

from __future__ import annotations

import src.api.hotfix  # noqa: F401

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(override=True)

logging.basicConfig(
    level  = logging.INFO,
    format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing ShadowLens Autonomous Connected Agent...")

    # 1. Initialize Graph Store & Seed Data
    from src.graph.graph_store import get_graph_store
    from src.graph.seed_data import seed_security_graph
    try:
        store = get_graph_store()
        seed_security_graph(store)
        logger.info("Connected Security Graph successfully initialized and seeded.")
    except Exception as exc:
        logger.error(f"Failed to initialize graph store: {exc}")

    # 2. Initialize MCP Server
    from src.mcp.server import get_mcp_server
    try:
        mcp = get_mcp_server()
        logger.info(f"MCP Server initialized with {len(mcp.list_tools())} tools.")
    except Exception as exc:
        logger.error(f"Failed to initialize MCP server: {exc}")

    # 3. MongoDB connection (optional / graceful fallback)
    from src.api.db import connect_db
    try:
        await connect_db()
    except Exception as exc:
        logger.warning(f"MongoDB connection skipped: {exc} — running in memory-first mode.")

    yield

    # Shutdown
    from src.api.db import disconnect_db
    await disconnect_db()
    logger.info("ShadowLens-Agent API shut down.")


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "ShadowLens-Agent API",
    description = "Autonomous Graph-Powered Security Investigation Agent Acting on Connected Data",
    version     = "2.0.0",
    lifespan    = lifespan,
)

# CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins     = cors_origins,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Routers ────────────────────────────────────────────────────────────────────

# Autonomous Graph Agent Routers (NEW)
from src.api.routes.investigations import router as investigations_router
from src.api.routes.graph_routes import router as graph_router
from src.api.routes.mcp_routes import router as mcp_router
from src.api.routes.findings_routes import router_findings, router_actions
from src.api.routes.ingestion_routes import router as ingestion_router
from src.api.routes.evaluation_routes import router as evaluation_router

app.include_router(investigations_router)
app.include_router(graph_router)
app.include_router(mcp_router)
app.include_router(router_findings)
app.include_router(router_actions)
app.include_router(ingestion_router)
app.include_router(evaluation_router)

# Original ShadowLens Routers (Retained for backward compatibility)
from src.api.routes.runs import router as runs_router
from src.api.routes.experiments import router as experiments_router
from src.api.routes.models import router_models, router_pipelines
from src.api.routes.health import router as health_router

app.include_router(runs_router)
app.include_router(experiments_router)
app.include_router(router_models)
app.include_router(router_pipelines)
app.include_router(health_router)


# ── WebSockets ─────────────────────────────────────────────────────────────────

from src.api.websocket import manager

@app.websocket("/ws/runs/{run_id}")
async def websocket_run_stream(websocket: WebSocket, run_id: str):
    await manager.connect(run_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(run_id, websocket)


@app.websocket("/ws/experiments/{experiment_id}")
async def websocket_experiment_stream(websocket: WebSocket, experiment_id: str):
    await manager.connect(experiment_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(experiment_id, websocket)


# ── Root ───────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "ShadowLens-Agent",
        "version": "2.0.0",
        "theme": "Agents That Act on Connected Data",
        "description": "Autonomous Graph-Powered Investigation Agent with MCP Tool Calling",
        "docs": "/docs",
        "endpoints": {
            "investigations": "/api/investigations",
            "graph": "/api/graph/overview",
            "mcp_tools": "/api/mcp/tools",
            "findings": "/api/findings",
            "actions": "/api/actions",
            "ingestion": "/api/ingestion",
            "evaluation": "/api/evaluation",
            "health": "/api/health",
        },
    }
