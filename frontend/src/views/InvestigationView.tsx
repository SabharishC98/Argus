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
      setGraphNodes(g.nodes);
      setGraphEdges(g.edges);
    }).catch(err => console.error('Failed to load initial graph', err));
  };

  useEffect(() => {
    fetchStatusAndGraph();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ── Requirement 1: Real Data Ingestion & Data Source Bar ── */}
      <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderGit2 size={16} color="#38bdf8" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
              Active Graph Data Source:
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 4,
                background: ingestionStatus?.active_source === 'real_repository' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                color: ingestionStatus?.active_source === 'real_repository' ? '#34d399' : '#38bdf8',
                border: ingestionStatus?.active_source === 'real_repository' ? '1px solid #10b981' : '1px solid #0284c7',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {ingestionStatus?.active_source === 'real_repository' ? '● REAL REPOSITORY' : '○ SEED / DEMO DATASET'}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              ({ingestionStatus?.repo_name || 'ShadowLens Graph'})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleResetSeed}
              disabled={ingesting}
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                padding: '5px 10px',
                borderRadius: 5,
                fontSize: '11px',
                cursor: ingesting ? 'not-allowed' : 'pointer',
              }}
            >
              Use Seed/Demo Dataset
            </button>
          </div>
        </div>

        {/* Real Repository Ingest Row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <input
            type="text"
            value={repoUrlInput}
            onChange={e => setRepoUrlInput(e.target.value)}
            placeholder="https://github.com/owner/repo or local/path"
            style={{
              flex: 1,
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 5,
              color: '#f8fafc',
              padding: '6px 12px',
              fontSize: '12px',
              outline: 'none',
              fontFamily: 'ui-monospace, monospace',
            }}
          />
          <button
            onClick={handleIngestRepo}
            disabled={ingesting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: ingesting ? '#475569' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 5,
              fontSize: '12px',
              fontWeight: 600,
              cursor: ingesting ? 'not-allowed' : 'pointer',
            }}
          >
            {ingesting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <GitBranch size={13} />}
            <span>{ingesting ? 'Analyzing Repo & OSV...' : 'Analyze Repository'}</span>
          </button>
        </div>

        {ingestMessage && (
          <div style={{ marginTop: 8, fontSize: '11px', color: ingestMessage.startsWith('✓') ? '#34d399' : '#f87171' }}>
            {ingestMessage}
          </div>
        )}
      </div>

      {/* Header & Scenario Pills */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Autonomous Graph Investigation
          </h2>
          <span style={{ fontSize: '11px', color: '#94a3b8', background: '#1e293b', padding: '4px 10px', borderRadius: 4, fontFamily: 'ui-monospace, monospace' }}>
            THEME: Agents That Act on Connected Data
          </span>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#94a3b8' }}>
          ShadowLens Agent autonomously plans multi-hop traversals, queries graph relationships through MCP tools, calculates quantitative risk, takes mitigation actions, and provides an explainable evidence trail.
        </p>

        {/* Demo Scenario Quick-Launch Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {DEMO_SCENARIOS.map((sc, i) => (
            <button
              key={i}
              onClick={() => selectScenario(sc)}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: sc.highlight
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(239, 68, 68, 0.15))'
                  : sc.honest
                  ? 'rgba(56, 189, 248, 0.1)'
                  : targetEntity === sc.target
                  ? '#1e293b'
                  : '#0f172a',
                border: sc.highlight
                  ? '1px solid #f59e0b'
                  : sc.honest
                  ? '1px solid #38bdf8'
                  : targetEntity === sc.target
                  ? '1px solid #f59e0b'
                  : '1px solid #334155',
                color: '#f1f5f9',
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              {sc.highlight ? (
                <TrendingUp size={14} color="#f59e0b" />
              ) : sc.honest ? (
                <HelpCircle size={14} color="#38bdf8" />
              ) : (
                <Sparkles size={14} color="#f59e0b" />
              )}
              <span>{sc.title}</span>
              <span
                style={{
                  fontSize: '10px',
                  background: sc.highlight
                    ? 'rgba(245, 158, 11, 0.25)'
                    : sc.honest
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(245, 158, 11, 0.15)',
                  color: sc.highlight ? '#fbbf24' : sc.honest ? '#38bdf8' : '#fbbf24',
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {sc.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Query Bar */}
      <div style={{ display: 'flex', gap: 10, background: '#0f172a', padding: '10px 14px', borderRadius: 8, border: '1px solid #1e293b' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter investigation prompt or suspicious entity ID..."
          style={{
            flex: 1,
            background: '#090d16',
            border: '1px solid #334155',
            borderRadius: 6,
            color: '#f8fafc',
            padding: '10px 14px',
            fontSize: '13px',
            outline: 'none',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') handleLaunch();
          }}
        />

        <button
          onClick={() => handleLaunch()}
          disabled={loading}
          style={{
            display: 'flex',
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
              <span>Agent Investigating...</span>
            </>
          ) : (
            <>
              <Play size={15} />
              <span>Run Investigation</span>
            </>
          )}
        </button>
      </div>

      {/* Main Split Layout: Left Graph, Right Timeline & Decision */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* Left: Connected Graph Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              <Database size={15} color="#38bdf8" />
              <span>Connected Security Knowledge Graph</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>({graphNodes.length} nodes · {graphEdges.length} edges)</span>
            </div>

            <button
              onClick={() => {
                api.getGraphOverview().then(g => {
                  setGraphNodes(g.nodes);
                  setGraphEdges(g.edges);
                  setHighlightedPath(null);
                });
              }}
              style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '3px 8px', borderRadius: 4, fontSize: '11px', cursor: 'pointer' }}
            >
              Reset to Full Graph
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
            <div style={{ background: '#0f172a', border: '1px solid #38bdf8', borderRadius: 6, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                  {selectedNode.label}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                  {selectedNode.type} · Risk: {selectedNode.risk_level} ({selectedNode.risk_score.toFixed(2)})
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                ID: {selectedNode.id}
              </div>
              <pre style={{ margin: 0, fontSize: '10px', color: '#cbd5e1', background: '#090d16', padding: '6px 8px', borderRadius: 4, maxHeight: 90, overflowY: 'auto' }}>
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
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Terminal size={32} color="#475569" />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>
                Autonomous Investigation Agent Ready
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', maxWidth: 360, lineHeight: '1.5' }}>
                Click one of the preset scenarios above (including <strong>Scenario 4 Non-Obvious Insight</strong> and <strong>Scenario 5 Failure Honesty</strong>) or enter a custom query to start the multi-hop reasoning loop.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
