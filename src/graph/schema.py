"""
Domain schemas for the Connected Security Knowledge Graph.
Defines entity types, relationship types, and graph representations.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EntityType(str, Enum):
    REPOSITORY     = "Repository"
    FILE           = "File"
    CLASS          = "Class"
    FUNCTION       = "Function"
    API_ENDPOINT   = "APIEndpoint"
    USER_INPUT     = "UserInput"
    DATABASE_QUERY = "DatabaseQuery"
    DEPENDENCY     = "Dependency"
    VULNERABILITY  = "Vulnerability"
    FINDING        = "Finding"
    THREAT         = "Threat"
    INCIDENT       = "Incident"
    ACCOUNT        = "Account"
    CLOUD_RESOURCE = "CloudResource"
    DEVICE         = "Device"


class RelationType(str, Enum):
    CONTAINS        = "CONTAINS"
    CALLS           = "CALLS"
    IMPORTS         = "IMPORTS"
    DEPENDS_ON      = "DEPENDS_ON"
    EXPOSES         = "EXPOSES"
    ACCEPTS_INPUT   = "ACCEPTS_INPUT"
    QUERIES         = "QUERIES"
    AFFECTS         = "AFFECTS"
    TRIGGERS        = "TRIGGERS"
    RELATED_TO      = "RELATED_TO"
    CONNECTED_TO    = "CONNECTED_TO"
    REACHES         = "REACHES"
    ASSOCIATED_WITH = "ASSOCIATED_WITH"
    OBSERVED_IN     = "OBSERVED_IN"


class GraphNode(BaseModel):
    id: str
    label: str
    type: EntityType
    risk_level: str = "LOW"  # CRITICAL, HIGH, MEDIUM, LOW, SAFE
    risk_score: float = 0.0  # 0.0 to 1.0
    properties: Dict[str, Any] = Field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type.value,
            "risk_level": self.risk_level,
            "risk_score": self.risk_score,
            "properties": self.properties,
        }


class GraphEdge(BaseModel):
    source: str
    target: str
    type: RelationType
    weight: float = 1.0
    properties: Dict[str, Any] = Field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "type": self.type.value,
            "weight": self.weight,
            "properties": self.properties,
        }


class GraphPath(BaseModel):
    source_id: str
    target_id: str
    hop_count: int
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    explanation: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "hop_count": self.hop_count,
            "node_ids": [n.id for n in self.nodes],
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "explanation": self.explanation,
        }


class Subgraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
        }
