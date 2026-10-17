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
          <Terminal size={16} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.02em' }}>
            Agent Execution Timeline ({events.length} steps)
          </h3>
        </div>
        {isLive && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
            Active Investigation
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#0b1120', borderRadius: 6, border: '1px dashed #1e293b' }}>
          Awaiting agent tool invocation... Launch an investigation to see real-time multi-hop graph reasoning.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((evt, idx) => {
            const isExpanded = expandedIndex === idx;
            const isAction = evt.tool_called.includes('action') || evt.tool_called.includes('finding');
            const isPath = evt.tool_called === 'find_path';

            let badgeBg = '#1e293b';
            let badgeColor = '#94a3b8';
            if (isAction) {
              badgeBg = 'rgba(239, 68, 68, 0.15)';
              badgeColor = '#f87171';
            } else if (isPath) {
              badgeBg = 'rgba(245, 158, 11, 0.15)';
              badgeColor = '#fbbf24';
            } else if (evt.tool_called.includes('risk') || evt.tool_called.includes('impact')) {
              badgeBg = 'rgba(147, 51, 234, 0.15)';
              badgeColor = '#c084fc';
            } else {
              badgeBg = 'rgba(56, 189, 248, 0.12)';
              badgeColor = '#38bdf8';
            }

            return (
              <div
                key={idx}
                style={{
                  background: '#0f172a',
                  border: isPath ? '1px solid #78350f' : '1px solid #1e293b',
                  borderRadius: 6,
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'ui-monospace, monospace', color: '#64748b', fontWeight: 600 }}>
                      #{String(evt.step_number).padStart(2, '0')}
                    </span>
                    <span style={{ fontFamily: 'ui-monospace, monospace', color: '#94a3b8' }}>
                      {evt.timestamp}
                    </span>
                    <span style={{ background: badgeBg, color: badgeColor, padding: '2px 8px', borderRadius: 4, fontFamily: 'ui-monospace, monospace', fontWeight: 600, fontSize: '10px' }}>
                      {evt.tool_called}()
                    </span>
                  </div>

                  <button
                    onClick={() => toggleExpand(idx)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px' }}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isExpanded ? 'Hide data' : 'Inspect'}
                  </button>
                </div>

                {/* Purpose */}
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  <strong style={{ color: '#94a3b8', marginRight: 6 }}>Intent:</strong>
                  {evt.purpose}
                </div>

                {/* Evidence */}
                {evt.evidence_collected && (
                  <div style={{ fontSize: '12px', color: isPath ? '#fbbf24' : '#38bdf8', background: isPath ? 'rgba(245, 158, 11, 0.08)' : 'rgba(56, 189, 248, 0.06)', padding: '6px 10px', borderRadius: 4, borderLeft: isPath ? '3px solid #f59e0b' : '3px solid #0284c7' }}>
                    <strong style={{ color: isPath ? '#f59e0b' : '#38bdf8', marginRight: 6 }}>Evidence:</strong>
                    {evt.evidence_collected}
                  </div>
                )}

                {/* Conclusion */}
                {evt.conclusion && (
                  <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} color="#10b981" />
                    <span>{evt.conclusion}</span>
                  </div>
                )}

                {/* Expanded Raw Data Drawer */}
                {isExpanded && evt.data_snapshot && (
                  <div style={{ marginTop: 6, background: '#090d16', padding: '8px 12px', borderRadius: 4, border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: 4, fontFamily: 'ui-monospace, monospace' }}>
                      RAW MCP TOOL RESPONSE:
                    </div>
                    <pre style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontFamily: 'ui-monospace, monospace', maxHeight: 180, overflowY: 'auto' }}>
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
