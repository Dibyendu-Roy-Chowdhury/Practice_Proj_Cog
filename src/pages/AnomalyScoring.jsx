import React, { useState, useEffect } from 'react';
import { Spin, Table, Input, Alert } from 'antd';
import { getAnomalyFeed, getAnomalyDistribution } from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';
import MetricLabel, { METRIC_TOOLTIPS } from '../components/common/MetricLabel';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const SH = ({ title }) => (
  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">{title}</span>
);

const ScoreBadge = ({ score }) => {
  const color = score <= 30 ? '#10B981' : score <= 60 ? '#F59E0B' : '#EF4444';
  const bg    = score <= 30 ? '#ECFDF3' : score <= 60 ? '#FFFAEB' : '#FEF3F2';
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: bg, color, fontVariantNumeric: 'tabular-nums' }}>{score}</span>;
};

const cardStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

const ACTION_COLORS = {
  'Auto-Remediated':  '#10B981',
  'HITL Escalated':   '#F59E0B',
  'Under Observation':'#00B5E2',
  'No Action':        '#94A3B8',
  'Monitoring':       '#00B5E2',
};
const ACTION_BG = {
  'Auto-Remediated':  '#ECFDF3',
  'HITL Escalated':   '#FFFAEB',
  'Under Observation':'#E0F2FE',
  'No Action':        '#F8FAFC',
  'Monitoring':       '#E0F2FE',
};

const DIST_LINES = [
  { key: 'Token Spike',      color: '#EF4444' },
  { key: 'ReAct Loop',       color: '#F59E0B' },
  { key: 'Tool Abuse',       color: '#00B5E2' },
  { key: 'Prompt Injection', color: '#000048' },
  { key: 'Hallucination',    color: '#94A3B8' },
  { key: 'Memory Overflow',  color: '#10B981' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#e2e8f0' }}>{p.dataKey}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function AnomalyScoring({ navParams, onNavigate }) {
  const { tenant } = useTenant();
  const [feed, setFeed]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [distData, setDistData]   = useState([]);
  const [distLoading, setDistLoading] = useState(true);
  const [searchText, setSearchText]   = useState(navParams?.agentFilter ?? '');
  const [error, setError]         = useState(null);

  useEffect(() => {
    setLoading(true);
    setDistLoading(true);
    setError(null);
    getAnomalyFeed()
      .then(setFeed)
      .catch(e => setError(e?.message || 'Failed to load anomaly feed'))
      .finally(() => setLoading(false));
    getAnomalyDistribution().then(d => {
      // Guard: verify the array has the expected keys; fall back to empty if format is wrong
      const valid = Array.isArray(d) && d.length > 0 && 'Token Spike' in d[0];
      setDistData(valid ? d : []);
    }).finally(() => setDistLoading(false));
  }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update search filter when arriving via a cross-pillar drilldown
  useEffect(() => {
    if (navParams?.agentFilter) setSearchText(navParams.agentFilter);
  }, [navParams?.agentFilter]);

  const filteredFeed = feed.filter(row =>
    !searchText ||
    row.agent?.toLowerCase().includes(searchText.toLowerCase()) ||
    row.category?.toLowerCase().includes(searchText.toLowerCase()) ||
    row.id?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    { title: 'Event ID',     dataIndex: 'id',        key: 'id',        render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748B' }}>{v}</span> },
    { title: 'Agent',        dataIndex: 'agent',     key: 'agent',     render: v => <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span> },
    { title: 'Timestamp',    dataIndex: 'timestamp', key: 'timestamp', render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span> },
    { title: 'Category',     dataIndex: 'category',  key: 'category',  render: v => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: <MetricLabel label="Anomaly Score" tooltip={METRIC_TOOLTIPS.anomalyScore} />, dataIndex: 'score', key: 'score', render: v => <ScoreBadge score={v} /> },
    {
      title: 'Action Taken', dataIndex: 'action', key: 'action',
      render: v => (
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: ACTION_BG[v] || '#F8FAFC', color: ACTION_COLORS[v] || '#64748B' }}>{v}</span>
      ),
    },
    {
      title: '', key: 'investigate', width: 160,
      render: (_, row) => row.score >= 75 ? (
        <button
          onClick={() => onNavigate?.('2', { tab: 'troubleshoot', agentId: row.agent })}
          style={{ fontSize: 11, fontWeight: 600, color: '#000048', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
        >
          Investigate in Workbench →
        </button>
      ) : null,
    },
  ];

  return (
    <div>
      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}

      <div style={{ ...cardStyle, padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <SH title="Anomaly Event Feed" />
        </div>

        {/* Table Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
          <Input.Search
            placeholder="Search records..."
            allowClear
            style={{ width: 240 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onSearch={v => setSearchText(v)}
          />
        </div>

        <div className="overflow-x-auto">
          <Table
            dataSource={filteredFeed}
            columns={columns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={false}
            locale={{ emptyText: 'No anomaly events match the current filter' }}
          />
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <SH title="Anomalies by Type — Last 7 Days" />
        </div>
        {distLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Spin /></div>
        ) : distData.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No anomaly distribution data available for the selected period</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={distData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <ReTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {DIST_LINES.map(l => (
                <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
