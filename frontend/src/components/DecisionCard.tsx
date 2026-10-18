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
          className="card"
          style={{
            borderColor: 'var(--accent-gold)',
            background: 'linear-gradient(135deg, rgba(229, 169, 60, 0.1), rgba(17, 19, 21, 0.95))',
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={16} color="var(--accent-gold)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              Non-Obvious Graph Insight: Severity Escalated
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0' }}>
            <span className="badge" style={{ color: 'var(--text-secondary)' }}>
              Initial: {escalation.initial}
            </span>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '14px' }}>→</span>
            <span className="badge badge-high" style={{ fontWeight: 800 }}>
              Escalated: {escalation.escalated}
            </span>
          </div>

          <p style={{ margin: '8px 0', fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {escalation.reason}
          </p>

          <div style={{ background: '#FAF8F8', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: 10 }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
              Discovered Multi-Hop Path ({escalation.path.length} hops):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {escalation.path.map((nodeId, idx) => (
                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="badge" style={{ color: idx === escalation.path.length - 1 ? 'var(--accent-gold-bright)' : 'var(--text-primary)', borderColor: idx === escalation.path.length - 1 ? 'var(--accent-gold)' : 'var(--border)' }}>
                    {nodeId}
                  </span>
                  {idx < escalation.path.length - 1 && (
                    <span style={{ color: 'var(--accent-gold)', fontSize: '11px', fontWeight: 700 }}>→</span>
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
          className="card"
          style={{
            borderColor: 'var(--border-bright)',
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <HelpCircle size={16} color="var(--accent-gold)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              Failure Honesty: Insufficient Evidence Confirmed
            </span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            The agent conducted multi-hop traversal across the connected knowledge graph. While localized anomalies exist in the component, the graph verified <strong>0 paths</strong> to production datastores, KMS keys, or cloud IAM roles.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAF8F8', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Status:</span>
            <span className="badge badge-safe">
              ESCALATED TO HUMAN REVIEW (NO DESTRUCTIVE ACTIONS TAKEN)
            </span>
          </div>
        </div>
      )}

      {/* ── Standard Assessment & Risk Header ── */}
      <div className="card" style={{ borderColor: 'var(--accent-gold)', padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(229, 169, 60, 0.12)', border: '1px solid var(--border-bright)', padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
              <RiskIcon size={20} color="var(--accent-gold-bright)" />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                Autonomous Agent Assessment
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-editorial)' }}>
                <span>{risk} RISK</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  (Score: {score.toFixed(2)})
                </span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Decision</span>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-bright)', fontWeight: 700 }}>
              {investigation.decision || 'INVESTIGATION_CONCLUDED'}
            </div>
          </div>
        </div>

        {explanation?.executive_summary && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {explanation.executive_summary}
          </p>
        )}
      </div>

      {/* ── Discovered Multi-Hop Path ── */}
      {primaryPath && primaryPath.found && (
        <div className="card" style={{ borderColor: 'var(--border-bright)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '11px', fontWeight: 700, color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            <Zap size={13} color="var(--accent-gold)" />
            <span>Discovered {primaryPath.hop_count}-Hop Execution Path</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {primaryPath.path_node_labels.map((lbl, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="badge" style={{ borderColor: i === 0 || i === primaryPath.path_node_labels.length - 1 ? 'var(--accent-gold)' : 'var(--border)', color: 'var(--text-primary)' }}>
                  {lbl}
                </span>
                {i < primaryPath.path_node_labels.length - 1 && (
                  <span style={{ color: 'var(--accent-gold)', fontSize: '11px', fontWeight: 700 }}>→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Requirement 4: Human-in-the-Loop Action Approval Card with Blast Radius Preview ── */}
      {pendingActions.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--accent-gold)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} color="var(--accent-gold)" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Human-in-the-Loop: Action Awaiting Approval ({pendingActions.length})
              </h4>
            </div>
            <span className="badge badge-high">
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
                <div key={act.action_id} style={{ background: '#FAF8F8', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-mono)' }}>
                      {act.action_type} → {act.target_entity_id}
                    </span>
                    <span className={isPending ? 'badge badge-high' : isExecuted ? 'badge badge-safe' : 'badge'}>
                      {act.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {act.summary}
                  </div>

                  {/* Pre-Execution Blast Radius Preview */}
                  {blast && (
                    <div style={{ background: '#F5F2F3', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '10px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        <Layers size={12} />
                        <span>Pre-Execution Graph Blast-Radius Preview ({blast.blast_count} nodes impacted)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '11px', color: 'var(--text-muted)' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>Upstream Dependencies:</strong>{' '}
                          {blast.upstream_dependencies_impacted.length > 0
                            ? blast.upstream_dependencies_impacted.join(', ')
                            : 'None'}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>Downstream Dependents:</strong>{' '}
                          {blast.downstream_dependents_impacted.length > 0
                            ? blast.downstream_dependents_impacted.join(', ')
                            : 'None'}
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <strong style={{ color: 'var(--accent-gold-bright)' }}>Protected Assets:</strong>{' '}
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
                        className="btn btn-primary"
                        style={{ fontSize: '10px', padding: '6px 14px' }}
                      >
                        <Check size={13} />
                        <span>{actionLoading === act.action_id ? 'Executing...' : 'Approve & Enforce Action'}</span>
                      </button>

                      <button
                        onClick={() => handleReject(act.action_id)}
                        disabled={actionLoading === act.action_id}
                        className="btn btn-danger"
                        style={{ fontSize: '10px', padding: '6px 14px' }}
                      >
                        <X size={13} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {isExecuted && act.approved_by && (
                    <div style={{ fontSize: '11px', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
                      <CheckCircle size={12} />
                      <span>Approved by {act.approved_by} and enforced in simulation mode.</span>
                    </div>
                  )}

                  {isRejected && act.rejection_reason && (
                    <div style={{ fontSize: '11px', color: '#e06c75', fontFamily: 'var(--font-mono)' }}>
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
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Action Verification Receipts ({actions.length})
            </h4>
            <span className="badge badge-safe">
              SIMULATION MODE
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actions.map((act, i) => (
              <div key={i} style={{ background: '#FAF8F8', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--accent-gold-bright)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} color="var(--accent-gold)" />
                    {act.action_type}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {act.action_id}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {act.summary}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTop: '1px dashed var(--border)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
                    <Hash size={11} color="var(--accent-gold)" /> Proof: <code>{act.verification_hash}</code>
                  </span>
                  <span style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>Target: {act.target_entity_id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Explainable Evidence Chain ── */}
      {explanation?.evidence_chain && explanation.evidence_chain.length > 0 && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Explainable Evidence Trail
          </h4>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {explanation.evidence_chain.map((ev, i) => (
              <li key={i}>{ev}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
