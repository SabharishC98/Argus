"""
Tests for new hackathon requirements:
1. Real Data Ingestion & Vulnerability Enrichment (with Seed Fallback)
2. Measured Results / Evaluation Benchmark (No-Graph Baseline vs Graph Agent)
3. Non-Obvious Graph Insight (Scenario 4: MEDIUM -> CRITICAL via 4 hops to cloud KMS key)
4. Human-in-the-Loop for Risky Actions with Blast Radius Preview & Approval/Rejection
5. Failure Honesty & Uncertainty Handling (Scenario 5: Disconnected Finding -> INSUFFICIENT_EVIDENCE)
"""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.graph.graph_store import get_graph_store
from src.graph.seed_data import seed_security_graph
from src.ingestion.repo_ingest import DATA_SOURCE_STATE, RepositoryIngestor, reset_to_seed_dataset
from src.evaluation.evaluator import BenchmarkEvaluator
from src.evaluation.dataset import EVAL_SCENARIOS
from src.agent.agent import ShadowLensAgent
from src.mcp.tools.action_tools import ACTIONS_REGISTRY, approve_action, reject_action


@pytest.fixture(autouse=True)
def reset_graph():
    """Ensure clean seeded graph state before each test."""
    reset_to_seed_dataset()


def test_seed_reset_and_status():
    """Test data source status and seed reset endpoint."""
    client = TestClient(app)
    
    # Check status
    res = client.get("/api/ingestion/status")
    assert res.status_code == 200
    data = res.json()
    assert data["active_source"] == "seed_dataset"
    assert "stats" in data

    # Reset seed
    res = client.post("/api/ingestion/reset-seed")
    assert res.status_code == 200
    assert res.json()["data_source"] == "seed_dataset"


def test_evaluation_benchmark_execution():
    """Test real evaluation benchmark comparing Baseline vs Graph Agent across 18 scenarios."""
    evaluator = BenchmarkEvaluator()
    report = evaluator.run_benchmark()

    assert report.total_scenarios == 18
    assert report.connected_scenarios == 15
    assert report.ambiguous_scenarios == 3

    # Graph Agent must outperform No-Graph baseline significantly
    assert report.graph_path_accuracy > report.baseline_path_accuracy
    assert report.graph_exact_path_accuracy > report.baseline_exact_path_accuracy
    assert report.graph_avg_edge_recall > report.baseline_avg_edge_recall
    assert report.accuracy_improvement_pp > 30.0
    assert report.graph_false_positives == 0

    # API endpoints
    client = TestClient(app)
    res = client.get("/api/evaluation/results")
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["total_scenarios"] == 18
    assert len(res_data["scenarios"]) == 18

    res_scenarios = client.get("/api/evaluation/scenarios")
    assert res_scenarios.status_code == 200
    assert len(res_scenarios.json()) == 18


@pytest.mark.asyncio
async def test_scenario_4_non_obvious_insight_escalation():
    """
    Test Scenario 4: finding:sec-402-format-injection starts as MEDIUM.
    Through 4 graph hops (func:format_agent_input -> service:agent_router -> tool:cloud_admin_exec -> cloud:kms_master_key),
    agent autonomously escalates finding to CRITICAL.
    """
    agent = ShadowLensAgent()
    state = await agent.start_investigation(
        query="Investigate security finding finding:sec-402-format-injection and determine blast radius",
        target_entity="finding:sec-402-format-injection",
    )

    assert state.status == "AWAITING_HUMAN_APPROVAL" or state.status == "COMPLETED"
    assert state.severity_escalation is not None
    assert state.severity_escalation["original_severity"] == "MEDIUM"
    assert state.severity_escalation["escalated_severity"] == "CRITICAL"
    assert "cloud:kms_master_key" in str(state.severity_escalation["discovered_path"])

    # Verify structured explanation mentions escalation
    expl = state.explanation or {}
    assert expl.get("severity_escalation") is not None
    assert "MEDIUM" in expl["severity_escalation"]["initial"]
    assert "CRITICAL" in expl["severity_escalation"]["escalated"]
    assert "NON-OBVIOUS GRAPH INSIGHT" in expl["executive_summary"]


@pytest.mark.asyncio
async def test_scenario_5_failure_honesty_uncertainty():
    """
    Test Scenario 5: finding:sec-801-sandbox-leak is disconnected from production/sensitive assets.
    Agent must honestly state INSUFFICIENT_EVIDENCE, escalate to human review, and NOT hallucinate an attack path.
    """
    agent = ShadowLensAgent()
    state = await agent.start_investigation(
        query="Investigate finding:sec-801-sandbox-leak and verify if cloud assets are impacted",
        target_entity="finding:sec-801-sandbox-leak",
    )

    assert state.status == "COMPLETED"
    assert state.uncertainty_state == "INSUFFICIENT_EVIDENCE"
    assert state.recommended_next_step == "ESCALATE_TO_HUMAN_REVIEW"

    # Verify explanation highlights honesty
    expl = state.explanation or {}
    assert expl.get("uncertainty_state") == "INSUFFICIENT_EVIDENCE"
    assert "INSUFFICIENT EVIDENCE" in expl["executive_summary"]


def test_human_in_the_loop_action_approval():
    """
    Test that high-risk remediation actions are held in AWAITING_APPROVAL with a blast radius preview,
    and can be approved or rejected via API.
    """
    client = TestClient(app)

    # 1. Propose action via API
    res = client.post("/api/actions", json={
        "action_type": "revoke_iam_permission",
        "target_entity_id": "tool:cloud_admin_exec",
        "parameters": {"scope": "all_regions"},
        "simulation": True,
    })
    assert res.status_code == 200
    action_data = res.json()
    action_id = action_data["action_id"]
    assert action_data["status"] == "AWAITING_APPROVAL"
    assert "blast_radius_preview" in action_data
    assert action_data["blast_radius_preview"]["blast_count"] >= 1

    # 2. Approve action
    res_app = client.post(f"/api/actions/{action_id}/approve", json={"approver": "secops_lead"})
    assert res_app.status_code == 200
    approved_data = res_app.json()
    assert approved_data["status"] == "EXECUTED_SIMULATION"
    assert approved_data["approved_by"] == "secops_lead"

    # 3. Create another action and reject it
    res2 = client.post("/api/actions", json={
        "action_type": "quarantine_endpoint",
        "target_entity_id": "endpoint:/api/v1/auth/login",
        "simulation": True,
    })
    action2_id = res2.json()["action_id"]
    res_rej = client.post(f"/api/actions/{action2_id}/reject", json={"reason": "Business hours maintenance window required"})
    assert res_rej.status_code == 200
    assert res_rej.json()["status"] == "REJECTED"
    assert res_rej.json()["rejection_reason"] == "Business hours maintenance window required"
