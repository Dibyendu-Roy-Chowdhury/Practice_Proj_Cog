import React, { useState, useEffect } from 'react';
import { Tabs, Select } from 'antd';
import {
  SearchCode, BookOpen, SlidersHorizontal, HeartPulse, Bot,
} from 'lucide-react';
import { getAgents } from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';
import LiveLogStream        from './LiveLogStream';
import Audit                from './Audit';
import InvestigationContext from './InvestigationContext';
import Runbooks             from './Runbooks';
import HitlConsole          from './HitlConsole';
import SelfHealing          from './SelfHealing';
import Logs                 from './Logs';
import { gatedTab }         from '../components/common/gatedTab';
import { toast }            from '../utils/toast';

const SectionDivider = ({ title }) => (
  <div style={{ padding: '16px 24px 8px', borderTop: '1px solid #E2E8F0', marginTop: 4 }}>
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>{title}</span>
  </div>
);

// ── Palantir Log Analysis Panel ───────────────────────────────────────────────
// Rendered exclusively when agent-009 (Palantir Log Analysis Agent) is selected.
// All data is derived from the real Palantir AIP Logic execution log extract
// (executionId: 0000019f-5f99-e046-4806-37a7843dd29a, traceId: cf45a9c07516ae76).

const PALANTIR_SERVICE_HEALTH = [
  { label: 'Active Transforms',  value: 4,       color: '#059669', bg: '#ECFDF5' },
  { label: 'Failing Transforms', value: 1,       color: '#DC2626', bg: '#FEF2F2' },
  { label: 'Executions (24h)',   value: 23,      color: '#0F172A', bg: '#F8FAFC' },
  { label: 'Avg Duration',       value: '38.4s', color: '#0F172A', bg: '#F8FAFC' },
  { label: 'Total Tokens (24h)', value: '204K',  color: '#0F172A', bg: '#F8FAFC' },
  { label: 'Last Execution',     value: '10h ago', color: '#64748B', bg: '#F8FAFC' },
];

const PALANTIR_EXEC_STEPS = [
  { step: 'routing_agent_action',   component: 'AIP Logic / LLM',     durationMs: 2100,  tokens: 597,  status: 'SUCCESS', level: 'INFO' },
  { step: 'build_candidate_profile',component: 'OntologySqlTool',      durationMs: 8400,  tokens: 2317, status: 'SUCCESS', level: 'INFO' },
  { step: 'vector_chunk_search',    component: 'FIND_RELEVANT_CHUNKS', durationMs: 1200,  tokens: 1003, status: 'SUCCESS', level: 'INFO' },
  { step: 'recommend_jobs',         component: 'OntologySqlTool / LLM',durationMs: 24800, tokens: 8063, status: 'SUCCESS', level: 'INFO' },
  { step: 'fetch_external_data',    component: 'External Datastore',   durationMs: null,  tokens: 0,    status: 'FAILED',  level: 'ERROR' },
];

const PALANTIR_LOG_VOLUME = [
  { level: 'INFO',  count: 187, color: '#0EA5E9', bg: '#E0F2FE' },
  { level: 'WARN',  count: 14,  color: '#F59E0B', bg: '#FFFAEB' },
  { level: 'ERROR', count: 3,   color: '#DC2626', bg: '#FEF2F2' },
];

const PALANTIR_LOG_STREAM = [
  { ts: '10h 39s ago', component: 'AIP Logic / LLM',      event: 'transform.enter',         message: 'routing_agent_action — intent: top_jobs_for_candidate',                          level: 'INFO',  traceId: 'cf45a9c07516ae76' },
  { ts: '10h 37s ago', component: 'OntologySqlTool',       event: 'tool.call',               message: 'SELECT * FROM SandeepCandidateProfiles WHERE id = :candidateId',                 level: 'INFO',  traceId: 'cf45a9c07516ae76' },
  { ts: '10h 29s ago', component: 'FIND_RELEVANT_CHUNKS',  event: 'vector.search',           message: 'kValue=10, query="candidate skills and experience", dataset=SandeepProfileChunks', level: 'INFO',  traceId: 'cf45a9c07516ae76' },
  { ts: '10h 05s ago', component: 'OntologySqlTool',       event: 'tool.call',               message: 'SELECT * FROM Jobs WHERE title ILIKE :role — returned 0 rows (3rd consecutive)',   level: 'WARN',  traceId: 'cf45a9c07516ae76' },
  { ts: '10h 01s ago', component: 'External Datastore',    event: 'transform.timeout',       message: 'fetch_external_data timed out after 30s — no response from upstream datastore',    level: 'ERROR', traceId: 'cf45a9c07516ae76' },
  { ts: '10h 00s ago', component: 'AIP Logic / LLM',      event: 'transform.exit',          message: 'execution completed with 1 failed step — circuit breaker not triggered (threshold: 2)', level: 'INFO',  traceId: 'cf45a9c07516ae76' },
];

const LEVEL_COLOR = { INFO: '#0EA5E9', WARN: '#F59E0B', ERROR: '#DC2626' };
const STEP_STATUS_COLOR = { SUCCESS: '#059669', FAILED: '#DC2626' };

const PalantirLogPanel = () => {
  const maxDuration = Math.max(...PALANTIR_EXEC_STEPS.filter(s => s.durationMs).map(s => s.durationMs));

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', background: '#0F172A', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#E2E8F0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Palantir Foundry — AIP Logic Execution Monitor
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>
          logicRid: ri.eddie.main.logic.0d87a2c6 · execId: 0000019f-5f99-e046
        </span>
      </div>

      {/* Service Health Summary */}
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderTop: 'none', padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 10 }}>
          Service Health Summary
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PALANTIR_SERVICE_HEALTH.map(h => (
            <div key={h.label} style={{ background: h.bg, border: `1px solid ${h.color}22`, borderRadius: 8, padding: '8px 14px', minWidth: 100 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: h.color, lineHeight: 1 }}>{h.value}</div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>{h.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: Exec Steps + Log Volume */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', border: '1px solid #E2E8F0', borderTop: 'none' }}>
        {/* Job Execution Durations */}
        <div style={{ padding: '14px 16px', borderRight: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 10 }}>
            Job Execution Durations — Last Run (traceId: cf45a9c07516ae76)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                {['Transform Step', 'Component', 'Duration', 'Tokens', 'Status'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PALANTIR_EXEC_STEPS.map(s => (
                <tr key={s.step} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#0F172A', fontSize: 10 }}>{s.step}</td>
                  <td style={{ padding: '6px 8px', color: '#64748B', fontSize: 10 }}>{s.component}</td>
                  <td style={{ padding: '6px 8px' }}>
                    {s.durationMs ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ height: 6, width: Math.round((s.durationMs / maxDuration) * 80), background: s.status === 'SUCCESS' ? '#0EA5E9' : '#DC2626', borderRadius: 3, minWidth: 4 }} />
                        <span style={{ fontSize: 10, color: '#475569' }}>{(s.durationMs / 1000).toFixed(1)}s</span>
                      </div>
                    ) : <span style={{ fontSize: 10, color: '#DC2626' }}>timeout</span>}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#64748B', fontSize: 10 }}>{s.tokens > 0 ? s.tokens.toLocaleString() : '—'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: STEP_STATUS_COLOR[s.status], background: s.status === 'SUCCESS' ? '#ECFDF5' : '#FEF2F2', padding: '2px 6px', borderRadius: 4 }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Error Rate / Log Volume */}
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 10 }}>
            Log Volume (24h)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PALANTIR_LOG_VOLUME.map(v => {
              const pct = Math.round((v.count / (187 + 14 + 3)) * 100);
              return (
                <div key={v.level}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: v.color }}>{v.level}</span>
                    <span style={{ fontSize: 10, color: '#475569' }}>{v.count}</span>
                  </div>
                  <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3 }}>
                    <div style={{ height: 6, width: `${pct}%`, background: v.color, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, fontSize: 10, color: '#94A3B8', borderTop: '1px solid #E2E8F0', paddingTop: 10 }}>
            <div style={{ fontWeight: 700, color: '#475569', marginBottom: 4 }}>Source</div>
            <div>ri.foundry.main.dataset</div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#64748B', marginTop: 2 }}>/veriforge-staging/exec-logs</div>
          </div>
        </div>
      </div>

      {/* Recent Log Stream */}
      <div style={{ border: '1px solid #E2E8F0', borderTop: 'none', padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 10 }}>
          Recent Log Stream
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              {['Timestamp', 'Component', 'Event Type', 'Message', 'Level'].map(h => (
                <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PALANTIR_LOG_STREAM.map((entry, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F8FAFC', background: entry.level === 'ERROR' ? '#FFF8F8' : entry.level === 'WARN' ? '#FFFDF0' : 'transparent' }}>
                <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#94A3B8', whiteSpace: 'nowrap' }}>{entry.ts}</td>
                <td style={{ padding: '5px 8px', color: '#475569', whiteSpace: 'nowrap' }}>{entry.component}</td>
                <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#64748B' }}>{entry.event}</td>
                <td style={{ padding: '5px 8px', color: '#0F172A', maxWidth: 340 }}>{entry.message}</td>
                <td style={{ padding: '5px 8px' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: LEVEL_COLOR[entry.level], background: entry.level === 'INFO' ? '#E0F2FE' : entry.level === 'WARN' ? '#FFFAEB' : '#FEF2F2', padding: '2px 5px', borderRadius: 4 }}>
                    {entry.level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Pillar B tabs ──────────────────────────────────────────────────────────────

/**
 * TroubleshootingTab — active investigation desk for a SINGLE agent.
 *
 * Distinct from Insights › Fleet Events (fleet monitoring) in three ways:
 *   1. Requires an agent to be selected — no fleet-wide raw log dump.
 *   2. 2-column layout: raw log stream (left) + investigation context (right).
 *   3. InvestigationContext panel surfaces related alerts, HITL decisions,
 *      and suggested runbooks to guide the operator to resolution.
 */
const TroubleshootingTab = ({ navParams, onNavigate }) => {
  const preselect = navParams?.agentId;
  const { tenant } = useTenant();
  const [agentList,    setAgentList]    = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(preselect || null);
  const [cleared,       setCleared]      = useState(false);
  const effectiveAgent = cleared ? null : selectedAgent;

  // Keep selectedAgent in sync when navigated here with an agentId
  useEffect(() => {
    if (preselect) { setSelectedAgent(preselect); setCleared(false); }
  }, [preselect]);

  // Load agent list for selector dropdown; clear any preselect from a different tenant
  useEffect(() => {
    setSelectedAgent(null);
    setCleared(false);
    getAgents().then(res => {
      const names = (res?.agents || []).map(a => a.name || a.id).filter(Boolean);
      setAgentList(names);
      // If the preselected agent isn't in the current tenant's list, clear it
      setSelectedAgent(prev => (prev && !names.includes(prev)) ? null : prev);
    }).catch(() => {});
  }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // No agent selected → show prompt
  if (!effectiveAgent) {
    return (
      <div>
        <div style={{
          margin: '24px 0 0',
          padding: '24px 28px',
          background: '#F8FAFC', border: '2px dashed #CBD5E1', borderRadius: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={22} strokeWidth={1.5} style={{ color: '#3B82F6' }} />
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#344054' }}>Select an Agent to Begin Investigation</p>
            <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>
              Troubleshooting is agent-scoped. For fleet-wide monitoring, use{' '}
              <button
                onClick={() => onNavigate?.('1', { tab: 'telemetry' })}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#000048', fontWeight: 600, fontSize: 12 }}
              >
                Insights → Fleet Events
              </button>.
            </p>
          </div>
          <Select
            placeholder="Choose an agent..."
            style={{ width: 280 }}
            onChange={v => { setSelectedAgent(v); setCleared(false); }}
            options={agentList.map(a => ({ value: a, label: a }))}
            size="large"
            showSearch
          />
        </div>
      </div>
    );
  }

  const isPalantirAgent = effectiveAgent === 'Palantir Log Analysis Agent';

  return (
    <div>
      {/* Context banner with agent switcher */}
      <div style={{
        margin: '12px 0 0', padding: '10px 14px',
        background: isPalantirAgent ? '#0F172A' : '#FFFAEB',
        border: `1px solid ${isPalantirAgent ? '#334155' : '#FEF0C7'}`, borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {isPalantirAgent && (
          <span style={{ fontSize: 10, fontWeight: 800, color: '#34D399', background: '#064E3B', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em' }}>
            PALANTIR
          </span>
        )}
        <span style={{ fontSize: 11, fontWeight: 700, color: isPalantirAgent ? '#E2E8F0' : '#92400E' }}>
          Investigation: {effectiveAgent}
        </span>
        <span style={{ fontSize: 11, color: isPalantirAgent ? '#64748B' : '#78350F' }}>
          {isPalantirAgent ? '— Foundry execution log analysis mode.' : '— logs and traces filtered to this agent.'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Select
            size="small"
            value={effectiveAgent}
            onChange={v => { setSelectedAgent(v); setCleared(false); }}
            options={agentList.map(a => ({ value: a, label: a }))}
            style={{ minWidth: 140 }}
            placeholder="Change agent"
          />
          <button
            onClick={() => setCleared(true)}
            style={{
              border: `1px solid ${isPalantirAgent ? '#334155' : '#FEF0C7'}`, borderRadius: 4,
              background: 'transparent', color: isPalantirAgent ? '#94A3B8' : '#92400E', fontSize: 10,
              fontWeight: 600, padding: '2px 8px', cursor: 'pointer', outline: 'none',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Palantir-specific execution log panel */}
      {isPalantirAgent && <PalantirLogPanel />}

      {/* 2-column investigation workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, margin: '12px 0 0' }}>
        {/* Left — Raw log stream for this agent */}
        <div style={{ minWidth: 0 }}>
          <LiveLogStream agentFilter={effectiveAgent} />
        </div>

        {/* Right — Investigation context panel */}
        <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 0 }}>
          <InvestigationContext agentId={effectiveAgent} onNavigate={onNavigate} />
        </div>
      </div>

      {/* Below — Trace analysis + Compliance */}
      <div style={{ margin: 0 }}>
        <SectionDivider title="Trace Analysis" />
        <Audit agentFilter={effectiveAgent} />
        <SectionDivider title="Compliance & Audit Trail" />
        <Logs />
      </div>
    </div>
  );
};

const RunbooksTab = ({ navParams }) => (
  <div>
    <Runbooks navParams={navParams} />
  </div>
);

const ManualOverridesTab = ({ userRole }) => (
  <div>
    <HitlConsole userRole={userRole} />
  </div>
);

const RecoveryTab = ({ userRole }) => (
  <div>
    <SelfHealing userRole={userRole} />
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgentOpsWorkbench({ navParams, onNavigate, onTabChange, userRole }) {
  const TAB_REMAP = { 'fine-tuning': 'troubleshoot', experiments: 'troubleshoot', 'prompt-playground': 'troubleshoot' };
  const [activeTab, setActiveTab] = useState(TAB_REMAP[navParams?.tab] ?? navParams?.tab ?? 'troubleshoot');

  useEffect(() => {
    if (navParams?.tab) setActiveTab(TAB_REMAP[navParams.tab] ?? navParams.tab);
  }, [navParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire a toast when this page is opened with a pre-selected agent (Golden Thread arrival)
  useEffect(() => {
    if (navParams?.agentId && navParams?.tab === 'troubleshoot') {
      toast.info(
        'Troubleshooting Session Opened',
        `Logs and traces pre-filtered to ${navParams.agentId}.`
      );
    }
  }, [navParams?.agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const TABS = [
    gatedTab('workbench.troubleshoot', {
      key: 'troubleshoot',
      name: 'Troubleshooting',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SearchCode size={13} strokeWidth={1.5} /> Troubleshooting
        </span>
      ),
      children: <TroubleshootingTab navParams={navParams} onNavigate={onNavigate} />,
    }),
    gatedTab('workbench.runbooks', {
      key: 'runbooks',
      name: 'Runbooks',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={13} strokeWidth={1.5} /> Runbooks
        </span>
      ),
      children: <RunbooksTab navParams={navParams} />,
    }),
    gatedTab('workbench.overrides', {
      key: 'overrides',
      name: 'Manual Overrides',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={13} strokeWidth={1.5} /> Manual Overrides
        </span>
      ),
      children: <ManualOverridesTab userRole={userRole} />,
    }),
    gatedTab('workbench.recovery', {
      key: 'recovery',
      name: 'Incident Recovery',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HeartPulse size={13} strokeWidth={1.5} /> Incident Recovery
        </span>
      ),
      children: <RecoveryTab userRole={userRole} />,
    }),
  ].filter(Boolean);

  return (
    <div style={{ padding: '24px 24px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#101828', letterSpacing: '-0.02em' }}>
          Workbench
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
          The ER Room — troubleshoot, remediate, and recover.
          {navParams?.agentId && (
            <strong style={{ color: '#F59E0B', marginLeft: 4 }}>
              Active context: {navParams.agentId}
            </strong>
          )}
        </p>
      </div>
      <Tabs activeKey={activeTab} onChange={(t) => { setActiveTab(t); onTabChange?.(t); }} items={TABS} />
    </div>
  );
}
