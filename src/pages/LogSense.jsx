import React, { useState, useEffect } from 'react';
import { Select, Table, Tabs, Input, Button, Spin } from 'antd';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RCTooltip, ResponsiveContainer,
} from 'recharts';
import { Search, RefreshCw, XCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import {
  getAgents, getDailyCostMetrics, getModelBreakdown,
  getCriticalAlerts, getWarningAlerts,
  getHealthDimensions, getPerformanceMetrics, getLiveLogs,
  getPerformanceMetricsAsync, getTrajectoryScoreAsync,
} from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';
import { chart }  from '../theme/tokens';

// ─── Agent Performance Tab (exported for direct use in pillar tabs) ──────────
// trajectoryData and kpiTiles are computed inside AgentPerformanceTab from the SSOT.

export const AgentPerformanceTab = () => {
  const { tenant } = useTenant();
  const [agents,         setAgents]         = useState([]);
  const [selectedAgent,  setSelectedAgent]  = useState('all');
  const [costData,       setCostData]       = useState([]);
  const [modelData,      setModelData]      = useState([]);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [warningAlerts,  setWarningAlerts]  = useState([]);
  const [perfKpis,       setPerfKpis]       = useState(() => getPerformanceMetrics()?.kpis || {});
  const [trajectoryData, setTrajectoryData] = useState(() => getHealthDimensions().slice(0, 5).map(d => ({ dim: d.dim, score: d.score })));
  const [loading,        setLoading]        = useState(false);

  useEffect(() => {
    setSelectedAgent('all');
    getAgents().then(d => setAgents(d?.agents ?? [])).catch(() => {});
  }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [c, m, cr, w, pRes, tRes] = await Promise.all([
          getDailyCostMetrics(selectedAgent), getModelBreakdown(selectedAgent),
          getCriticalAlerts(selectedAgent),   getWarningAlerts(selectedAgent),
          getPerformanceMetricsAsync(selectedAgent), getTrajectoryScoreAsync(selectedAgent),
        ]);
        setCostData(c?.data ?? []);
        setModelData(m?.models ?? m?.breakdown ?? []);
        setCriticalAlerts(cr?.alerts ?? []);
        setWarningAlerts(w?.alerts ?? []);
        if (pRes?.kpis) setPerfKpis(pRes.kpis);
        if (tRes?.dimensions) setTrajectoryData(tRes.dimensions.map(d => ({ dim: d.dim, score: d.score })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [selectedAgent, tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const agentOptions = [
    { value: 'all', label: 'All Agents' },
    ...agents.map(a => ({ value: a.id, label: a.name })),
  ];

  const alertCols = [
    { title: 'Agent',   dataIndex: 'agentName',  key: 'agent', width: 160,
      render: v => <span title={v} className="text-xs text-ink-primary" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { title: 'Message', dataIndex: 'message',    key: 'msg',
      onCell: () => ({ style: { maxWidth: 0 } }),
      render: v => <span title={v} className="text-xs text-ink-secondary" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { title: 'Time',    dataIndex: 'timestamp',  key: 'ts',    width: 90,
      render: v => {
        const d = new Date(v);
        const str = isNaN(d.getTime()) ? v : `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        return <span className="text-xs font-mono text-ink-tertiary" style={{ whiteSpace: 'nowrap' }}>{str}</span>;
      } },
  ];

  const cardCls = 'bg-white border border-border rounded shadow-card';

  const kpiTiles = [
    { label: 'p95 Latency',   value: `${perfKpis.p95Latency  ?? 3.1}s`,  delta: '-8.3%', up: false },
    { label: 'Success Rate',  value: `${perfKpis.successRate  ?? 97.2}%`, delta: '+1.2%', up: true  },
    { label: 'Health Score',  value: `${perfKpis.healthScore  ?? 82}`,    delta: '+2.1%', up: true  },
    { label: 'Active Agents', value: `${perfKpis.activeAgents ?? 5}`,     delta: '',       up: true  },
  ];

  return (
    <div>
      {/* KPI metrics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {kpiTiles.map(({ label, value, delta, up, warn }) => {
          const deltaColor = warn ? '#F04438' : '#12B76A';
          const DeltaIcon  = up ? TrendingUp : TrendingDown;
          return (
            <div key={label} className="bg-white border border-border rounded shadow-card p-3">
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1">{label}</p>
              <p className="text-xl font-bold text-ink-primary font-mono">{value}</p>
              <div className="flex items-center gap-1 mt-1">
                <DeltaIcon size={14} strokeWidth={1.5} style={{ color: deltaColor }} />
                <span className="text-xs font-medium" style={{ color: deltaColor }}>{delta}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm font-medium text-ink-secondary">Agent:</span>
        <Select value={selectedAgent} onChange={setSelectedAgent}
          options={agentOptions} style={{ width: 220 }} />
        {loading && <Spin size="small" />}
      </div>

      {/* Cost + Token trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className={`${cardCls} p-4`}>
          <p className="text-sm font-semibold text-ink-primary mb-0.5">Daily Cost Trend</p>
          <p className="text-xs text-ink-tertiary mb-4">30 days · USD</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={costData}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chart.line[2]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chart.line[2]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="date" fontSize={10} tick={{ fill: chart.tick }} tickLine={false} axisLine={false} interval={4} />
              <YAxis fontSize={10} tick={{ fill: chart.tick }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <RCTooltip formatter={v => [`$${v}`, 'Cost']} />
              <Area type="monotone" dataKey="cost" stroke={chart.line[2]} strokeWidth={1.5} fill="url(#costGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`${cardCls} p-4`}>
          <p className="text-sm font-semibold text-ink-primary mb-0.5">Token Volume Trend</p>
          <p className="text-xs text-ink-tertiary mb-4">30 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={costData}>
              <defs>
                <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chart.line[0]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chart.line[0]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="date" fontSize={10} tick={{ fill: chart.tick }} tickLine={false} axisLine={false} interval={4} />
              <YAxis fontSize={10} tick={{ fill: chart.tick }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <RCTooltip formatter={v => [v?.toLocaleString(), 'Tokens']} />
              <Area type="monotone" dataKey="tokens" stroke={chart.line[0]} strokeWidth={1.5} fill="url(#tokenGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model breakdown */}
      <div className={`${cardCls} p-4 mb-4`}>
        <p className="text-sm font-semibold text-ink-primary mb-0.5">Model Usage Breakdown</p>
        <p className="text-xs text-ink-tertiary mb-4">Tokens and requests by model</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={modelData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
            <XAxis type="number" fontSize={10} tick={{ fill: chart.tick }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="model" fontSize={11} tick={{ fill: chart.tick }} tickLine={false} axisLine={false} width={140} />
            <RCTooltip />
            <Bar dataKey="tokens"   fill={chart.line[0]} name="Tokens"   radius={[0, 2, 2, 0]} />
            <Bar dataKey="requests" fill={chart.line[1]} name="Requests" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trajectory Score */}
      <div className={`${cardCls} p-4 mb-4`}>
        <p className="text-sm font-semibold text-ink-primary mb-0.5">Trajectory Score</p>
        <p className="text-xs text-ink-tertiary mb-4">Evaluation dimensions · Current period</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trajectoryData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis type="number" domain={[0, 100]} fontSize={10} tick={{ fill: chart.tick }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="dim" fontSize={11} tick={{ fill: chart.tick }} tickLine={false} axisLine={false} width={160} />
            <RCTooltip formatter={v => [v, 'Score']} />
            <Bar dataKey="score" fill="#000048" radius={[0, 2, 2, 0]} name="Score" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alert tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { title: 'Critical Alerts', data: criticalAlerts, icon: XCircle,       color: '#F04438', iconCls: 'text-status-error'   },
          { title: 'Warning Alerts',  data: warningAlerts,  icon: AlertTriangle, color: '#F79009', iconCls: 'text-status-warning' },
        ].map(({ title, data, icon: Icon, color, iconCls }) => (
          <div key={title} className={cardCls}>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Icon size={14} strokeWidth={1.5} className={iconCls} />
              <span className="text-sm font-semibold text-ink-primary">{title}</span>
              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ background: color }}>
                {data.length}
              </span>
            </div>
            <Table dataSource={data} columns={alertCols} rowKey="id" size="small"
              pagination={{ pageSize: 5, size: 'small' }} locale={{ emptyText: `No ${title.toLowerCase()}` }}
              scroll={{ x: 400 }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Live Logs Tab (exported for direct use in pillar tabs) ──────────────────
export const LEVEL_COLORS = { INFO: '#0BA5EC', WARN: '#F79009', ERROR: '#F04438', DEBUG: '#98A2B3' };

export const LiveLogsTab = () => {
  const [logLevel,    setLogLevel]    = useState('all');
  const [searchTerm,  setSearchTerm]  = useState('');

  // Derive log entries from SSOT — tenant/env-aware (component remounts on tenant change).
  const relTs = (iso) => {
    if (!iso) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
  };
  const liveLogs = getLiveLogs();
  const platformLogs = [
    { id: 'p1', level: 'DEBUG', agentName: null, message: 'Token count validated — input: 1,847 tokens, output: 634 tokens, within budget: true', agentId: null },
    { id: 'p2', level: 'INFO',  agentName: null, message: 'Routing decision: claude-opus → claude-haiku (cost circuit breaker at 78%)', agentId: null },
  ];
  const sampleLogs = [...liveLogs, ...platformLogs].map((l, i) => ({
    id:        i + 1,
    timestamp: relTs(l.ts),
    level:     l.level,
    message:   l.message,
    requestId: `req_${(l.agentId || 'sys').replace('agent-', 'a')}_${String(1000 + i).slice(1)}`,
  }));

  const filtered = sampleLogs.filter(log => {
    const lvlMatch = logLevel === 'all' || log.level.toLowerCase() === logLevel;
    const txtMatch = !searchTerm || log.message.toLowerCase().includes(searchTerm.toLowerCase()) || log.requestId.toLowerCase().includes(searchTerm.toLowerCase());
    return lvlMatch && txtMatch;
  });

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          value={logLevel}
          onChange={setLogLevel}
          style={{ width: 140 }}
          options={[
            { value: 'all',   label: 'All Levels' },
            { value: 'error', label: 'Error'      },
            { value: 'warn',  label: 'Warning'    },
            { value: 'info',  label: 'Info'       },
            { value: 'debug', label: 'Debug'      },
          ]}
        />
        <Input
          prefix={<Search size={13} strokeWidth={1.5} style={{ color: '#98A2B3' }} />}
          placeholder="Search logs..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: 260 }}
        />
        <Button icon={<RefreshCw size={13} strokeWidth={1.5} />} onClick={() => { setLogLevel('all'); setSearchTerm(''); }}>
          Refresh
        </Button>
      </div>

      <div className="bg-[#0F1117] rounded border border-[#2d3748] overflow-auto"
        style={{ maxHeight: 480 }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: '#475467' }}>
            No logs match the current filter
          </div>
        ) : (
          filtered.map(log => (
            <div key={log.id} className="flex gap-3 px-4 py-2 border-b vfo-code-block"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#475467', flexShrink: 0 }}>{log.timestamp}</span>
              <span className="font-semibold" style={{ color: LEVEL_COLORS[log.level] || '#94a3b8', flexShrink: 0, minWidth: 44 }}>
                {log.level}
              </span>
              <span style={{ color: '#64748b', flexShrink: 0 }}>{log.requestId}</span>
              <span style={{ color: '#e2e8f0' }}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Main ────────────────────────────────────────────────────────────────────
const LogSense = () => (
  <div>
    <Tabs
      className="vfo-tabs"
      defaultActiveKey="performance"
      items={[
        { key: 'performance', label: 'Cost & Metrics', children: <AgentPerformanceTab /> },
        { key: 'logs',        label: 'Log Stream',     children: <LiveLogsTab /> },
      ]}
    />
  </div>
);

export default LogSense;
