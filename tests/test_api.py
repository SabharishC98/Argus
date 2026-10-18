"""
Test suite for ShadowLens-Agent REST API.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from src.api.main import app


@pytest.mark.asyncio
async def test_api_root_and_overview():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] in ["Argus Agent", "ShadowLens-Agent"]
        assert "endpoints" in data

        # Graph overview
        res_graph = await ac.get("/api/graph/overview")
        assert res_graph.status_code == 200
        g_data = res_graph.json()
        assert g_data["total_nodes"] >= 20
        assert g_data["total_edges"] >= 15


@pytest.mark.asyncio
async def test_mcp_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/mcp/tools")
        assert res.status_code == 200
        t_data = res.json()
        assert t_data["count"] >= 8

        # Call find_path via MCP endpoint
        call_res = await ac.post("/api/mcp/call", json={
            "tool": "find_path",
            "arguments": {
                "source_id": "endpoint:payment-v1",
                "target_id": "db:prod-payments-db",
                "max_hops": 6,
            }
        })
        assert call_res.status_code == 200
        assert call_res.json()["data"]["found"] is True


@pytest.mark.asyncio
async def test_investigations_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Start investigation
        res = await ac.post("/api/investigations", json={
            "query": "Investigate suspicious API endpoint payment-v1",
            "target_entity": "endpoint:payment-v1"
        })
        assert res.status_code == 200
        inv = res.json()
        inv_id = inv["investigation_id"]
        assert inv["status"] in ("COMPLETED", "AWAITING_HUMAN_APPROVAL"), f"Unexpected status: {inv['status']}"
        assert len(inv["timeline"]) >= 5

        # Get by ID
        get_res = await ac.get(f"/api/investigations/{inv_id}")
        assert get_res.status_code == 200
        assert get_res.json()["investigation_id"] == inv_id

        # Get timeline
        tl_res = await ac.get(f"/api/investigations/{inv_id}/timeline")
        assert tl_res.status_code == 200
        assert tl_res.json()["step_count"] >= 5

        # Get graph
        g_res = await ac.get(f"/api/investigations/{inv_id}/graph")
        assert g_res.status_code == 200
        assert len(g_res.json()["nodes"]) >= 3
