import React from 'react';
import { Table, Tag, Timeline } from 'antd';
import {
  GitBranch, PlayCircle, Award,
  MessageSquare, CheckCircle2,
} from 'lucide-react';
import { getAgentsSync } from '../services/API_services';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY   = '#000048';
const CYAN   = '#00B5E2';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
const ERROR   = '#EF4444';

// ── Shared primitives ─────────────────────────────────────────────────────────
const cardStyle = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 6,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const SH = ({ title }) => (
  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">
    {title}
  </span>
);

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1E293B', border: '1px solid #334155',
      borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#F1F5F9',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#94A3B8' }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
          <span style={{ color: p.color }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── KPI Bar ───────────────────────────────────────────────────────────────────
const kpis = [
  { label: 'Total Feedback Items', value: '8,432', icon: MessageSquare, color: NAVY },
  { label: 'Labeled This Week',    value: '1,247', icon: CheckCircle2,  color: SUCCESS },
  { label: 'RLHF Training Runs',   value: '6',     icon: PlayCircle,    color: CYAN },
  { label: 'Avg Reward Signal',    value: '+0.34', icon: Award,         color: WARNING },
];

const KpiBar = () => (
  <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
    {kpis.map(({ label, value, icon: Icon, color }) => (
      <div key={label} style={{ ...cardStyle, flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} strokeWidth={1.5} style={{ color }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>{label}</p>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#101828', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
        </div>
      </div>
    ))}
  </div>
);

// ── Section 2: Feedback Sources Table — derived from SSOT ────────────────────
const buildFeedbackSources = (agents) => {
  const a = agents.map(x => x.name);
  const get = (i) => a[i % a.length] || 'Primary Agent';
  return [
    { key: 1, source: 'User Thumbs',       agent: get(0), type: 'Implicit',  volume: '2,840', labeled: '2,614', pending: 226, quality: '91.2%', status: 'active' },
    { key: 2, source: 'User Thumbs',       agent: get(1), type: 'Implicit',  volume: '1,920', labeled: '1,756', pending: 164, quality: '88.4%', status: 'active' },
    { key: 3, source: 'Expert Review',     agent: get(2), type: 'Explicit',  volume: '340',   labeled: '340',   pending: 0,   quality: '96.8%', status: 'active' },
    { key: 4, source: 'Automated Eval',    agent: get(3), type: 'Automated', volume: '1,247', labeled: '1,247', pending: 0,   quality: '82.1%', status: 'active' },
    { key: 5, source: 'Comparative Rank',  agent: 'Fleet-wide',              type: 'Explicit', volume: '156',   labeled: '98',   pending: 58,  quality: '94.3%', status: 'paused' },
    { key: 6, source: 'Error Correction',  agent: get(3), type: 'Explicit',  volume: '89',    labeled: '89',    pending: 0,   quality: '97.2%', status: 'active' },
    { key: 7, source: 'A/B Preference',    agent: get(4), type: 'Implicit',  volume: '567',   labeled: '423',   pending: 144, quality: '79.6%', status: 'active' },
    { key: 8, source: 'Adversarial Flag',  agent: 'Fleet-wide',              type: 'Explicit', volume: '34',    labeled: '34',   pending: 0,   quality: '99.1%', status: 'active' },
  ];
};

const SOURCE_COLS = [
  { title: 'Source',         dataIndex: 'source',   key: 'source',   render: v => <strong style={{ color: '#101828' }}>{v}</strong> },
  { title: 'Agent',          dataIndex: 'agent',    key: 'agent',    render: v => <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{v}</span> },
  { title: 'Feedback Type',  dataIndex: 'type',     key: 'type',     render: v => {
    const map = { Implicit: '#94A3B8', Explicit: CYAN, Automated: WARNING };
    return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${map[v]}18`, color: map[v] }}>{v}</span>;
  }},
  { title: 'Volume (7d)',    dataIndex: 'volume',   key: 'volume',   align: 'right', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
  { title: 'Labeled',        dataIndex: 'labeled',  key: 'labeled',  align: 'right', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: SUCCESS }}>{v}</span> },
  { title: 'Pending',        dataIndex: 'pending',  key: 'pending',  align: 'right', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: v > 0 ? WARNING : '#94A3B8' }}>{v}</span> },
  { title: 'Quality Score',  dataIndex: 'quality',  key: 'quality',  align: 'right', render: v => {
    const n = parseFloat(v);
    const color = n >= 95 ? SUCCESS : n >= 85 ? CYAN : n >= 75 ? WARNING : ERROR;
    return <span style={{ fontWeight: 700, fontSize: 12, color }}>{v}</span>;
  }},
  { title: 'Status', dataIndex: 'status', key: 'status', render: v =>
    <Tag color={v === 'active' ? 'success' : 'warning'} style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{v}</Tag>
  },
];

const FeedbackSourcesTable = () => {
  const feedbackSources = buildFeedbackSources(getAgentsSync());
  return (
  <div style={{ ...cardStyle, padding: 20, marginBottom: 24 }}>
    <SH title="Feedback Sources" />
    <Table
      dataSource={feedbackSources}
      columns={SOURCE_COLS}
      size="small"
      pagination={false}
      rowKey="key"
      style={{ fontSize: 12 }}
    />
  </div>
  );
};

// ── Section 3: Reward Signal LineChart ────────────────────────────────────────
const REWARD_STEPS = [
  { step: 0,    train: 0.12, val: 0.10 },
  { step: 500,  train: 0.16, val: 0.13 },
  { step: 1000, train: 0.20, val: 0.17 },
  { step: 1500, train: 0.23, val: 0.19 },
  { step: 2000, train: 0.27, val: 0.22 },
  { step: 2500, train: 0.29, val: 0.25 },
  { step: 3000, train: 0.32, val: 0.27 },
  { step: 3500, train: 0.34, val: 0.29 },
  { step: 4000, train: 0.35, val: 0.31 },
  { step: 4500, train: 0.37, val: 0.32 },
  { step: 5000, train: 0.38, val: 0.34 },
];

const RewardModelChart = () => (
  <div style={{ ...cardStyle, padding: 20, marginBottom: 24 }}>
    <SH title="Reward Signal Over Training Steps" />
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={REWARD_STEPS} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey="step"
          tickFormatter={v => v.toLocaleString()}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={{ stroke: '#E2E8F0' }}
          tickLine={false}
          label={{ value: 'Training Steps', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94A3B8' }}
        />
        <YAxis
          domain={[0.05, 0.45]}
          tickFormatter={v => v.toFixed(2)}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
        />
        <ReTooltip content={<DarkTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          iconType="circle"
          iconSize={8}
        />
        <ReferenceLine
          y={0.30}
          stroke={SUCCESS}
          strokeDasharray="6 3"
          strokeWidth={1.5}
          label={{ value: 'Target (0.30)', position: 'insideTopRight', fontSize: 11, fill: SUCCESS }}
        />
        <Line
          type="monotone"
          dataKey="train"
          name="Training Reward"
          stroke={CYAN}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="val"
          name="Validation Reward"
          stroke={NAVY}
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// ── Section 4: Preference Dataset Browser — derived from SSOT ────────────────
const buildPreferencePairs = (agents) => {
  const a = agents.map(x => x.name);
  const get = (i) => a[i % a.length] || 'Primary Agent';
  return [
    { key: 'PP-1847', id: 'PP-1847', agent: get(0), prompt: '"Identify compliance obligations in regulatory filing..."', winner: 'Response A', confidence: 0.99, annotator: 'Expert-03', date: 'Today' },
    { key: 'PP-1846', id: 'PP-1846', agent: get(1), prompt: '"Explain the risk in the current context..."',             winner: 'Response A', confidence: 0.92, annotator: 'Expert-03', date: 'Apr 1'  },
    { key: 'PP-1845', id: 'PP-1845', agent: get(2), prompt: '"What regulatory guidelines apply here..."',               winner: 'Response B', confidence: 0.78, annotator: 'Auto-Eval', date: 'Apr 1'  },
    { key: 'PP-1844', id: 'PP-1844', agent: get(3), prompt: '"Summarize the Q4 findings..."',                           winner: 'Response A', confidence: 0.95, annotator: 'Expert-01', date: 'Mar 31' },
    { key: 'PP-1843', id: 'PP-1843', agent: get(4), prompt: '"Compare the proposed strategies..."',                     winner: 'Response A', confidence: 0.83, annotator: 'Expert-02', date: 'Mar 31' },
    { key: 'PP-1842', id: 'PP-1842', agent: get(0), prompt: '"Draft a compliance report for the current period..."',    winner: 'Response B', confidence: 0.71, annotator: 'Auto-Eval', date: 'Mar 30' },
  ];
};

const PAIR_COLS = [
  { title: 'Pair ID',        dataIndex: 'id',         key: 'id',         width: 90,  render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: NAVY, fontWeight: 700 }}>{v}</span> },
  { title: 'Agent',          dataIndex: 'agent',      key: 'agent',      width: 100, render: v => <span style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>{v}</span> },
  { title: 'Prompt Preview', dataIndex: 'prompt',     key: 'prompt',     render: v => <span style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>{v}</span> },
  { title: 'Winner',         dataIndex: 'winner',     key: 'winner',     width: 100, render: v => <Tag color="blue" style={{ fontSize: 11, fontWeight: 600 }}>{v}</Tag> },
  { title: 'Confidence',     dataIndex: 'confidence', key: 'confidence', width: 90,  align: 'right', render: v => {
    const color = v >= 0.90 ? SUCCESS : v >= 0.80 ? CYAN : v >= 0.70 ? WARNING : ERROR;
    return <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color }}>{v.toFixed(2)}</span>;
  }},
  { title: 'Annotator',      dataIndex: 'annotator',  key: 'annotator',  width: 100, render: v => {
    const isAuto = v === 'Auto-Eval';
    return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: isAuto ? '#F1F5F9' : '#EFF6FF', color: isAuto ? '#64748B' : '#3B82F6' }}>{v}</span>;
  }},
  { title: 'Date',           dataIndex: 'date',       key: 'date',       width: 72,  render: v => <span style={{ fontSize: 12, color: '#94A3B8' }}>{v}</span> },
];

const PreferencePairsTable = () => {
  const preferencePairs = buildPreferencePairs(getAgentsSync());
  return (
    <div style={{ ...cardStyle, padding: 20, marginBottom: 24 }}>
      <SH title="Labeled Preference Pairs" />
      <Table
        dataSource={preferencePairs}
        columns={PAIR_COLS}
        size="small"
        pagination={false}
        rowKey="key"
        style={{ fontSize: 12 }}
      />
    </div>
  );
};

// ── Section 5: RLHF Run History Timeline ──────────────────────────────────────
const RUN_DOT_COLOR = { completed: SUCCESS, running: CYAN, failed: ERROR };

const buildRlhfRuns = (agents) => {
  const a = agents.map(x => x.name);
  const get = (i) => a[i % a.length] || 'Primary Agent';
  return [
    { key: 'run6', status: 'running',   date: 'Apr 1',  name: 'RLHF-Run-006', detail: '2,400 / 5,000 steps · Δ reward +0.08 (in progress)' },
    { key: 'run5', status: 'completed', date: 'Mar 28', name: 'RLHF-Run-005', detail: `5,000 steps · Δ reward +0.12 · Applied to ${get(0)}` },
    { key: 'run4', status: 'completed', date: 'Mar 22', name: 'RLHF-Run-004', detail: `5,000 steps · Δ reward +0.09 · Applied to ${get(1)}` },
    { key: 'run3', status: 'completed', date: 'Mar 15', name: 'RLHF-Run-003', detail: `4,200 steps · Δ reward +0.07 · Applied to ${get(2)}` },
    { key: 'run2', status: 'failed',    date: 'Mar 8',  name: 'RLHF-Run-002', detail: '1,800 steps · OOM error — dataset too large' },
    { key: 'run1', status: 'completed', date: 'Mar 1',  name: 'RLHF-Run-001', detail: `5,000 steps · Δ reward +0.04 · Applied to ${get(0)}` },
  ];
};

const STATUS_LABEL = { completed: 'Completed', running: 'Running', failed: 'Failed' };
const STATUS_BG    = { completed: '#ECFDF3', running: 'rgba(0,181,226,0.10)', failed: '#FEF2F2' };

const RlhfTimeline = () => {
  const rlhfRuns = buildRlhfRuns(getAgentsSync());
  return (
  <div style={{ ...cardStyle, padding: 20, marginBottom: 24 }}>
    <SH title="RLHF Run History" />
    <Timeline
      items={rlhfRuns.map(run => ({
        key: run.key,
        color: RUN_DOT_COLOR[run.status],
        children: (
          <div style={{ paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, minWidth: 48 }}>{run.date}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>{run.name}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: STATUS_BG[run.status],
                color: RUN_DOT_COLOR[run.status],
              }}>
                {STATUS_LABEL[run.status]}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{run.detail}</p>
          </div>
        ),
      }))}
    />
  </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
export function FeedbackRLHF() {
  return (
    <div style={{ padding: '24px 24px 40px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${CYAN}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={16} strokeWidth={1.5} style={{ color: CYAN }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#101828', letterSpacing: '-0.02em' }}>
            Feedback &amp; RLHF
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
          Human feedback collection pipelines, reward model training, and preference dataset management.
        </p>
      </div>

      {/* Section 1 – KPI Bar */}
      <KpiBar />

      {/* Two-column layout for table + chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Section 2 – Feedback Sources */}
        <FeedbackSourcesTable />

        {/* Section 3 – Reward Signal Chart */}
        <RewardModelChart />

        {/* Section 4 + 5 side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <PreferencePairsTable />
          <RlhfTimeline />
        </div>
      </div>
    </div>
  );
}
