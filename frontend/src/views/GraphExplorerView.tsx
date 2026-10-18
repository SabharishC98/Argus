import { useState, useEffect } from 'react';
import { Database, Filter, Search, Play, RefreshCw, Layers, ShieldAlert, Cpu } from 'lucide-react';
import ConnectedGraphViewer from '../components/ConnectedGraphViewer';
import { api, type GraphOverview, type GraphNode, type GraphEdge, type DiscoveredPath } from '../services/api';

const ALGORITHMS = [
  { id: 'shortest_path', label: 'Shortest Multi-Hop Path' },
  { id: 'blast_radius', label: 'Blast Radius (Downstream Impact)' },
  { id: 'risk_propagation', label: 'Risk Propagation Decay' },
  { id: 'centrality', label: 'Centrality & Bottlenecks' },
];

interface Props {
  onFalkorToggle?: () => void;
}

export default function GraphExplorerView({ onFalkorToggle }: Props) {
  const [overview, setOverview] = useState<GraphOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [falkorStatus, setFalkorStatus] = useState<import('../services/api').FalkorDBStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Algorithm runner state
  const [algorithm, setAlgorithm] = useState('shortest_path');
  const [sourceId, setSourceId] = useState('endpoint:payment-v1');
  const [targetId, setTargetId] = useState('db:prod-payments-db');
  const [algoLoading, setAlgoLoading] = useState(false);
  const [algoResult, setAlgoResult] = useState<Record<string, unknown> | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<DiscoveredPath | null>(null);

  useEffect(() => {
    fetchGraph();
    fetchFalkorStatus();
  }, []);

  const fetchFalkorStatus = () => {
    api.getFalkorDBStatus().then(setFalkorStatus).catch(console.error);
  };

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const data = await api.getGraphOverview();
      setOverview(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFalkorDB = async () => {
    if (!falkorStatus) return;
    try {
      await api.toggleFalkorDB(!falkorStatus.is_operational);
      fetchFalkorStatus();
      fetchGraph();
      // Propagate up so App.tsx top bar reflects the new state immediately
      onFalkorToggle?.();
    } catch (err) {
      console.error('Failed to toggle FalkorDB', err);
    }
  };

  const handleRunAlgorithm = async () => {
    setAlgoLoading(true);
    setAlgoResult(null);
    setHighlightedPath(null);

    try {
      const res = await api.queryGraph({
        algorithm,
        source_id: sourceId,
        target_id: targetId,
        max_hops: 6,
      });
      setAlgoResult(res);

      if (algorithm === 'shortest_path' && res.found && res.path) {
        const p = res.path as Record<string, unknown>;
        setHighlightedPath({
          found: true,
          source_id: p.source_id as string,
          target_id: p.target_id as string,
          hop_count: p.hop_count as number,
          path_node_ids: (p.nodes as Array<{ id: string }>).map(n => n.id),
          path_node_labels: (p.nodes as Array<{ label: string }>).map(n => n.label),
          relationships: (p.edges as Array<{ type: string }>).map(e => e.type),
          summary: p.explanation as string || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAlgoLoading(false);
    }
  };

  const filteredNodes = (overview?.nodes || []).filter(n => {
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.id.toLowerCase().includes(q) || n.label.toLowerCase().includes(q);
    }
    return true;
  });

  const nodeIdsSet = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = (overview?.edges || []).filter(e => {
    return nodeIdsSet.has(e.source) && nodeIdsSet.has(e.target);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h2>Graph Explorer</h2>
          <p>Direct interactive exploration of the connected knowledge graph and graph traversal algorithms</p>
        </div>
        <button
          onClick={fetchGraph}
          disabled={loading}
          className="btn btn-secondary"
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Reload Graph
        </button>
      </div>

      {/* FalkorDB Connection & Verification Beacon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Database size={16} color="var(--accent-burgundy)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            FalkorDB Authoritative Graph:
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 4, background: falkorStatus?.is_live_server ? 'rgba(49, 88, 56, 0.12)' : 'rgba(103, 36, 43, 0.08)', color: falkorStatus?.is_live_server ? '#315838' : '#67242B', fontWeight: 600 }}>
            {falkorStatus?.connection_mode || 'FalkorDB Cypher Engine (Embedded)'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: falkorStatus?.is_operational ? '#315838' : '#8C323B', display: 'inline-block' }} />
            {falkorStatus?.is_operational ? 'OPERATIONAL' : 'DISABLED (VERIFICATION TEST)'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            CRITICAL VERIFICATION:
          </span>
          <button
            onClick={handleToggleFalkorDB}
            className="btn btn-secondary"
            style={{ fontSize: '10px', padding: '4px 10px', height: 'auto', color: falkorStatus?.is_operational ? '#8C323B' : '#315838' }}
            title="Temporarily disable or enable FalkorDB to verify the agent strictly halts without graph data"
          >
            {falkorStatus?.is_operational ? 'Disable FalkorDB (Test Failure)' : 'Restore FalkorDB'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {overview && (
        <div className="stat-grid" style={{ margin: 0 }}>
          <div className="stat-card">
            <div className="stat-label">TOTAL NODES</div>
            <div className="stat-value">{overview.total_nodes}</div>
            <div className="stat-desc">Entities mapped</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">TOTAL RELATIONSHIPS</div>
            <div className="stat-value" style={{ color: 'var(--accent-gold)' }}>{overview.total_edges}</div>
            <div className="stat-desc">Graph edges</div>
          </div>
          <div className="stat-card highlighted-gold">
            <div className="stat-label">CRITICAL ASSETS</div>
            <div className="stat-value">
              {overview.risk_distribution['CRITICAL'] || 0}
            </div>
            <div className="stat-desc">High risk nodes</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">HIGH-RISK NODES</div>
            <div className="stat-value" style={{ color: 'var(--accent-gold-bright)' }}>
              {overview.risk_distribution['HIGH'] || 0}
            </div>
            <div className="stat-desc">Reachable nodes</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <Search size={15} color="var(--text-muted)" />
        <input
          type="text"
          className="form-input"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter nodes by ID, label, or path..."
          style={{ flex: 1, padding: '7px 10px', fontSize: '12px' }}
        />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['ALL', 'APIEndpoint', 'Dependency', 'DatabaseQuery', 'Vulnerability', 'Finding', 'CloudResource'].map(t => {
            const isChecked = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`tab-btn ${isChecked ? 'active' : ''}`}
                style={{ padding: '5px 10px', fontSize: '10px' }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(340px, 1fr)', gap: 20 }}>
        {/* Graph Viewer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ConnectedGraphViewer
            nodes={filteredNodes}
            edges={filteredEdges}
            highlightedPath={highlightedPath}
            selectedNodeId={selectedNode?.id}
            onSelectNode={setSelectedNode}
            height={560}
          />
        </div>

        {/* Algorithm Console & Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Algorithm Runner Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <Cpu size={15} color="var(--accent-gold)" />
              <span>Execute Graph Algorithm</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Algorithm</label>
                <select
                  value={algorithm}
                  onChange={e => setAlgorithm(e.target.value)}
                  className="form-select"
                >
                  {ALGORITHMS.map(a => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Source Entity ID</label>
                <input
                  type="text"
                  value={sourceId}
                  onChange={e => setSourceId(e.target.value)}
                  className="form-input"
                />
              </div>

              {algorithm === 'shortest_path' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Target Entity ID</label>
                  <input
                    type="text"
                    value={targetId}
                    onChange={e => setTargetId(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}

              <button
                onClick={handleRunAlgorithm}
                disabled={algoLoading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 4 }}
              >
                <Play size={13} />
                <span>{algoLoading ? 'Executing Algorithm...' : 'Run Graph Algorithm'}</span>
              </button>
            </div>

            {/* Algorithm Output */}
            {algoResult && (
              <div style={{ marginTop: 8, background: '#FAF8F8', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', color: 'var(--accent-gold-bright)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Algorithm Execution Output:
                </div>
                <pre style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', maxHeight: 180, overflowY: 'auto', fontFamily: 'var(--font-mono)' }}>
                  {JSON.stringify(algoResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Node Inspector */}
          {selectedNode && (
            <div className="card" style={{ borderColor: 'var(--accent-gold)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                Selected Entity Inspector
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-gold-bright)' }}>{selectedNode.label}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', margin: '4px 0 8px' }}>
                {selectedNode.id} · {selectedNode.type} · Risk: {selectedNode.risk_level}
              </div>
              <pre style={{ margin: 0, background: '#FAF8F8', border: '1px solid var(--border)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '10px', color: 'var(--text-secondary)', maxHeight: 120, overflowY: 'auto' }}>
                {JSON.stringify(selectedNode.properties, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
