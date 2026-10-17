"""
ShadowLens Autonomous Investigation Agent.
Main orchestration interface for starting, tracking, and retrieving investigations.
"""

from __future__ import annotations

import datetime
import logging
import uuid
from typing import Any, Callable, Dict, List, Optional

from src.agent.explainer import Explainer
from src.agent.planner import InvestigationPlanner
from src.agent.state import InvestigationState
from src.mcp.server import get_mcp_server

logger = logging.getLogger(__name__)

# In-memory investigation registry
INVESTIGATIONS_STORE: Dict[str, InvestigationState] = {}


class ShadowLensAgent:
    def __init__(self, model: Optional[str] = None):
        self.planner = InvestigationPlanner(mcp_server=get_mcp_server(), model=model)

    async def start_investigation(
        self,
        query: str,
        target_entity: Optional[str] = None,
        on_step_callback: Optional[Callable[[Any], None]] = None,
    ) -> InvestigationState:
        """
        Initiate an autonomous graph investigation.
        """
        inv_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
        state = InvestigationState(
            investigation_id=inv_id,
            query=query,
            target_entity=target_entity,
            status="INITIALIZED",
        )
        INVESTIGATIONS_STORE[inv_id] = state

        logger.info(f"Initialized investigation {inv_id}: '{query}'")

        # Execute agent investigation loop
        state = await self.planner.execute_investigation(
            state=state,
            max_steps=12,
            on_step_callback=on_step_callback,
        )

        state.completed_at = datetime.datetime.utcnow().isoformat() + "Z"
        # Generate structured explainability
        state.explanation = Explainer.generate_explanation(state)
        INVESTIGATIONS_STORE[inv_id] = state

        logger.info(f"Completed investigation {inv_id}. Risk: {state.risk_level}")
        return state

    @staticmethod
    def get_investigation(inv_id: str) -> Optional[InvestigationState]:
        return INVESTIGATIONS_STORE.get(inv_id)

    @staticmethod
    def list_investigations() -> List[Dict[str, Any]]:
        return [
            {
                "investigation_id": s.investigation_id,
                "query": s.query,
                "target_entity": s.target_entity,
                "status": s.status,
                "risk_level": s.risk_level,
                "risk_score": s.risk_score,
                "steps_count": len(s.timeline),
                "created_at": s.created_at,
                "completed_at": s.completed_at,
            }
            for s in sorted(
                INVESTIGATIONS_STORE.values(),
                key=lambda x: x.created_at,
                reverse=True,
            )
        ]
