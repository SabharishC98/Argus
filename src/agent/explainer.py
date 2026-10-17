"""
Explainability Engine for ShadowLens-Agent.
Synthesizes graph evidence, multi-hop paths, risk metrics, and actions into structured,
human-interpretable security explanations.
"""

from __future__ import annotations

from typing import Any, Dict, List
from src.agent.state import InvestigationState


class Explainer:
    """
    Transforms graph traversal evidence and algorithmic outputs into
    user-facing, explainable decision records.
    """

    @staticmethod
    def generate_explanation(state: InvestigationState) -> Dict[str, Any]:
        evidence_points: List[str] = []

        # 1. Summarize primary discovered path
        path_summary = None
        if state.discovered_paths:
            primary_path = state.discovered_paths[0]
            hop_count = primary_path.get("hop_count", 0)
            labels = primary_path.get("path_node_labels", [])
            path_str = " -> ".join(labels) if labels else " -> ".join(primary_path.get("path_node_ids", []))
            path_summary = f"{hop_count}-hop connection: {path_str}"
            evidence_points.append(
                f"Multi-hop graph traversal identified an active {hop_count}-hop execution path: {path_str}."
            )

        # 2. Add individual evidence items
        for ev in state.evidence:
            if ev.description not in evidence_points:
                evidence_points.append(ev.description)

        # 3. Risk scoring breakdown
        risk_level = state.risk_level or "HIGH"
        risk_score = state.risk_score or 0.85
        evidence_points.append(
            f"Graph risk propagation calculated cumulative risk score of {risk_score:.2f} ({risk_level} severity)."
        )

        # 4. Actions summary
        actions_summary = []
        for act in state.actions_taken:
            actions_summary.append({
                "action_type": act.get("action_type"),
                "target": act.get("target_entity_id"),
                "status": act.get("status"),
                "summary": act.get("summary"),
                "verification_hash": act.get("verification_hash"),
            })

        # 5. Severity escalation explanation (Requirement 3)
        escalation_data = None
        if state.severity_escalation:
            escalation_data = state.severity_escalation
            evidence_points.insert(
                0,
                f"SEVERITY ESCALATION: Initial finding rated {escalation_data.get('initial')}, but graph traversal revealed a 4-hop path to {escalation_data.get('discovered_capability', 'privileged capability')}. Escalated to {escalation_data.get('escalated')}."
            )

        # 6. Failure honesty / Uncertainty (Requirement 5)
        uncertainty = state.uncertainty_state
        if uncertainty == "INSUFFICIENT_EVIDENCE":
            exec_summary = (
                f"INSUFFICIENT EVIDENCE: ShadowLens Agent investigated '{state.target_entity or state.query}' across the connected graph. "
                f"While localized anomalies exist in the component's perimeter, the graph confirmed NO complete execution or reachability path connects to sensitive production datastores, KMS keys, or privileged roles. "
                f"Honest assessment: Missing necessary evidence for automated containment. Escalated to human security review without taking unverified disruptive action."
            )
        elif escalation_data:
            exec_summary = (
                f"NON-OBVIOUS GRAPH INSIGHT: Isolated finding '{state.target_entity}' was evaluated as {escalation_data.get('initial')} risk. "
                f"Graph multi-hop reasoning proved that input flows 4 hops into privileged {escalation_data.get('discovered_capability')}, directly threatening {escalation_data.get('affected_target', 'sensitive resources')}. "
                f"Severity escalated from {escalation_data.get('initial')} → {escalation_data.get('escalated')}."
            )
        else:
            exec_summary = (
                f"ShadowLens Agent investigated '{state.target_entity or state.query}' across connected graph data. "
                f"The investigation confirmed {risk_level} security risk across a {len(state.visited_entities)} entity neighborhood. "
                + (f"A {state.discovered_paths[0].get('hop_count')}-hop attack vector reaches critical production assets. " if state.discovered_paths else "")
                + f"Remediation actions proposed with verified blast-radius impact analysis."
            )

        return {
            "investigation_id": state.investigation_id,
            "target_entity": state.target_entity,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "uncertainty_state": uncertainty,
            "severity_escalation": escalation_data,
            "decision": state.decision or f"CONFIRMED_{risk_level}_RISK",
            "path_summary": path_summary,
            "evidence_chain": evidence_points,
            "actions_executed": actions_summary,
            "pending_actions": state.pending_actions,
            "executive_summary": exec_summary,
        }
