import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Hash,
  Zap,
  TrendingUp,
  HelpCircle,
  Check,
  X,
  Layers,
  AlertOctagon,
} from 'lucide-react';
import { api, type ActionReceipt, type InvestigationDetail } from '../services/api';

interface Props {
  investigation: InvestigationDetail;
  onActionStatusChange?: () => void;
}

export default function DecisionCard({ investigation, onActionStatusChange }: Props) {
  const [pendingActions, setPendingActions] = useState<ActionReceipt[]>(
    investigation.pending_actions || []
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const risk = investigation.risk_level || 'UNKNOWN';
  const score = investigation.risk_score || 0;
  const explanation = investigation.explanation;
  const actions = investigation.actions_taken || [];
  const primaryPath = investigation.discovered_paths?.[0];
  const escalation = investigation.severity_escalation;
  const isInsufficientEvidence = investigation.uncertainty_state === 'INSUFFICIENT_EVIDENCE';

  let riskBg = 'rgba(239, 68, 68, 0.15)';
  let riskBorder = '#ef4444';
  let riskColor = '#f87171';
  let RiskIcon = ShieldAlert;

  if (isInsufficientEvidence) {
    riskBg = 'rgba(56, 189, 248, 0.15)';
    riskBorder = '#38bdf8';
    riskColor = '#38bdf8';
    RiskIcon = HelpCircle;
  } else if (risk === 'CRITICAL') {
    riskBg = 'rgba(239, 68, 68, 0.2)';
    riskBorder = '#ef4444';
    riskColor = '#f87171';
    RiskIcon = AlertOctagon;
  } else if (risk === 'HIGH') {
    riskBg = 'rgba(249, 115, 22, 0.15)';
    riskBorder = '#f97316';
    riskColor = '#fb923c';
    RiskIcon = AlertTriangle;
  } else if (risk === 'MEDIUM') {
    riskBg = 'rgba(234, 179, 8, 0.15)';
    riskBorder = '#eab308';
    riskColor = '#facc15';
    RiskIcon = AlertTriangle;
  } else if (risk === 'LOW' || risk === 'SAFE') {
    riskBg = 'rgba(16, 185, 129, 0.15)';
    riskBorder = '#10b981';
    riskColor = '#34d399';
    RiskIcon = ShieldCheck;
  }

  const handleApprove = async (actionId: string) => {
    setActionLoading(actionId);
    try {
      const res = await api.approveAction(actionId, 'security_lead');
      if (res.success) {
        setPendingActions(prev =>
          prev.map(a =>
            a.action_id === actionId
              ? { ...a, status: res.status, approved_by: res.approved_by }
              : a
          )
        );
        onActionStatusChange?.();
      }
    } catch (err) {
      console.error('Failed to approve action:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (actionId: string) => {
    setActionLoading(actionId);
    try {
      const res = await api.rejectAction(actionId, 'Rejected by operator: business impact window required');
      if (res.success) {
        setPendingActions(prev =>
          prev.map(a =>
            a.action_id === actionId
              ? { ...a, status: 'REJECTED', rejection_reason: res.rejection_reason }
              : a
          )
        );
        onActionStatusChange?.();
      }
    } catch (err) {
      console.error('Failed to reject action:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Requirement 3: Non-Obvious Severity Escalation Card ── */}
      {escalation && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.12))',
            border: '1px solid #f59e0b',
            borderRadius: 8,
            padding: '16px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={18} color="#f59e0b" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Non-Obvious Graph Insight: Severity Escalated
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
            <span style={{ background: '#334155', color: '#facc15', padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontSize: '12px' }}>
              Initial: {escalation.initial}
            </span>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '14px' }}>→</span>
            <span style={{ background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', border: '1px solid #ef4444', padding: '4px 10px', borderRadius: 4, fontWeight: 800, fontSize: '13px' }}>
              Escalated: {escalation.escalated}
            </span>
          </div>

          <p style={{ margin: '8px 0', fontSize: '12px', color: '#e2e8f0', lineHeight: 1.5 }}>
            {escalation.reason}
          </p>

          <div style={{ background: '#090d16', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', marginTop: 10 }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: 4 }}>
              Discovered Attack Breadcrumb Path ({escalation.path.length} hops):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {escalation.path.map((nodeId, idx) => (
                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: '#1e293b', color: idx === escalation.path.length - 1 ? '#f87171' : '#f1f5f9', padding: '3px 7px', borderRadius: 4, fontSize: '11px', fontFamily: 'ui-monospace, monospace' }}>
                    {nodeId}
                  </span>
                  {idx < escalation.path.length - 1 && (
                    <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700 }}>→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Requirement 5: Honest Failure & Uncertainty Handling Card ── */}
      {isInsufficientEvidence && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(30, 41, 59, 0.8))',
            border: '1px solid #38bdf8',
            borderRadius: 8,
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <HelpCircle size={18} color="#38bdf8" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Failure Honesty: Insufficient Evidence Confirmed
            </span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#e2e8f0', lineHeight: 1.5 }}>
            The agent conducted multi-hop traversal across the connected knowledge graph. While localized anomalies exist in the component, the graph verified <strong>0 paths</strong> to production datastores, KMS keys, or cloud IAM roles.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#090d16', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Status:</span>
            <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: 4, fontSize: '11px', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>
              ESCALATED TO HUMAN REVIEW (NO DESTRUCTIVE ACTIONS TAKEN)
            </span>
          </div>
        </div>
      )}

      {/* ── Standard Assessment & Risk Header ── */}
      <div style={{ background: '#0f172a', border: `1px solid ${riskBorder}`, borderRadius: 8, padding: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: riskBorder }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: riskBg, padding: '8px', borderRadius: '50%', display: 'flex' }}>
              <RiskIcon size={20} color={riskColor} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Autonomous Agent Assessment
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{risk} RISK</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
                  (Score: {score.toFixed(2)})
                </span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Decision</span>
            <div style={{ fontSize: '12px', fontFamily: 'ui-monospace, monospace', color: '#38bdf8', fontWeight: 600 }}>
              {investigation.decision || 'INVESTIGATION_CONCLUDED'}
            </div>
          </div>
        </div>

        {explanation?.executive_summary && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', lineHeight: '1.5', color: '#cbd5e1' }}>
            {explanation.executive_summary}
          </p>
        )}
      </div>

      {/* ── Discovered Multi-Hop Path ── */}
      {primaryPath && primaryPath.found && (
        <div style={{ background: '#0f172a', border: '1px solid #78350f', borderRadius: 8, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>
            <Zap size={14} color="#f59e0b" />
            <span>Discovered {primaryPath.hop_count}-Hop Execution Path</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {primaryPath.path_node_labels.map((lbl, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ background: '#1e293b', color: '#f1f5f9', padding: '4px 8px', borderRadius: 4, fontSize: '11px', fontFamily: 'ui-monospace, monospace', border: i === 0 || i === primaryPath.path_node_labels.length - 1 ? '1px solid #f59e0b' : '1px solid #334155' }}>
                  {lbl}
                </span>
                {i < primaryPath.path_node_labels.length - 1 && (
                  <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 700 }}>→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Requirement 4: Human-in-the-Loop Action Approval Card with Blast Radius Preview ── */}
      {pendingActions.length > 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #38bdf8', borderRadius: 8, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} color="#38bdf8" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                Human-in-the-Loop: Action Awaiting Approval ({pendingActions.length})
              </h4>
            </div>
            <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: 4, fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
              PRE-EXECUTION GATE
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingActions.map(act => {
              const isPending = act.status === 'AWAITING_APPROVAL' || act.status === 'PROPOSED';
              const isExecuted = act.status.includes('EXECUTED');
              const isRejected = act.status === 'REJECTED';
              const blast = act.blast_radius_preview;

              return (
                <div key={act.action_id} style={{ background: '#090d16', padding: '12px 14px', borderRadius: 6, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: '#38bdf8', fontFamily: 'ui-monospace, monospace' }}>
                      {act.action_type} → {act.target_entity_id}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 600,
                        background: isPending ? 'rgba(234, 179, 8, 0.15)' : isExecuted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isPending ? '#facc15' : isExecuted ? '#34d399' : '#f87171',
                      }}
                    >
                      {act.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    {act.summary}
                  </div>

                  {/* Pre-Execution Blast Radius Preview */}
                  {blast && (
                    <div style={{ background: '#030712', padding: '10px', borderRadius: 4, border: '1px solid #1f2937', marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', fontWeight: 600, color: '#f59e0b', marginBottom: 6 }}>
                        <Layers size={13} />
                        <span>Pre-Execution Graph Blast-Radius Preview ({blast.blast_count} nodes impacted)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '11px', color: '#94a3b8' }}>
                        <div>
                          <strong style={{ color: '#cbd5e1' }}>Upstream Dependencies:</strong>{' '}
                          {blast.upstream_dependencies_impacted.length > 0
                            ? blast.upstream_dependencies_impacted.join(', ')
                            : 'None'}
                        </div>
                        <div>
                          <strong style={{ color: '#cbd5e1' }}>Downstream Dependents:</strong>{' '}
                          {blast.downstream_dependents_impacted.length > 0
                            ? blast.downstream_dependents_impacted.join(', ')
                            : 'None'}
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <strong style={{ color: '#34d399' }}>Protected / Shielded Assets:</strong>{' '}
                          {blast.critical_nodes_shielded.length > 0
                            ? blast.critical_nodes_shielded.join(', ')
                            : 'All primary services isolated safely'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Approve / Reject Controls */}
                  {isPending && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <button
                        onClick={() => handleApprove(act.action_id)}
                        disabled={actionLoading === act.action_id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={14} />
                        <span>{actionLoading === act.action_id ? 'Executing...' : 'Approve & Enforce Action'}</span>
                      </button>

                      <button
                        onClick={() => handleReject(act.action_id)}
                        disabled={actionLoading === act.action_id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'transparent',
                          color: '#f87171',
                          border: '1px solid #ef4444',
                          padding: '6px 14px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {isExecuted && act.approved_by && (
                    <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} />
                      <span>Approved by {act.approved_by} and enforced in simulation mode.</span>
                    </div>
                  )}

                  {isRejected && act.rejection_reason && (
                    <div style={{ fontSize: '11px', color: '#f87171' }}>
                      Rejection Reason: {act.rejection_reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Autonomous Remediation Action Receipts ── */}
      {actions.length > 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
              Action Verification Receipts ({actions.length})
            </h4>
            <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, monospace' }}>
              SIMULATION MODE
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actions.map((act, i) => (
              <div key={i} style={{ background: '#090d16', padding: '10px 12px', borderRadius: 6, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} color="#10b981" />
                    {act.action_type}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', color: '#64748b' }}>
                    {act.action_id}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  {act.summary}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTop: '1px dashed #1e293b', fontSize: '10px', color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Hash size={11} color="#64748b" /> Proof: <code style={{ color: '#94a3b8' }}>{act.verification_hash}</code>
                  </span>
                  <span style={{ color: '#38bdf8' }}>Target: {act.target_entity_id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Explainable Evidence Chain ── */}
      {explanation?.evidence_chain && explanation.evidence_chain.length > 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '14px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
            Explainable Evidence Trail
          </h4>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            {explanation.evidence_chain.map((ev, i) => (
              <li key={i}>{ev}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
