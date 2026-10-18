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
  FlaskConical,
  Activity,
  Cpu,
} from 'lucide-react';
import { api, type BenchmarkReport, type ScenarioResult } from '../services/api';
import ExperimentRunner from './ExperimentRunner';
import AttackGraphView from './AttackGraphView';
import LiveMonitor from './LiveMonitor';

export default function EvaluationView() {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'connected' | 'ambiguous'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'benchmark' | 'experiments' | 'lab' | 'monitor'>('benchmark');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

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
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h2>Measured Results & Red-Team Lab</h2>
          <p>
            {subTab === 'benchmark' && 'Comparative benchmark: Graph Agent vs No-Graph Baseline across 18 verified ground-truth scenarios'}
            {subTab === 'experiments' && 'Multi-model Monte Carlo stress testing: compare Gemini, Llama, and Gemma across injection techniques'}
            {subTab === 'lab' && 'Interactive attack propagation simulation, semantic drift oscilloscope, and boundary decryptor'}
            {subTab === 'monitor' && 'Real-time WebSocket telemetry inspector: observing inter-agent packet flow'}
          </p>
        </div>

        {subTab === 'benchmark' && (
          <button
            onClick={handleRunBenchmark}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Running 18 Scenarios...</span>
              </>
            ) : (
              <>
                <TrendingUp size={14} />
                <span>Run Benchmark Evaluation</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div className="tab-group" style={{ margin: 0 }}>
        <button
          onClick={() => setSubTab('benchmark')}
          className={`tab-btn ${subTab === 'benchmark' ? 'active' : ''}`}
        >
          <BarChart3 size={14} />
          <span>Track 01 Benchmark: Graph vs Baseline</span>
        </button>

        <button
          onClick={() => setSubTab('experiments')}
          className={`tab-btn ${subTab === 'experiments' ? 'active' : ''}`}
        >
          <FlaskConical size={14} />
          <span>Multi-Model Stress Testing</span>
        </button>

        <button
          onClick={() => setSubTab('lab')}
          className={`tab-btn ${subTab === 'lab' ? 'active' : ''}`}
        >
          <Activity size={14} />
          <span>Attack Propagation Lab</span>
        </button>

        <button
          onClick={() => setSubTab('monitor')}
          className={`tab-btn ${subTab === 'monitor' ? 'active' : ''}`}
        >
          <Cpu size={14} />
          <span>Live Stream Monitor</span>
        </button>
      </div>

      {/* ── Content Switcher ── */}
      {subTab === 'experiments' && <ExperimentRunner />}
      {subTab === 'lab' && <AttackGraphView onRunStarted={setActiveRunId} />}
      {subTab === 'monitor' && <LiveMonitor runId={activeRunId} />}

      {subTab === 'benchmark' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Metrics Cards Grid ── */}
      {report && (
        <div className="stat-grid" style={{ margin: 0 }}>
          {/* Path Accuracy */}
          <div className="stat-card highlighted-gold">
            <div className="stat-label">PATH-FINDING ACCURACY</div>
            <div className="stat-value">
              {report.graph_path_accuracy.toFixed(1)}%
            </div>
            <div className="stat-desc">
              vs {report.baseline_path_accuracy.toFixed(1)}% baseline (+{report.accuracy_improvement_pp.toFixed(1)} pp)
            </div>
          </div>

          {/* Exact Path Accuracy */}
          <div className="stat-card">
            <div className="stat-label">EXACT PATH MATCH</div>
            <div className="stat-value" style={{ color: 'var(--accent-gold-bright)' }}>
              {report.graph_exact_path_accuracy.toFixed(1)}%
            </div>
            <div className="stat-desc">
              vs {report.baseline_exact_path_accuracy.toFixed(1)}% baseline
            </div>
          </div>

          {/* Average Edge Recall */}
          <div className="stat-card">
            <div className="stat-label">AVG EDGE RECALL</div>
            <div className="stat-value">
              {report.graph_avg_edge_recall.toFixed(1)}%
            </div>
            <div className="stat-desc">
              vs {report.baseline_avg_edge_recall.toFixed(1)}% baseline
            </div>
          </div>

          {/* False Positives & Negatives */}
          <div className="stat-card">
            <div className="stat-label">FALSE POSITIVES / NEGATIVES</div>
            <div className="stat-value" style={{ fontSize: '20px', color: 'var(--text-primary)' }}>
              {report.graph_false_positives} FP · {report.graph_false_negatives} FN
            </div>
            <div className="stat-desc">
              Baseline: {report.baseline_false_positives} FP · {report.baseline_false_negatives} FN
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Filter:</span>
          {(['all', 'connected', 'ambiguous'] as const).map(f => {
            const isSelected = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`tab-btn ${isSelected ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '10px' }}
              >
                {f === 'all' ? `All (18)` : f === 'connected' ? `Connected Paths (15)` : `Failure Honesty (3)`}
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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
              className="card"
              style={{
                borderColor: isExpanded ? 'var(--accent-gold)' : !sc.has_ground_truth_path ? 'rgba(229, 169, 60, 0.35)' : 'var(--border)',
                padding: '14px 18px',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedId(isExpanded ? null : sc.scenario_id)}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge" style={{ color: 'var(--text-secondary)' }}>
                    {sc.scenario_id}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {sc.title}
                  </span>
                  {!sc.has_ground_truth_path && (
                    <span className="badge badge-high">
                      HONEST UNCERTAINTY TEST
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Baseline outcome */}
                  <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Baseline:</span>
                    {sc.baseline_correct ? (
                      <CheckCircle2 size={13} color="var(--accent-silver)" />
                    ) : (
                      <XCircle size={13} color="#e06c75" />
                    )}
                  </span>

                  {/* Graph Agent outcome */}
                  <span className="badge" style={{ borderColor: 'var(--accent-gold)', background: 'rgba(229, 169, 60, 0.08)', color: 'var(--accent-gold-bright)' }}>
                    <span style={{ fontWeight: 600 }}>Graph Agent:</span>
                    {sc.graph_correct ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                        <CheckCircle2 size={12} color="var(--accent-gold)" />
                        {sc.graph_exact_match ? 'Exact Match' : 'Path Found'}
                      </span>
                    ) : (
                      <XCircle size={12} color="#e06c75" style={{ marginLeft: 4 }} />
                    )}
                  </span>
                </div>
              </div>

              {/* Expanded Scenario Details */}
              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {sc.has_ground_truth_path ? (
                    <div>
                      <strong style={{ color: 'var(--accent-gold)' }}>Ground-Truth Verified Path ({sc.ground_truth_hops} hops):</strong>
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                        {sc.ground_truth_path.map((node, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span className="badge" style={{ color: 'var(--text-primary)' }}>
                              {node}
                            </span>
                            {i < sc.ground_truth_path.length - 1 && <span style={{ color: 'var(--accent-gold)' }}>→</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--accent-gold-bright)' }}>
                      <strong>Ground Truth:</strong> Disconnected / Ambiguous anomaly. There is no legitimate attack path to sensitive assets. Correct answer is to report Insufficient Evidence and escalate to human review.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                    <div style={{ background: '#FAF8F8', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>No-Graph Baseline:</span>
                      <div style={{ fontSize: '11px', marginTop: 6, color: sc.baseline_path_found ? '#e06c75' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        Path Found: {sc.baseline_path_found ? 'YES' : 'NO'} | Edge Recall: {(sc.baseline_edge_recall * 100).toFixed(0)}%
                        {sc.baseline_predicted_path.length > 0 && (
                          <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>
                            {sc.baseline_predicted_path.join(' → ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#FAF8F8', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-gold)' }}>
                      <span style={{ fontSize: '10px', color: 'var(--accent-gold-bright)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Graph Agent:</span>
                      <div style={{ fontSize: '11px', marginTop: 6, color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-mono)' }}>
                        Path Found: {sc.graph_path_found ? `YES (${sc.graph_hops} hops)` : 'NO'} | Edge Recall: {(sc.graph_edge_recall * 100).toFixed(0)}%
                        {sc.graph_predicted_path.length > 0 && (
                          <div style={{ marginTop: 6, color: 'var(--text-primary)' }}>
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
  )}
</div>
);
}
