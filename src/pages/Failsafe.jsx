import React, { useState, useEffect } from 'react';
import {
  Table, message, Button, Modal,
  Switch, Space, Tag, Tooltip, Tabs,
} from 'antd';
import { History, Bot, Database, FlaskConical, CheckCircle, XCircle } from 'lucide-react';
import {
  getAgents, updateAgentStatus,
  getAgentVersionHistory, getAgentEvalMetrics,
} from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';
import PageHeader  from '../components/layout/PageHeader';
import { gatedTab } from '../components/common/gatedTab';
import { isSubFeatureEnabled } from '../config/featureGates';
import { toast }   from '../utils/toast';
import StatusBadge from '../components/common/Badge';
import KpiBar      from '../components/common/KpiBar';
import ModelRegistry from './ModelRegistry';

const MODEL_OPTIONS = [
  { label: 'AWS Bedrock', options: [
    { value: 'anthropic.claude-3-sonnet-20240229-v1:0', label: 'Claude 3 Sonnet (AWS Bedrock)' },
    { value: 'anthropic.claude-3-haiku-20240307-v1:0',  label: 'Claude 3 Haiku (AWS Bedrock)'  },
    { value: 'anthropic.claude-3-opus-20240229-v1:0',   label: 'Claude 3 Opus (AWS Bedrock)'   },
    { value: 'amazon.titan-text-express-v1',             label: 'Amazon Titan Text Express'     },
    { value: 'meta.llama3-70b-instruct-v1:0',            label: 'Meta LLaMA 3 70B (AWS Bedrock)'},
  ]},
  { label: 'Azure OpenAI', options: [
    { value: 'azure/gpt-4o',       label: 'GPT-4o (Azure OpenAI)'       },
    { value: 'azure/gpt-4-turbo',  label: 'GPT-4 Turbo (Azure OpenAI)'  },
    { value: 'azure/gpt-35-turbo', label: 'GPT-3.5 Turbo (Azure OpenAI)'},
    { value: 'azure/mistral-large',label: 'Mistral Large (Azure OpenAI)' },
  ]},
  { label: 'Google Vertex AI', options: [
    { value: 'google/gemini-1.5-pro',   label: 'Gemini 1.5 Pro (Vertex AI)'  },
    { value: 'google/gemini-1.5-flash', label: 'Gemini 1.5 Flash (Vertex AI)'},
    { value: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash (Vertex AI)'},
    { value: 'google/text-bison',       label: 'PaLM 2 Text Bison (Vertex AI)'},
  ]},
  { label: 'OpenAI', options: [
    { value: 'openai/gpt-4o',      label: 'GPT-4o (OpenAI)'     },
    { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo (OpenAI)'},
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenAI)'},
  ]},
  { label: 'Meta (Self-hosted)', options: [
    { value: 'meta/llama-3-70b', label: 'LLaMA 3 70B (Meta)' },
    { value: 'meta/llama-3-8b',  label: 'LLaMA 3 8B (Meta)'  },
  ]},
  { label: 'Mistral AI', options: [
    { value: 'mistral/mistral-large', label: 'Mistral Large' },
    { value: 'mistral/mistral-7b',    label: 'Mistral 7B'    },
  ]},
];

const flatModels = MODEL_OPTIONS.flatMap(g => g.options);
const modelLabel = v => flatModels.find(m => m.value === v)?.label || v?.split('/').pop() || '—';

const CHANGE_COLORS = { create: 'green', update: 'blue', rollback: 'orange' };

const ENV_OPTIONS = [
  { value: 'production', label: 'Production', color: '#10B981', bg: '#ECFDF3' },
  { value: 'staging',    label: 'Staging',    color: '#F59E0B', bg: '#FFFAEB' },
  { value: 'dev',        label: 'Dev',        color: '#00B5E2', bg: '#E0F2FE' },
];

const MOCK_ENV_SEED = ['production', 'production', 'production', 'staging', 'staging', 'dev'];
const deriveEnv = (agent, idx) => agent.environment || MOCK_ENV_SEED[idx % MOCK_ENV_SEED.length];

// ── Multi-cloud assignment ────────────────────────────────────────────────────
// Cycle through AWS → Azure → GCP so the registry always shows all three clouds.
const CLOUD_SEED = ['AWS', 'Azure', 'GCP', 'AWS', 'Azure', 'GCP'];
const CLOUD_META = {
  AWS:   { color: '#B45309', bg: '#FFF8EE', dot: '#FF9900', label: 'AWS'   },
  Azure: { color: '#0078D4', bg: '#EEF5FF', dot: '#0078D4', label: 'Azure' },
  GCP:   { color: '#188038', bg: '#F0FBF2', dot: '#34A853', label: 'GCP'   },
};

const CloudBadge = ({ provider }) => {
  const meta = CLOUD_META[provider] || CLOUD_META.AWS;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
      background: meta.bg, color: meta.color,
      border: `1px solid ${meta.color}33`,
      letterSpacing: '0.01em',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
      {meta.label}
    </span>
  );
};

// ── Compliance tags per tenant ────────────────────────────────────────────────
const COMPLIANCE_MAP = {
  'arcadia-health': [
    { label: 'HIPAA',     color: '#10B981', bg: '#ECFDF5' },
    { label: 'ISO 42001', color: '#000048', bg: '#EEF2FF' },
  ],
  'capital-wealth': [
    { label: 'SEC',       color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'FINRA',     color: '#D97706', bg: '#FFFBEB' },
    { label: 'SOC 2',     color: '#059669', bg: '#ECFDF5' },
    { label: 'ISO 42001', color: '#000048', bg: '#EEF2FF' },
  ],
};
const DEFAULT_COMPLIANCE = [
  { label: 'ISO 42001', color: '#000048', bg: '#EEF2FF' },
];

const CompliancePills = ({ tenantId }) => {
  const tags = COMPLIANCE_MAP[tenantId] || DEFAULT_COMPLIANCE;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {tags.map(t => (
        <span key={t.label} style={{
          fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
          background: t.bg, color: t.color, border: `1px solid ${t.color}33`,
          whiteSpace: 'nowrap',
        }}>
          {t.label}
        </span>
      ))}
    </div>
  );
};

// ── Evaluation Modal ──────────────────────────────────────────────────────────
const SCORE_COLOR = (s) => s >= 0.85 ? '#10B981' : s >= 0.70 ? '#F59E0B' : '#EF4444';
const SCORE_BG    = (s) => s >= 0.85 ? '#ECFDF5' : s >= 0.70 ? '#FFFBEB' : '#FEF2F2';
const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;
const fmtTs = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
};

const EvalModal = ({ agent, tenantId, open, onClose }) => {
  if (!agent) return null;
  const data = getAgentEvalMetrics(agent.id || agent.agent_id);
  const { summary, runs, environment } = data;
  const tags = COMPLIANCE_MAP[tenantId] || DEFAULT_COMPLIANCE;

  const envMeta = ENV_OPTIONS.find(o => o.value === environment) || ENV_OPTIONS[0];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[<Button key="close" onClick={onClose}>Close</Button>]}
      width={720}
      destroyOnClose
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FlaskConical size={16} strokeWidth={1.5} style={{ color: '#000048' }} />
          <span style={{ fontWeight: 800, color: '#101828' }}>{agent.name}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {tags.map(t => (
              <span key={t.label} style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: t.bg, color: t.color, border: `1px solid ${t.color}33` }}>
                {t.label}
              </span>
            ))}
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: envMeta.bg, color: envMeta.color }}>
              {envMeta.label}
            </span>
          </div>
        </div>
      }
    >
      {/* Sub-header */}
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94A3B8' }}>
        {agent.agent_id || agent.id} · {agent.model_id ? agent.model_id.split('/').pop().split('.').slice(1, 3).join(' ') : '—'} · {(agent.cloud_provider || 'AWS')} {agent.cloud_region || ''}
      </p>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Factual Accuracy',    value: pct(summary.accuracy),                color: SCORE_COLOR(summary.accuracy),         bg: SCORE_BG(summary.accuracy)         },
          { label: 'Hallucination Rate',  value: pct(summary.hallucination),            color: SCORE_COLOR(1 - summary.hallucination), bg: SCORE_BG(1 - summary.hallucination) },
          { label: 'Guardrail Bypasses',  value: summary.guardrailBypasses,             color: summary.guardrailBypasses > 0 ? '#EF4444' : '#10B981', bg: summary.guardrailBypasses > 0 ? '#FEF2F2' : '#ECFDF5' },
          { label: 'Composite Score',     value: pct(summary.compositeScore),           color: SCORE_COLOR(summary.compositeScore),    bg: SCORE_BG(summary.compositeScore)    },
          { label: 'Avg Latency',         value: `${(summary.avgLatencyMs / 1000).toFixed(2)}s`, color: '#101828', bg: '#F8FAFC'      },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ flex: '1 1 100px', background: bg, border: `1px solid ${color}22`, borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>{label}</p>
            <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent runs table */}
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
        Recent Evaluation Runs
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            {['Run ID', 'Type', 'Status', 'Composite', 'Accuracy', 'Hallucin.', 'Bypasses', 'Started'].map(h => (
              <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.eval_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '7px 8px', fontFamily: 'monospace', color: '#64748B', fontSize: 11 }}>{r.eval_id.split('-').slice(-1)[0]}</td>
              <td style={{ padding: '7px 8px' }}>
                <Tag style={{ fontSize: 10 }} color={{ scheduled: 'cyan', regression: 'volcano', manual: 'blue' }[r.eval_type] || 'default'}>
                  {r.eval_type}
                </Tag>
              </td>
              <td style={{ padding: '7px 8px' }}>
                {r.status === 'completed'
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontSize: 11, fontWeight: 600 }}><CheckCircle size={12} strokeWidth={2} /> Passed</span>
                  : <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444', fontSize: 11, fontWeight: 600 }}><XCircle   size={12} strokeWidth={2} /> Failed</span>
                }
              </td>
              <td style={{ padding: '7px 8px' }}>
                {r.status === 'failed' ? <span style={{ color: '#EF4444', fontWeight: 700 }}>—</span> : (
                  <span style={{ fontWeight: 700, padding: '2px 7px', borderRadius: 10, fontSize: 11, background: SCORE_BG(r.metrics.composite_score), color: SCORE_COLOR(r.metrics.composite_score) }}>
                    {pct(r.metrics.composite_score)}
                  </span>
                )}
              </td>
              <td style={{ padding: '7px 8px', color: SCORE_COLOR(r.metrics.factual_accuracy ?? 0) }}>{r.status === 'failed' ? '—' : pct(r.metrics.factual_accuracy)}</td>
              <td style={{ padding: '7px 8px', color: SCORE_COLOR(1 - (r.metrics.hallucination_score ?? 0)) }}>{r.status === 'failed' ? '—' : pct(r.metrics.hallucination_score)}</td>
              <td style={{ padding: '7px 8px', color: r.metrics.guardrail_bypass_attempts > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>{r.metrics.guardrail_bypass_attempts ?? 0}</td>
              <td style={{ padding: '7px 8px', color: '#94A3B8', fontSize: 11 }}>{fmtTs(r.started_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
};

const Failsafe = ({ navParams, onNavigate, onTabChange, userRole }) => {
  const { tenant } = useTenant();
  const tenantId   = tenant?.id || 'arcadia-health';

  const [agents,   setAgents]   = useState([]);
  const [loading,  setLoading]  = useState(false);

  // Evaluation modal state
  const [evalOpen,  setEvalOpen]  = useState(false);
  const [evalAgent, setEvalAgent] = useState(null);

  // History
  const [histOpen,      setHistOpen]      = useState(false);
  const [histAgent,     setHistAgent]     = useState(null);
  const [history,       setHistory]       = useState([]);
  const [histLoading,   setHistLoading]   = useState(false);

  const TAB_REMAP = { lifecycle: 'fleet', memory: 'fleet', deployments: 'fleet', routing: 'fleet', rag: 'models', 'eval-suites': 'models', prompts: 'fleet', tools: 'fleet' };
  const [mainTab, setMainTab] = useState(TAB_REMAP[navParams?.tab] ?? navParams?.tab ?? 'fleet');

  useEffect(() => {
    if (navParams?.tab) setMainTab(TAB_REMAP[navParams.tab] ?? navParams.tab);
  }, [navParams?.tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (navParams?.agentId) {
      toast.info('Registry Opened', `Viewing registry context for ${navParams.agentId}.`);
    } else if (navParams?.modelId) {
      toast.info('Model Card', `Opening model card for ${navParams.modelId}.`);
    }
  }, [navParams?.agentId, navParams?.modelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAgents(); }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAgents = async () => {
    setLoading(true);
    try { const d = await getAgents(); setAgents(d.agents); }
    catch { message.error('Failed to load agents'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateAgentStatus(id, status);
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      message.success(status === 'Active' ? 'Agent activated' : 'Agent deactivated');
    } catch { message.error('Status update failed'); }
  };

  const handleOpenHistory = async a => {
    setHistAgent(a); setHistOpen(true); setHistLoading(true);
    try {
      const d = await getAgentVersionHistory(a.id);
      setHistory([...d.version_history].reverse());
    } catch { message.error('Failed to load version history'); }
    finally { setHistLoading(false); }
  };

  const augmentedAgents = agents.map((a, idx) => ({
    ...a,
    environment:    deriveEnv(a, idx),
    cloud_provider: a.cloud_provider || CLOUD_SEED[idx % CLOUD_SEED.length],
  }));
  const activeCount     = augmentedAgents.filter(a => (a.status || '').toLowerCase() === 'active').length;

  const columns = [
    {
      title: 'Agent Name', dataIndex: 'name', key: 'name', width: '18%',
      render: v => <span className="text-sm font-semibold text-ink-primary">{v}</span>,
    },
    {
      title: 'Description', dataIndex: 'desc', key: 'desc', width: '22%',
      render: (t, r) => <span className="text-xs text-ink-secondary">{t || r.description}</span>,
    },
    {
      title: 'Cloud', dataIndex: 'cloud_provider', key: 'cloud', width: '9%',
      render: v => <CloudBadge provider={v || 'AWS'} />,
    },
    {
      title: 'Compliance', key: 'compliance', width: '14%',
      render: () => <CompliancePills tenantId={tenantId} />,
    },
    {
      title: 'Model', dataIndex: 'model_id', key: 'model', width: '16%',
      render: v => <Tag style={{ fontSize: 11 }}>{modelLabel(v)}</Tag>,
    },
    {
      title: 'Version', dataIndex: 'version_string', key: 'ver', width: '7%',
      render: (v, r) => (
        <Tag color={CHANGE_COLORS[r.change_type] || 'default'}>{v || `v${r.version}`}</Tag>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: '12%',
      render: (status, r) => (
        <div className="flex items-center gap-2">
          <StatusBadge variant={status === 'Active' ? 'success' : 'neutral'} dot>
            {status}
          </StatusBadge>
          <Switch
            size="small"
            checked={status === 'Active'}
            disabled={userRole !== 'admin' || !isSubFeatureEnabled('registry.fleet.editAgent')}
            onChange={checked => handleStatusChange(r.id, checked ? 'Active' : 'Inactive')}
          />
        </div>
      ),
    },
    {
      title: 'Circuit Breaker', dataIndex: 'circuit_breaker', key: 'cb', width: '10%',
      render: (v, r) => {
        const states = ['Closed', 'Closed', 'Closed', 'Half-Open', 'Open'];
        const state = v || states[r.id?.charCodeAt(1) % states.length] || 'Closed';
        const colorMap = { 'Closed': 'success', 'Half-Open': 'warning', 'Open': 'error' };
        return <Tag color={colorMap[state]} style={{ fontSize: 11 }}>{state}</Tag>;
      },
    },
    {
      title: 'Actions', key: 'actions', width: '8%',
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="Evaluation Results">
            <Button size="small" icon={<FlaskConical size={13} strokeWidth={1.5} />} onClick={(e) => { e.stopPropagation(); setEvalAgent(r); setEvalOpen(true); }} />
          </Tooltip>
          <Tooltip title="Revision History">
            <Button size="small" icon={<History size={13} strokeWidth={1.5} />} onClick={(e) => { e.stopPropagation(); handleOpenHistory(r); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const histColumns = [
    { title: 'Version', dataIndex: 'version_string', key: 'ver', width: 80,
      render: (v, r) => <Tag color={CHANGE_COLORS[r.change_type] || 'default'}>{v}</Tag> },
    { title: 'Type', dataIndex: 'change_type', key: 'type', width: 80,
      render: t => <Tag color={CHANGE_COLORS[t] || 'default'} style={{ textTransform: 'capitalize' }}>{t}</Tag> },
    { title: 'Changed Fields', dataIndex: 'changed_fields', key: 'fields',
      render: fields => fields?.length > 0
        ? fields.map(f => <Tag key={f} style={{ fontSize: 11 }}>{f}</Tag>)
        : <span className="text-xs text-ink-tertiary">—</span> },
    { title: 'Date', dataIndex: 'snapshot_date', key: 'date', width: 150,
      render: d => <span className="text-xs font-mono text-ink-secondary">{d ? new Date(d).toLocaleString() : '—'}</span> },
    { title: 'By', dataIndex: 'updated_by', key: 'by', width: 120,
      render: v => <span className="text-xs text-ink-secondary">{v || '—'}</span> },
    {
      title: '', key: 'rb', width: 80,
      render: (_, _r, i) => i === 0
        ? <Tag style={{ fontSize: 11 }}>Current</Tag>
        : null,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Registry"
        subtitle={`${augmentedAgents.length} agents enrolled`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge variant="success" dot>{activeCount} Active</StatusBadge>
            <StatusBadge variant="neutral" dot>{augmentedAgents.length - activeCount} Inactive</StatusBadge>
          </div>
        }
      />

      {/* Agent context banner — shown when navigated from Insights */}
      {navParams?.agentId && (
        <div style={{
          margin: '0 0 0', padding: '8px 24px',
          background: '#FFFAEB', borderBottom: '1px solid #FEF0C7',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>Context: {navParams.agentId}</span>
          <span style={{ fontSize: 11, color: '#78350F' }}>— Navigated from Insights. Showing agent-specific registry views.</span>
        </div>
      )}
      {navParams?.modelId && (
        <div style={{
          margin: '0 0 0', padding: '8px 24px',
          background: '#FFFAEB', borderBottom: '1px solid #FEF0C7',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>Context: {navParams.modelId}</span>
          <span style={{ fontSize: 11, color: '#78350F' }}>— Navigated from Workbench. Showing model card.</span>
        </div>
      )}

      <Tabs
        activeKey={mainTab}
        onChange={(t) => { setMainTab(t); onTabChange?.(t); }}
        items={[
          gatedTab('registry.fleet', {
            key: 'fleet',
            name: 'Agent Registry',
            label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={13} strokeWidth={1.5} /> Agent Registry</span>,
            children: (
              <div style={{ paddingTop: 24 }}>
                <KpiBar tiles={[
                  { label: 'Total Agents',    value: augmentedAgents.length,                                          accent: '#000048' },
                  { label: 'Active',          value: activeCount,                                                     accent: '#12B76A', trend: 'up', trendLabel: augmentedAgents.length ? `${Math.round(activeCount/augmentedAgents.length*100)}%` : '0%' },
                  { label: 'Inactive',        value: augmentedAgents.length - activeCount,                            accent: '#F04438' },
                  { label: 'Models in Use',   value: [...new Set(augmentedAgents.map(a => a.model_id))].length,       accent: '#7A5AF8', sub: 'distinct models' },
                  { label: 'Cloud Providers', value: [...new Set(augmentedAgents.map(a => a.cloud_provider))].length, accent: '#00B5E2', sub: 'providers' },
                ]} />
                <div className="bg-white border border-border rounded shadow-card overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <Table
                      columns={columns}
                      dataSource={augmentedAgents}
                      loading={loading}
                      size="small"
                      rowKey="id"
                      locale={{ emptyText: 'No agents enrolled' }}
                      pagination={{ pageSize: 8, showSizeChanger: false, size: 'small',
                        showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
                      onRow={(r) => ({
                        onClick: () => { setEvalAgent(r); setEvalOpen(true); },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </div>
                </div>
              </div>
            ),
          }),
          gatedTab('registry.models', {
            key: 'models',
            name: 'Model Registry',
            label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={13} strokeWidth={1.5} /> Models</span>,
            children: <ModelRegistry onNavigate={onNavigate} />,
          }),
        ].filter(Boolean)}
      />

      {/* Evaluation Modal */}
      <EvalModal
        agent={evalAgent}
        tenantId={tenantId}
        open={evalOpen}
        onClose={() => { setEvalOpen(false); setEvalAgent(null); }}
      />

      {/* Version History Modal */}
      <Modal
        title={
          <Space>
            <History size={15} strokeWidth={1.5} />
            <span>Revision History — {histAgent?.name}</span>
            {histAgent && <Tag color="blue">{histAgent.version_string || `v${histAgent.version}`}</Tag>}
          </Space>
        }
        open={histOpen}
        onCancel={() => { setHistOpen(false); setHistory([]); }}
        footer={[<Button key="close" onClick={() => { setHistOpen(false); setHistory([]); }}>Close</Button>]}
        width={820} destroyOnClose
      >
        <Table columns={histColumns} dataSource={history} loading={histLoading}
          size="small" rowKey={r => r.version} pagination={false}
          locale={{ emptyText: 'No version history available for this agent' }} />
        <p className="text-xs text-ink-tertiary mt-3">
          Rollback creates a new version entry — version numbers are never decremented.
        </p>
      </Modal>
    </div>
  );
};

export default Failsafe;
