import React from 'react';
import { Button, Tooltip, Progress, message } from 'antd';
import { getCostOptimizationKpis, getCostRecommendations, getCostWasteByAgent } from '../services/API_services';
import { Zap, Database, ArrowRight, DollarSign } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RCTooltip,
  Cell,
} from 'recharts';

const cardStyle = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  padding: '20px 24px',
  marginBottom: 16,
};

const SH = ({ title }) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: '#94A3B8',
    }}
  >
    {title}
  </span>
);

const COLORS = {
  primary: '#000048',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  slate: '#64748B',
  accent: '#00B5E2',
};

// ─── Section 1: KPI Strip ────────────────────────────────────────────────────

function KPIStrip() {
  // Derive KPI values from SSOT — updates on tenant/env change (remount via AppShell key).
  const kpis = getCostOptimizationKpis();
  const kpiTiles = [
    { label: 'MTD Spend',        value: kpis.mtdSpend,     color: COLORS.primary,  icon: <DollarSign size={18} color={COLORS.primary}  />, borderColor: COLORS.primary  },
    { label: 'Token Efficiency', value: kpis.tokenEffPct,  color: COLORS.success,  icon: <Zap       size={18} color={COLORS.success}  />, borderColor: COLORS.success  },
    { label: 'Token Waste Rate', value: kpis.savingsPct,   color: COLORS.warning,  icon: <Zap       size={18} color={COLORS.warning}  />, borderColor: COLORS.warning  },
    { label: 'Projected Monthly',value: kpis.projectedMtd, color: COLORS.accent,   icon: <Database  size={18} color={COLORS.accent}   />, borderColor: COLORS.accent   },
  ];
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
      {kpiTiles.map((tile) => (
        <div
          key={tile.label}
          style={{
            flex: '1 1 180px',
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderLeft: `4px solid ${tile.borderColor}`,
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `${tile.borderColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {tile.icon}
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.slate, marginBottom: 2 }}>{tile.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: tile.color, lineHeight: 1 }}>
              {tile.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section 2: Optimization Recommendations ────────────────────────────────
// Derived from SSOT — updates when tenant/env changes (component remounts via AppShell key).

function RecommendationCard({ rec }) {
  const dotColor = rec.severity === 'green' ? COLORS.success : COLORS.warning;
  const savingsBg = rec.severity === 'green' ? '#D1FAE5' : '#FEF3C7';
  const savingsColor = rec.severity === 'green' ? '#065F46' : '#92400E';
  const confidenceColor =
    rec.confidence >= 85
      ? COLORS.success
      : rec.confidence >= 70
      ? COLORS.warning
      : COLORS.slate;

  return (
    <div
      style={{
        ...cardStyle,
        marginBottom: 12,
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Severity dot */}
        <div style={{ paddingTop: 4, flexShrink: 0 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: dotColor,
              marginTop: 2,
            }}
          />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14, marginBottom: 4 }}>
                {rec.title}
              </div>
              <div style={{ fontSize: 13, color: COLORS.slate, lineHeight: 1.5, marginBottom: 8 }}>
                {rec.description}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  background: savingsBg,
                  color: savingsColor,
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 4,
                  padding: '2px 8px',
                }}
              >
                Est. savings: {rec.savings}
              </span>
            </div>

            {/* Right: confidence + CTA */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <Tooltip title="Model confidence in projected savings">
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: COLORS.slate, marginBottom: 2 }}>Confidence</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: confidenceColor }}>
                    {rec.confidence}%
                  </div>
                </div>
              </Tooltip>
              <Tooltip title="Available in Enterprise tier">
                <Button
                  size="small"
                  disabled
                  style={{ fontSize: 12 }}
                  icon={<ArrowRight size={12} />}
                >
                  {rec.ctaLabel}
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Detail row */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid #F1F5F9',
              fontSize: 12,
              color: '#475569',
            }}
          >
            {rec.detail}
          </div>
        </div>
      </div>
    </div>
  );
}

function OptimizationRecommendations() {
  const recommendations = getCostRecommendations();
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ marginBottom: 12 }}>
        <SH title="Recommendations" />
      </div>
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.title} rec={rec} />
      ))}
    </div>
  );
}

// ─── Section 3: Token Waste Analysis ────────────────────────────────────────
// wasteByAgent is derived from SSOT inside TokenWasteAnalysis component.



const CustomWasteTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ color: COLORS.slate }}>
          Token Waste: <strong style={{ color: payload[0].value > 3 ? COLORS.warning : COLORS.success }}>{payload[0].value}%</strong>
        </div>
      </div>
    );
  }
  return null;
};

function TokenWasteAnalysis() {
  const wasteByAgent = getCostWasteByAgent();
  const kpis = getCostOptimizationKpis();
  const totalWaste = parseFloat(kpis.savingsPct);
  const topAgent = wasteByAgent[0]?.agent || 'Primary Agent';
  const dynamicWasteTiles = [
    { label: 'Prompt Verbosity Waste',    value: `${Math.max(1, Math.round(totalWaste * 0.50))}%`, note: `↗ ${topAgent} compression opp.`, color: COLORS.warning },
    { label: 'Unnecessary Long Outputs',  value: `${Math.max(1, Math.round(totalWaste * 0.34))}%`, note: '',                               color: COLORS.warning },
    { label: 'Failed Request Waste',      value: `${Math.max(1, Math.round(totalWaste * 0.16))}%`, note: '',                               color: COLORS.error   },
    { label: 'Total Waste',               value: `${totalWaste}%`,                                  note: 'of all token spend',             color: COLORS.slate   },
  ];
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ marginBottom: 12 }}>
        <SH title="Token Waste Analysis" />
      </div>

      {/* Part A: Summary tiles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {dynamicWasteTiles.map((tile) => (
          <div
            key={tile.label}
            style={{
              flex: '1 1 160px',
              background: '#FAFAFA',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: 11, color: COLORS.slate, marginBottom: 4 }}>{tile.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: tile.color }}>{tile.value}</div>
            {tile.note && (
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{tile.note}</div>
            )}
          </div>
        ))}
      </div>

      {/* Part B: Bar chart */}
      <div style={{ ...cardStyle, marginBottom: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, marginBottom: 14 }}>
          Token Waste by Agent
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={wasteByAgent}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, 8]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: COLORS.slate }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="agent"
              tick={{ fontSize: 11, fill: '#334155' }}
              axisLine={false}
              tickLine={false}
              width={190}
            />
            <RCTooltip content={<CustomWasteTooltip />} />
            <Bar dataKey="waste" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {wasteByAgent.map((entry) => (
                <Cell
                  key={entry.agent}
                  fill={entry.waste > 3 ? COLORS.warning : COLORS.success}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.warning, display: 'inline-block' }} />
            Above threshold (&gt;3%)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.success, display: 'inline-block' }} />
            Within target (≤3%)
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Section 4: Caching Performance ─────────────────────────────────────────

const cacheData = [
  {
    tool: 'account_lookup',
    hitRate: 34,
    ttl: '5 min',
    dailyCalls: '12,340',
    cachedCalls: '4,196',
    potential: '60% possible',
    potentialFlag: 'high',
  },
  {
    tool: 'transaction_search',
    hitRate: 28,
    ttl: '3 min',
    dailyCalls: '5,890',
    cachedCalls: '1,649',
    potential: '45% possible',
    potentialFlag: 'high',
  },
  {
    tool: 'compliance_rules_api',
    hitRate: 61,
    ttl: '30 min',
    dailyCalls: '5,890',
    cachedCalls: '3,593',
    potential: '65% possible',
    potentialFlag: 'good',
  },
  {
    tool: 'credit_score_api',
    hitRate: 12,
    ttl: '1 min',
    dailyCalls: '2,110',
    cachedCalls: '253',
    potential: '35% possible',
    potentialFlag: 'medium',
  },
  {
    tool: 'analytics_sql',
    hitRate: 5,
    ttl: 'None',
    dailyCalls: '890',
    cachedCalls: '45',
    potential: '40% possible',
    potentialFlag: 'medium',
  },
];

const tableHeaderStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#94A3B8',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '8px 12px',
  background: '#F8FAFC',
  borderBottom: '1px solid #E2E8F0',
};

const tableCellStyle = {
  padding: '11px 12px',
  fontSize: 13,
  color: '#334155',
  borderBottom: '1px solid #F1F5F9',
};

function hitRateColor(rate) {
  if (rate >= 50) return COLORS.success;
  if (rate >= 25) return COLORS.warning;
  return COLORS.error;
}

function potentialBadge(flag) {
  const map = {
    high: { bg: '#DBEAFE', color: '#1D4ED8' },
    good: { bg: '#D1FAE5', color: '#065F46' },
    medium: { bg: '#FEF3C7', color: '#92400E' },
  };
  const style = map[flag] || map.medium;
  return style;
}

function CachingPerformance() {
  const columns = ['Tool', 'Hit Rate', 'TTL', 'Daily Calls', 'Cached Calls', 'Potential'];

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ marginBottom: 12 }}>
        <SH title="Cache Performance" />
      </div>
      <div style={cardStyle}>
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.2fr 1.4fr' }}>
            {columns.map((col) => (
              <div key={col} style={tableHeaderStyle}>
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {cacheData.map((row, idx) => {
            const badge = potentialBadge(row.potentialFlag);
            const isLast = idx === cacheData.length - 1;
            const rowCell = { ...tableCellStyle, borderBottom: isLast ? 'none' : tableCellStyle.borderBottom };
            return (
              <div
                key={row.tool}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.2fr 1.4fr',
                  background: idx % 2 === 0 ? '#fff' : '#FAFAFA',
                }}
              >
                <div style={{ ...rowCell, fontFamily: 'monospace', fontSize: 12, color: COLORS.primary, fontWeight: 600 }}>
                  {row.tool}
                </div>
                <div style={rowCell}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: hitRateColor(row.hitRate) }}>{row.hitRate}%</span>
                    <div style={{ flex: 1, maxWidth: 40 }}>
                      <Progress
                        percent={row.hitRate}
                        showInfo={false}
                        size="small"
                        strokeColor={hitRateColor(row.hitRate)}
                        trailColor="#E2E8F0"
                      />
                    </div>
                  </div>
                </div>
                <div style={{ ...rowCell, color: row.ttl === 'None' ? COLORS.error : COLORS.slate }}>
                  {row.ttl}
                </div>
                <div style={rowCell}>{row.dailyCalls}</div>
                <div style={rowCell}>{row.cachedCalls}</div>
                <div style={rowCell}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: badge.bg,
                      color: badge.color,
                      borderRadius: 4,
                      padding: '2px 8px',
                    }}
                  >
                    {row.potential}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="default"
          icon={<Database size={14} />}
          onClick={() => message.info('Cache configuration requires Platform Admin permissions.')}
          style={{ fontSize: 13 }}
        >
          Tune Cache Settings
        </Button>
      </div>
    </div>
  );
}

// ─── Root Component ──────────────────────────────────────────────────────────

export default function CostOptimization() {
  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <DollarSign size={20} color={COLORS.primary} />
          <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary }}>
            Cost Optimization
          </span>
        </div>
        <div style={{ fontSize: 13, color: COLORS.slate }}>
          AI-identified savings opportunities and efficiency recommendations across the VeriForge Ops fleet.
        </div>
      </div>

      <KPIStrip />
      <OptimizationRecommendations />
      <TokenWasteAnalysis />
      <CachingPerformance />
    </div>
  );
}
