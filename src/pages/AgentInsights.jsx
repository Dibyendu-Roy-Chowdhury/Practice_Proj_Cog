import React, { useState, useEffect } from 'react';
import { Tabs } from 'antd';
import { Activity, ShieldCheck, BarChart2, Radar } from 'lucide-react';
import PerformanceMetrics  from './PerformanceMetrics';
import FleetEventFeed      from './FleetEventFeed';
import AnomalyScoring      from './AnomalyScoring';
import XOpsIntelligence    from './XOpsIntelligence';
import TrustSecurity       from './TrustSecurity';
import { gatedTab }        from '../components/common/gatedTab';
import { getAgentsSync }   from '../services/API_services';

const SectionDivider = ({ title }) => (
  <div style={{ padding: '16px 24px 8px', borderTop: '1px solid #E2E8F0', marginTop: 4 }}>
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>{title}</span>
  </div>
);

const WorkbenchCTA = ({ label, agentId, tab = 'troubleshoot', onNavigate, disabled }) => (
  <button
    onClick={disabled ? undefined : () => onNavigate?.('2', { tab, agentId })}
    disabled={disabled}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: '#000048', color: '#fff', border: 'none', outline: 'none',
      fontSize: 12, fontWeight: 600, transition: 'opacity 0.15s ease',
      opacity: disabled ? 0.4 : 1,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.85'; }}
    onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '1'; }}
  >
    {label || 'Investigate in Workbench →'}
  </button>
);

// ── Pillar A tabs ──────────────────────────────────────────────────────────────

const FleetHealthTab = () => (
  <div>
    <PerformanceMetrics />
  </div>
);

// Fleet Events tab — fleet-wide curated event monitor (NOT a raw log stream).
// Raw logs and full trace explorer live in Workbench › Troubleshooting.
const FleetEventsTab = ({ onNavigate }) => (
  <div>
    <FleetEventFeed onNavigate={onNavigate} />
  </div>
);

const SignalsDriftTab = ({ navParams, onNavigate }) => {
  // Derive the default agent dynamically so it reflects the selected tenant.
  const defaultAgentId = navParams?.agentId || getAgentsSync()[0]?.name || '';
  return (
    <div>
      <AnomalyScoring navParams={navParams} onNavigate={onNavigate} />
      <SectionDivider title="Precursor Alerts & Remediation" />
      <XOpsIntelligence agentId={defaultAgentId} />
      <div style={{ padding: '16px 24px' }}>
        <WorkbenchCTA onNavigate={onNavigate} agentId={defaultAgentId} />
      </div>
    </div>
  );
};

const GuardrailsSafetyTab = () => (
  <div>
    <TrustSecurity />
  </div>
);

// ── Tab remap for removed/renamed tabs arriving via navParams ─────────────────
const TAB_REMAP = {
  'token-context':  'health',
  'tool-analytics': 'health',
  orchestration:    'health',
  evaluations:      'signals',
  feedback:         'safety',
  quality:          'signals',
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgentInsights({ navParams, onNavigate, onTabChange }) {
  const [activeTab, setActiveTab] = useState(TAB_REMAP[navParams?.tab] ?? navParams?.tab ?? 'health');

  useEffect(() => {
    if (navParams?.tab) setActiveTab(TAB_REMAP[navParams.tab] ?? navParams.tab);
  }, [navParams]);

  const TABS = [
    gatedTab('insights.health', {
      key: 'health',
      name: 'Fleet Health',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart2 size={13} strokeWidth={1.5} /> Fleet Health
        </span>
      ),
      children: <FleetHealthTab onNavigate={onNavigate} />,
    }),
    // Gate key 'insights.fleet-events' intentionally differs from tab key 'telemetry':
    // the feature flag names the "Fleet Events" capability; 'telemetry' is the stable
    // tab identifier preserved for backwards-compatible navParams routing.
    gatedTab('insights.fleet-events', {
      key: 'telemetry',
      name: 'Fleet Events',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={13} strokeWidth={1.5} /> Fleet Events
        </span>
      ),
      children: <FleetEventsTab onNavigate={onNavigate} />,
    }),
    gatedTab('insights.signals', {
      key: 'signals',
      name: 'Signals & Drift',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Radar size={13} strokeWidth={1.5} /> Signals & Drift
        </span>
      ),
      children: <SignalsDriftTab navParams={navParams} onNavigate={onNavigate} />,
    }),
    // Gate key 'insights.guardrails' intentionally differs from tab key 'safety':
    // the feature flag names the guardrail subsystem; 'safety' is the stable tab
    // identifier used throughout the navigation and TAB_REMAP redirect chains.
    gatedTab('insights.guardrails', {
      key: 'safety',
      name: 'Safety & Monitoring',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={13} strokeWidth={1.5} /> Safety & Monitoring
        </span>
      ),
      children: <GuardrailsSafetyTab onNavigate={onNavigate} />,
    }),
  ].filter(Boolean);

  return (
    <div style={{ padding: '24px 24px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#101828', letterSpacing: '-0.02em' }}>
          Insights
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
          Fleet-wide observability — monitor health, detect signals, and track guardrails.
        </p>
      </div>
      <Tabs activeKey={activeTab} onChange={(t) => { setActiveTab(t); onTabChange?.(t); }} items={TABS} />
    </div>
  );
}
