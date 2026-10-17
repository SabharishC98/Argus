import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, RefreshCw, Hash, Shield, Lock, FileText } from 'lucide-react';
import { api, type Finding, type ActionReceipt } from '../services/api';

export default function FindingsView() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [actions, setActions] = useState<ActionReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'findings' | 'actions'>('findings');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fData, aData] = await Promise.all([api.listFindings(), api.listActions()]);
      setFindings(fData);
      setActions(aData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
            Autonomous Findings & Action Ledger
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Verifiable record of agent-created security findings and automated remediation executions.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '12px' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Ledger
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
        <button
          onClick={() => setTab('findings')}
          style={{
            background: tab === 'findings' ? '#0284c7' : '#0f172a',
            color: tab === 'findings' ? '#ffffff' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ShieldAlert size={15} />
          <span>Security Findings ({findings.length})</span>
        </button>

        <button
          onClick={() => setTab('actions')}
          style={{
            background: tab === 'actions' ? '#0284c7' : '#0f172a',
            color: tab === 'actions' ? '#ffffff' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Lock size={15} />
          <span>Remediation Action Receipts ({actions.length})</span>
        </button>
      </div>

      {/* Content */}
      {tab === 'findings' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {findings.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', background: '#0f172a', borderRadius: 8, border: '1px dashed #1e293b' }}>
              No security findings recorded yet. Run an investigation to generate formal graph-backed findings.
            </div>
          ) : (
            findings.map((f, i) => (
              <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)', color: f.severity === 'CRITICAL' ? '#f87171' : '#fb923c', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '11px', fontFamily: 'ui-monospace, monospace' }}>
                      {f.severity}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                      {f.title}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                    {f.finding_id} · {f.created_at}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                  {f.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Affected Entities:</span>
                  {f.affected_entities.map((e, idx) => (
                    <span key={idx} style={{ background: '#1e293b', color: '#38bdf8', padding: '2px 6px', borderRadius: 4, fontSize: '11px', fontFamily: 'ui-monospace, monospace' }}>
                      {e}
                    </span>
                  ))}
                </div>

                {f.evidence_paths && f.evidence_paths.length > 0 && (
                  <div style={{ marginTop: 4, background: '#090d16', padding: '8px 12px', borderRadius: 6, border: '1px solid #1e293b', fontSize: '11px', color: '#fbbf24', fontFamily: 'ui-monospace, monospace' }}>
                    <strong>Attack Chain:</strong> {f.evidence_paths[0].join(' → ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actions.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', background: '#0f172a', borderRadius: 8, border: '1px dashed #1e293b' }}>
              No automated actions executed yet.
            </div>
          ) : (
            actions.map((act, i) => (
              <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: '13px' }}>
                      <CheckCircle size={15} color="#10b981" />
                      {act.action_type}
                    </span>
                    <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '10px', padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, monospace' }}>
                      {act.simulation_mode ? 'SAFE SIMULATION' : 'LIVE ENFORCED'}
                    </span>
                  </div>

                  <span style={{ fontFamily: 'ui-monospace, monospace', color: '#64748b', fontSize: '11px' }}>
                    {act.action_id}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#f1f5f9' }}>
                  {act.summary}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#090d16', padding: '8px 12px', borderRadius: 6, border: '1px solid #1e293b', fontSize: '11px' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Hash size={13} color="#64748b" /> Cryptographic Verification Hash: <code style={{ color: '#94a3b8' }}>{act.verification_hash}</code>
                  </span>
                  <span style={{ color: '#38bdf8', fontFamily: 'ui-monospace, monospace' }}>
                    Target: {act.target_entity_id}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
