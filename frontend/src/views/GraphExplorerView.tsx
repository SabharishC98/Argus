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

export default function GraphExplorerView() {
  const [overview, setOverview] = useState<GraphOverview | null>(null);
  const [loading, setLoading] = useState(true);
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
  }, []);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
            Connected Knowledge Graph Explorer
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Direct interactive exploration of the multi-agent security topology and graph algorithms.
          </p>
        </div>

        <button
          onClick={fetchGraph}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '12px' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Reload Graph
        </button>
      </div>

      {/* Metrics Row */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>TOTAL NODES</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#f8fafc' }}>{overview.total_nodes}</div>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>TOTAL RELATIONSHIPS</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8' }}>{overview.total_edges}</div>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>CRITICAL ASSETS</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444' }}>
              {overview.risk_distribution['CRITICAL'] || 0}
            </div>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>HIGH-RISK NODES</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#f97316' }}>
              {overview.risk_distribution['HIGH'] || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#0f172a', padding: '10px 14px', borderRadius: 6, border: '1px solid #1e293b' }}>
        <Search size={15} color="#64748b" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter nodes by ID or label..."
          style={{ flex: 1, background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '12px', outline: 'none' }}
        />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['ALL', 'APIEndpoint', 'Dependency', 'DatabaseQuery', 'Vulnerability', 'Finding', 'CloudResource'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                background: typeFilter === t ? '#38bdf8' : '#1e293b',
                color: typeFilter === t ? '#0f172a' : '#94a3b8',
                border: 'none',
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Algorithm Runner Card */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              <Cpu size={15} color="#38bdf8" />
              <span>Execute Graph Algorithm</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Algorithm</label>
                <select
                  value={algorithm}
                  onChange={e => setAlgorithm(e.target.value)}
                  style={{ width: '100%', background: '#090d16', border: '1px solid #334155', color: '#f8fafc', padding: '6px 8px', borderRadius: 4, fontSize: '12px' }}
                >
                  {ALGORITHMS.map(a => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Source Entity ID</label>
                <input
                  type="text"
                  value={sourceId}
                  onChange={e => setSourceId(e.target.value)}
                  style={{ width: '100%', background: '#090d16', border: '1px solid #334155', color: '#f8fafc', padding: '6px 8px', borderRadius: 4, fontSize: '12px' }}
                />
              </div>

              {algorithm === 'shortest_path' && (
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8' }}>Target Entity ID</label>
                  <input
                    type="text"
                    value={targetId}
                    onChange={e => setTargetId(e.target.value)}
                    style={{ width: '100%', background: '#090d16', border: '1px solid #334155', color: '#f8fafc', padding: '6px 8px', borderRadius: 4, fontSize: '12px' }}
                  />
                </div>
              )}

              <button
                onClick={handleRunAlgorithm}
                disabled={algoLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: algoLoading ? 'not-allowed' : 'pointer',
                  marginTop: 4,
                }}
              >
                <Play size={13} />
                <span>{algoLoading ? 'Executing...' : 'Run Graph Algorithm'}</span>
              </button>
            </div>

            {/* Algorithm Output */}
            {algoResult && (
              <div style={{ marginTop: 6, background: '#090d16', padding: '10px', borderRadius: 6, border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, marginBottom: 4 }}>
                  Algorithm Execution Output:
                </div>
                <pre style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', maxHeight: 180, overflowY: 'auto' }}>
                  {JSON.stringify(algoResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Node Inspector */}
          {selectedNode && (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>
                Selected Entity Inspector
              </div>
              <div style={{ fontSize: '12px', color: '#38bdf8' }}>{selectedNode.label}</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                {selectedNode.id} · {selectedNode.type} · Risk: {selectedNode.risk_level}
              </div>
              <pre style={{ margin: '8px 0 0', background: '#090d16', padding: '8px', borderRadius: 4, fontSize: '10px', color: '#cbd5e1', maxHeight: 120, overflowY: 'auto' }}>
                {JSON.stringify(selectedNode.properties, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
