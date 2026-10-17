"""
/api/evaluation — Benchmark evaluation endpoints.
Executes comparative evaluation between No-Graph Baseline and Graph Agent across 18 ground-truth scenarios.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter

from src.evaluation.evaluator import (
    BenchmarkEvaluator,
    BenchmarkReport,
    LATEST_EVALUATION_REPORT,
)
from src.evaluation.dataset import EVAL_SCENARIOS

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])


@router.post("/run", response_model=BenchmarkReport)
async def run_evaluation():
    """
    Run evaluation benchmark comparing No-Graph Baseline vs Graph Agent
    across 18 ground-truth multi-hop scenarios.
    """
    evaluator = BenchmarkEvaluator()
    report = evaluator.run_benchmark()
    return report


@router.get("/results", response_model=BenchmarkReport)
async def get_evaluation_results():
    """
    Retrieve results of the latest benchmark run.
    If no benchmark has been executed yet, runs one automatically.
    """
    import src.evaluation.evaluator as ev_mod

    if ev_mod.LATEST_EVALUATION_REPORT is None:
        evaluator = BenchmarkEvaluator()
        return evaluator.run_benchmark()
    return ev_mod.LATEST_EVALUATION_REPORT


@router.get("/scenarios")
async def list_evaluation_scenarios():
    """
    List all 18 ground-truth scenarios with entry points, targets, and expected paths.
    """
    return [s.to_dict() for s in EVAL_SCENARIOS]
