"""
Graph traversal and query tools for MCP Server.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional
from src.graph.graph_store import get_graph_store

if TYPE_CHECKING:
    from src.mcp.server import MCPServer


def search_entity(query: str = "", entity_type: Optional[str] = None) -> Dict[str, Any]:
    """Search for nodes in the security graph by label, ID, or entity type."""
    store = get_graph_store()
    nodes = store.search_nodes(query=query, entity_type=entity_type)
    return {
        "count": len(nodes),
        "entities": [n.to_dict() for n in nodes[:20]],
    }


def get_entity(entity_id: str) -> Dict[str, Any]:
    """Retrieve full details, attributes, and risk level for a specific entity."""
    store = get_graph_store()
    node = store.get_node(entity_id)
    if not node:
        return {"found": False, "entity_id": entity_id, "error": f"Entity '{entity_id}' not found"}
    return {
        "found": True,
        "entity": node.to_dict(),
    }


def get_neighbors(
    entity_id: str,
    direction: str = "both",
    relationship_type: Optional[str] = None,
    max_depth: int = 1,
) -> Dict[str, Any]:
    """
    Explore connected neighbors of an entity up to max_depth.
    Direction: 'out' (downstream calls/dependencies), 'in' (upstream callers), 'both'.
    """
    store = get_graph_store()
    neighbors = store.get_neighbors(
        node_id=entity_id,
        direction=direction,
        relation_type=relationship_type,
        max_depth=max_depth,
    )
    return {
        "entity_id": entity_id,
        "direction": direction,
        "neighbor_count": len(neighbors),
        "neighbors": neighbors,
    }


def find_path(source_id: str, target_id: str, max_hops: int = 6) -> Dict[str, Any]:
    """
    Find multi-hop relationship path between source_id and target_id.
    Crucial for tracing attack vectors (e.g., endpoint to database vulnerability).
    """
    store = get_graph_store()
    path = store.find_shortest_path(source_id, target_id, max_hops=max_hops)
    if not path:
        return {
            "found": False,
            "source_id": source_id,
            "target_id": target_id,
            "message": f"No connected path found within {max_hops} hops.",
        }
    return {
        "found": True,
        "source_id": source_id,
        "target_id": target_id,
        "hop_count": path.hop_count,
        "path_node_ids": [n.id for n in path.nodes],
        "path_node_labels": [n.label for n in path.nodes],
        "relationships": [e.type.value if hasattr(e.type, "value") else str(e.type) for e in path.edges],
        "full_path": path.to_dict(),
        "summary": " -> ".join([n.label for n in path.nodes]),
    }


def get_subgraph(entity_id: str, depth: int = 2) -> Dict[str, Any]:
    """Extract ego-subgraph centered around an entity for visualization."""
    store = get_graph_store()
    subgraph = store.get_subgraph(center_id=entity_id, depth=depth)
    return {
        "center_id": entity_id,
        "depth": depth,
        "node_count": len(subgraph.nodes),
        "edge_count": len(subgraph.edges),
        "subgraph": subgraph.to_dict(),
    }


def find_related_entities(entity_id: str, relationship_type: Optional[str] = None) -> Dict[str, Any]:
    """Find all directly related entities filtered by relationship type."""
    store = get_graph_store()
    neighbors = store.get_neighbors(
        node_id=entity_id,
        direction="both",
        relation_type=relationship_type,
        max_depth=1,
    )
    return {
        "entity_id": entity_id,
        "relationship_type": relationship_type,
        "count": len(neighbors),
        "related": neighbors,
    }


def register_graph_tools(server: MCPServer) -> None:
    server.register_tool(
        name="search_entity",
        description="Search for entities/nodes in the connected security graph by keyword or entity type (APIEndpoint, Function, Dependency, Vulnerability, etc.)",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Keyword to match against node ID, label, or properties"},
                "entity_type": {"type": "string", "description": "Optional entity type filter (e.g. 'APIEndpoint', 'Dependency', 'Vulnerability', 'DatabaseQuery')"},
            },
        },
        handler=search_entity,
        category="graph",
    )

    server.register_tool(
        name="get_entity",
        description="Retrieve complete attributes, metadata, and risk score for a specific entity ID",
        parameters={
            "type": "object",
            "properties": {
                "entity_id": {"type": "string", "description": "Exact entity ID (e.g. 'endpoint:payment-v1', 'dep:pyjwt-vuln')"},
            },
            "required": ["entity_id"],
        },
        handler=get_entity,
        category="graph",
    )

    server.register_tool(
        name="get_neighbors",
        description="Explore graph neighbors of an entity up to max_depth hops. Use direction='out' for downstream dependencies/calls, 'in' for upstream callers.",
        parameters={
            "type": "object",
            "properties": {
                "entity_id": {"type": "string", "description": "Entity ID to explore around"},
                "direction": {"type": "string", "enum": ["both", "out", "in"], "default": "both", "description": "Edge direction to traverse"},
                "relationship_type": {"type": "string", "description": "Optional relationship filter (e.g. 'CALLS', 'DEPENDS_ON', 'QUERIES')"},
                "max_depth": {"type": "integer", "default": 1, "minimum": 1, "maximum": 3, "description": "Traversal depth"},
            },
            "required": ["entity_id"],
        },
        handler=get_neighbors,
        category="graph",
    )

    server.register_tool(
        name="find_path",
        description="Find multi-hop relationship path between source entity and target entity across the graph. Essential for identifying end-to-end exploit or data-leak chains.",
        parameters={
            "type": "object",
            "properties": {
                "source_id": {"type": "string", "description": "Starting node ID (e.g. suspicious endpoint or finding)"},
                "target_id": {"type": "string", "description": "Target node ID (e.g. production database, vulnerability, or S3 bucket)"},
                "max_hops": {"type": "integer", "default": 6, "minimum": 1, "maximum": 10, "description": "Maximum path length in hops"},
            },
            "required": ["source_id", "target_id"],
        },
        handler=find_path,
        category="graph",
    )

    server.register_tool(
        name="get_subgraph",
        description="Retrieve an ego-subgraph surrounding an entity for visual representation and contextual reasoning",
        parameters={
            "type": "object",
            "properties": {
                "entity_id": {"type": "string", "description": "Center node ID"},
                "depth": {"type": "integer", "default": 2, "minimum": 1, "maximum": 3, "description": "Radius around center node"},
            },
            "required": ["entity_id"],
        },
        handler=get_subgraph,
        category="graph",
    )

    server.register_tool(
        name="find_related_entities",
        description="Find all entities linked to the target entity by a specific relationship type (e.g., all functions CALLING a service, or all packages that DEPEND_ON a library)",
        parameters={
            "type": "object",
            "properties": {
                "entity_id": {"type": "string", "description": "Source entity ID"},
                "relationship_type": {"type": "string", "description": "Relationship type filter (e.g. 'CALLS', 'AFFECTS', 'DEPENDS_ON')"},
            },
            "required": ["entity_id"],
        },
        handler=find_related_entities,
        category="graph",
    )
