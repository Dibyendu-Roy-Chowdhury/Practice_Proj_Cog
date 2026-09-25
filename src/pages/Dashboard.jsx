import React, { useState, useEffect } from 'react';
import { colors } from '../theme/tokens';
import {
  LineChart, Line, ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RCTooltip, ResponsiveContainer,
} from 'recharts';
import {
  getAgents, getAgentsSync, getDashboardAlerts, getCostOptimizationKpis,
  getSystemHealth, getProjectsHub, getTelemetryKpis, getTelemetryBreakdown,
  getTelemetryEvents, generateMockTelemetry, INITIAL_TELEMETRY_EVENTS,
} from '../services/API_services';
import MetricCard from '../components/common/MetricCard';
import PageHeader from '../components/layout/PageHeader';
import { chart }  from '../theme/tokens';

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#344054', fontSize: 11 }}>{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ color: '#667085', minWidth: 72 }}>{entry.name || entry.dataKey}:</span>
          <span style={{ color: '#101828', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {typeof entry.value === 'number'
              ? entry.name === 'Budget' || entry.name === 'Spend'
                ? `$${entry.value.toLocaleString()}`
                : `${entry.value} ms`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const Dashboard = ({ onNavigate }) => {
  // Derive initial counts synchronously so first render is tenant-correct.
  const initAgents = getAgentsSync();
  const [agents, setAgents] = useState(initAgents);

  useEffect(() => {
    getAgents().then(d => setAgents(d?.agents ?? [])).catch(() => {});
  }, []);

  // ── VeriForge Telemetry / Multi-Project Hub ─────────────────────────────
  const TELEMETRY_PAGE_SIZE = 20;
  const [health, setHealth] = useState({ status: 'ok', service: 'veriforgeops-telemetry-api' });
  const [projectsHub, setProjectsHub] = useState({
    'cog01k24f1ea555zdv7ynzthxanz5': { name: 'Central (Self)', status: 'active' },
    'cog01k2y024cd8wbctssq11xdjrs6': { name: 'AI/ML Guild Project', status: 'active' },
    'cog-aws-703384432149': { name: 'AWS Spoke (703384432149)', account_id: '703384432149', ad_group: 'cb9547721a-veriforge-aw', home_region: 'us-west-2', status: 'active', cloud: 'AWS', role: 'spoke' },
    'cog-az-cb10201881a-veriforge-az': { name: 'Azure Spoke (cb10201881a-veriforge-az)', subscription_id: 'a31057e2-5e01-4a71-b667-88145982c04b', tenant: 'cognizantonline.onmicrosoft.com', ad_group: 'cb10201881a-veriforge-az', home_region: 'eastus', status: 'active', cloud: 'AZURE', role: 'spoke' }
  });
  const [telemetryKpis, setTelemetryKpis] = useState({
    total_events: 500,
    total_cost: 644.32,
    total_input_tokens: 1271289,
    total_output_tokens: 265182
  });
  const [telemetryBreakdown, setTelemetryBreakdown] = useState({
    GCP: 205.08, AWS: 201.95, AZURE: 237.29
  });
  const [telemetryEvents, setTelemetryEvents] = useState(INITIAL_TELEMETRY_EVENTS || []);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [mockGenerating, setMockGenerating] = useState(false);
  const [telemetryPage, setTelemetryPage] = useState(1);
  const [telemetrySearch, setTelemetrySearch] = useState('');

  const fetchTelemetryEvents = () => {
    setTelemetryLoading(true);
    return getTelemetryEvents({ maxMessages: 200 })
      .then(d => {
        if (d?.events && d.events.length > 0) {
          setTelemetryEvents(d.events);
          setTelemetryPage(1);
        }
      })
      .catch(() => {})
      .finally(() => setTelemetryLoading(false));
  };

  const refreshTelemetry = () => {
    getTelemetryKpis().then(d => { if (d) setTelemetryKpis(d); }).catch(() => {});
    getTelemetryBreakdown('cloud').then(d => { if (d?.breakdown) setTelemetryBreakdown(d.breakdown); }).catch(() => {});
    fetchTelemetryEvents();
  };

  useEffect(() => {
    getSystemHealth().then(d => { if (d) setHealth(d); }).catch(() => {});
    getProjectsHub().then(d => { if (d?.projects) setProjectsHub(d.projects); }).catch(() => {});
    refreshTelemetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (value) => {
    setTelemetrySearch(value);
    setTelemetryPage(1);
  };

  const filteredTelemetryEvents = telemetryEvents.filter(e => {
    const q = telemetrySearch.toLowerCase();
    if (!q) return true;
    const cloud = (e.data?.cloud ?? '').toLowerCase();
    const associate = (e.data?.associate_id ?? '').toLowerCase();
    const sourceProject = (e.data?.source_project ?? '').toLowerCase();
    return cloud.includes(q) || associate.includes(q) || sourceProject.includes(q);
  });

  const telemetryTotalPages = Math.max(1, Math.ceil(filteredTelemetryEvents.length / TELEMETRY_PAGE_SIZE));
  const pagedTelemetryEvents = filteredTelemetryEvents.slice(
    (telemetryPage - 1) * TELEMETRY_PAGE_SIZE,
    telemetryPage * TELEMETRY_PAGE_SIZE
  );

  const handleGenerateMock = async () => {
    setMockGenerating(true);
    try {
      await generateMockTelemetry(3);
      refreshTelemetry();
    } catch {
      // no-op — backend unavailable
    } finally {
      setMockGenerating(false);
    }
  };

  const activeCount     = agents.filter(a => a.status === 'Active').length || agents.length;
  const registeredCount = agents.length;

  // Derive cost KPI from SSOT (tenant/env-aware).
  const costKpis = getCostOptimizationKpis();

  const kpiStats = [
    { label: 'Registered Agents',  value: String(registeredCount), trend: { label: '+1 this month', direction: 'up'   }, nav: ['7'] },
    { label: 'Active Agents',      value: String(activeCount),     trend: { label: '+1 today',     direction: 'up'   }, nav: ['1', { tab: 'health' }] },
    { label: 'Tasks Completed',    value: '45.2K',     trend: { label: '+12.3%',  direction: 'up'   }, nav: ['1', { tab: 'telemetry' }] },
    { label: 'Fleet Cost (MTD)',   value: costKpis.mtdSpend, trend: { label: '+13.5%',   direction: 'up'   }, nav: ['12'] },
    { label: 'Hallucination Rate', value: '1.4%',      trend: { label: '-0.3pp',  direction: 'down' }, nav: ['1', { tab: 'safety' }] },
    { label: 'Task Success Rate',  value: '97.2%',     trend: { label: '+0.8pp',  direction: 'up'   }, nav: ['1', { tab: 'safety' }] },
  ];

  const lifetimeStats = [
    { label: 'Total Fleet Cost',          value: '$12,847.32' },
    { label: 'Total Tokens Processed',    value: '45.7M'      },
    { label: 'Total Agent Invocations',   value: '156,892'    },
    { label: 'Avg Cost / Successful Task', value: '$0.008'    },
  ];

  const budgetData = [
    { month: 'Feb', budget: 2800, spend: 2690 },
    { month: 'Mar', budget: 3000, spend: 2940 },
    { month: 'Apr', budget: 3200, spend: 3140 },
    { month: 'May', budget: 3800, spend: 3232 },
    { month: 'Jun', budget: 4100, spend: 3840 },
    { month: 'Jul', budget: 4300, spend: 1980, forecast: 3970 },
    { month: 'Aug', budget: 4500, forecast: 4280 },
    { month: 'Sep', budget: 4700, forecast: 4480 },
    { month: 'Oct', budget: 4900, forecast: 4680 },
  ];

  const responseData = (() => {
    const today = new Date();
    const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
    const day = (offset) => { const d = new Date(today); d.setDate(today.getDate() + offset); return d; };
    const actuals = [
      [98, 138, 234, 112], [102, 142, 228, 108], [95, 135, 241, 115],
      [107, 148, 219, 121], [99, 141, 237, 110], [103, 144, 246, 118],
    ];
    return [
      ...actuals.map(([haiku, sonnet, opus, nova], i) => ({ date: fmt(day(i - 6)), haiku, sonnet, opus, nova })),
      { date: fmt(day(0)),  forecast: 101 },
      { date: fmt(day(1)),  forecast: 104 },
      { date: fmt(day(2)),  forecast: 107 },
    ];
  })();

  // Alerts derived from SSOT — tenant/env-aware, no hardcoded agent names.
  const dashboardAlerts = getDashboardAlerts();
  const criticalAlerts  = dashboardAlerts.critical;
  const warningAlerts   = dashboardAlerts.warning;

  const cardCls = 'bg-white border border-border rounded shadow-card';

  return (
    <div className="p-6">
      <PageHeader
        title="Agent Fleet Overview"
        subtitle="Fleet-wide agent performance, cost, quality, and behavioral alerts"
      />

      {/* ── KPI Grid ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpiStats.map(s => (
          <div key={s.label} onClick={() => s.nav && onNavigate?.(...s.nav)} style={{ cursor: s.nav && onNavigate ? 'pointer' : 'default' }}>
            <MetricCard label={s.label} value={s.value} trend={s.trend} mono />
          </div>
        ))}
      </div>

      {/* ── Lifetime Stats ───────────────────────── */}
      <div className="mb-2">
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">
          Lifetime Usage Statistics
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {lifetimeStats.map(s => (
            <MetricCard key={s.label} label={s.label} value={s.value} mono />
          ))}
        </div>
      </div>

      {/* ── Charts ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className={`${cardCls} p-4`}>
          <p className="text-sm font-semibold text-ink-primary mb-0.5">Budget vs Spend</p>
          <p className="text-xs text-ink-tertiary mb-4">Monthly comparison (USD)</p>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: chart.tick }} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{ fill: chart.tick }} />
              <RCTooltip content={<CustomTooltip />} />
              <Bar dataKey="budget"   fill="#E4E7EC" name="Budget"   radius={[2, 2, 0, 0]} />
              <Bar dataKey="spend"    fill="#000048" name="Spend"    radius={[2, 2, 0, 0]} />
              <Line dataKey="forecast" stroke="#67E8F9" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Forecast" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-ink-secondary"><span className="w-3 h-2 rounded-sm bg-border" /> Budget</span>
            <span className="flex items-center gap-1.5 text-xs text-ink-secondary"><span className="w-3 h-2 rounded-sm" style={{ background: '#000048' }} /> Spend</span>
            <span className="flex items-center gap-1.5 text-xs text-ink-secondary"><span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: '#67E8F9' }} /> Forecast</span>
          </div>
        </div>

        <div className={`${cardCls} p-4`}>
          <p className="text-sm font-semibold text-ink-primary mb-0.5">Model Latency by Provider</p>
          <p className="text-xs text-ink-tertiary mb-4">AWS Bedrock — avg model call latency (ms), last 7 days</p>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={responseData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: chart.tick }} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{ fill: chart.tick }} />
              <RCTooltip content={<CustomTooltip />} />
              {[
                { k: 'haiku',  c: chart.line[1], n: 'Claude 3.5 Haiku'  },
                { k: 'nova',   c: chart.line[3], n: 'Amazon Nova Pro'    },
                { k: 'sonnet', c: chart.line[0], n: 'Claude 3.5 Sonnet'  },
                { k: 'opus',   c: chart.line[2], n: 'Claude 3 Opus'      },
              ].map(({ k, c, n }) => (
                <Line key={k} type="monotone" dataKey={k} stroke={c} strokeWidth={1.5} dot={false} name={n} />
              ))}
              <Line type="monotone" dataKey="forecast" stroke="#67E8F9" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Forecast" connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-3">
            {[
              { c: chart.line[1], n: 'Claude 3.5 Haiku'  },
              { c: chart.line[3], n: 'Amazon Nova Pro'    },
              { c: chart.line[0], n: 'Claude 3.5 Sonnet'  },
              { c: chart.line[2], n: 'Claude 3 Opus'      },
            ].map(({ c, n }) => (
              <span key={n} className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span className="w-2 h-2 rounded-full" style={{ background: c }} />{n}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: '#67E8F9' }} /> Forecast
            </span>
          </div>
        </div>
      </div>

      {/* ── MLOps Health Summary ─────────────────── */}
      <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3 mt-6">
        MLOps Health Summary
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Models Registered',  value: '5',      sub: '5 active · production + staging',       accent: '#0EA5E9', nav: ['7', { tab: 'models' }] },
          { label: 'Guardrails Active',  value: '6',      sub: 'fleet-wide interceptors active',         accent: '#00B5E2', nav: ['1', { tab: 'safety' }] },
          { label: 'HITL Queue',         value: '3',      sub: '1 critical · SLA active',                accent: '#F04438', nav: ['2', { tab: 'overrides' }] },
          { label: 'Anomaly Score',      value: '79',     sub: `${agents[0]?.name ?? 'Primary Agent'} · above 75 threshold`, accent: '#F59E0B', nav: ['1', { tab: 'signals' }] },
        ].map(({ label, value, sub, accent, nav }) => (
          <div
            key={label}
            className={cardCls}
            style={{ padding: '14px 16px', cursor: onNavigate ? 'pointer' : 'default', borderLeft: `3px solid ${accent}` }}
            onClick={() => onNavigate?.(...nav)}
          >
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>{label}</p>
            <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 800, color: '#101828', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── VeriForge Telemetry / Multi-Project Hub ── */}
      <div className="flex items-center justify-between mb-3 mt-6">
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
          VeriForge Telemetry
        </p>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            color: health?.status === 'ok' ? '#027A48' : '#B42318',
            background: health?.status === 'ok' ? '#ECFDF3' : '#FEF3F2',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: health?.status === 'ok' ? '#12B76A' : '#F04438' }}
          />
          {health == null ? 'Checking…' : health.status === 'ok' ? 'Backend Online' : 'Backend Unreachable'}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Events"   value={String(telemetryKpis?.total_events ?? '—')} mono />
        <MetricCard label="Total Cost"     value={telemetryKpis ? `$${telemetryKpis.total_cost.toFixed(2)}` : '—'} mono />
        <MetricCard label="Input Tokens"   value={telemetryKpis ? telemetryKpis.total_input_tokens.toLocaleString() : '—'} mono />
        <MetricCard label="Output Tokens"  value={telemetryKpis ? telemetryKpis.total_output_tokens.toLocaleString() : '—'} mono />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className={`${cardCls} p-4`}>
          <p className="text-sm font-semibold text-ink-primary mb-0.5">Cost by Cloud</p>
          <p className="text-xs text-ink-tertiary mb-4">Live breakdown from /api/metrics/breakdown</p>
          <div className="space-y-2">
            {Object.entries(telemetryBreakdown).length === 0 && (
              <p className="text-xs text-ink-tertiary">No telemetry events yet.</p>
            )}
            {Object.entries(telemetryBreakdown).map(([cloud, cost]) => {
              const max = Math.max(...Object.values(telemetryBreakdown), 1);
              return (
                <div key={cloud} className="flex items-center gap-3">
                  <span className="text-xs text-ink-secondary w-14 flex-shrink-0">{cloud}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-raised overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(cost / max) * 100}%`, background: '#000048' }} />
                  </div>
                  <span className="text-xs font-mono text-ink-primary w-16 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    ${cost.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${cardCls} p-4`}>
          <p className="text-sm font-semibold text-ink-primary mb-0.5">Multi-Project Hub</p>
          <p className="text-xs text-ink-tertiary mb-4">Producer projects feeding central telemetry</p>
          <div className="space-y-2">
            {Object.entries(projectsHub).map(([id, proj]) => (
              <div key={id} className="flex items-start justify-between p-2 rounded bg-surface-raised">
                <div>
                  <p className="text-xs font-medium text-ink-primary">{proj.name}</p>
                  <p className="text-xs text-ink-tertiary font-mono">{id}</p>
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: proj.status === 'active' ? '#027A48' : '#B42318', background: proj.status === 'active' ? '#ECFDF3' : '#FEF3F2' }}
                >
                  {proj.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live Telemetry Feed ──────────────────── */}
      <div className={`${cardCls} mb-6`}>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Live Telemetry Feed</p>
            <p className="text-xs text-ink-tertiary">Most recent events from GET /telemetry</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateMock}
              disabled={mockGenerating}
              className="text-xs font-medium px-3 py-1.5 rounded border border-border text-ink-secondary hover:bg-surface-raised disabled:opacity-50"
            >
              {mockGenerating ? 'Generating…' : 'Generate Mock Events'}
            </button>
            <button
              onClick={refreshTelemetry}
              disabled={telemetryLoading}
              className="text-xs font-medium px-3 py-1.5 rounded text-white disabled:opacity-50"
              style={{ background: '#000048' }}
            >
              {telemetryLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <input
            value={telemetrySearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search cloud, associate, or source project…"
            className="text-xs px-3 py-1.5 rounded border border-border w-80"
          />
          {telemetrySearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="text-xs font-medium text-ink-tertiary hover:text-ink-secondary"
            >
              Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Timestamp', 'Cloud', 'Service', 'Operation', 'Associate', 'Cost', 'Source Project'].map(h => (
                  <th key={h} className="text-left font-semibold text-ink-tertiary uppercase tracking-wider px-4 py-2" style={{ fontSize: 10 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedTelemetryEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-ink-tertiary py-6">
                    {telemetryEvents.length === 0
                      ? 'No telemetry events yet — try "Generate Mock Events".'
                      : 'No events match the current filters.'}
                  </td>
                </tr>
              )}
              {pagedTelemetryEvents.map((e, i) => (
                <tr key={e.message_id || i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-mono text-ink-tertiary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-ink-primary">{e.data?.cloud ?? '—'}</td>
                  <td className="px-4 py-2 text-ink-primary">{e.data?.service ?? '—'}</td>
                  <td className="px-4 py-2 text-ink-secondary">{e.data?.operation ?? '—'}</td>
                  <td className="px-4 py-2 text-ink-secondary">{e.data?.associate_id ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-ink-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {typeof e.data?.cost === 'number' ? `$${e.data.cost.toFixed(5)}` : '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-ink-tertiary">{e.data?.source_project ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-ink-tertiary">
            {filteredTelemetryEvents.length === 0
              ? '0 events'
              : `Showing ${(telemetryPage - 1) * TELEMETRY_PAGE_SIZE + 1}–${Math.min(telemetryPage * TELEMETRY_PAGE_SIZE, filteredTelemetryEvents.length)} of ${filteredTelemetryEvents.length}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTelemetryPage(p => Math.max(1, p - 1))}
              disabled={telemetryPage <= 1}
              className="text-xs font-medium px-3 py-1.5 rounded border border-border text-ink-secondary hover:bg-surface-raised disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-ink-tertiary">Page {telemetryPage} of {telemetryTotalPages}</span>
            <button
              onClick={() => setTelemetryPage(p => Math.min(telemetryTotalPages, p + 1))}
              disabled={telemetryPage >= telemetryTotalPages}
              className="text-xs font-medium px-3 py-1.5 rounded border border-border text-ink-secondary hover:bg-surface-raised disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────── */}
      <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">
        Agent Behavioral Alerts — Last 7 Days
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { title: 'Critical Alerts', items: criticalAlerts, color: colors.error,   borderCls: 'border-l-2 border-status-error' },
          { title: 'Warning Alerts',  items: warningAlerts,  color: colors.warning, borderCls: 'border-l-2 border-status-warning' },
        ].map(({ title, items, color, borderCls }) => (
          <div key={title} className={`${cardCls}`}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-primary">{title}</p>
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
                style={{ background: color }}
              >
                {items.length}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {items.map((a, i) => (
                <div
                  key={a.id || a.msg || i}
                  className={`flex items-start gap-3 p-2 rounded ${borderCls} bg-surface-raised`}
                  style={{ cursor: onNavigate ? 'pointer' : 'default' }}
                  onClick={() => onNavigate?.('2', { tab: 'troubleshoot' })}
                >
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-primary">{a.msg}</p>
                    <p className="text-xs text-ink-tertiary mt-0.5 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
