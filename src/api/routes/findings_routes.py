"""
/api/findings and /api/actions — Endpoints for security findings and remediation action receipts.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.mcp.tools.action_tools import (
    ACTIONS_REGISTRY,
    FINDINGS_REGISTRY,
    approve_action,
    create_finding,
    reject_action,
    take_remediation_action,
    update_finding,
)

router_findings = APIRouter(prefix="/api/findings", tags=["findings"])
router_actions = APIRouter(prefix="/api/actions", tags=["actions"])


# ── Findings Routes ────────────────────────────────────────────────────────────

class CreateFindingRequest(BaseModel):
    title: str
    severity: str = "HIGH"
    affected_entities: List[str]
    description: str
    evidence_paths: Optional[List[List[str]]] = None


class UpdateFindingRequest(BaseModel):
    status: str
    note: Optional[str] = None


@router_findings.get("")
async def list_findings():
    """List all findings created by investigations."""
    return list(FINDINGS_REGISTRY.values())


@router_findings.post("")
async def post_finding(req: CreateFindingRequest):
    """Create a new security finding."""
    res = create_finding(
        title=req.title,
        severity=req.severity,
        affected_entities=req.affected_entities,
        description=req.description,
        evidence_paths=req.evidence_paths,
    )
    return res


@router_findings.get("/{finding_id}")
async def get_single_finding(finding_id: str):
    """Get single finding by ID."""
    if finding_id not in FINDINGS_REGISTRY:
        raise HTTPException(status_code=404, detail="Finding not found")
    return FINDINGS_REGISTRY[finding_id]


@router_findings.patch("/{finding_id}")
async def patch_finding(finding_id: str, req: UpdateFindingRequest):
    """Update finding status or append triage notes."""
    res = update_finding(finding_id=finding_id, status=req.status, note=req.note)
    if not res.get("updated"):
        raise HTTPException(status_code=404, detail=res.get("error"))
    return res


# ── Actions Routes ─────────────────────────────────────────────────────────────

class ExecuteActionRequest(BaseModel):
    action_type: str
    target_entity_id: str
    parameters: Optional[Dict[str, Any]] = None
    simulation: bool = True


@router_actions.get("")
async def list_actions():
    """List all autonomous remediation actions and verification receipts."""
    return list(ACTIONS_REGISTRY.values())


@router_actions.post("")
async def post_action(req: ExecuteActionRequest):
    """Execute autonomous remediation action."""
    res = take_remediation_action(
        action_type=req.action_type,
        target_entity_id=req.target_entity_id,
        parameters=req.parameters,
        simulation=req.simulation,
    )
    return res


@router_actions.get("/{action_id}")
async def get_single_action(action_id: str):
    """Get receipt for a specific remediation action."""
    if action_id not in ACTIONS_REGISTRY:
        raise HTTPException(status_code=404, detail="Action receipt not found")
    return ACTIONS_REGISTRY[action_id]


class ApproveActionRequest(BaseModel):
    approver: str = "security_lead"


class RejectActionRequest(BaseModel):
    reason: str = "Rejected by security operator"


@router_actions.post("/{action_id}/approve")
async def approve_single_action(action_id: str, req: Optional[ApproveActionRequest] = None):
    """Human-in-the-loop: Approve and execute a proposed high-risk remediation action."""
    approver = req.approver if req else "security_lead"
    res = approve_action(action_id=action_id, approver=approver)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


@router_actions.post("/{action_id}/reject")
async def reject_single_action(action_id: str, req: Optional[RejectActionRequest] = None):
    """Human-in-the-loop: Reject a proposed remediation action."""
    reason = req.reason if req else "Rejected by security operator"
    res = reject_action(action_id=action_id, reason=reason)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

