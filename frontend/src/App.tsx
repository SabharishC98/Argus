import { useCallback, useEffect, useState } from 'react';
import { Compass, Network, ShieldAlert, BarChart3 } from 'lucide-react';
import InvestigationView from './views/InvestigationView';
import GraphExplorerView from './views/GraphExplorerView';
import FindingsView from './views/FindingsView';
import EvaluationView from './views/EvaluationView';
import ArgusMythBackground from './components/ArgusMythBackground';
import { api, type HealthStatus } from './services/api';
import './index.css';

type View = 'investigation' | 'explorer' | 'findings' | 'evaluation';

const NAV_ITEMS = [
  { id: 'investigation', label: 'Agent Investigation', icon: Compass,     code: '01' },
  { id: 'explorer',      label: 'Graph Explorer',     icon: Network,     code: '02' },
  { id: 'findings',      label: 'Findings & Actions',  icon: ShieldAlert, code: '03' },
  { id: 'evaluation',    label: 'Measured Results & Lab', icon: BarChart3, code: '04' },
] as const;

export default function App() {
  const [view, setView] = useState<View>('investigation');
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const refreshHealth = useCallback(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    refreshHealth();
    // Poll fast (4s) during initial cloud wake-up, then settle to 30s once online
    const interval = setInterval(refreshHealth, health ? 30_000 : 4_000);
    return () => clearInterval(interval);
  }, [health, refreshHealth]);

  return (
    <div className="app-layout">
      {/* Mythical Argus Panoptes Drawing Background */}
      <ArgusMythBackground />

      <nav className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-logo">
          <span className="brand-mark" aria-hidden="true" title="Argus Panoptes — The All-Seeing Guardian">
            <svg viewBox="0 0 32 32" fill="none">
              {/* Outer watchful eye contour */}
              <path d="M4 16 C8 8, 24 8, 28 16 C24 24, 8 24, 4 16 Z" stroke="#F2F2F2" strokeWidth="1.6" />
              {/* Concentric iris ring */}
              <circle cx="16" cy="16" r="5" stroke="#67242B" strokeWidth="2" fill="none" />
              {/* Vigilant pupil */}
              <circle cx="16" cy="16" r="2.2" fill="#F2F2F2" />
              {/* Celestial ticks */}
              <line x1="16" y1="3" x2="16" y2="6.5" stroke="#A83E49" strokeWidth="1.5" />
              <line x1="16" y1="25.5" x2="16" y2="29" stroke="#A83E49" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="brand-lockup">
            <span className="brand-name">ARGUS</span>
            <span className="brand-caption" style={{ color: 'var(--accent-burgundy-bright)' }}>ALL-SEEING GRAPH AGENT</span>
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
            <span>FalkorDB Graph</span>
            <span className={`status-beacon ${health ? 'is-online' : 'is-offline'}`} />
          </div>
          <strong>
            {health
              ? (health.falkordb_mode === 'live_server' ? 'FalkorDB Cloud (Port 6379)' : 'FalkorDB Cypher Engine')
              : 'Connecting Engine...'}
          </strong>
          <span className="runtime-detail">
            {health
              ? `${health.falkordb_mode === 'live_server' ? '● Live Server' : '● Embedded Engine'} · ${health.falkordb_node_count || 14} Nodes · MCP Ready`
              : 'Waking up cloud container (takes ~30s on free tier)...'}
          </span>
        </section>

        <div className="sidebar-footer">
          <span>Argus 2.0 Agent</span>
          <span>Hackathon Track 01 · Connected Data</span>
        </div>
      </nav>

      <main className="main-content" style={{ position: 'relative', zIndex: 2 }}>
        <div className="utility-bar">
          <div className="utility-path">
            <span>Argus Autonomous Security Agent</span>
            <span className="utility-separator">/</span>
            <span>FalkorDB Knowledge Graph</span>
            <span className="utility-separator">/</span>
            <span style={{ color: 'var(--accent-burgundy-bright)', fontWeight: 600 }}>Multi-Hop Reasoning</span>
          </div>
          <div className="utility-meta" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: health ? '#315838' : '#8C323B', display: 'inline-block' }} />
              {health?.falkordb_mode === 'live_server' ? 'FalkorDB Cloud: Connected' : 'FalkorDB Engine: Active'}
            </span>
            <span>Model Context Protocol (MCP)</span>
            <span className="utility-mark" aria-hidden="true" />
          </div>
        </div>

        {view === 'investigation' && <InvestigationView />}
        {view === 'explorer' && <GraphExplorerView onFalkorToggle={refreshHealth} />}
        {view === 'findings' && <FindingsView />}
        {view === 'evaluation' && <EvaluationView />}
      </main>
    </div>
  );
}
