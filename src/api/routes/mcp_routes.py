"""
/api/mcp — Model Context Protocol endpoints.
"""

from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.mcp.server import get_mcp_server

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


class ToolCallRequest(BaseModel):
    tool: str = Field(..., description="Tool name to execute")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Tool input arguments")


@router.get("/tools")
async def list_mcp_tools(category: Optional[str] = None):
    """List all registered MCP tools, parameters, descriptions, and categories."""
    server = get_mcp_server()
    tools = server.list_tools(category=category)
    return {
        "count": len(tools),
        "tools": [t.model_dump() for t in tools],
    }


@router.post("/call")
async def call_mcp_tool(req: ToolCallRequest):
    """Directly execute an MCP tool and return its structured output."""
    server = get_mcp_server()
    result = await server.execute_tool(req.tool, req.arguments)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    return result.model_dump()
