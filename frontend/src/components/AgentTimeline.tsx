import { useState } from 'react';
import { Terminal, ShieldAlert, Cpu, CheckCircle2, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import type { TimelineEvent } from '../services/api';

interface Props {
  events: TimelineEvent[];
  isLive?: boolean;
}


export default function AgentTimeline({ events, isLive }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={16} color="var(--accent-gold)" />
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>
            Agent Execution Timeline ({events.length} steps)
          </h3>
        </div>
        {isLive && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--accent-burgundy-bright)', background: 'rgba(103, 36, 43, 0.25)', padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(103, 36, 43, 0.55)', fontFamily: "'DM Mono', monospace" }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-burgundy-bright)', animation: 'pulse 1.5s infinite' }} />
            Active Investigation
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#8E959E', fontSize: '13px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px dashed var(--border)' }}>
          Awaiting agent tool invocation... Launch an investigation to see real-time multi-hop graph reasoning.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((evt, idx) => {
            const isExpanded = expandedIndex === idx;
            const isAction = evt.tool_called.includes('action') || evt.tool_called.includes('finding');
            const isPath = evt.tool_called === 'find_path' || evt.tool_called.includes('path');

            let badgeBg = 'rgba(242, 242, 242, 0.04)';
            let badgeColor = '#C4BCBD';
            let badgeBorder = '1px solid var(--border)';
            if (isAction) {
              badgeBg = 'rgba(103, 36, 43, 0.4)';
              badgeColor = '#F2F2F2';
              badgeBorder = '1px solid var(--accent-burgundy-bright)';
            } else if (isPath) {
              badgeBg = 'rgba(103, 36, 43, 0.3)';
              badgeColor = 'var(--accent-burgundy-bright)';
              badgeBorder = '1px solid rgba(103, 36, 43, 0.6)';
            } else if (evt.tool_called.includes('risk') || evt.tool_called.includes('impact')) {
              badgeBg = 'rgba(168, 62, 73, 0.25)';
              badgeColor = '#F2F2F2';
              badgeBorder = '1px solid rgba(168, 62, 73, 0.45)';
            } else {
              badgeBg = 'rgba(242, 242, 242, 0.05)';
              badgeColor = 'var(--text-primary)';
              badgeBorder = '1px solid var(--border-mid)';
            }

            return (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card)',
                  border: isPath ? '1px solid var(--accent-gold)' : '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", color: '#8E959E', fontWeight: 600 }}>
                      #{String(evt.step_number).padStart(2, '0')}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", color: '#8E959E' }}>
                      {evt.timestamp}
                    </span>
                    <span style={{ background: badgeBg, color: badgeColor, border: badgeBorder, padding: '2px 8px', borderRadius: 4, fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: '10px' }}>
                      {evt.tool_called}()
                    </span>
                  </div>

                  <button
                    onClick={() => toggleExpand(idx)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', fontFamily: "'DM Mono', monospace" }}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isExpanded ? 'Hide data' : 'Inspect'}
                  </button>
                </div>

                {/* Purpose */}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#8E959E', marginRight: 6 }}>Intent:</strong>
                  {evt.purpose}
                </div>

                {/* Evidence */}
                {evt.evidence_collected && (
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', background: 'rgba(103, 36, 43, 0.25)', padding: '6px 10px', borderRadius: 4, borderLeft: '3px solid var(--accent-burgundy-bright)' }}>
                    <strong style={{ color: 'var(--accent-burgundy-bright)', marginRight: 6 }}>Evidence:</strong>
                    {evt.evidence_collected}
                  </div>
                )}

                {/* Conclusion */}
                {evt.conclusion && (
                  <div style={{ fontSize: '12px', color: 'var(--accent-burgundy-bright)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} color="var(--accent-burgundy-bright)" />
                    <span>{evt.conclusion}</span>
                  </div>
                )}

                {/* Expanded Raw Data Drawer */}
                {isExpanded && evt.data_snapshot && (
                  <div style={{ marginTop: 6, background: '#FAF8F8', padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>
                      RAW MCP TOOL RESPONSE:
                    </div>
                    <pre style={{ margin: 0, fontSize: '11px', color: 'var(--text-primary)', fontFamily: "'DM Mono', monospace", maxHeight: 180, overflowY: 'auto' }}>
                      {JSON.stringify(evt.data_snapshot, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
