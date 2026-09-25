import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RCTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Gauge, Zap, Activity, CheckCircle } from 'lucide-react';
import { getPerformanceMetrics, getPerformanceMetricsAsync } from '../services/API_services';

const cardStyle = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  padding: '20px 24px',
  marginBottom: 16,
};

const SH = ({ title }) => (
  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
    {title}
  </span>
);

// Fixed color palette — assigned by position so all charts stay consistent.
const PALETTE = ['#000048', '#7C3AED', '#F59E0B', '#10B981', '#0369A1', '#EF4444'];

// ---------- KPI tile ----------

const KpiTile = ({ icon: Icon, label, value, sub, color = '#101828' }) => (
  <div style={{
    flex: '1 1 0',
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    minWidth: 0,
  }}>
    <div style={{
      width: 38, height: 38, borderRadius: 8,
      background: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={18} color="#64748B" strokeWidth={1.8} />
    </div>
    <div style={{ minWidth: 0 }}>
      <SH title={label} />
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.2, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

// ---------- main component ----------

export default function PerformanceMetrics() {
  const [metrics, setMetrics] = useState(() => getPerformanceMetrics());

  useEffect(() => {
    setMetrics(getPerformanceMetrics());
    getPerformanceMetricsAsync()
      .then(m => { if (m) setMetrics(m); })
      .catch(() => {});
  }, []);

  const { tenantLabel, agentNames = [], latencyData = [], throughputData = [], errorData = [], kpis = {} } = metrics;

  return (
    <div style={{ padding: '4px 0' }}>

      {/* header row */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#101828', letterSpacing: '-0.01em' }}>
          Performance Metrics
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>
          {tenantLabel ? `${tenantLabel} — ` : ''}Latency, throughput and error rate — last 7 days
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <KpiTile icon={Gauge}       label="Active Agents" value={kpis.activeAgents ?? 6}       sub="All operational" />
        <KpiTile icon={Activity}    label="p95 Latency"   value={`${kpis.p95Latency ?? 3.4}s`} sub="95th percentile" color="#F59E0B" />
        <KpiTile icon={Zap}         label="Health Score"  value={`${kpis.healthScore ?? 82}`}   sub="Fleet composite" />
        <KpiTile icon={CheckCircle} label="Success Rate"  value={`${kpis.successRate ?? 97.2}%`}sub="7-day average"  color="#10B981" />
      </div>

      {/* Chart 1: Latency trend */}
      <div style={cardStyle}>
        <div style={{ marginBottom: 14 }}>
          <SH title="Latency by Agent — 7 Day Trend" />
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
            Response latency (seconds) per agent.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={latencyData} margin={{ top: 6, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}s`}
              domain={[0, 'auto']}
            />
            <RCTooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E2E8F0' }}
              formatter={(v, name) => [`${v}s`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => <span style={{ color: '#344054', fontWeight: 600 }}>{value}</span>}
            />
            {agentNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: PALETTE[i % PALETTE.length] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Throughput stacked bar */}
      <div style={cardStyle}>
        <div style={{ marginBottom: 14 }}>
          <SH title="Throughput — Daily Requests by Agent" />
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
            Total requests per day, stacked by agent.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={throughputData} margin={{ top: 6, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            />
            <RCTooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E2E8F0' }}
              formatter={(value, name) => [`${value.toLocaleString()} req`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => <span style={{ color: '#344054', fontWeight: 600 }}>{value}</span>}
            />
            {agentNames.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="a"
                fill={PALETTE[i % PALETTE.length]}
                radius={i === agentNames.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3: Error rate by category */}
      <div style={cardStyle}>
        <div style={{ marginBottom: 14 }}>
          <SH title="Error Rate by Category — 7 Day Avg" />
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
            Average error rate (%) per category over the last 7 days.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={errorData}
            layout="horizontal"
            margin={{ top: 6, right: 16, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
              tickFormatter={v => `${v}%`}
            />
            <RCTooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E2E8F0' }}
              formatter={(value) => [`${value}%`, 'Error Rate']}
            />
            <Bar dataKey="rate" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
