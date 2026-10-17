import { useEffect, useState } from 'react';
import { Activity, FlaskConical, History, Network, Compass, ShieldAlert, Cpu } from 'lucide-react';
import InvestigationView from './views/InvestigationView';
import GraphExplorerView from './views/GraphExplorerView';
import FindingsView from './views/FindingsView';
import AttackGraphView from './views/AttackGraphView';
import LiveMonitor from './views/LiveMonitor';
import RunHistory from './views/RunHistory';
import ExperimentRunner from './views/ExperimentRunner';
import { api, type HealthStatus } from './services/api';
import './index.css';

type View = 'investigation' | 'explorer' | 'findings' | 'graph' | 'monitor' | 'history' | 'experiment';

const NAV_ITEMS = [
  { id: 'investigation', label: 'Agent Investigation', icon: Compass, code: '01' },
  { id: 'explorer',      label: 'Graph Explorer',     icon: Network, code: '02' },
  { id: 'findings',      label: 'Findings & Actions',  icon: ShieldAlert, code: '03' },
  { id: 'graph',         label: 'Attack Graph (Lab)',  icon: Activity, code: '04' },
  { id: 'monitor',       label: 'Live Monitor',        icon: Cpu, code: '05' },
  { id: 'history',       label: 'Run Archive',         icon: History, code: '06' },
  { id: 'experiment',    label: 'Experiments',         icon: FlaskConical, code: '07' },
] as const;

export default function App() {
  const [view, setView] = useState<View>('investigation');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    const interval = setInterval(() => {
      api.health().then(setHealth).catch(() => setHealth(null));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <nav className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-logo">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M5 23 12 9l4 8 4-8 7 14-11-7-11 7Z" stroke="#38bdf8" strokeWidth="2" />
              <path d="m10 25 6-4 6 4" stroke="#f59e0b" strokeWidth="2" />
            </svg>
          </span>
          <span className="brand-lockup">
            <span className="brand-name">ShadowLens</span>
            <span className="brand-caption" style={{ color: '#38bdf8' }}>Connected Data Agent</span>
          </span>
        </div>

        <div className="sidebar-section-label">Agent Workspace</div>
        <div className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon, code }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => setView(id)}
              aria-label={label}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon className="nav-icon" size={17} strokeWidth={1.7} aria-hidden="true" />
              <span className="nav-label">{label}</span>
              <span className="nav-index">{code}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-spacer" />

        <section className="runtime-panel" aria-label="Backend connection status">
          <div className="runtime-label">
            <span>Agent Engine</span>
            <span className={`status-beacon ${health ? 'is-online' : 'is-offline'}`} />
          </div>
          <strong>{health ? 'Connected & Active' : 'Offline'}</strong>
          <span className="runtime-detail">
            {health
              ? `Graph Ready · MCP Tools Active · API v${health.version || '2.0.0'}`
              : 'Waiting for API connection'}
          </span>
        </section>

        <div className="sidebar-footer">
          <span>ShadowLens 2.0 Agent</span>
          <span>Hackathon Submission · Connected Data</span>
        </div>
      </nav>

      <main className="main-content">
        <div className="utility-bar">
          <div className="utility-path">
            <span>Autonomous Security Agent</span>
            <span className="utility-separator">/</span>
            <span>Connected Knowledge Graph</span>
            <span className="utility-separator">/</span>
            <span style={{ color: '#38bdf8' }}>Multi-Hop Reasoning</span>
          </div>
          <div className="utility-meta">
            <span>Model Context Protocol (MCP)</span>
            <span className="utility-mark" aria-hidden="true" />
          </div>
        </div>

        {view === 'investigation' && <InvestigationView />}
        {view === 'explorer' && <GraphExplorerView />}
        {view === 'findings' && <FindingsView />}
        {view === 'graph' && <AttackGraphView onRunStarted={setActiveRunId} />}
        {view === 'monitor' && <LiveMonitor runId={activeRunId} />}
        {view === 'history' && <RunHistory />}
        {view === 'experiment' && <ExperimentRunner />}
      </main>
    </div>
  );
}
