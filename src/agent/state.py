"""
State models for the ShadowLens Autonomous Investigation Agent.
"""

from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TimelineEvent(BaseModel):
    step_number: int
    timestamp: str
    tool_called: str
    purpose: str
    evidence_collected: str
    conclusion: str
    data_snapshot: Optional[Dict[str, Any]] = None


class EvidenceItem(BaseModel):
    id: str
    type: str  # "node", "path", "risk_score", "blast_radius", "vulnerability"
    description: str
    entities_involved: List[str]
    confidence: float = 1.0


class InvestigationState(BaseModel):
    investigation_id: str
    query: str
    target_entity: Optional[str] = None
    status: str = "INITIALIZED"  # INITIALIZED, RUNNING, COMPLETED, FAILED
    current_step: int = 0
    visited_entities: List[str] = Field(default_factory=list)
    discovered_paths: List[Dict[str, Any]] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None  # CRITICAL, HIGH, MEDIUM, LOW, SAFE
    decision: Optional[str] = None
    actions_taken: List[Dict[str, Any]] = Field(default_factory=list)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    explanation: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")
    completed_at: Optional[str] = None
    error: Optional[str] = None

    def add_timeline_event(
        self,
        tool: str,
        purpose: str,
        evidence: str,
        conclusion: str,
        snapshot: Optional[Dict[str, Any]] = None,
    ) -> TimelineEvent:
        self.current_step += 1
        now_time = datetime.datetime.utcnow().strftime("%H:%M:%S")
        event = TimelineEvent(
            step_number=self.current_step,
            timestamp=now_time,
            tool_called=tool,
            purpose=purpose,
            evidence_collected=evidence,
            conclusion=conclusion,
            data_snapshot=snapshot,
        )
        self.timeline.append(event)
        return event

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()
