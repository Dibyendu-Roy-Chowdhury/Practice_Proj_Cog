import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

const CHAIN_COLORS = ['#00B5E2', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const RISK_STYLE = {
  High:   { bg: '#FEF3F2', fg: '#EF4444' },
  Medium: { bg: '#FFFAEB', fg: '#F59E0B' },
  Low:    { bg: '#ECFDF3', fg: '#10B981' },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #1E293B',
      borderRadius: 6, padding: '10px 14px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700,
        color: '#94A3B8', textTransform: 'uppercase' }}>Hop {label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%',
            background: p.color, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#E2E8F0' }}>
            {p.name}: <strong>{(p.value * 100).toFixed(0)}%</strong>
          </span>
        </div>
      ))}
      <p style={{ margin: '6px 0 0', fontSize: 10, color: '#475569' }}>
        Threshold: 80% — drops below indicate semantic drift
      </p>
    </div>
  );
};

export default function SemanticConsistencyChart({ chains = [], threshold = 0.80 }) {
  // Build chart data: one row per hop step, one key per chain
  const maxHops = Math.max(...chains.map(c => c.hops.length), 0);
  const chartData = Array.from({ length: maxHops }, (_, step) => {
    const row = { step };
    chains.forEach(c => {
      const hop = c.hops.find(h => h.step === step);
      if (hop) row[c.id] = hop.similarity;
    });
    return row;
  });

  return (
    <div>
      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis
            dataKey="step"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            tickFormatter={v => `Hop ${v}`}
            axisLine={false} tickLine={false}
          />
          <YAxis
            domain={[0.5, 1.05]}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false} tickLine={false}
          />
          <ReTooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={threshold} stroke="#EF4444" strokeDasharray="5 3"
            label={{ value: 'Threshold', position: 'insideTopRight', fontSize: 10, fill: '#EF4444' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            formatter={(value) => {
              const chain = chains.find(c => c.id === value);
              return chain?.task?.slice(0, 32) + (chain?.task?.length > 32 ? '…' : '') ?? value;
            }}
          />
          {chains.map((c, i) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={c.id}
              name={c.id}
              stroke={CHAIN_COLORS[i % CHAIN_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Chain summary table */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chains.map((c, i) => {
          const minSim = Math.min(...c.hops.map(h => h.similarity));
          const rs = RISK_STYLE[c.risk] ?? RISK_STYLE.Low;
          const driftHop = c.hops.find(h => h.similarity < threshold);
          return (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '8px 1fr 90px 80px 120px',
              gap: 10, padding: '8px 12px', background: '#F8FAFC',
              border: '1px solid #E2E8F0', borderRadius: 6, alignItems: 'center',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%',
                background: CHAIN_COLORS[i % CHAIN_COLORS.length], display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: '#344054', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.task}>
                {c.task}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px',
                borderRadius: 99, background: rs.bg, color: rs.fg, textAlign: 'center' }}>
                {c.risk}
              </span>
              <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums',
                fontWeight: 700, color: minSim < threshold ? '#EF4444' : '#10B981',
                textAlign: 'right' }}>
                Min: {(minSim * 100).toFixed(0)}%
              </span>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>
                {driftHop
                  ? `Drift at hop ${driftHop.step} (${driftHop.agent})`
                  : 'Within threshold ✓'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
