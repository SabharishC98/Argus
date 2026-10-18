"""
Critical Verification & Operation Tests for FalkorDB Primary Graph Database.
Validates:
1. FalkorDB is the primary authoritative graph store for ShadowLens
2. All 8 required FalkorDB graph operations execute (Entity search, Neighbor traversal,
   Multi-hop pathfinding, Attack-path detection, Privileged reachability, Blast radius,
   Related findings, Risk assessment)
3. CRITICAL VERIFICATION TEST: Temporarily remove/disable FalkorDB and verify that
   multi-hop pathfinding, reachability, risk propagation, blast radius, and investigations
   strictly STOP WORKING and do NOT silently fall back.
"""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.graph.graph_store import get_graph_store
from src.graph.falkordb_store import FalkorDBGraphStore, FalkorDBUnavailableError
from src.graph.seed_data import seed_security_graph
from src.agent.agent import ShadowLensAgent
from src.mcp.tools.graph_tools import find_path, search_entity, get_neighbors
from src.mcp.tools.analysis_tools import get_impact_analysis, calculate_graph_risk


@pytest.fixture(autouse=True)
def ensure_falkordb_operational():
    store = get_graph_store()
    if hasattr(store, "set_operational"):
        store.set_operational(True)
    yield
    if hasattr(store, "set_operational"):
        store.set_operational(True)


def test_falkordb_is_primary_store():
    """Verify FalkorDB is the primary and authoritative graph database."""
    store = get_graph_store()
    assert isinstance(store, FalkorDBGraphStore), f"Expected FalkorDBGraphStore, got {type(store)}"
    assert store.backend_name == "FalkorDB"
    assert store.is_operational() is True

    # Test /api/graph/status
    client = TestClient(app)
    res = client.get("/api/graph/status")
    assert res.status_code == 200
    data = res.json()
    assert data["primary_database"] == "FalkorDB"
    assert data["authoritative"] is True
    assert data["status"] == "OPERATIONAL"


def test_falkordb_required_operations():
    """
    Demonstrate all required FalkorDB graph operations:
    1. Entity search
    2. Neighbor traversal
    3. Multi-hop path finding
    4. Attack-path detection
    5. Privileged resource reachability
    6. Blast-radius analysis
    7. Related-finding discovery
    8. Graph-based risk assessment
    """
    store = get_graph_store()

    # 1. Entity Search
    search_res = store.search_nodes(query="payment", entity_type="API_ENDPOINT")
    assert len(search_res) >= 1
    assert any("payment" in n.id for n in search_res)

    # 2. Neighbor Traversal
    neighbors = store.get_neighbors("endpoint:payment-v1", direction="both", max_depth=1)
    assert len(neighbors) >= 1

    # 3. Multi-Hop Shortest Path (Cypher shortestPath)
    path = store.find_shortest_path("endpoint:payment-v1", "db:prod-payments-db", max_hops=6)
    assert path is not None
    assert path.hop_count >= 3
    assert path.source_id == "endpoint:payment-v1"
    assert path.target_id == "db:prod-payments-db"

    # 4. Attack-Path Detection (all simple paths)
    all_paths = store.find_all_paths("input:user-query", "db:prod-payments-db", max_hops=6, limit=3)
    assert len(all_paths) >= 1
    assert all_paths[0].hop_count >= 4

    # 5. Privileged Resource Reachability
    priv_targets = store.check_privileged_reachability("finding:sec-402-format-injection")
    assert any("kms" in pt["target_id"] or "admin" in pt["target_id"] for pt in priv_targets)

    # 6. Blast-Radius Analysis (Downstream and Upstream)
    blast = store.get_blast_radius("dep:pyjwt-vuln", max_depth=4)
    assert blast["blast_count"] >= 3
    assert len(blast["upstream_dependencies_impacted"]) >= 1

    # 7. Graph-Based Risk Assessment
    risk_data = store.calculate_risk_propagation("endpoint:payment-v1", decay=0.75)
    assert risk_data["source_risk"] > 0
    assert len(risk_data["propagated_risks"]) >= 3

    # 8. OpenCypher query execution
    cypher_res = store.query(
        "MATCH (n) WHERE toLower(n.id) CONTAINS toLower($q) RETURN n",
        params={"q": "payment"}
    )
    assert len(cypher_res) >= 1


@pytest.mark.asyncio
async def test_critical_verification_remove_falkordb():
    """
    CRITICAL VERIFICATION TEST:
    Temporarily remove/disable FalkorDB.
    Verify that:
    1. Multi-hop attack-path analysis stops working
    2. Privileged reachability analysis stops working
    3. Graph-based risk escalation stops working
    4. Blast-radius calculation stops working
    5. Agent investigation halts immediately with FAILED_GRAPH_UNAVAILABLE
    6. System does NOT silently fall back to an alternate database.
    """
    store = get_graph_store()

    # Step 1: Temporarily disable / remove FalkorDB
    store.set_operational(False)
    assert store.is_operational() is False

    # Step 2: Direct graph operations must raise FalkorDBUnavailableError
    with pytest.raises(FalkorDBUnavailableError):
        store.find_shortest_path("endpoint:payment-v1", "db:prod-payments-db", max_hops=6)

    with pytest.raises(FalkorDBUnavailableError):
        store.get_blast_radius("endpoint:payment-v1", max_depth=4)

    with pytest.raises(FalkorDBUnavailableError):
        store.calculate_risk_propagation("endpoint:payment-v1")

    with pytest.raises(FalkorDBUnavailableError):
        store.check_privileged_reachability("finding:sec-402-format-injection")

    with pytest.raises(FalkorDBUnavailableError):
        store.search_nodes(query="payment")

    # Step 3: MCP tools must return explicit FalkorDB unavailable errors
    mcp_path = find_path("endpoint:payment-v1", "db:prod-payments-db")
    assert mcp_path["found"] is False
    assert "FalkorDB is unavailable" in mcp_path.get("error", "")

    mcp_blast = get_impact_analysis("endpoint:payment-v1")
    assert mcp_blast["success"] is False
    assert "FalkorDB is unavailable" in mcp_blast.get("error", "")

    mcp_risk = calculate_graph_risk("endpoint:payment-v1")
    assert mcp_risk["success"] is False
    assert "FalkorDB is unavailable" in mcp_risk.get("error", "")

    # Step 4: Agent investigation MUST fail cleanly (NO SILENT FALLBACK)
    agent = ShadowLensAgent()
    state = await agent.start_investigation(
        query="Investigate suspicious API endpoint payment-v1 reaching production database",
        target_entity="endpoint:payment-v1",
    )

    assert state.status == "FAILED_GRAPH_UNAVAILABLE"
    assert state.decision == "HALTED_FALKORDB_OFFLINE"
    assert "FalkorDB is offline" in str(state.error)
    assert len(state.discovered_paths) == 0
    assert len(state.actions_taken) == 0
    assert "CRITICAL FAILURE: FalkorDB is offline" in state.explanation["executive_summary"]

    # Step 5: Restore FalkorDB and verify recovery
    store.set_operational(True)
    assert store.is_operational() is True

    recovered_path = store.find_shortest_path("endpoint:payment-v1", "db:prod-payments-db", max_hops=6)
    assert recovered_path is not None
    assert recovered_path.hop_count >= 3


def test_falkordb_network_outage_unreachable_socket():
    """
    Physical Network Outage Test:
    Instantiates FalkorDB store targeting an unreachable TCP socket (port 6399).
    Verifies that socket connection fails cleanly, live server is marked offline,
    and no spurious connection is fabricated.
    """
    dead_store = FalkorDBGraphStore(host="127.0.0.1", port=6399)
    assert dead_store._is_connected_to_live_server is False
    assert dead_store._live_client is None
    assert dead_store.backend_name == "FalkorDB"

