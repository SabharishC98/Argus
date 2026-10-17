"""
Evaluation module for ShadowLens-Agent.
"""

from src.evaluation.dataset import EVAL_SCENARIOS, EvalScenario
from src.evaluation.evaluator import BenchmarkEvaluator, BenchmarkReport, ScenarioResult, get_latest_benchmark_report

__all__ = [
    "EVAL_SCENARIOS",
    "EvalScenario",
    "BenchmarkEvaluator",
    "BenchmarkReport",
    "ScenarioResult",
    "get_latest_benchmark_report",
]
