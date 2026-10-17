"""
/api/ingestion — Endpoints for repository ingestion, OSV vulnerability enrichment,
data source tracking, and demo seed resets.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.ingestion.repo_ingest import (
    DATA_SOURCE_STATE,
    RepositoryIngestor,
    reset_to_seed_dataset,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])


class IngestRepositoryRequest(BaseModel):
    repo_url: str = Field(..., description="GitHub repository URL (e.g. https://github.com/pallets/flask) or local directory path")
    max_files: int = Field(60, ge=5, le=300, description="Max files to parse via AST")


@router.get("/status")
async def get_ingestion_status():
    """
    Get current data source state (real_repository vs seed_dataset),
    active repository info, and entity statistics.
    """
    return DATA_SOURCE_STATE


@router.post("/repository")
async def ingest_repository(req: IngestRepositoryRequest):
    """
    Ingest a real GitHub repository or local codebase:
    1. Clone/download repository
    2. Static code analysis (AST parsing of files, classes, functions, calls)
    3. Dependency extraction (requirements.txt / package.json)
    4. Vulnerability enrichment via live OSV.dev query
    5. Construct connected graph in graph store
    6. Switch active data source to REAL_REPOSITORY
    """
    url_or_path = req.repo_url.strip()
    if not url_or_path:
        raise HTTPException(status_code=400, detail="Repository URL or path cannot be empty")

    ingestor = RepositoryIngestor()
    try:
        result = await ingestor.ingest_repository(url_or_path, max_files=req.max_files)
        if not result.get("success"):
            raise HTTPException(status_code=422, detail=result.get("error", "Failed to ingest repository"))
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to ingest repository '{url_or_path}': {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ingestion error: {str(exc)}")


@router.post("/reset-seed")
async def reset_seed():
    """
    Reset graph store back to clean offline seed demo dataset.
    Useful for running pre-baked benchmark scenarios and fast demo reviews.
    """
    try:
        result = reset_to_seed_dataset()
        return result
    except Exception as exc:
        logger.error(f"Failed to reset seed dataset: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Reset error: {str(exc)}")
