import React from 'react';
import { Skeleton } from 'antd';

/**
 * MetricCard — KPI / stat display.
 * Replaces: kpi-card, metric-card, lifetime-card, dashboard-kpi-value patterns.
 *
 * Props:
 *   label   — string  — uppercase label
 *   value   — string  — primary metric value
 *   sub     — string  — secondary line (optional)
 *   trend   — { label: string, direction: 'up'|'down'|'neutral' } (optional)
 *   mono    — boolean — render value in monospace (token counts, costs, IDs)
 *   loading — boolean
 */
const MetricCard = ({ label, value, sub, trend, mono = false, loading = false, className = '' }) => {
  const trendColor =
    trend?.direction === 'up'   ? 'text-status-success' :
    trend?.direction === 'down' ? 'text-status-error'   : 'text-status-success';

  return (
    <div className={`bg-white border border-border rounded shadow-card p-4 ${className}`}>
      {loading ? (
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      ) : (
        <>
          <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1.5">
            {label}
          </p>
          <p className={`text-xl font-bold text-ink-primary leading-tight ${mono ? 'font-mono' : ''}`}>
            {value ?? '—'}
          </p>
          {sub && (
            <p className="text-xs text-ink-tertiary mt-1 font-mono">{sub}</p>
          )}
          {trend && (
            <div className="flex items-center justify-between mt-1.5 gap-2">
              <span className={`text-xs font-semibold ${trendColor}`}>
                {trend.label}
              </span>
              {trend.right && (
                <span className="text-xs font-mono text-ink-tertiary flex-shrink-0">
                  {trend.right}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MetricCard;
