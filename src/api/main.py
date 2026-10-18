"""
FastAPI application entry point for Argus Agent.
Autonomous graph-powered investigation agent that acts on connected data.

Initialises on startup:
  - Connected Knowledge Graph (FalkorDB — openCypher embedded engine)
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
    logger.info("Initializing Argus Autonomous Connected Agent...")

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
    logger.info("Argus Agent API shut down.")


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "Argus Agent API",
    description = "Autonomous Graph-Powered Security Investigation Agent Acting on Connected Data (FalkorDB + MCP)",
    version     = "2.0.0",
    lifespan    = lifespan,
)

# CORS — allow deployed frontend (e.g. Vercel) and localhost
cors_origins_env = os.getenv("CORS_ORIGINS")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins     = allowed_origins,
    allow_credentials = False,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    from fastapi.responses import JSONResponse
    tb = traceback.format_exc()
    logger.error("Unhandled exception on %s %s: %s\n%s", request.method, request.url, exc, tb)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__, "traceback": tb.splitlines()[-4:]},
        headers={"Access-Control-Allow-Origin": "*"}
    )



# ── Routers ────────────────────────────────────────────────────────────────────

# Autonomous Graph Agent Routers
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

# Legacy Routers (retained for backward compatibility)
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
        "name": "Argus Agent",
        "version": "2.0.0",
        "theme": "Agents That Act on Connected Data",
        "primary_graph_database": "FalkorDB",
        "description": "Autonomous Graph-Powered Investigation Agent with FalkorDB openCypher & MCP Tool Calling",
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
