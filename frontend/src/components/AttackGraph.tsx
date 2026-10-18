import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { ObserverEvent } from '../services/api';
import { palette } from '../theme';

const NODES = [
  { id: 'INPUT_VALIDATOR', label: 'Input Validator', short: 'IV' },
  { id: 'ORCHESTRATOR',    label: 'Orchestrator',    short: 'OR' },
  { id: 'TOOL_CALLER',     label: 'Tool Caller',     short: 'TC' },
  { id: 'RESPONDER',       label: 'Responder',       short: 'RS' },
];

const LINKS = [
  { source: 'INPUT_VALIDATOR', target: 'ORCHESTRATOR' },
  { source: 'ORCHESTRATOR',    target: 'TOOL_CALLER'  },
  { source: 'TOOL_CALLER',     target: 'RESPONDER'    },
];

const colorScale = d3.scaleLinear<string>()
  .domain([0, 0.35, 0.7, 1.0])
  .range(['#8E545B', '#A83E49', '#8C323B', '#67242B']);

interface Props {
  events: ObserverEvent[];
  onEdgeClick?: (event: ObserverEvent) => void;
}

export default function AttackGraph({ events, onEdgeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const edgeDataRef = useRef<Record<string, ObserverEvent>>({});

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const W = svgRef.current?.clientWidth  || 800;
    const H = svgRef.current?.clientHeight || 420;

    // Background grid
    const defs = svg.append('defs');
    const pattern = defs.append('pattern')
      .attr('id', 'grid').attr('width', 40).attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern.append('path')
      .attr('d', 'M 40 0 L 0 0 0 40')
      .attr('fill', 'none').attr('stroke', 'rgba(103, 36, 43, 0.06)').attr('stroke-width', 1);
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#grid)');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Use a vertical pipeline on narrow screens to preserve label separation.
    const compact = W < 560;
    const nodePositions: Record<string, { x: number; y: number }> = {};
    if (compact) {
      const firstY = 126;
      const nodeSpacing = Math.max(48, (H - firstY - 54) / (NODES.length - 1));
      NODES.forEach((n, i) => {
        nodePositions[n.id] = { x: W * 0.34, y: firstY + nodeSpacing * i };
      });
    } else {
      const nodeSpacing = W / (NODES.length + 1);
      NODES.forEach((n, i) => {
        nodePositions[n.id] = { x: nodeSpacing * (i + 1), y: H / 2 };
      });
    }

    // Draw edges
    LINKS.forEach(link => {
      const src  = nodePositions[link.source];
      const tgt  = nodePositions[link.target];
      const key  = `${link.source}->${link.target}`;
      const evt  = edgeDataRef.current[key];
      const conf = evt?.injection_confidence ?? 0;
      const color= colorScale(conf);
      const thick= 1.5 + (conf * 6);

      // Animated flow line
      const g = svg.append('g').attr('class', 'edge-group').style('cursor', 'pointer');

      // Shadow glow for injected edges
      if (conf > 0.3) {
        g.append('line')
          .attr('x1', src.x).attr('y1', src.y).attr('x2', tgt.x).attr('y2', tgt.y)
          .attr('stroke', color).attr('stroke-width', thick + 4)
          .attr('stroke-opacity', 0.25).attr('filter', 'url(#glow)');
      }

      g.append('line')
        .attr('x1', src.x).attr('y1', src.y).attr('x2', tgt.x).attr('y2', tgt.y)
        .attr('stroke', color).attr('stroke-width', thick)
        .attr('stroke-opacity', conf > 0 ? 0.9 : 0.45)
        .attr('stroke-linecap', 'square');

      // Arrowhead
      const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
      const ax = tgt.x - 28 * Math.cos(angle);
      const ay = tgt.y - 28 * Math.sin(angle);
      g.append('polygon')
        .attr('points', `0,-5 10,0 0,5`)
        .attr('transform', `translate(${ax},${ay}) rotate(${(angle * 180) / Math.PI})`)
        .attr('fill', color).attr('opacity', conf > 0 ? 0.9 : 0.6);

      // Confidence label on edge midpoint
      if (conf > 0) {
        g.append('text')
          .attr('x', (src.x + tgt.x) / 2)
          .attr('y', (src.y + tgt.y) / 2 - 12)
          .attr('text-anchor', 'middle')
          .attr('fill', color)
          .attr('font-size', '11px')
          .attr('font-family', 'DM Mono, monospace')
          .attr('font-weight', '700')
          .text(conf.toFixed(2));
      }

      // Click handler
      if (evt && onEdgeClick) {
        g.on('click', () => onEdgeClick(evt));
      }
    });

    // Draw nodes
    NODES.forEach(node => {
      const { x, y } = nodePositions[node.id];
      const hasEvent  = Object.keys(edgeDataRef.current).some(k => k.startsWith(node.id));
      const nodeEvent = Object.values(edgeDataRef.current).find(e => e.sender_node === node.id);
      const injected  = nodeEvent?.injection_detected ?? false;

      const g = svg.append('g').attr('transform', `translate(${x},${y})`);

      // Outer ring (injected indicator)
      if (injected) {
        g.append('circle').attr('r', 32).attr('fill', 'none')
          .attr('stroke', '#A83E49').attr('stroke-width', 2).attr('opacity', 0.85)
          .attr('stroke-dasharray', '4 3');
      }

      // Node circle - solid white background with crisp burgundy border
      g.append('circle').attr('r', 24)
        .attr('fill', injected ? 'rgba(103, 36, 43, 0.12)' : '#FFFFFF')
        .attr('stroke', injected ? '#67242B' : 'rgba(103, 36, 43, 0.45)')
        .attr('stroke-width', injected ? 2.5 : 1.8)
        .style('filter', 'drop-shadow(0 2px 6px rgba(103, 36, 43, 0.08))');

      // Short label inside node (IV, OR, TC, RS) - bold crisp ink
      g.append('text')
        .attr('text-anchor', 'middle').attr('dy', '0.36em')
        .attr('fill', injected ? '#67242B' : '#3A1217')
        .attr('font-size', '12px').attr('font-weight', '700')
        .attr('font-family', "'Chillax', system-ui, sans-serif")
        .text(node.short);

      // Node label below ("Input Validator", "Orchestrator", etc.) - dark high-contrast ink
      g.append('text')
        .attr('text-anchor', compact ? 'start' : 'middle')
        .attr('x', compact ? 38 : 0)
        .attr('dy', compact ? '0.35em' : '46px')
        .attr('fill', '#1C0A0D')
        .attr('font-size', compact ? '11px' : '12px').attr('font-weight', '700')
        .attr('font-family', "'Chillax', system-ui, sans-serif")
        .text(node.label);

      // Goal violated badge
      if (nodeEvent?.goal_violated) {
        g.append('circle').attr('cx', 16).attr('cy', -16).attr('r', 7)
          .attr('fill', '#67242B');
        g.append('text').attr('x', 16).attr('y', -13)
          .attr('text-anchor', 'middle').attr('fill', '#FFFFFF')
          .attr('font-size', '9px').attr('font-weight', '800')
          .text('!');
      }
    });

    // Legend - styled matching half-white cards
    const legend = svg.append('g').attr('transform', `translate(${compact ? 14 : W - 186}, 20)`);
    legend.append('rect').attr('width', 172).attr('height', 88)
      .attr('rx', 4).attr('fill', 'rgba(255, 255, 255, 0.96)').attr('stroke', 'rgba(103, 36, 43, 0.18)')
      .style('filter', 'drop-shadow(0 2px 8px rgba(103, 36, 43, 0.08))');
    const legendItems = [
      { color: '#8E545B', label: 'Contained (0.0–0.3)' },
      { color: '#A83E49', label: 'Watch (0.3–0.7)' },
      { color: '#67242B', label: 'Injected (0.7–1.0)' },
    ];
    legendItems.forEach((item, i) => {
      legend.append('rect').attr('x', 14).attr('y', 16 + i * 22)
        .attr('width', 14).attr('height', 5).attr('rx', 1).attr('fill', item.color);
      legend.append('text').attr('x', 36).attr('y', 21 + i * 22)
        .attr('fill', '#1C0A0D').attr('font-size', '11px').attr('font-weight', '600')
        .attr('font-family', "'Chillax', system-ui, sans-serif").text(item.label);
    });
  }, [onEdgeClick]);

  // Rebuild graph on events change
  useEffect(() => {
    events.forEach(e => {
      const key = `${e.sender_node}->${e.receiver_node}`;
      edgeDataRef.current[key] = e;
    });
    draw();
  }, [events, draw]);

  // Handle resize
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (svgRef.current) ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
