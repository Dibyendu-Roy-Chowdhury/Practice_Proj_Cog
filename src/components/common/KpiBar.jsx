/**
 * KpiBar — row of KPI tiles displayed at the top of every page.
 * Matches Cognizant 1C card architecture: white surface, 1px #E2E8F0 border, 4px radius.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * @param {object} props
 * @param {Array<{
 *   label: string,
 *   value: string|number,
 *   sub?: string,
 *   trend?: 'up'|'down'|'flat',
 *   trendLabel?: string,
 *   accent?: string,   // left-border color; defaults to #00B5E2
 * }>} props.tiles
 */
const KpiBar = ({ tiles = [] }) => (
  <div
    style={{
      display:               'grid',
      gridTemplateColumns:   `repeat(${tiles.length}, 1fr)`,
      gap:                   12,
      marginBottom:          20,
    }}
  >
    {tiles.map((tile, i) => (
      <KpiTile key={i} {...tile} />
    ))}
  </div>
);

const TREND_META = {
  up:   { Icon: TrendingUp,   color: '#027A48' },
  down: { Icon: TrendingDown, color: '#B42318' },
  flat: { Icon: Minus,        color: '#98A2B3' },
};

const KpiTile = ({ label, value, sub, trend, trendLabel, accent = '#00B5E2', icon }) => {
  const tm = trend ? TREND_META[trend] : null;

  return (
    <div
      className="vfo-card"
      style={{
        padding:      '14px 16px 12px',
        borderLeft:   `3px solid ${accent}`,
        borderRadius:  4,
        display:      'flex',
        alignItems:   'center',
        gap:          icon ? 12 : 0,
      }}
    >
      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: accent,
        }}>
          {icon}
        </div>
      )}
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#101828', lineHeight: 1.2 }}>
          {value}
        </p>
        {(sub || tm) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {tm && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: tm.color, fontSize: 11, fontWeight: 500 }}>
                <tm.Icon size={12} strokeWidth={1.5} />
                {trendLabel}
              </span>
            )}
            {sub && !tm && (
              <span style={{ fontSize: 11, color: '#98A2B3' }}>{sub}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiBar;
