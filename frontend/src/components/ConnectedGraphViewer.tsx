import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge, DiscoveredPath } from '../services/api';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedPath?: DiscoveredPath | null;
  selectedNodeId?: string | null;
  onSelectNode?: (node: GraphNode | null) => void;
  height?: number;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#67242B', // Brand deep burgundy
  HIGH:     '#8C323B', // Wine red
  MEDIUM:   '#A83E49', // Crimson oxblood
  LOW:      '#968E8F', // Silver soft
  SAFE:     '#315838', // Forest muted green
};

const TYPE_ICONS: Record<string, string> = {
  APIEndpoint:   '⚡',
  UserInput:     '📥',
  Class:         '📦',
  Function:      'λ',
  DatabaseQuery: '🗄️',
  Dependency:    '🧩',
  Vulnerability: '⚠️',
  Finding:       '🛡️',
  CloudResource: '☁️',
  Account:       '👤',
  Repository:    '📁',
  File:          '📄',
};

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  risk_level: string;
  risk_score: number;
  properties: Record<string, unknown>;
  isPathNode?: boolean;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  type: string;
  weight: number;
  isPathLink?: boolean;
}

export default function ConnectedGraphViewer({
  nodes,
  edges,
  highlightedPath,
  selectedNodeId,
  onSelectNode,
  height = 540,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  
  // Persist node positions across re-renders to prevent sudden reforming/explosions
  const nodePosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const zoomGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Compute set of path node IDs and path edges for rapid lookup
  const pathNodeIds = useMemo(() => {
    return new Set(highlightedPath?.path_node_ids || []);
  }, [highlightedPath]);

  const pathEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    if (highlightedPath?.path_node_ids && highlightedPath.path_node_ids.length > 1) {
      for (let i = 0; i < highlightedPath.path_node_ids.length - 1; i++) {
        const u = highlightedPath.path_node_ids[i];
        const v = highlightedPath.path_node_ids[i + 1];
        keys.add(`${u}->${v}`);
        keys.add(`${v}->${u}`);
      }
    }
    return keys;
  }, [highlightedPath]);

  // Topology fingerprint: only re-build the D3 force simulation when actual nodes/edges change
  const topologyFingerprint = useMemo(() => {
    const nKey = nodes.map(n => n.id).sort().join(',');
    const eKey = edges.map(e => `${e.source}->${e.target}`).sort().join(',');
    return `${nKey}|${eKey}`;
  }, [nodes, edges]);

  // Main D3 force layout creation & physics configuration
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const h = height;

    // Define defs: markers, glow filters, background grid
    const defs = svg.append('defs');

    // Arrowhead marker default
    defs.append('marker')
      .attr('id', 'arrow-default')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'rgba(103, 36, 43, 0.4)');

    // Arrowhead marker path highlight
    defs.append('marker')
      .attr('id', 'arrow-highlight')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 26)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#A83E49');

    // Glow filter
    const glowFilter = defs.append('filter').attr('id', 'path-glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', 3.5).attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Background subtle grid
    const gridPattern = defs.append('pattern')
      .attr('id', 'graph-grid')
      .attr('width', 36)
      .attr('height', 36)
      .attr('patternUnits', 'userSpaceOnUse');
    gridPattern.append('circle')
      .attr('cx', 2)
      .attr('cy', 2)
      .attr('r', 1.2)
      .attr('fill', 'rgba(103, 36, 43, 0.08)');

    svg.append('rect')
      .attr('width', width)
      .attr('height', h)
      .attr('fill', '#EAE5DE');

    // Zoom container
    const g = svg.append('g').attr('class', 'zoom-group');
    zoomGroupRef.current = g;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Check if we have cached positions for existing nodes
    let hasExistingPositions = false;
    const d3Nodes: D3Node[] = nodes.map((n, i) => {
      const cached = nodePosRef.current.get(n.id);
      if (cached) {
        hasExistingPositions = true;
        return {
          ...n,
          x: cached.x,
          y: cached.y,
          isPathNode: pathNodeIds.has(n.id),
        };
      }
      // Spread new nodes gently around center
      const angle = (i / Math.max(1, nodes.length)) * 2 * Math.PI;
      const radius = 120 + (i % 3) * 45;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius,
        isPathNode: pathNodeIds.has(n.id),
      };
    });

    const d3Links: D3Link[] = edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.type,
      weight: e.weight,
      isPathLink: pathEdgeKeys.has(`${e.source}->${e.target}`) || pathEdgeKeys.has(`${e.target}->${e.source}`),
    }));

    // Scale physics dynamically with node count to ensure ample spacing
    const nodeCount = d3Nodes.length;
    const linkDist = nodeCount > 50 ? 150 : (nodeCount > 25 ? 130 : 110);
    const repulseStrength = nodeCount > 50 ? -380 : (nodeCount > 25 ? -280 : -220);
    const collideRadius = nodeCount > 50 ? 44 : 38;

    // Create D3 Force Simulation with balanced repulsion and collision to ensure clean spacing
    const simulation = d3.forceSimulation<D3Node>(d3Nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(d3Links).id(d => d.id).distance(linkDist).strength(0.6))
      .force('charge', d3.forceManyBody().strength(repulseStrength).distanceMax(550))
      .force('center', d3.forceCenter(width / 2, h / 2).strength(0.06))
      .force('collision', d3.forceCollide().radius(collideRadius).strength(0.85))
      .velocityDecay(0.65)   // High friction: quickly settles without elastic oscillation
      .alphaDecay(0.04);     // Rapid cooling: graph reaches stable resting state quickly

    // If positions were already known, reheat very gently so it barely shifts
    if (hasExistingPositions) {
      simulation.alpha(0.18).restart();
    }

    simulationRef.current = simulation;

    // Render edges
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('g')
      .data(d3Links)
      .enter()
      .append('g')
      .attr('class', 'link-group');

    // Edge shadow line for path glow
    link.filter(d => !!d.isPathLink)
      .append('line')
      .attr('stroke', '#67242B')
      .attr('stroke-width', 6)
      .attr('stroke-opacity', 0.28)
      .attr('filter', 'url(#path-glow)');

    // Main edge line
    const edgeLines = link.append('line')
      .attr('class', 'edge-line')
      .attr('stroke', d => d.isPathLink ? '#67242B' : 'rgba(103, 36, 43, 0.18)')
      .attr('stroke-width', d => d.isPathLink ? 2.5 : 1.1)
      .attr('stroke-dasharray', d => d.isPathLink ? '6,3' : 'none')
      .attr('marker-end', d => d.isPathLink ? 'url(#arrow-highlight)' : 'url(#arrow-default)');

    // Edge label (relationship type) - hide non-critical edge text when dense to keep view clean
    const edgeLabels = link.append('text')
      .attr('class', 'edge-label')
      .attr('font-size', '8px')
      .attr('fill', d => d.isPathLink ? '#67242B' : 'rgba(142, 84, 91, 0.75)')
      .attr('font-weight', d => d.isPathLink ? '700' : '400')
      .attr('font-family', 'var(--font-mono), monospace')
      .attr('text-anchor', 'middle')
      .attr('dy', -3)
      .style('pointer-events', 'none')
      .text(d => {
        // In dense graphs, only show labels on highlighted paths or significant links
        if (nodeCount > 40 && !d.isPathLink) return '';
        return d.type;
      });

    // Render nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll('g')
      .data(d3Nodes, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .attr('id', d => `node-el-${d.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`)
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, D3Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.2).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            // Pin dragged position in cache
            if (d.x !== undefined && d.y !== undefined) {
              nodePosRef.current.set(d.id, { x: d.x, y: d.y });
            }
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_event, d) => {
        onSelectNode?.(d);
      });

    // Node outer ring / halo for path nodes
    node.filter(d => !!d.isPathNode)
      .append('circle')
      .attr('class', 'path-halo')
      .attr('r', 25)
      .attr('fill', 'none')
      .attr('stroke', '#A83E49')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '4,2')
      .attr('opacity', 0.9);

    // Dedicated Selection ring (controlled smoothly by separate useEffect)
    node.append('circle')
      .attr('class', 'selection-ring')
      .attr('r', 28)
      .attr('fill', 'none')
      .attr('stroke', d => d.id === selectedNodeId ? '#67242B' : 'transparent')
      .attr('stroke-width', 2.5);

    // Node base circle
    node.append('circle')
      .attr('r', d => d.isPathNode ? 20 : 16)
      .attr('fill', '#FAF6F2')
      .attr('stroke', d => RISK_COLORS[d.risk_level] || '#8E545B')
      .attr('stroke-width', d => d.isPathNode ? 3.5 : 2);

    // Node emoji/icon
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '12px')
      .style('pointer-events', 'none')
      .text(d => TYPE_ICONS[d.type] || '●');

    // Node label badge background for crystal-clear readability
    node.append('rect')
      .attr('class', 'label-bg')
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', 'rgba(255, 255, 255, 0.88)')
      .attr('stroke', 'rgba(103, 36, 43, 0.12)')
      .attr('stroke-width', 0.5)
      .style('pointer-events', 'none');

    // Node title label with clean truncation
    const labelTexts = node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 28)
      .attr('font-size', '10px')
      .attr('font-weight', d => d.isPathNode ? '700' : '500')
      .attr('fill', d => d.isPathNode ? '#67242B' : '#1F0B0E')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .style('pointer-events', 'none')
      .text(d => {
        const maxLen = nodeCount > 40 ? 16 : 22;
        return d.label.length > maxLen ? d.label.slice(0, maxLen - 1) + '…' : d.label;
      });

    // Auto-fit label backgrounds
    labelTexts.each(function(this: SVGTextElement) {
      try {
        const bbox = this.getBBox();
        const parent = d3.select(this.parentNode as SVGGElement);
        parent.select('.label-bg')
          .attr('x', bbox.x - 4)
          .attr('y', bbox.y - 1)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 2);
      } catch {
        // Fallback if headless/hidden
      }
    });

    // Node subtitle / type caption: hide in dense graphs to eliminate clumsy text collisions
    if (nodeCount <= 35) {
      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 40)
        .attr('font-size', '8.5px')
        .attr('fill', '#8E545B')
        .attr('font-family', 'ui-monospace, monospace')
        .style('pointer-events', 'none')
        .text(d => `${d.type} · ${d.risk_level}`);
    }

    // Simulation tick update
    simulation.on('tick', () => {
      // Continuously update node positions in cache
      d3Nodes.forEach(d => {
        if (d.x !== undefined && d.y !== undefined) {
          nodePosRef.current.set(d.id, { x: d.x, y: d.y });
        }
      });

      edgeLines
        .attr('x1', d => (d.source as D3Node).x || 0)
        .attr('y1', d => (d.source as D3Node).y || 0)
        .attr('x2', d => (d.target as D3Node).x || 0)
        .attr('y2', d => (d.target as D3Node).y || 0);

      edgeLabels
        .attr('x', d => (((d.source as D3Node).x || 0) + ((d.target as D3Node).x || 0)) / 2)
        .attr('y', d => (((d.source as D3Node).y || 0) + ((d.target as D3Node).y || 0)) / 2);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Stop simulation when settled completely to avoid CPU burn or micro-shakes
    simulation.on('end', () => {
      simulation.stop();
    });

    return () => {
      simulation.stop();
    };
  }, [topologyFingerprint, height]);

  // Separate, lightweight effect to handle node selection styling without restarting physics!
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('.node-item').each(function(d: any) {
      const isSelected = d && d.id === selectedNodeId;
      d3.select(this).select('circle.selection-ring')
        .attr('stroke', isSelected ? '#67242B' : 'transparent')
        .attr('stroke-width', isSelected ? 2.5 : 0);
    });
  }, [selectedNodeId]);

  // Separate effect to handle highlighted path updates without rebuilding the whole simulation!
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Update edge highlights
    svg.selectAll('.edge-line').each(function(d: any) {
      if (!d) return;
      const isPath = pathEdgeKeys.has(`${d.source.id || d.source}->${d.target.id || d.target}`) ||
                     pathEdgeKeys.has(`${d.target.id || d.target}->${d.source.id || d.source}`);
      d3.select(this)
        .attr('stroke', isPath ? '#67242B' : 'rgba(103, 36, 43, 0.22)')
        .attr('stroke-width', isPath ? 2.5 : 1.2)
        .attr('stroke-dasharray', isPath ? '6,3' : 'none')
        .attr('marker-end', isPath ? 'url(#arrow-highlight)' : 'url(#arrow-default)');
    });

    // Update edge label highlights
    svg.selectAll('.edge-label').each(function(d: any) {
      if (!d) return;
      const isPath = pathEdgeKeys.has(`${d.source.id || d.source}->${d.target.id || d.target}`) ||
                     pathEdgeKeys.has(`${d.target.id || d.target}->${d.source.id || d.source}`);
      d3.select(this)
        .attr('fill', isPath ? '#67242B' : '#8E545B')
        .attr('font-weight', isPath ? '700' : '400');
    });

    // Update node path halos
    svg.selectAll('.node-item').each(function(d: any) {
      if (!d) return;
      const isPath = pathNodeIds.has(d.id);
      const sel = d3.select(this);
      let halo = sel.select('.path-halo');
      if (isPath) {
        if (halo.empty()) {
          sel.insert('circle', ':first-child')
            .attr('class', 'path-halo')
            .attr('r', 25)
            .attr('fill', 'none')
            .attr('stroke', '#A83E49')
            .attr('stroke-width', 2.5)
            .attr('stroke-dasharray', '4,2')
            .attr('opacity', 0.9);
        }
      } else {
        halo.remove();
      }
    });
  }, [pathNodeIds, pathEdgeKeys]);

  // Recenter / Reset View callback
  const handleResetView = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    setZoomLevel(1);
    if (simulationRef.current) {
      simulationRef.current.alpha(0.15).restart();
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height, background: '#F2F2F2', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Legend & Controls Overlay */}
      <div style={{ position: 'absolute', bottom: 12, left: 14, display: 'flex', gap: 12, background: 'rgba(255, 255, 255, 0.94)', padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '11px', fontFamily: 'var(--font-mono)', backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(103, 36, 43, 0.08)' }}>
        <span style={{ color: '#67242B', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#67242B', border: '1px solid #A83E49', display: 'inline-block' }} /> Critical
        </span>
        <span style={{ color: '#8C323B', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8C323B', display: 'inline-block' }} /> High
        </span>
        <span style={{ color: '#A83E49', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#A83E49', display: 'inline-block' }} /> Medium
        </span>
        <span style={{ color: '#315838', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#315838', display: 'inline-block' }} /> Safe
        </span>
        {highlightedPath && (
          <span style={{ color: 'var(--accent-burgundy)', marginLeft: 8, borderLeft: '1px solid var(--border)', paddingLeft: 10, fontWeight: 700 }}>
            ★ Discovered Attack Path ({highlightedPath.hop_count} hops)
          </span>
        )}
      </div>

      <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={handleResetView}
          title="Reset Zoom & Recenter Layout"
          style={{
            color: 'var(--accent-burgundy)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            background: 'rgba(255, 255, 255, 0.94)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(103, 36, 43, 0.06)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ↺ RECENTER
        </button>
        <div style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'var(--font-mono)', background: 'rgba(255, 255, 255, 0.94)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(103, 36, 43, 0.06)' }}>
          SCROLL TO ZOOM · DRAG TO PIN ({Math.round(zoomLevel * 100)}%)
        </div>
      </div>
    </div>
  );
}
