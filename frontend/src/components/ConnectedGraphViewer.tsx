import { useEffect, useRef, useState, useMemo } from 'react';
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
  SAFE:     '#F2F2F2', // Porcelain
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
      .attr('fill', '#4b5563');

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
    glowFilter.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'coloredBlur');
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
      .attr('fill', 'rgba(103, 36, 43, 0.09)');

    svg.append('rect')
      .attr('width', width)
      .attr('height', h)
      .attr('fill', '#EAE5DE');

    // Zoom container
    const g = svg.append('g').attr('class', 'zoom-group');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Prepare simulation data
    const d3Nodes: D3Node[] = nodes.map(n => ({
      ...n,
      isPathNode: pathNodeIds.has(n.id),
    }));

    const d3Links: D3Link[] = edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.type,
      weight: e.weight,
      isPathLink: pathEdgeKeys.has(`${e.source}->${e.target}`) || pathEdgeKeys.has(`${e.target}->${e.source}`),
    }));

    // Create D3 Force Simulation
    const simulation = d3.forceSimulation<D3Node>(d3Nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(d3Links).id(d => d.id).distance(110))
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(width / 2, h / 2))
      .force('collision', d3.forceCollide().radius(44));

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
      .attr('stroke', d => d.isPathLink ? '#67242B' : 'rgba(103, 36, 43, 0.22)')
      .attr('stroke-width', d => d.isPathLink ? 2.5 : 1.2)
      .attr('stroke-dasharray', d => d.isPathLink ? '6,3' : 'none')
      .attr('marker-end', d => d.isPathLink ? 'url(#arrow-highlight)' : 'url(#arrow-default)');

    // Edge label (relationship type)
    const edgeLabels = link.append('text')
      .attr('class', 'edge-label')
      .attr('font-size', '9px')
      .attr('fill', d => d.isPathLink ? '#67242B' : '#8E545B')
      .attr('font-weight', d => d.isPathLink ? '700' : '400')
      .attr('font-family', 'var(--font-mono), monospace')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .text(d => d.type);

    // Render nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll('g')
      .data(d3Nodes)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, D3Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
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
      .attr('r', 25)
      .attr('fill', 'none')
      .attr('stroke', '#A83E49')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '4,2')
      .attr('opacity', 0.9);

    // Node selected ring
    node.filter(d => d.id === selectedNodeId)
      .append('circle')
      .attr('r', 28)
      .attr('fill', 'none')
      .attr('stroke', '#67242B')
      .attr('stroke-width', 2);

    // Node base circle
    node.append('circle')
      .attr('r', d => d.isPathNode ? 20 : 17)
      .attr('fill', '#FAF6F2')
      .attr('stroke', d => RISK_COLORS[d.risk_level] || '#8E545B')
      .attr('stroke-width', d => d.isPathNode ? 3.5 : 2);

    // Node emoji/icon
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '13px')
      .text(d => TYPE_ICONS[d.type] || '●');

    // Node title label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 32)
      .attr('font-size', '11px')
      .attr('font-weight', d => d.isPathNode ? '700' : '500')
      .attr('fill', d => d.isPathNode ? '#67242B' : '#1F0B0E')
      .text(d => {
        const short = d.label.length > 24 ? d.label.slice(0, 22) + '…' : d.label;
        return short;
      });

    // Node type caption
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 44)
      .attr('font-size', '9px')
      .attr('fill', '#8E545B')
      .attr('font-family', 'ui-monospace, monospace')
      .text(d => `${d.type} · ${d.risk_level}`);

    // Simulation tick update
    simulation.on('tick', () => {
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

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, highlightedPath, pathNodeIds, pathEdgeKeys, selectedNodeId, height, onSelectNode]);

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

      <div style={{ position: 'absolute', top: 12, right: 14, color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'var(--font-mono)', background: 'rgba(255, 255, 255, 0.94)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(103, 36, 43, 0.06)' }}>
        SCROLL TO ZOOM · DRAG TO REPOSITION ({Math.round(zoomLevel * 100)}%)
      </div>
    </div>
  );
}
