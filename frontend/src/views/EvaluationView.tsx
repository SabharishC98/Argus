import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Filter,
} from 'lucide-react';
import { api, type BenchmarkReport, type ScenarioResult } from '../services/api';

export default function EvaluationView() {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'connected' | 'ambiguous'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      const data = await api.getEvaluationResults();
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch benchmark results:', err);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleRunBenchmark = async () => {
    setLoading(true);
    try {
      const newReport = await api.runEvaluation();
      setReport(newReport);
    } catch (err) {
      console.error('Failed to run benchmark:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredScenarios = report?.scenarios.filter(sc => {
    if (filter === 'connected') return sc.has_ground_truth_path;
    if (filter === 'ambiguous') return !sc.has_ground_truth_path;
    return true;
  }) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={22} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Measured Results: Graph Agent vs No-Graph Baseline
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Empirical comparative benchmark across 18 independently verified ground-truth scenarios (15 multi-hop attack paths + 3 ambiguous test cases).
          </p>
        </div>

        <button
          onClick={handleRunBenchmark}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: loading ? '#475569' : '#0284c7',
            color: '#ffffff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Running 18 Scenarios...</span>
            </>
          ) : (
            <>
              <TrendingUp size={15} />
              <span>Run Benchmark Evaluation</span>
            </>
          )}
        </button>
      </div>

      {/* ── Metrics Cards Grid ── */}
      {report && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {/* Path Accuracy */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Path-Finding Accuracy
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#34d399' }}>
                {(report.graph_path_accuracy * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                vs {(report.baseline_path_accuracy * 100).toFixed(1)}% baseline
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
              +{report.accuracy_improvement_pp.toFixed(1)} pp improvement
            </div>
          </div>

          {/* Exact Path Accuracy */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Exact Path Accuracy
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#34d399' }}>
                {(report.graph_exact_path_accuracy * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                vs {(report.baseline_exact_path_accuracy * 100).toFixed(1)}% baseline
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
              +{report.exact_match_improvement_pp.toFixed(1)} pp exact match
            </div>
          </div>

          {/* Average Edge Recall */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Average Edge Recall
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#34d399' }}>
                {(report.graph_avg_edge_recall * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                vs {(report.baseline_avg_edge_recall * 100).toFixed(1)}% baseline
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
              +{report.edge_recall_improvement_pp.toFixed(1)} pp edge recall
            </div>
          </div>

          {/* False Positives & Negatives */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              False Positives / Negatives
            </div>
            <div style={{ margin: '6px 0', fontSize: '13px', color: '#f1f5f9' }}>
              Graph Agent: <strong style={{ color: '#34d399' }}>{report.graph_false_positives} FP</strong> / <strong style={{ color: '#34d399' }}>{report.graph_false_negatives} FN</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#f87171' }}>
              Baseline: {report.baseline_false_positives} FP / {report.baseline_false_negatives} FN
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={15} color="#94a3b8" />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Filter Scenarios:</span>
          {(['all', 'connected', 'ambiguous'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#0284c7' : '#1e293b',
                color: filter === f ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f === 'all' ? `All (18)` : f === 'connected' ? `Connected Paths (15)` : `Failure Honesty (3)`}
            </button>
          ))}
        </div>

        <span style={{ fontSize: '11px', color: '#64748b' }}>
          Last Evaluated: {report?.evaluated_at ? new Date(report.evaluated_at).toLocaleTimeString() : 'Ready'}
        </span>
      </div>

      {/* ── Detailed Scenarios List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredScenarios.map(sc => {
          const isExpanded = expandedId === sc.scenario_id;

          return (
            <div
              key={sc.scenario_id}
              style={{
                background: '#0f172a',
                border: sc.has_ground_truth_path ? '1px solid #1e293b' : '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: 8,
                padding: '14px 16px',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedId(isExpanded ? null : sc.scenario_id)}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#64748b', background: '#090d16', padding: '2px 6px', borderRadius: 4 }}>
                    {sc.scenario_id}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    {sc.title}
                  </span>
                  {!sc.has_ground_truth_path && (
                    <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      HONEST UNCERTAINTY TEST
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Baseline outcome */}
                  <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Baseline:</span>
                    {sc.baseline_correct ? (
                      <CheckCircle2 size={13} color="#34d399" />
                    ) : (
                      <XCircle size={13} color="#f87171" />
                    )}
                  </span>

                  {/* Graph Agent outcome */}
                  <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>Graph Agent:</span>
                    {sc.graph_correct ? (
                      <span style={{ color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} color="#34d399" />
                        {sc.graph_exact_match ? 'Exact Match' : 'Path Found'}
                      </span>
                    ) : (
                      <XCircle size={13} color="#f87171" />
                    )}
                  </span>
                </div>
              </div>

              {/* Expanded Scenario Details */}
              {isExpanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '12px', color: '#cbd5e1' }}>
                  {sc.has_ground_truth_path ? (
                    <div>
                      <strong style={{ color: '#fbbf24' }}>Ground-Truth Verified Path ({sc.ground_truth_hops} hops):</strong>
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                        {sc.ground_truth_path.map((node, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ background: '#1e293b', color: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}>
                              {node}
                            </span>
                            {i < sc.ground_truth_path.length - 1 && <span style={{ color: '#fbbf24' }}>→</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#38bdf8' }}>
                      <strong>Ground Truth:</strong> Disconnected / Ambiguous anomaly. There is no legitimate attack path to sensitive assets. Correct answer is to report Insufficient Evidence and escalate to human review.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                    <div style={{ background: '#090d16', padding: '10px', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>No-Graph Baseline:</span>
                      <div style={{ fontSize: '11px', marginTop: 4, color: sc.baseline_path_found ? '#f87171' : '#cbd5e1' }}>
                        Path Found: {sc.baseline_path_found ? 'YES' : 'NO'} | Edge Recall: {(sc.baseline_edge_recall * 100).toFixed(0)}%
                        {sc.baseline_predicted_path.length > 0 && (
                          <div style={{ marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>
                            {sc.baseline_predicted_path.join(' → ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#090d16', padding: '10px', borderRadius: 6, border: '1px solid #10b981' }}>
                      <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>Graph Agent:</span>
                      <div style={{ fontSize: '11px', marginTop: 4, color: '#34d399' }}>
                        Path Found: {sc.graph_path_found ? `YES (${sc.graph_hops} hops)` : 'NO'} | Edge Recall: {(sc.graph_edge_recall * 100).toFixed(0)}%
                        {sc.graph_predicted_path.length > 0 && (
                          <div style={{ marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>
                            {sc.graph_predicted_path.join(' → ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
