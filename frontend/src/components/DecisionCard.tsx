import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, Hash, ExternalLink, Zap } from 'lucide-react';
import type { InvestigationDetail } from '../services/api';

interface Props {
  investigation: InvestigationDetail;
}

export default function DecisionCard({ investigation }: Props) {
  const risk = investigation.risk_level || 'UNKNOWN';
  const score = investigation.risk_score || 0;
  const explanation = investigation.explanation;
  const actions = investigation.actions_taken || [];
  const primaryPath = investigation.discovered_paths?.[0];

  let riskBg = 'rgba(239, 68, 68, 0.15)';
  let riskBorder = '#ef4444';
  let riskColor = '#f87171';
  let RiskIcon = ShieldAlert;

  if (risk === 'HIGH') {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Risk & Decision Header Card */}
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

      {/* Discovered Multi-Hop Path */}
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

      {/* Autonomous Remediation Action Receipts */}
      {actions.length > 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
              Autonomous Remediation Actions ({actions.length})
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

      {/* Evidence Chain */}
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
