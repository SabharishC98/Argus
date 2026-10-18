import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, RefreshCw, Hash, Shield, Lock, FileText, History } from 'lucide-react';
import { api, type Finding, type ActionReceipt } from '../services/api';
import RunHistory from './RunHistory';

export default function FindingsView() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [actions, setActions] = useState<ActionReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'findings' | 'actions' | 'archive'>('findings');

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h2>Findings & Actions</h2>
          <p>Verifiable record of agent-created security findings, autonomous remediation actions, and run history</p>
        </div>

        {tab !== 'archive' && (
          <button
            onClick={loadData}
            disabled={loading}
            className="btn btn-secondary"
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh Ledger
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-group" style={{ margin: 0 }}>
        <button
          onClick={() => setTab('findings')}
          className={`tab-btn ${tab === 'findings' ? 'active' : ''}`}
        >
          <ShieldAlert size={14} />
          <span>Security Findings ({findings.length})</span>
        </button>

        <button
          onClick={() => setTab('actions')}
          className={`tab-btn ${tab === 'actions' ? 'active' : ''}`}
        >
          <Lock size={14} />
          <span>Remediation Action Receipts ({actions.length})</span>
        </button>

        <button
          onClick={() => setTab('archive')}
          className={`tab-btn ${tab === 'archive' ? 'active' : ''}`}
        >
          <History size={14} />
          <span>Run Archive & Execution Audit</span>
        </button>
      </div>

      {/* Content */}
      {tab === 'archive' ? (
        <RunHistory />
      ) : tab === 'findings' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {findings.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No security findings recorded yet. Run an investigation to generate formal graph-backed findings.
            </div>
          ) : (
            findings.map((f, i) => (
              <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={f.severity === 'CRITICAL' ? 'badge badge-critical' : 'badge badge-high'}>
                      {f.severity}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {f.title}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {f.finding_id} · {f.created_at}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {f.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Affected Entities:</span>
                  {f.affected_entities.map((e, idx) => (
                    <span key={idx} className="badge" style={{ color: 'var(--accent-gold)' }}>
                      {e}
                    </span>
                  ))}
                </div>

                {f.evidence_paths && f.evidence_paths.length > 0 && (
                  <div style={{ marginTop: 6, background: '#FAF8F8', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--accent-gold-bright)', fontFamily: 'var(--font-mono)' }}>
                    <strong style={{ color: 'var(--accent-gold)' }}>ATTACK CHAIN:</strong> {f.evidence_paths[0].join(' → ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {actions.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No automated remediation actions executed yet.
            </div>
          ) : (
            actions.map((act, i) => (
              <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--accent-gold-bright)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '13px' }}>
                      <CheckCircle size={15} color="var(--accent-gold)" />
                      {act.action_type}
                    </span>
                    <span className="badge badge-safe">
                      {act.simulation_mode ? 'SAFE SIMULATION' : 'LIVE ENFORCED'}
                    </span>
                  </div>

                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px' }}>
                    {act.action_id}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                  {act.summary}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAF8F8', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)' }}>
                    <Hash size={13} color="var(--accent-gold)" /> Cryptographic Receipt: <code style={{ color: 'var(--text-secondary)' }}>{act.verification_hash}</code>
                  </span>
                  <span style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
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
