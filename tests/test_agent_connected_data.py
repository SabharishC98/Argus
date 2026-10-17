"""
Automated End-to-End Test Suite for ShadowLens-Agent.
Tests:
1. Graph schema, nodes, edges, and pathfinding
2. MCP server tool registry and tool execution
3. Graph algorithms: shortest path, blast radius, risk propagation, centrality
4. Autonomous investigation agent end-to-end execution
5. Explainability generation and remediation receipts
"""

import asyncio
import pytest
from src.graph.schema import EntityType, RelationType, GraphNode, GraphEdge
from src.graph.graph_store import InMemoryGraphStore
from src.graph.seed_data import seed_security_graph
from src.mcp.server import get_mcp_server
from src.agent.agent import ShadowLensAgent


def test_graph_store_and_algorithms():
    store = InMemoryGraphStore()
    seed_security_graph(store)

    nodes = store.get_all_nodes()
    assert len(nodes) >= 20, f"Expected at least 20 nodes, got {len(nodes)}"

    # 1. Test 5-hop path from User Input to Production DB
    path = store.find_shortest_path("input:user-query", "db:prod-payments-db", max_hops=6)
    assert path is not None, "Failed to find 5-hop path from input to DB"
    assert path.hop_count >= 4, f"Expected multi-hop path (>=4), got {path.hop_count}"
    assert "query:raw-sql-executor" in [n.id for n in path.nodes]

    # 2. Test blast radius
    blast = store.get_blast_radius("dep:pyjwt-vuln", max_depth=4)
    assert blast["blast_count"] >= 3, "Blast radius should touch multiple downstream assets"

    # 3. Test risk propagation
    risk = store.calculate_risk_propagation("query:raw-sql-executor", decay=0.8)
    assert risk["overall_propagated_risk"] in ("CRITICAL", "HIGH")


@pytest.mark.asyncio
async def test_mcp_tools():
    server = get_mcp_server()
    tools = server.list_tools()
    tool_names = [t.name for t in tools]

    expected = [
        "search_entity",
        "get_entity",
        "get_neighbors",
        "find_path",
        "calculate_graph_risk",
        "get_impact_analysis",
        "create_finding",
        "take_remediation_action",
    ]
    for exp in expected:
        assert exp in tool_names, f"Expected MCP tool '{exp}' not found"

    # Test direct execution of find_path
    res = await server.execute_tool(
        "find_path",
        {"source_id": "endpoint:payment-v1", "target_id": "db:prod-payments-db", "max_hops": 6},
    )
    assert res.success is True
    assert res.data["found"] is True
    assert res.data["hop_count"] >= 4

    # Test create_finding
    f_res = await server.execute_tool(
        "create_finding",
        {
            "title": "Automated Test Finding",
            "severity": "CRITICAL",
            "affected_entities": ["endpoint:payment-v1"],
            "description": "Test finding for MCP server",
        },
    )
    assert f_res.success is True
    assert f_res.data["created"] is True

    # Test take_remediation_action
    a_res = await server.execute_tool(
        "take_remediation_action",
        {
            "action_type": "quarantine_endpoint",
            "target_entity_id": "endpoint:payment-v1",
            "simulation": True,
        },
    )
    assert a_res.success is True
    assert a_res.data["simulation"] is True
    assert len(a_res.data["verification_hash"]) > 0


@pytest.mark.asyncio
async def test_autonomous_investigation_scenario_1():
    agent = ShadowLensAgent()
    state = await agent.start_investigation(
        query="Investigate suspicious API endpoint payment-v1 reaching production database",
        target_entity="endpoint:payment-v1",
    )

    assert state.status == "COMPLETED"
    assert len(state.timeline) >= 5, f"Expected >= 5 timeline events, got {len(state.timeline)}"
    assert len(state.discovered_paths) >= 1, "Agent should have discovered multi-hop path"
    assert state.risk_level in ("CRITICAL", "HIGH")
    assert len(state.actions_taken) >= 1, "Agent must take at least one remediation action"
    assert state.explanation is not None, "Agent must generate structured explanation"
    assert len(state.explanation["evidence_chain"]) >= 3


@pytest.mark.asyncio
async def test_autonomous_investigation_scenario_2():
    agent = ShadowLensAgent()
    state = await agent.start_investigation(
        query="Determine blast radius of compromised dependency dep:pyjwt-vuln",
        target_entity="dep:pyjwt-vuln",
    )

    assert state.status == "COMPLETED"
    assert state.risk_level in ("CRITICAL", "HIGH")
    assert any("patch_dependency" in str(a) for a in state.actions_taken)
