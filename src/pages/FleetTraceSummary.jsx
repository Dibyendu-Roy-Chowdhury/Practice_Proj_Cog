/**
 * FleetTraceSummary — high-level trace overview for Insights › Fleet Events tab.
 *
 * Shows a summary table of recent execution traces across all agents with KPIs.
 * This is NOT the full trace explorer (that's in Workbench › Troubleshooting).
 * Clicking a row navigates to Workbench for deep investigation of that agent.
 *
 * Scope: FLEET-WIDE summary. Full trace explorer lives in Workbench.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Table, Tag } from 'antd';
import { ExternalLink, Clock, Activity, AlertCircle, Zap } from 'lucide-react';
import { getAuditTraces } from '../services/API_services';
import KpiBar from '../components/common/KpiBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMs = (ms) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

const STATUS_META = {
  success: { color: '#027A48', bg: '#ECFDF3', label: 'Success' },
  error:   { color: '#B42318', bg: '#FEF3F2', label: 'Error'   },
  timeout: { color: '#B54708', bg: '#FFFAEB', label: 'Timeout' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FleetTraceSummary({ onNavigate }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditTraces().then(data => {
      // data is { [agentId]: Trace[] }
      if (!data || typeof data !== 'object') { setLoading(false); return; }
      const flat = Object.entries(data).flatMap(([agentId, traces]) => {
        if (!Array.isArray(traces)) return [];
        return traces.map(t => ({
          key:        t.session_id,
          traceId:    t.session_id,
          agent:      t.agent_name || (agentId.charAt(0).toUpperCase() + agentId.slice(1)),
          durationMs: t.duration_ms,
          spans:      Array.isArray(t.steps) ? t.steps.length : (t.span_count || '—'),
          status:     t.status || 'success',
          startedAt:  t.started_at,
          model:      t.model_id || '—',
        }));
      }).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      setRows(flat);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    if (!rows.length) return null;
    const recent1h  = rows; // all traces for now (mock data doesn't have real timestamps)
    const errCount  = recent1h.filter(r => r.status === 'error').length;
    const errPct    = recent1h.length ? Math.round((errCount / recent1h.length) * 100) : 0;
    const avgMs     = recent1h.length
      ? Math.round(recent1h.filter(r => r.durationMs).reduce((s, r) => s + r.durationMs, 0) / recent1h.filter(r => r.durationMs).length)
      : 0;
    const byAgent   = {};
    recent1h.forEach(r => { byAgent[r.agent] = (byAgent[r.agent] || 0) + (r.durationMs || 0); });
    const slowest   = Object.entries(byAgent).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return { total: recent1h.length, errPct, avgMs, slowest };
  }, [rows]);

  const columns = [
    {
      title: 'Trace ID',
      dataIndex: 'traceId',
      key: 'traceId',
      render: v => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#344054' }}>{v}</span>
      ),
    },
    {
      title: 'Agent',
      dataIndex: 'agent',
      key: 'agent',
      render: v => <span style={{ fontWeight: 700, color: '#000048', fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      key: 'durationMs',
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#344054' }}>{v ? fmtMs(v) : '—'}</span>,
      sorter: (a, b) => (a.durationMs || 0) - (b.durationMs || 0),
    },
    {
      title: 'Spans',
      dataIndex: 'spans',
      key: 'spans',
      render: v => <span style={{ fontSize: 12, color: '#64748B' }}>{v}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: v => {
        const m = STATUS_META[v] || STATUS_META.success;
        return (
          <Tag style={{ background: m.bg, color: m.color, border: 'none', fontSize: 11, fontWeight: 600 }}>
            {m.label}
          </Tag>
        );
      },
      filters: [
        { text: 'Success', value: 'success' },
        { text: 'Error',   value: 'error'   },
        { text: 'Timeout', value: 'timeout' },
      ],
      onFilter: (v, r) => r.status === v,
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: v => <span style={{ fontSize: 11, color: '#94A3B8' }}>{v}</span>,
    },
    {
      title: '',
      key: 'action',
      render: (_, record) => (
        <button
          onClick={() => onNavigate?.('2', { tab: 'troubleshoot', agentId: record.agent })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
            background: 'transparent', color: '#000048',
            border: '1px solid #CBD5E1', fontSize: 11, fontWeight: 600,
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#000048'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000048'; }}
          title={`Investigate ${record.agent} in Workbench`}
        >
          <ExternalLink size={10} strokeWidth={1.5} />
          Investigate
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* KPIs */}
      {kpis && (
        <KpiBar tiles={[
          { label: 'Total Traces (fleet)',   value: kpis.total,               sub: 'Most recent session window', accent: '#00B5E2', icon: <Activity size={16} strokeWidth={1.5} /> },
          { label: 'Error Trace %',          value: `${kpis.errPct}%`,        sub: kpis.errPct > 10 ? 'Above 10% threshold' : 'Within threshold', accent: kpis.errPct > 10 ? '#EF4444' : '#10B981', icon: <AlertCircle size={16} strokeWidth={1.5} />, trend: kpis.errPct > 10 ? 'down' : 'flat', trendLabel: `${kpis.errPct}% errors` },
          { label: 'Avg Trace Duration',     value: kpis.avgMs ? fmtMs(kpis.avgMs) : '—', sub: 'Across all agents', accent: '#F59E0B', icon: <Clock size={16} strokeWidth={1.5} /> },
          { label: 'Highest Latency Agent',  value: kpis.slowest,             sub: 'By cumulative duration', accent: '#8B5CF6', icon: <Zap size={16} strokeWidth={1.5} /> },
        ]} />
      )}

      {/* Summary table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#344054' }}>Recent Execution Traces</span>
          <button
            onClick={() => onNavigate?.('2', { tab: 'troubleshoot' })}
            style={{ fontSize: 11, color: '#000048', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            Open Full Trace Explorer →
          </button>
        </div>
        <Table
          columns={columns}
          dataSource={rows}
          loading={loading}
          size="small"
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: t => `${t} traces` }}
          scroll={{ x: 700 }}
          style={{ fontSize: 12 }}
        />
      </div>
    </div>
  );
}
