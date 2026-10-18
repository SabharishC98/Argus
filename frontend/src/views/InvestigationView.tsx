import { useState, useEffect } from 'react';
import {
  Play,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Database,
  Terminal,
  Shield,
  ArrowRight,
  GitBranch,
  FolderGit2,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import ConnectedGraphViewer from '../components/ConnectedGraphViewer';
import AgentTimeline from '../components/AgentTimeline';
import DecisionCard from '../components/DecisionCard';
import {
  api,
  type InvestigationDetail,
  type GraphNode,
  type GraphEdge,
  type DiscoveredPath,
  type IngestionStatus,
} from '../services/api';

const DEMO_SCENARIOS = [
  {
    title: 'Scenario 1: API Endpoint to SQL Injection',
    badge: '5-Hop Attack Path',
    query: 'Investigate suspicious API endpoint payment-v1 reaching production database',
    target: 'endpoint:payment-v1',
  },
  {
    title: 'Scenario 2: Compromised Dependency Blast Radius',
    badge: 'Blast Radius Analysis',
    query: 'Determine blast radius of compromised dependency dep:pyjwt-vuln',
    target: 'dep:pyjwt-vuln',
  },
  {
    title: 'Scenario 3: Agent Tool Privilege Escalation',
    badge: 'Finding to S3 Leak',
    query: 'Trace privilege escalation path from finding SEC-309 to S3 customer backups',
    target: 'finding:sec-309-priv-esc',
  },
  {
    title: '⚡ Scenario 4: Non-Obvious Insight (MEDIUM -> CRITICAL)',
    badge: '4-Hop to KMS Key',
    query: 'Investigate security finding finding:sec-402-format-injection and determine blast radius',
    target: 'finding:sec-402-format-injection',
    highlight: true,
  },
  {
    title: 'Scenario 5: Failure Honesty (Ambiguous Case)',
    badge: 'Insufficient Evidence',
    query: 'Investigate finding:sec-801-sandbox-leak and verify if cloud assets are impacted',
    target: 'finding:sec-801-sandbox-leak',
    honest: true,
  },
];

export default function InvestigationView() {
  const [query, setQuery] = useState(DEMO_SCENARIOS[3].query);
  const [targetEntity, setTargetEntity] = useState(DEMO_SCENARIOS[3].target);
  const [investigation, setInvestigation] = useState<InvestigationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Ingestion state
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatus | null>(null);
  const [repoUrlInput, setRepoUrlInput] = useState('https://github.com/pallets/flask');
  const [ingesting, setIngesting] = useState(false);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);

  // Graph state
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [highlightedPath, setHighlightedPath] = useState<DiscoveredPath | null>(null);

  const fetchStatusAndGraph = () => {
    api.getIngestionStatus().then(setIngestionStatus).catch(console.error);
    api.getGraphOverview().then(g => {
      setGraphNodes(prev => {
        if (prev.length > 0 && prev.length === g.nodes.length && prev[0]?.id === g.nodes[0]?.id) {
          return prev;
        }
        return g.nodes;
      });
      setGraphEdges(prev => {
        if (prev.length > 0 && prev.length === g.edges.length) {
          return prev;
        }
        return g.edges;
      });
    }).catch(err => console.error('Failed to load initial graph', err));
  };

  useEffect(() => {
    fetchStatusAndGraph();
    // Auto-retry once after 6 seconds in case cloud backend was spinning up from cold-start
    const timer = setTimeout(() => {
      fetchStatusAndGraph();
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleLaunch = async (customQuery?: string, customTarget?: string) => {
    const q = customQuery || query;
    const t = customTarget !== undefined ? customTarget : targetEntity;
    setLoading(true);
    setSelectedNode(null);

    try {
      const res = await api.createInvestigation(q, t);
      setInvestigation(res);

      if (res.discovered_paths && res.discovered_paths.length > 0) {
        setHighlightedPath(res.discovered_paths[0]);
      } else {
        setHighlightedPath(null);
      }

      const gRes = await api.getInvestigationGraph(res.investigation_id);
      if (gRes.nodes.length > 0) {
        setGraphNodes(gRes.nodes);
        setGraphEdges(gRes.edges);
      }
    } catch (err) {
      console.error('Investigation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectScenario = (sc: typeof DEMO_SCENARIOS[0]) => {
    setQuery(sc.query);
    setTargetEntity(sc.target);
    handleLaunch(sc.query, sc.target);
  };

  const handleIngestRepo = async () => {
    if (!repoUrlInput.trim()) return;
    setIngesting(true);
    setIngestMessage(null);
    try {
      const res = await api.ingestRepository(repoUrlInput.trim(), 40);
      setIngestMessage(`✓ Successfully ingested: ${res.nodes_count} nodes, ${res.edges_count} edges, ${res.dependencies_found} dependencies, ${res.vulnerabilities_enriched} OSV vulnerabilities enriched.`);
      fetchStatusAndGraph();
    } catch (err: any) {
      setIngestMessage(`✕ Ingestion failed: ${err.message || 'Check repository URL or connectivity.'}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleResetSeed = async () => {
    setIngesting(true);
    try {
      await api.resetSeedDataset();
      setIngestMessage('✓ Graph restored to verified offline seed demo dataset.');
      fetchStatusAndGraph();
    } catch (err) {
      console.error('Failed to reset seed dataset:', err);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header matching theme ── */}
      <div className="page-header">
        <div>
          <h2>Agent Investigation</h2>
          <p>Autonomous graph-powered agent acting on connected data via multi-hop reasoning and MCP tools</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-high" style={{ padding: '6px 12px', fontSize: '10px' }}>
            FalkorDB Powered
          </span>
          <span className="badge" style={{ padding: '6px 12px', fontSize: '10px', color: 'var(--accent-gold)' }}>
            12 MCP Tools Active
          </span>
        </div>
      </div>

      {/* ── Real Data Ingestion & Data Source Bar ── */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderGit2 size={16} color="var(--accent-gold)" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              Active Knowledge Graph:
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                background: ingestionStatus?.active_source === 'real_repository' ? 'rgba(229, 169, 60, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: ingestionStatus?.active_source === 'real_repository' ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
                border: ingestionStatus?.active_source === 'real_repository' ? '1px solid var(--border-bright)' : '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
              }}
            >
              {ingestionStatus?.active_source === 'real_repository' ? '● REAL REPOSITORY' : '○ SEED DEMO DATASET'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {ingestionStatus?.repo_name || 'Argus Knowledge Graph'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleResetSeed}
              disabled={ingesting}
              className="btn btn-secondary"
              style={{ fontSize: '10px', padding: '5px 12px' }}
            >
              Reset to Seed Dataset
            </button>
          </div>
        </div>

        {/* Real Repository Ingest Row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            value={repoUrlInput}
            onChange={e => setRepoUrlInput(e.target.value)}
            placeholder="Enter public GitHub repository URL (e.g. https://github.com/pallets/flask)"
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px' }}
          />
          <button
            onClick={handleIngestRepo}
            disabled={ingesting}
            className="btn btn-primary"
            style={{ minWidth: 180 }}
          >
            {ingesting ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <GitBranch size={14} />}
            <span>{ingesting ? 'Analyzing Repo...' : 'Analyze Repository'}</span>
          </button>
        </div>

        {ingestMessage && (
          <div style={{ marginTop: 10, fontSize: '11px', fontFamily: 'var(--font-mono)', color: ingestMessage.startsWith('✓') ? 'var(--accent-gold-bright)' : '#e06c75' }}>
            {ingestMessage}
          </div>
        )}
      </div>

      {/* Preset Scenario Cards */}
      <div>
        <div className="section-title">
          Benchmark & Demo Investigation Scenarios
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {DEMO_SCENARIOS.map((sc, i) => {
            const isSelected = targetEntity === sc.target;
            return (
              <div
                key={i}
                className="card"
                onClick={() => selectScenario(sc)}
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-gold)' : sc.highlight ? 'rgba(229, 169, 60, 0.45)' : 'var(--border)',
                  background: isSelected ? 'rgba(229, 169, 60, 0.08)' : 'var(--bg-card)',
                  transition: 'all 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-gold)' }}>
                    {sc.highlight ? <TrendingUp size={14} /> : sc.honest ? <HelpCircle size={14} /> : <Sparkles size={14} />}
                    <span style={{ font: '600 10px var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {sc.badge}
                    </span>
                  </span>
                  {isSelected && <span style={{ color: 'var(--accent-gold)', fontSize: '11px', fontWeight: 700 }}>● Active</span>}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 4 }}>
                  {sc.title}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Target: {sc.target}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Query Bar */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="text"
          className="form-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter investigation prompt or target entity ID..."
          style={{ flex: 1, fontSize: '13px' }}
          onKeyDown={e => {
            if (e.key === 'Enter') handleLaunch();
          }}
        />

        <button
          onClick={() => handleLaunch()}
          disabled={loading}
          className="btn btn-primary"
          style={{ minWidth: 190 }}
        >
          {loading ? (
            <>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Investigating...</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>Run Investigation</span>
            </>
          )}
        </button>
      </div>

      {/* Main Split Layout: Left Graph, Right Timeline & Decision */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)', gap: 20 }}>
        {/* Left: Connected Graph Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <Database size={15} color="var(--accent-gold)" />
              <span>Connected Security Knowledge Graph</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ({graphNodes.length} nodes · {graphEdges.length} edges)
              </span>
            </div>

            <button
              onClick={() => {
                api.getGraphOverview().then(g => {
                  setGraphNodes(g.nodes);
                  setGraphEdges(g.edges);
                  setHighlightedPath(null);
                });
              }}
              className="btn btn-secondary"
              style={{ fontSize: '9px', padding: '4px 10px', minHeight: 28 }}
            >
              Reset Full Graph
            </button>
          </div>

          <ConnectedGraphViewer
            nodes={graphNodes}
            edges={graphEdges}
            highlightedPath={highlightedPath}
            selectedNodeId={selectedNode?.id}
            onSelectNode={setSelectedNode}
            height={580}
          />

          {/* Node Inspector Drawer */}
          {selectedNode && (
            <div className="card" style={{ borderColor: 'var(--accent-gold)', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold-bright)' }}>
                  {selectedNode.label}
                </span>
                <span className="badge badge-high">
                  {selectedNode.type} · Risk: {selectedNode.risk_level} ({selectedNode.risk_score.toFixed(2)})
                </span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ID: {selectedNode.id}
              </div>
              <pre style={{ margin: 0, fontSize: '10px', color: 'var(--text-secondary)', background: '#FAF8F8', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', maxHeight: 110, overflowY: 'auto' }}>
                {JSON.stringify(selectedNode.properties, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Right: Agent Reasoning & Decision */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {investigation ? (
            <>
              <DecisionCard
                investigation={investigation}
                onActionStatusChange={() => {
                  api.getInvestigation(investigation.investigation_id).then(setInvestigation).catch(console.error);
                }}
              />
              <AgentTimeline events={investigation.timeline} isLive={loading} />
            </>
          ) : (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <Terminal size={36} color="var(--border-bright)" />
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-editorial)' }}>
                Autonomous Investigation Agent Ready
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', maxWidth: 360, lineHeight: 1.6 }}>
                Click one of the benchmark scenarios above or enter a target entity ID to initiate autonomous multi-hop traversal in FalkorDB.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
