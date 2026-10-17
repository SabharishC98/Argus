"""
Analysis and algorithm tools for MCP Server.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional
from src.graph.graph_store import get_graph_store
from src.graph.schema import EntityType

if TYPE_CHECKING:
    from src.mcp.server import MCPServer


def calculate_graph_risk(entity_id: str, decay: float = 0.75) -> Dict[str, Any]:
    """
    Calculate risk propagation score outwards from an investigated entity.
    Propagates risk scores along dependency, execution, and data-flow edges.
    """
    store = get_graph_store()
    return store.calculate_risk_propagation(source_id=entity_id, decay=decay)


def get_impact_analysis(entity_id: str, max_depth: int = 4) -> Dict[str, Any]:
    """
    Determine the blast radius and all downstream assets, databases, and endpoints
    that would be impacted if this entity is compromised or modified.
    """
    store = get_graph_store()
    return store.get_blast_radius(entity_id=entity_id, max_depth=max_depth)


def find_related_findings(entity_id: str) -> Dict[str, Any]:
    """
    Find all security findings, alerts, and historical incidents associated
    directly or via 1-2 hops with this entity.
    """
    store = get_graph_store()
    node = store.get_node(entity_id)
    if not node:
        return {"entity_id": entity_id, "findings_count": 0, "findings": []}

    # Find neighbors of type Finding or Incident
    neighbors = store.get_neighbors(node_id=entity_id, direction="both", max_depth=2)
    associated_findings = []
    for nbr in neighbors:
        nbr_node = nbr.get("node", {})
        if nbr_node.get("type") in (EntityType.FINDING.value, EntityType.INCIDENT.value, EntityType.VULNERABILITY.value):
            associated_findings.append({
                "id": nbr_node.get("id"),
                "label": nbr_node.get("label"),
                "type": nbr_node.get("type"),
                "risk_level": nbr_node.get("risk_level", "HIGH"),
                "distance": nbr.get("depth", 1),
                "relationship": nbr.get("relationship"),
            })

    return {
        "entity_id": entity_id,
        "findings_count": len(associated_findings),
        "findings": associated_findings,
    }


def register_analysis_tools(server: MCPServer) -> None:
    server.register_tool(
        name="calculate_graph_risk",
        description="Compute propagated risk across the connected graph starting from an entity. Evaluates cascading risk across execution and dependency edges.",
        parameters={
            "type": "object",
            "properties": {
                "entity_id": {"type": "string", "description": "Entity ID to compute risk propagation for"},
                "decay": {"type": "number", "default": 0.75, "description": "Risk attenuation factor per hop (0.1 to 0.9)"},
            },
            "required": ["entity_id"],
        },
        handler=calculate_graph_risk,
        category="analysis",
    )

    server.register_tool(
        name="get_impact_analysis",
        description="Compute blast radius: identify all reachable downstream endpoints, databases, sensitive files, and accounts affected if the entity is breached.",
        parameters={
            "type": "object",
            "properties": {
                "entity_id": {"type": "string", "description": "Target entity ID"},
                "max_depth": {"type": "integer", "default": 4, "minimum": 1, "maximum": 6, "description": "Max hop depth for blast radius search"},
            },
            "required": ["entity_id"],
        },
        handler=get_impact_analysis,
        category="analysis",
    )

    server.register_tool(
        name="find_related_findings",
        description="Search for existing security findings, vulnerabilities, or incidents connected to an entity within 2 hops.",
        parameters={
            "type": "object",
            "properties": {
                "entity_id": {"type": "string", "description": "Entity ID to query related findings for"},
            },
            "required": ["entity_id"],
        },
        handler=find_related_findings,
        category="analysis",
    )
