"""
Model Context Protocol (MCP) Server for ShadowLens-Agent.
Maintains a registry of graph, analysis, and action tools with strict input/output schemas.
Enables dynamic tool selection and execution by the autonomous investigation agent.
"""

from __future__ import annotations

import inspect
import json
import logging
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class MCPToolParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True
    default: Optional[Any] = None
    enum: Optional[List[str]] = None


class MCPToolDefinition(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]
    category: str  # "graph", "analysis", "action"


class MCPToolExecutionResult(BaseModel):
    tool: str
    success: bool
    data: Any
    error: Optional[str] = None


class MCPServer:
    """
    In-process MCP Server exposing graph queries, analytics, and remediation actions.
    Compatible with LiteLLM / OpenAI tool definitions and JSON-RPC dispatch.
    """

    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._definitions: Dict[str, MCPToolDefinition] = {}
        self._categories: Dict[str, str] = {}
        logger.info("Initialized ShadowLens MCP Server")

    def register_tool(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any],
        handler: Callable,
        category: str = "graph",
    ) -> None:
        """Register a new tool with the MCP server."""
        self._tools[name] = handler
        self._definitions[name] = MCPToolDefinition(
            name=name,
            description=description,
            parameters=parameters,
            category=category,
        )
        self._categories[name] = category
        logger.debug(f"Registered MCP tool: {name} [{category}]")

    def list_tools(self, category: Optional[str] = None) -> List[MCPToolDefinition]:
        """List registered tools, optionally filtered by category."""
        if category:
            return [t for t in self._definitions.values() if t.category == category]
        return list(self._definitions.values())

    def get_tool_definition(self, name: str) -> Optional[MCPToolDefinition]:
        return self._definitions.get(name)

    def get_llm_tool_schemas(self) -> List[Dict[str, Any]]:
        """
        Export registered tools in OpenAI/LiteLLM function calling schema format.
        """
        schemas = []
        for tool in self._definitions.values():
            schemas.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            })
        return schemas

    async def execute_tool(self, name: str, arguments: Dict[str, Any]) -> MCPToolExecutionResult:
        """
        Execute an MCP tool by name with provided arguments.
        Provides robust error handling and structured output.
        """
        if name not in self._tools:
            logger.error(f"MCP Tool not found: {name}")
            return MCPToolExecutionResult(
                tool=name,
                success=False,
                data=None,
                error=f"Tool '{name}' is not registered on this MCP server.",
            )

        handler = self._tools[name]
        try:
            logger.info(f"Executing MCP tool '{name}' with args: {arguments}")
            if inspect.iscoroutinefunction(handler):
                result = await handler(**arguments)
            else:
                result = handler(**arguments)

            return MCPToolExecutionResult(
                tool=name,
                success=True,
                data=result,
                error=None,
            )
        except TypeError as te:
            err_msg = f"Invalid arguments for tool '{name}': {te}"
            logger.warning(err_msg)
            return MCPToolExecutionResult(tool=name, success=False, data=None, error=err_msg)
        except Exception as exc:
            err_msg = f"Execution error in tool '{name}': {exc}"
            logger.error(err_msg, exc_info=True)
            return MCPToolExecutionResult(tool=name, success=False, data=None, error=err_msg)


_MCP_SERVER: Optional[MCPServer] = None


def get_mcp_server() -> MCPServer:
    """Singleton getter for MCP Server."""
    global _MCP_SERVER
    if _MCP_SERVER is None:
        _MCP_SERVER = MCPServer()
        # Register all tools
        from src.mcp.tools.graph_tools import register_graph_tools
        from src.mcp.tools.analysis_tools import register_analysis_tools
        from src.mcp.tools.action_tools import register_action_tools

        register_graph_tools(_MCP_SERVER)
        register_analysis_tools(_MCP_SERVER)
        register_action_tools(_MCP_SERVER)
        logger.info(f"MCP Server initialized with {len(_MCP_SERVER.list_tools())} tools.")

    return _MCP_SERVER
